//! Brush and sample tests. They repeat assertions from `brush.test.ts`.

use crate::{
    BrushSettings, MIN_STAMP_DISTANCE, StrokeSample, Tool, stamp_distances, stroke::StrokeEngine,
};
use drawing_core::TILE_SIZE;
use drawing_core::geometry::Size;
use drawing_core::tile::TileMap;

const SIZE: Size = Size::new(512.0, 512.0);
const COLS: u32 = 2;

fn brush() -> BrushSettings {
    BrushSettings {
        color: String::from("#000000"),
        hardness: 1.0,
        opacity: 1.0,
        size: 8.0,
        spacing: 0.25,
    }
}

fn red_brush() -> BrushSettings {
    BrushSettings {
        color: String::from("#ff0000"),
        ..brush()
    }
}

fn sample(x: f64, y: f64, pressure: f64) -> StrokeSample {
    StrokeSample {
        pressure,
        tilt_x: 0.0,
        tilt_y: 0.0,
        time: 0.0,
        x,
        y,
    }
}

fn alpha_sum(tiles: &TileMap) -> u64 {
    tiles
        .keys()
        .into_iter()
        .map(|key| {
            tiles
                .get(key)
                .unwrap()
                .pixels
                .as_chunks::<4>()
                .0
                .iter()
                .map(|pixel| u64::from(pixel[3]))
                .sum::<u64>()
        })
        .sum()
}

fn alpha_at(tiles: &TileMap, key: u32, x: usize, y: usize) -> u8 {
    tiles
        .get(key)
        .map_or(0, |tile| tile.pixels[(y * TILE_SIZE + x) * 4 + 3])
}

#[test]
fn stamp_step_comes_from_the_brush_size() {
    assert_eq!(brush().style().stamp_distance(), 2.0);
}

#[test]
fn brush_comparison_sees_a_difference_in_any_field() {
    assert!(brush().same_as(&brush()));
    assert!(!brush().same_as(&BrushSettings {
        size: 9.0,
        ..brush()
    }));
    assert!(!brush().same_as(&BrushSettings {
        color: String::from("#ffffff"),
        ..brush()
    }));
    assert!(!brush().same_as(&BrushSettings {
        opacity: 0.5,
        ..brush()
    }));
    assert!(!brush().same_as(&BrushSettings {
        hardness: 0.5,
        ..brush()
    }));
    assert!(!brush().same_as(&BrushSettings {
        spacing: 0.5,
        ..brush()
    }));
}

#[test]
fn stamp_step_is_never_below_the_minimum() {
    let style = BrushSettings {
        size: 1.0,
        ..brush()
    }
    .style();

    assert_eq!(style.stamp_distance(), MIN_STAMP_DISTANCE);
}

#[test]
fn distances_go_with_an_even_step_to_the_end_of_the_segment() {
    let (carry, distances) = stamp_distances(10.0, 2.0, 0.0);

    assert_eq!(carry, 0.0);
    assert_eq!(distances, vec![2.0, 4.0, 6.0, 8.0, 10.0]);
}

#[test]
fn the_remainder_carries_into_the_next_segment() {
    let (carry, distances) = stamp_distances(10.0, 3.0, 0.0);

    assert_eq!(carry, 1.0);
    assert_eq!(distances, vec![3.0, 6.0, 9.0]);

    let (carry, distances) = stamp_distances(5.0, 3.0, 1.0);

    assert_eq!(carry, 0.0);
    assert_eq!(distances, vec![2.0, 5.0]);
}

#[test]
fn zero_step_does_not_loop() {
    let (carry, distances) = stamp_distances(10.0, 0.0, 0.0);

    assert_eq!(carry, 10.0);
    assert!(distances.is_empty());
}

#[test]
fn a_short_segment_only_accumulates_carry() {
    let (carry, distances) = stamp_distances(1.0, 3.0, 0.0);

    assert_eq!(carry, 1.0);
    assert!(distances.is_empty());
}

#[test]
fn stamp_size_depends_on_pressure() {
    let style = brush().style();

    assert_eq!(style.stamp_size(1.0), 8.0);
    assert!((style.stamp_size(0.0) - 0.8).abs() < 1e-9);
    assert!((style.stamp_size(0.5) - 4.4).abs() < 1e-9);
}

#[test]
fn pressure_outside_the_range_is_clipped() {
    let style = brush().style();

    assert_eq!(style.stamp_size(5.0), 8.0);
    assert!((style.stamp_size(-3.0) - 0.8).abs() < 1e-9);
}

#[test]
fn sample_interpolation_covers_every_field() {
    let from = StrokeSample {
        pressure: 0.0,
        tilt_x: 0.0,
        tilt_y: 0.0,
        time: 0.0,
        x: 0.0,
        y: 0.0,
    };
    let to = StrokeSample {
        pressure: 1.0,
        tilt_x: 10.0,
        tilt_y: -10.0,
        time: 100.0,
        x: 10.0,
        y: 20.0,
    };

    assert_eq!(
        StrokeSample::lerp(from, to, 0.5),
        StrokeSample {
            pressure: 0.5,
            tilt_x: 5.0,
            tilt_y: -5.0,
            time: 50.0,
            x: 5.0,
            y: 10.0,
        }
    );
}

#[test]
fn a_single_point_gives_a_stamp() {
    let mut engine = StrokeEngine::new(SIZE, COLS);

    engine.begin(sample(20.0, 20.0, 1.0), &red_brush(), Tool::Draw);

    assert_eq!(engine.buffer().len(), 1);
    assert_eq!(alpha_at(engine.buffer(), 0, 20, 20), 255);
}

#[test]
fn stamps_are_spread_over_the_whole_segment() {
    let mut engine = StrokeEngine::new(SIZE, COLS);

    engine.begin(sample(10.0, 10.0, 1.0), &red_brush(), Tool::Draw);
    engine.add(sample(30.0, 10.0, 1.0));

    for x in [10, 15, 20, 25, 30] {
        assert!(alpha_at(engine.buffer(), 0, x, 10) > 0, "no mark at x={x}");
    }
}

#[test]
fn pressure_shrinks_the_stamp_without_removing_it() {
    let mut full = StrokeEngine::new(SIZE, COLS);
    let mut light = StrokeEngine::new(SIZE, COLS);

    full.begin(sample(20.0, 20.0, 1.0), &red_brush(), Tool::Draw);
    light.begin(sample(20.0, 20.0, 0.0), &red_brush(), Tool::Draw);

    assert!(alpha_sum(light.buffer()) < alpha_sum(full.buffer()));
    assert!(alpha_sum(light.buffer()) > 0);
}

#[test]
fn a_stamp_on_the_seam_touches_both_tiles() {
    let mut engine = StrokeEngine::new(SIZE, COLS);

    engine.begin(sample(250.0, 10.0, 1.0), &red_brush(), Tool::Draw);
    engine.add(sample(260.0, 10.0, 1.0));

    assert_eq!(engine.buffer().keys(), vec![0, 1]);
}

#[test]
fn commit_moves_the_stroke_into_the_layer() {
    let mut engine = StrokeEngine::new(SIZE, COLS);
    let mut layer = TileMap::new(COLS);

    engine.begin(sample(10.0, 10.0, 1.0), &red_brush(), Tool::Draw);
    engine.add(sample(30.0, 10.0, 1.0));

    let buffer_sum = alpha_sum(engine.buffer());
    let changed = engine.commit_to(&mut layer);

    assert_eq!(changed, vec![0]);
    assert_eq!(alpha_sum(&layer), buffer_sum);
}

#[test]
fn eraser_commit_subtracts_layer_alpha() {
    let mut drawn = TileMap::new(COLS);
    let mut drawing = StrokeEngine::new(SIZE, COLS);

    drawing.begin(sample(10.0, 10.0, 1.0), &red_brush(), Tool::Draw);
    drawing.add(sample(60.0, 10.0, 1.0));
    drawing.commit_to(&mut drawn);

    let before = alpha_sum(&drawn);
    let mut erasing = StrokeEngine::new(SIZE, COLS);

    erasing.begin(sample(10.0, 10.0, 1.0), &red_brush(), Tool::Eraser);
    erasing.add(sample(60.0, 10.0, 1.0));
    erasing.commit_to(&mut drawn);

    assert_eq!(alpha_at(&drawn, 0, 30, 10), 0);
    assert!((alpha_sum(&drawn) as f64) < (before as f64) * 0.1);
}

#[test]
fn eraser_never_creates_tiles() {
    let mut engine = StrokeEngine::new(SIZE, COLS);
    let mut layer = TileMap::new(COLS);

    engine.begin(sample(20.0, 20.0, 1.0), &red_brush(), Tool::Eraser);
    engine.commit_to(&mut layer);

    assert!(layer.is_empty());
}

#[test]
fn zero_opacity_leaves_the_layer_alone() {
    let mut engine = StrokeEngine::new(SIZE, COLS);
    let mut layer = TileMap::new(COLS);
    let transparent = BrushSettings {
        opacity: 0.0,
        ..red_brush()
    };

    engine.begin(sample(20.0, 20.0, 1.0), &transparent, Tool::Draw);

    assert!(engine.commit_to(&mut layer).is_empty());
    assert!(layer.is_empty());
}

#[test]
fn reset_clears_the_buffer_and_the_state() {
    let mut engine = StrokeEngine::new(SIZE, COLS);

    engine.begin(sample(20.0, 20.0, 1.0), &red_brush(), Tool::Draw);
    engine.reset();

    assert!(!engine.is_active());
    assert_eq!(engine.buffer().len(), 0);
}

#[test]
fn one_gesture_applies_opacity_once() {
    // With a step of a quarter brush size, a buffer without separate opacity
    // would saturate to full opacity by the third stamp already.
    let mut engine = StrokeEngine::new(SIZE, COLS);
    let mut layer = TileMap::new(COLS);
    let half = BrushSettings {
        opacity: 0.5,
        ..red_brush()
    };

    engine.begin(sample(10.0, 10.0, 1.0), &half, Tool::Draw);
    engine.add(sample(80.0, 10.0, 1.0));
    engine.commit_to(&mut layer);

    assert!(alpha_at(&layer, 0, 40, 10) <= 128);
}

#[test]
fn stroke_buffer_keeps_points_off_the_document() {
    let mut engine = StrokeEngine::new(SIZE, COLS);

    engine.begin(sample(-100.0, -100.0, 1.0), &red_brush(), Tool::Draw);

    assert!(engine.buffer().is_empty());
}

#[test]
fn a_stamp_on_the_tile_seam_is_mirror_symmetric() {
    let mut engine = StrokeEngine::new(SIZE, COLS);
    let big = BrushSettings {
        size: 100.0,
        ..red_brush()
    };

    engine.begin(sample(256.0, 100.0, 1.0), &big, Tool::Draw);

    for y in 40..160usize {
        let left = alpha_at(engine.buffer(), 0, 255, y);
        let right = alpha_at(engine.buffer(), 1, 0, y);

        assert_eq!(left, right, "seam mismatch at row {y}");
    }
}

#[test]
fn a_stamp_hanging_over_the_document_edge_stays_inside() {
    let size = Size::new(420.0, 420.0);
    let mut engine = StrokeEngine::new(size, 2);
    let big = BrushSettings {
        size: 100.0,
        ..red_brush()
    };

    engine.begin(sample(410.0, 210.0, 1.0), &big, Tool::Draw);

    for y in 0..256usize {
        for x in 164..256usize {
            assert_eq!(
                alpha_at(engine.buffer(), 1, x, y),
                0,
                "overhang paint at tile 1 ({x}, {y})"
            );
            assert_eq!(
                alpha_at(engine.buffer(), 3, x, y),
                0,
                "overhang paint at tile 3 ({x}, {y})"
            );
        }
    }
}
