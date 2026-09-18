//! Brush stamp rasterization and pixel blending.
//!
//! Writes must reproduce `Uint8ClampedArray` byte for byte: otherwise the
//! TypeScript and Rust versions would differ in the picture, with nothing left
//! to compare against. Rounding is "nearest, ties to even", clamped at both
//! ends.

use drawing_core::TILE_SIZE;
use drawing_core::color::Color;
use drawing_core::geometry::Rect;
use drawing_core::tile::Tile;

#[cfg(test)]
mod tests;

pub const fn clamp01(value: f64) -> f64 {
    value.clamp(0.0, 1.0)
}

/// Byte conversion exactly as `Uint8ClampedArray` performs it.
pub fn to_clamped_u8(value: f64) -> u8 {
    if value.is_nan() {
        return 0;
    }

    value.clamp(0.0, 255.0).round_ties_even() as u8
}

fn store(pixels: &mut [u8], index: usize, value: f64) {
    pixels[index] = to_clamped_u8(value);
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum BlendMode {
    DestinationOut,
    SourceOver,
}

/// Pixel coverage of a stamp.
///
/// The falloff band is at least one pixel wide, or a hard brush gives a torn
/// edge, and it grows with brush softness. This also leaves a non empty mark
/// for stamps smaller than a pixel.
pub fn stamp_coverage(distance: f64, radius: f64, hardness: f64) -> f64 {
    if radius <= 0.0 {
        return 0.0;
    }

    let band = 1.0 + (1.0 - hardness).max(0.0) * radius;

    clamp01((radius + 0.5 - distance) / band)
}

/// Source-over blend of one pixel. Public for writers outside the brush: the
/// region fill puts pixels in with the same blend the stamps use, or the
/// picture would depend on which tool drew it.
pub fn blend_source_over(pixels: &mut [u8], index: usize, color: Color, source_alpha: f64) {
    let src = clamp01(source_alpha);

    if src <= 0.0 {
        return;
    }

    let dst = pixels[index + 3] as f64 / 255.0;
    let out = src + dst * (1.0 - src);

    if out <= 0.0 {
        store(pixels, index + 3, 0.0);

        return;
    }

    let kept = (dst * (1.0 - src)) / out;
    let added = src / out;

    store(
        pixels,
        index,
        color.r as f64 * added + pixels[index] as f64 * kept,
    );
    store(
        pixels,
        index + 1,
        color.g as f64 * added + pixels[index + 1] as f64 * kept,
    );
    store(
        pixels,
        index + 2,
        color.b as f64 * added + pixels[index + 2] as f64 * kept,
    );
    store(pixels, index + 3, out * 255.0);
}

pub struct StampOptions {
    pub alpha: f64,
    pub center_x: f64,
    pub center_y: f64,
    /// Pixels outside stay untouched: edge tiles overhang the document,
    /// and without this the stroke would spill past the sheet.
    pub clip: Rect,
    pub color: Color,
    pub hardness: f64,
    pub radius: f64,
}

/// Puts one stamp into a tile. Returns true if at least one pixel changed:
/// only then does the tile version grow and the tile reach the output.
pub fn paint_stamp(tile: &mut Tile, options: &StampOptions) -> bool {
    let StampOptions {
        alpha,
        center_x,
        center_y,
        clip,
        color,
        hardness,
        radius,
    } = *options;

    if radius <= 0.0 || alpha <= 0.0 {
        return false;
    }

    let origin_x = tile.col as f64 * TILE_SIZE as f64;
    let origin_y = tile.row as f64 * TILE_SIZE as f64;
    let reach = radius + 0.5;
    let last = (TILE_SIZE - 1) as f64;

    // A pixel belongs to the clip when its unit square overlaps it. The
    // clip bounds stay exact: they are tile multiples and whole document
    // sizes, so floor and ceil below lose nothing to float dust.
    let clip_lo_x = (clip.x - origin_x - 1.0).floor() + 1.0;
    let clip_hi_x = (clip.x + clip.width - origin_x).ceil() - 1.0;
    let clip_lo_y = (clip.y - origin_y - 1.0).floor() + 1.0;
    let clip_hi_y = (clip.y + clip.height - origin_y).ceil() - 1.0;

    let from_x = (center_x - reach - origin_x - 0.5)
        .ceil()
        .max(0.0)
        .max(clip_lo_x) as i64;
    let to_x = (center_x + reach - origin_x - 0.5)
        .floor()
        .min(last)
        .min(clip_hi_x) as i64;
    let from_y = (center_y - reach - origin_y - 0.5)
        .ceil()
        .max(0.0)
        .max(clip_lo_y) as i64;
    let to_y = (center_y + reach - origin_y - 0.5)
        .floor()
        .min(last)
        .min(clip_hi_y) as i64;

    let mut painted = false;

    for py in from_y..=to_y {
        let doc_y = origin_y + py as f64 + 0.5;

        for px in from_x..=to_x {
            let doc_x = origin_x + px as f64 + 0.5;
            let distance = (doc_x - center_x).hypot(doc_y - center_y);
            let coverage = stamp_coverage(distance, radius, hardness);

            if coverage <= 0.0 {
                continue;
            }

            let index = ((py as usize).min(TILE_SIZE - 1) * TILE_SIZE
                + (px as usize).min(TILE_SIZE - 1))
                * 4;

            blend_source_over(&mut tile.pixels, index, color, coverage * alpha);
            painted = true;
        }
    }

    if painted {
        tile.version += 1;
    }

    painted
}

/// Applies the stroke buffer onto a layer tile. Opacity and blend mode apply
/// here, once per gesture: per stamp they would saturate the stroke by itself.
pub fn composite_tile(target: &mut Tile, source: &Tile, opacity: f64, mode: BlendMode) -> bool {
    let amount = clamp01(opacity);

    if amount <= 0.0 {
        return false;
    }

    let mut changed = false;

    for index in (0..target.pixels.len()).step_by(4) {
        let source_alpha = (source.pixels[index + 3] as f64 / 255.0) * amount;

        if source_alpha <= 0.0 {
            continue;
        }

        match mode {
            BlendMode::DestinationOut => {
                let target_alpha = target.pixels[index + 3] as f64 / 255.0;

                if target_alpha <= 0.0 {
                    continue;
                }

                let out = target_alpha * (1.0 - source_alpha);
                store(&mut target.pixels, index + 3, out * 255.0);

                if out <= 0.0 {
                    store(&mut target.pixels, index, 0.0);
                    store(&mut target.pixels, index + 1, 0.0);
                    store(&mut target.pixels, index + 2, 0.0);
                }
            }
            BlendMode::SourceOver => {
                blend_source_over(
                    &mut target.pixels,
                    index,
                    Color::new(
                        source.pixels[index],
                        source.pixels[index + 1],
                        source.pixels[index + 2],
                    ),
                    source_alpha,
                );
            }
        }

        changed = true;
    }

    if changed {
        target.version += 1;
    }

    changed
}
