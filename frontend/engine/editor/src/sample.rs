//! Colour sampling from the document.
//!
//! Colour is read from tiles, not from the output canvas: the result then does
//! not depend on zoom, pixel density or anything drawn on top.

use drawing_core::TILE_SIZE;
use drawing_core::color::Color;
use drawing_core::document::Layer;
use drawing_core::geometry::{Point, Size};
use drawing_core::tile::{tile_grid, tile_key};

/// Blends one channel over what is accumulated so far. Channels stay float and
/// round once at the end: rounding per layer would shift the colour.
fn over(source: f64, source_alpha: f64, target: f64, target_alpha: f64) -> f64 {
    let out = source_alpha + target_alpha * (1.0 - source_alpha);
    let kept = (target_alpha * (1.0 - source_alpha)) / out;
    let added = source_alpha / out;

    source * added + target * kept
}

/// Document colour at a point: layers bottom to top over a white background.
pub fn sample_color(layers: &[Layer], size: Size, point: Point) -> Option<Color> {
    let x = point.x.floor();
    let y = point.y.floor();

    if x < 0.0 || y < 0.0 {
        return None;
    }

    pixel_color(layers, size, x as usize, y as usize)
}

/// Colour of one document pixel by its integer coordinates. Everything that
/// compares the picture against what the user sees, like the region fill,
/// goes through here: a second blend would drift apart from the eyedropper.
pub(crate) fn pixel_color(layers: &[Layer], size: Size, x: usize, y: usize) -> Option<Color> {
    if x as f64 >= size.width || y as f64 >= size.height {
        return None;
    }

    let grid = tile_grid(size, TILE_SIZE);
    let key = tile_key((x / TILE_SIZE) as u32, (y / TILE_SIZE) as u32, grid.cols);
    let index = ((y % TILE_SIZE) * TILE_SIZE + (x % TILE_SIZE)) * 4;

    let mut red = 255.0;
    let mut green = 255.0;
    let mut blue = 255.0;
    let mut alpha = 1.0;

    for layer in layers {
        if !layer.visible {
            continue;
        }

        let Some(tile) = layer.tiles.get(key) else {
            continue;
        };

        let source_alpha = (tile.pixels[index + 3] as f64 / 255.0) * layer.opacity;

        if source_alpha <= 0.0 {
            continue;
        }

        red = over(tile.pixels[index] as f64, source_alpha, red, alpha);
        green = over(tile.pixels[index + 1] as f64, source_alpha, green, alpha);
        blue = over(tile.pixels[index + 2] as f64, source_alpha, blue, alpha);
        alpha = source_alpha + alpha * (1.0 - source_alpha);
    }

    Some(Color::new(
        red.round() as u8,
        green.round() as u8,
        blue.round() as u8,
    ))
}
