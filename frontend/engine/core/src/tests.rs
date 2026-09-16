//! Core tests.
//! They repeat assertions from the old frontend tests: a difference here meant
//! the TypeScript and Rust versions had drifted apart.

use crate::color::Color;
use crate::document::Document;
use crate::geometry::Size;
use crate::geometry::{Point, Rect};
use crate::tile::{
    TileMap, apply_tiles, snapshot_tiles, tile_col, tile_grid, tile_key, tile_rect, tile_row,
    tiles_in_rect, tiles_in_segment,
};

const SIZE: Size = Size::new(512.0, 512.0);

fn size(width: f64, height: f64) -> Size {
    Size::new(width, height)
}

#[test]
fn grid_rounds_up() {
    let grid = tile_grid(Size::new(1920.0, 1080.0), 256);

    assert_eq!((grid.cols, grid.rows), (8, 5));
}

#[test]
fn document_smaller_than_a_tile_gives_one_cell() {
    let grid = tile_grid(size(100.0, 100.0), 256);

    assert_eq!((grid.cols, grid.rows), (1, 1));
}

#[test]
fn key_converts_back_to_column_and_row() {
    let cols = 8;
    let key = tile_key(3, 2, cols);

    assert_eq!(key, 19);
    assert_eq!(tile_col(key, cols), 3);
    assert_eq!(tile_row(key, cols), 2);
}

#[test]
fn tile_rect_is_in_document_coordinates() {
    assert_eq!(tile_rect(19, 8, 256), Rect::new(768.0, 512.0, 256.0, 256.0));
}

#[test]
fn one_pixel_inside_a_tile_gives_one_tile() {
    assert_eq!(
        tiles_in_rect(Rect::new(10.0, 10.0, 1.0, 1.0), SIZE, 256),
        vec![0]
    );
}

#[test]
fn rect_on_a_tile_seam_gives_four_tiles() {
    assert_eq!(
        tiles_in_rect(Rect::new(255.0, 255.0, 2.0, 2.0), SIZE, 256),
        vec![0, 1, 2, 3]
    );
}

#[test]
fn rect_over_the_whole_document_gives_one_key_per_tile() {
    assert_eq!(
        tiles_in_rect(Rect::new(0.0, 0.0, 512.0, 512.0), SIZE, 256),
        vec![0, 1, 2, 3]
    );
}

#[test]
fn rect_exactly_on_a_tile_border_does_not_touch_its_neighbours() {
    assert_eq!(
        tiles_in_rect(Rect::new(0.0, 0.0, 256.0, 256.0), SIZE, 256),
        vec![0]
    );
    assert_eq!(
        tiles_in_rect(Rect::new(256.0, 0.0, 256.0, 256.0), SIZE, 256),
        vec![1]
    );
    assert_eq!(
        tiles_in_rect(Rect::new(256.0, 256.0, 256.0, 256.0), SIZE, 256),
        vec![3]
    );
}

#[test]
fn rect_beyond_the_document_is_clipped() {
    assert_eq!(
        tiles_in_rect(Rect::new(-50.0, -50.0, 100.0, 100.0), SIZE, 256),
        vec![0]
    );
}

#[test]
fn rect_fully_outside_the_document_gives_no_tiles() {
    assert!(tiles_in_rect(Rect::new(-100.0, -100.0, 10.0, 10.0), SIZE, 256).is_empty());
}

#[test]
fn segment_on_a_seam_touches_both_tiles_with_its_radius() {
    assert_eq!(
        tiles_in_segment(
            Point::new(250.0, 10.0),
            Point::new(260.0, 10.0),
            4.0,
            SIZE,
            256
        ),
        vec![0, 1]
    );
}

#[test]
fn segment_inside_a_tile_touches_one_tile() {
    assert_eq!(
        tiles_in_segment(
            Point::new(10.0, 10.0),
            Point::new(20.0, 10.0),
            1.0,
            SIZE,
            256
        ),
        vec![0]
    );
}

#[test]
fn new_tile_takes_its_coordinates_from_the_key() {
    let mut map = TileMap::new(2);
    let tile = map.ensure(tile_key(1, 0, 2));

    assert_eq!(tile.col, 1);
    assert_eq!(tile.row, 0);
    assert_eq!(tile.version, 0);
    assert_eq!(tile.pixels.len(), 256 * 256 * 4);
}

#[test]
fn asking_twice_for_a_tile_gives_the_same_one() {
    let mut map = TileMap::new(2);
    let key = 0;

    assert!(std::ptr::eq(map.ensure(key), map.ensure(key)));
    assert_eq!(map.len(), 1);
}

#[test]
fn snapshot_and_restore_return_tile_pixels() {
    let mut map = TileMap::new(2);
    map.ensure(0).pixels[3] = 200;

    let snapshot = snapshot_tiles(&map, &[0]);

    map.ensure(0).pixels[3] = 0;
    apply_tiles(&mut map, &[0], &snapshot);

    assert_eq!(map.get(0).unwrap().pixels[3], 200);
    assert_eq!(map.get(0).unwrap().version, 1);
}

#[test]
fn restore_without_pixels_removes_the_tile() {
    let mut map = TileMap::new(2);

    map.ensure(0);
    apply_tiles(&mut map, &[0], &[]);

    assert_eq!(map.len(), 0);
}

#[test]
fn snapshot_skips_missing_tiles() {
    let map = TileMap::new(2);

    assert!(snapshot_tiles(&map, &[0, 1]).is_empty());
}

#[test]
fn restore_recomputes_emptiness() {
    let mut map = TileMap::new(2);
    map.ensure(0).pixels[3] = 255;

    let snapshot = snapshot_tiles(&map, &[0]);
    let tile = map.get_mut(0).unwrap();

    tile.pixels[3] = 0;
    tile.refresh_empty();

    assert!(map.get(0).unwrap().empty);

    apply_tiles(&mut map, &[0], &snapshot);

    assert!(!map.get(0).unwrap().empty);
}

#[test]
fn hex_is_parsed_in_all_accepted_forms() {
    assert_eq!(Color::from_hex("#ff0000"), Some(Color::new(255, 0, 0)));
    assert_eq!(Color::from_hex("#f00"), Some(Color::new(255, 0, 0)));
    assert_eq!(Color::from_hex(" ff0000 "), Some(Color::new(255, 0, 0)));
    assert_eq!(Color::from_hex("000000"), Some(Color::BLACK));
    assert_eq!(Color::from_hex("#12345"), None);
    assert_eq!(Color::from_hex("#gggggg"), None);
    assert_eq!(Color::from_hex(""), None);
}

#[test]
fn hex_is_printed_in_upper_case() {
    assert_eq!(Color::new(255, 0, 16).to_hex(), "#FF0010");
}

#[test]
fn packed_color_round_trips() {
    let color = Color::new(1, 2, 3);

    assert_eq!(Color::from_u32(color.to_u32()), color);
}

#[test]
fn document_starts_with_one_active_layer() {
    let document = Document::new(SIZE);

    assert_eq!(document.layers().len(), 1);
    assert_eq!(document.active_layer_id(), 1);
    assert_eq!(document.active_layer().unwrap().name, "Слой 1");
    assert_eq!((document.grid().cols, document.grid().rows), (2, 2));
    assert_eq!(document.size(), SIZE);
}

#[test]
fn layers_are_added_and_found_by_id() {
    let mut document = Document::new(SIZE);
    let id = document.add_layer("Layer 2");

    assert_eq!(id, 2);
    assert!(document.layer(2).is_some());
    assert!(document.layer(99).is_none());
}

#[test]
fn active_layer_switches_only_to_an_existing_one() {
    let mut document = Document::new(SIZE);
    document.add_layer("Layer 2");

    assert!(document.set_active_layer(2));
    assert_eq!(document.active_layer_id(), 2);
    assert!(!document.set_active_layer(99));
    assert_eq!(document.active_layer_id(), 2);
}

#[test]
fn layer_opacity_changes_only_for_an_existing_layer() {
    let mut document = Document::new(SIZE);

    assert!(document.set_layer_opacity(1, 0.5));
    assert_eq!(document.layer(1).unwrap().opacity, 0.5);
    assert!(!document.set_layer_opacity(99, 0.5));
}

#[test]
fn clearing_a_layer_removes_tiles_and_returns_their_keys() {
    let mut document = Document::new(SIZE);
    let id = document.add_layer("Layer 2");

    document.layer_mut(id).unwrap().tiles.ensure(0);
    document.layer_mut(id).unwrap().tiles.ensure(3);

    assert_eq!(document.clear_layer(id), vec![0, 3]);
    assert_eq!(document.layer(id).unwrap().tiles.len(), 0);
    assert!(document.clear_layer(99).is_empty());
}

#[test]
fn content_ignores_layer_visibility() {
    let mut document = Document::new(SIZE);

    assert!(!document.has_content());

    let tile = document.active_layer_mut().unwrap().tiles.ensure(0);
    tile.pixels[3] = 255;
    tile.refresh_empty();
    document.set_layer_visible(1, false);

    assert!(document.has_content());
}
