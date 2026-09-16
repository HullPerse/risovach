//! Edge with JavaScript tests.
//!
//! What leaves here is not pixels but their address in module memory: the
//! caller makes the copy. The contract behind that copy is checked: an existing
//! tile has an address, a missing one gives zero, and the address really points
//! into core tile memory rather than into a copy.

use drawing_core::TILE_BYTES;

use crate::{DrawingEngine, tile_bytes, tile_size};

fn engine() -> DrawingEngine {
    DrawingEngine::new(512.0, 512.0)
}

fn stroke(engine: &mut DrawingEngine) {
    engine.begin_stroke(40.0, 40.0, 1.0, 0.0, 0.0, 0.0);
    engine.push_samples(&[80.0, 80.0, 1.0, 0.0, 0.0, 1.0]);
    engine.end_stroke();
}

#[test]
fn tile_pointer_points_at_the_pixels_of_the_core() {
    let mut engine = engine();
    stroke(&mut engine);

    let expected = engine
        .editor
        .tile(1, 0)
        .expect("a stroke at the document origin creates a tile")
        .pixels
        .as_ptr() as usize;

    assert_ne!(expected, 0);
    assert_eq!(engine.tile_pointer(1, 0), expected);
}

#[test]
fn overlay_tile_pointer_points_at_the_stroke_buffer() {
    let mut engine = engine();

    engine.begin_stroke(40.0, 40.0, 1.0, 0.0, 0.0, 0.0);

    let expected = engine
        .editor
        .overlay_tile(0)
        .expect("a started stroke holds a buffer tile")
        .pixels
        .as_ptr() as usize;

    assert_eq!(engine.overlay_tile_pointer(0), expected);
}

#[test]
fn a_tile_that_does_not_exist_gives_zero() {
    let engine = engine();

    assert_eq!(engine.tile_pointer(1, 999), 0);
    assert_eq!(engine.overlay_tile_pointer(0), 0);
}

#[test]
fn tile_bytes_matches_the_tile_side() {
    let side = tile_size() as usize;

    assert_eq!(tile_bytes(), side * side * 4);
    assert_eq!(tile_bytes(), TILE_BYTES);
}
