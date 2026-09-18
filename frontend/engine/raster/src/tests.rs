//! Rasterization tests. They repeat assertions from `raster.test.ts`.

use drawing_core::TILE_SIZE;
use drawing_core::color::Color;
use drawing_core::geometry::Rect;
use drawing_core::tile::Tile;

use crate::{BlendMode, StampOptions, composite_tile, paint_stamp, stamp_coverage};

const RED: Color = Color::new(255, 0, 0);

fn base() -> StampOptions {
    StampOptions {
        alpha: 1.0,
        center_x: 20.0,
        center_y: 20.0,
        clip: Rect::new(0.0, 0.0, TILE_SIZE as f64, TILE_SIZE as f64),
        color: RED,
        hard_edge: false,
        hardness: 1.0,
        radius: 4.0,
    }
}

fn pencil() -> StampOptions {
    StampOptions {
        center_x: 20.4,
        center_y: 20.6,
        hard_edge: true,
        radius: 0.5,
        ..base()
    }
}

fn tile() -> Tile {
    Tile::new(0, 0)
}

fn alpha_at(tile: &Tile, x: usize, y: usize) -> u8 {
    tile.pixels[(y * TILE_SIZE + x) * 4 + 3]
}

fn painted() -> Tile {
    let mut tile = tile();
    paint_stamp(&mut tile, &base());

    tile
}

#[test]
fn coverage_is_full_inside_the_solid_core() {
    assert_eq!(stamp_coverage(0.0, 8.0, 1.0, false), 1.0);
    assert_eq!(stamp_coverage(6.0, 8.0, 1.0, false), 1.0);
}

#[test]
fn coverage_falls_off_at_the_edge_and_reaches_zero() {
    assert!(stamp_coverage(7.9, 8.0, 1.0, false) > 0.0);
    assert!(stamp_coverage(8.4, 8.0, 1.0, false) > 0.0);
    assert_eq!(stamp_coverage(8.5, 8.0, 1.0, false), 0.0);
    assert_eq!(stamp_coverage(20.0, 8.0, 1.0, false), 0.0);
}

#[test]
fn softness_widens_the_falloff_inside_the_stamp() {
    assert_eq!(stamp_coverage(3.0, 8.0, 0.5, false), 1.0);
    assert!(stamp_coverage(5.0, 8.0, 0.5, false) < 1.0);
    assert!(stamp_coverage(5.0, 8.0, 0.5, false) > 0.0);
    assert!(
        stamp_coverage(7.0, 8.0, 0.5, false) < stamp_coverage(5.0, 8.0, 1.0, false)
    );
}

#[test]
fn zero_radius_gives_no_coverage() {
    assert_eq!(stamp_coverage(0.0, 0.0, 1.0, false), 0.0);
}

#[test]
fn a_hard_edge_paints_a_pixel_or_leaves_it_alone() {
    assert_eq!(stamp_coverage(0.0, 4.0, 1.0, true), 1.0);
    assert_eq!(stamp_coverage(4.0, 4.0, 1.0, true), 1.0);
    assert_eq!(stamp_coverage(4.1, 4.0, 1.0, true), 0.0);
    // Softness has nothing to widen here: the edge is the tool, not a setting.
    assert_eq!(stamp_coverage(2.0, 4.0, 0.0, true), 1.0);
}

#[test]
fn a_one_pixel_pencil_paints_exactly_one_pixel() {
    let mut tile = tile();

    assert!(paint_stamp(&mut tile, &pencil()));
    assert_eq!(alpha_at(&tile, 20, 20), 255);
    assert_eq!(alpha_at(&tile, 21, 20), 0);
    assert_eq!(alpha_at(&tile, 19, 20), 0);
    assert_eq!(alpha_at(&tile, 21, 21), 0);
}

#[test]
fn a_pencil_snaps_its_centre_to_the_pixel() {
    // Both pointers sit inside pixel (20, 20): a fractional centre would
    // leave the same pixel painted twice or a neighbour touched.
    let mut first = tile();
    let mut second = tile();

    paint_stamp(&mut first, &pencil());
    paint_stamp(
        &mut second,
        &StampOptions {
            center_x: 20.1,
            center_y: 20.2,
            ..pencil()
        },
    );

    for y in 18..24usize {
        for x in 18..24usize {
            assert_eq!(alpha_at(&first, x, y), alpha_at(&second, x, y));
        }
    }
}

#[test]
fn a_soft_stamp_of_the_same_size_keeps_its_fringe() {
    let mut hard = tile();
    let mut soft = tile();

    paint_stamp(
        &mut hard,
        &StampOptions {
            center_x: 20.5,
            center_y: 20.5,
            hard_edge: true,
            radius: 3.6,
            ..base()
        },
    );
    paint_stamp(
        &mut soft,
        &StampOptions {
            center_x: 20.5,
            center_y: 20.5,
            radius: 3.6,
            ..base()
        },
    );

    // Pixel 24 sits 4 pixels away: inside the soft falloff band, outside the
    // hard edge. The pencil leaves it untouched, the brush paints a fringe.
    assert_eq!(alpha_at(&hard, 24, 20), 0);
    assert!(alpha_at(&soft, 24, 20) > 0);
    assert_eq!(alpha_at(&hard, 20, 20), 255);
    assert_eq!(alpha_at(&soft, 20, 20), 255);
}

#[test]
fn stamp_paints_pixels_around_the_center() {
    let mut tile = tile();

    assert!(paint_stamp(&mut tile, &base()));
    assert_eq!(alpha_at(&tile, 20, 20), 255);
    assert!(alpha_at(&tile, 23, 20) > 0);
    assert_eq!(alpha_at(&tile, 40, 20), 0);
}

#[test]
fn stamp_does_not_leave_its_own_tile() {
    let mut tile = tile();

    assert!(paint_stamp(
        &mut tile,
        &StampOptions {
            center_x: 254.0,
            center_y: 254.0,
            radius: 6.0,
            ..base()
        }
    ));
    assert!(alpha_at(&tile, 255, 255) > 0);
}

#[test]
fn stamp_respects_the_clip_rectangle() {
    let mut tile = tile();

    assert!(paint_stamp(
        &mut tile,
        &StampOptions {
            center_x: 20.0,
            center_y: 20.0,
            clip: Rect::new(22.0, 0.0, TILE_SIZE as f64 - 22.0, TILE_SIZE as f64),
            radius: 4.0,
            ..base()
        }
    ));
    assert_eq!(alpha_at(&tile, 21, 20), 0);
    assert!(alpha_at(&tile, 22, 20) > 0);
}

#[test]
fn version_grows_only_on_real_painting() {
    let mut tile = tile();

    assert!(!paint_stamp(
        &mut tile,
        &StampOptions {
            center_x: 2000.0,
            center_y: 2000.0,
            ..base()
        }
    ));
    assert_eq!(tile.version, 0);
    assert!(paint_stamp(&mut tile, &base()));
    assert_eq!(tile.version, 1);
}

#[test]
fn zero_alpha_leaves_the_tile_alone() {
    let mut tile = tile();

    assert!(!paint_stamp(
        &mut tile,
        &StampOptions {
            alpha: 0.0,
            ..base()
        }
    ));
    assert_eq!(tile.version, 0);
}

#[test]
fn source_over_adds_alpha() {
    let mut target = tile();
    let source = painted();

    assert!(composite_tile(
        &mut target,
        &source,
        1.0,
        BlendMode::SourceOver
    ));
    assert_eq!(alpha_at(&target, 20, 20), alpha_at(&source, 20, 20));
}

#[test]
fn source_opacity_weakens_the_result() {
    let mut full = tile();
    let mut half = tile();
    let source = painted();

    composite_tile(&mut full, &source, 1.0, BlendMode::SourceOver);
    composite_tile(&mut half, &source, 0.5, BlendMode::SourceOver);

    assert!(alpha_at(&half, 20, 20) < alpha_at(&full, 20, 20));
    assert!(alpha_at(&half, 20, 20) > 0);
}

#[test]
fn destination_out_erases_alpha() {
    let mut target = painted();
    let source = painted();

    assert!(composite_tile(
        &mut target,
        &source,
        1.0,
        BlendMode::DestinationOut
    ));
    assert_eq!(alpha_at(&target, 20, 20), 0);
}

#[test]
fn erasing_an_empty_tile_changes_nothing() {
    let mut target = tile();
    let source = painted();

    assert!(!composite_tile(
        &mut target,
        &source,
        1.0,
        BlendMode::DestinationOut
    ));
    assert_eq!(target.version, 0);
}

#[test]
fn zero_opacity_leaves_the_tile_alone() {
    let mut target = tile();

    assert!(!composite_tile(
        &mut target,
        &painted(),
        0.0,
        BlendMode::SourceOver
    ));
    assert_eq!(target.version, 0);
}

#[test]
fn byte_conversion_matches_the_browser_rule() {
    // The Uint8ClampedArray rule: nearest integer, ties to even, clamped to
    // the byte range.
    assert_eq!(crate::to_clamped_u8(254.5), 254);
    assert_eq!(crate::to_clamped_u8(255.5), 255);
    assert_eq!(crate::to_clamped_u8(0.5), 0);
    assert_eq!(crate::to_clamped_u8(1.5), 2);
    assert_eq!(crate::to_clamped_u8(-4.0), 0);
    assert_eq!(crate::to_clamped_u8(300.0), 255);
    assert_eq!(crate::to_clamped_u8(f64::NAN), 0);
    assert_eq!(crate::to_clamped_u8(f64::INFINITY), 255);
    assert_eq!(crate::to_clamped_u8(f64::NEG_INFINITY), 0);
}
