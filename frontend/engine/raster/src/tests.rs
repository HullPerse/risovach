//! Rasterization tests. They repeat assertions from `raster.test.ts`.

use drawing_core::TILE_SIZE;
use drawing_core::color::Color;
use drawing_core::tile::Tile;

use crate::{BlendMode, StampOptions, composite_tile, paint_stamp, stamp_coverage};

const RED: Color = Color::new(255, 0, 0);

fn base() -> StampOptions {
    StampOptions {
        alpha: 1.0,
        center_x: 20.0,
        center_y: 20.0,
        color: RED,
        hardness: 1.0,
        radius: 4.0,
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
    assert_eq!(stamp_coverage(0.0, 8.0, 1.0), 1.0);
    assert_eq!(stamp_coverage(6.0, 8.0, 1.0), 1.0);
}

#[test]
fn coverage_falls_off_at_the_edge_and_reaches_zero() {
    assert!(stamp_coverage(7.9, 8.0, 1.0) > 0.0);
    assert!(stamp_coverage(8.4, 8.0, 1.0) > 0.0);
    assert_eq!(stamp_coverage(8.5, 8.0, 1.0), 0.0);
    assert_eq!(stamp_coverage(20.0, 8.0, 1.0), 0.0);
}

#[test]
fn softness_widens_the_falloff_inside_the_stamp() {
    assert_eq!(stamp_coverage(3.0, 8.0, 0.5), 1.0);
    assert!(stamp_coverage(5.0, 8.0, 0.5) < 1.0);
    assert!(stamp_coverage(5.0, 8.0, 0.5) > 0.0);
    assert!(stamp_coverage(7.0, 8.0, 0.5) < stamp_coverage(5.0, 8.0, 1.0));
}

#[test]
fn zero_radius_gives_no_coverage() {
    assert_eq!(stamp_coverage(0.0, 0.0, 1.0), 0.0);
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
