//! History tests. They repeat assertions from `history.test.ts`.

use drawing_core::document::Document;
use drawing_core::geometry::Size;
use drawing_core::tile::{snapshot_tiles, tile_key};

use crate::{History, HistoryPatch};

const SIZE: Size = Size::new(512.0, 512.0);

fn setup() -> (Document, u32, u32) {
    let mut document = Document::new(SIZE);
    let layer_id = document.add_layer("Layer 2");
    let key = tile_key(0, 0, document.grid().cols);

    document.layer_mut(layer_id).unwrap().tiles.ensure(key);

    (document, layer_id, key)
}

fn alpha_at(document: &Document, layer_id: u32, key: u32) -> u8 {
    document
        .layer(layer_id)
        .and_then(|layer| layer.tiles.get(key))
        .map_or(0, |tile| tile.pixels[3])
}

fn patch(layer_id: u32, key: u32) -> HistoryPatch {
    HistoryPatch {
        after: Vec::new(),
        before: Vec::new(),
        keys: vec![key],
        layer_id,
    }
}

#[test]
fn undo_returns_tiles_to_the_state_before_the_command() {
    let (mut document, layer_id, key) = setup();
    let mut history = History::with_default_limit();

    let before = {
        let layer = document.layer(layer_id).unwrap();
        snapshot_tiles(&layer.tiles, &[key])
    };

    document
        .layer_mut(layer_id)
        .unwrap()
        .tiles
        .ensure(key)
        .pixels[3] = 255;

    let after = {
        let layer = document.layer(layer_id).unwrap();
        snapshot_tiles(&layer.tiles, &[key])
    };

    history.record(HistoryPatch {
        after,
        before,
        keys: vec![key],
        layer_id,
    });

    assert!(history.can_undo());
    assert!(!history.can_redo());
    assert_eq!(history.undo(&mut document), Some(layer_id));
    assert_eq!(alpha_at(&document, layer_id, key), 0);
    assert!(history.can_redo());
}

#[test]
fn redo_returns_the_state_after_the_command() {
    let (mut document, layer_id, key) = setup();
    let mut history = History::with_default_limit();

    let before = {
        let layer = document.layer(layer_id).unwrap();
        snapshot_tiles(&layer.tiles, &[key])
    };

    document
        .layer_mut(layer_id)
        .unwrap()
        .tiles
        .ensure(key)
        .pixels[3] = 255;

    let after = {
        let layer = document.layer(layer_id).unwrap();
        snapshot_tiles(&layer.tiles, &[key])
    };

    history.record(HistoryPatch {
        after,
        before,
        keys: vec![key],
        layer_id,
    });

    history.undo(&mut document);

    assert_eq!(history.redo(&mut document), Some(layer_id));
    assert_eq!(alpha_at(&document, layer_id, key), 255);
    assert!(!history.can_redo());
}

#[test]
fn undo_of_a_layer_clear_returns_the_removed_tiles() {
    let (mut document, layer_id, key) = setup();
    let mut history = History::with_default_limit();

    document
        .layer_mut(layer_id)
        .unwrap()
        .tiles
        .ensure(key)
        .pixels[3] = 255;

    let before = {
        let layer = document.layer(layer_id).unwrap();
        snapshot_tiles(&layer.tiles, &[key])
    };

    document.clear_layer(layer_id);
    history.record(HistoryPatch {
        after: Vec::new(),
        before,
        keys: vec![key],
        layer_id,
    });

    assert_eq!(document.layer(layer_id).unwrap().tiles.len(), 0);

    history.undo(&mut document);
    assert_eq!(document.layer(layer_id).unwrap().tiles.len(), 1);

    history.redo(&mut document);
    assert_eq!(document.layer(layer_id).unwrap().tiles.len(), 0);
}

#[test]
fn history_depth_is_limited() {
    let (mut document, layer_id, key) = setup();
    let mut history = History::new(2);

    history.record(patch(layer_id, key));
    history.record(patch(layer_id, key));
    history.record(patch(layer_id, key));

    assert_eq!(history.undo(&mut document), Some(layer_id));
    assert_eq!(history.undo(&mut document), Some(layer_id));
    assert_eq!(history.undo(&mut document), None);
}

#[test]
fn a_new_command_resets_redo() {
    let (mut document, layer_id, key) = setup();
    let mut history = History::with_default_limit();

    history.record(patch(layer_id, key));
    history.undo(&mut document);
    assert!(history.can_redo());

    history.record(patch(layer_id, key));
    assert!(!history.can_redo());
}

#[test]
fn undo_without_commands_does_nothing() {
    let (mut document, _, _) = setup();
    let mut history = History::with_default_limit();

    assert_eq!(history.undo(&mut document), None);
    assert_eq!(history.redo(&mut document), None);
}

#[test]
fn clearing_the_history_empties_both_sides() {
    let (mut document, layer_id, key) = setup();
    let mut history = History::with_default_limit();

    history.record(patch(layer_id, key));
    history.undo(&mut document);
    history.clear();

    assert!(!history.can_undo());
    assert!(!history.can_redo());
}
