//! Editor tests: commands, one history step per gesture, tile index and colour
//! sampling. The document and layer bounds are also covered here as a single
//! place, which the TypeScript core did not have.

use drawing_brush::{BrushSettings, StrokeSample, Tool};
use drawing_core::color::Color;
use drawing_core::geometry::{Point, Rect, Size};
use drawing_core::tile::{tile_key, tiles_in_rect};

use crate::Editor;

const SIZE: Size = Size::new(512.0, 512.0);

fn brush() -> BrushSettings {
    BrushSettings {
        color: String::from("#ff0000"),
        hardness: 1.0,
        opacity: 1.0,
        size: 8.0,
        spacing: 0.25,
    }
}

fn editor() -> Editor {
    Editor::new(SIZE, brush())
}

fn sample(x: f64, y: f64) -> StrokeSample {
    StrokeSample {
        pressure: 1.0,
        tilt_x: 0.0,
        tilt_y: 0.0,
        time: 0.0,
        x,
        y,
    }
}

fn alpha_sum(editor: &Editor, layer_id: u32) -> u64 {
    editor
        .layer_tile_index(layer_id)
        .into_iter()
        .filter_map(|(key, _)| editor.tile(layer_id, key))
        .map(|tile| {
            tile.pixels
                .as_chunks::<4>()
                .0
                .iter()
                .map(|pixel| u64::from(pixel[3]))
                .sum::<u64>()
        })
        .sum()
}

fn stroke(editor: &mut Editor, from: (f64, f64), to: (f64, f64)) {
    editor.begin_stroke(sample(from.0, from.1));
    editor.push_samples(&[sample(to.0, to.1)]);
    editor.end_stroke();
}

#[test]
fn editor_starts_with_one_layer_and_default_brush() {
    let editor = editor();

    assert_eq!(editor.layers().len(), 1);
    assert_eq!(editor.active_layer_id(), 1);
    assert_eq!(editor.brush().color, "#ff0000");
    assert!(!editor.has_content());
}

#[test]
fn one_gesture_gives_one_history_step() {
    let mut editor = editor();

    stroke(&mut editor, (10.0, 10.0), (100.0, 10.0));
    stroke(&mut editor, (10.0, 40.0), (100.0, 40.0));

    assert!(editor.can_undo());
    assert!(editor.has_content());

    assert!(editor.undo());
    assert!(editor.has_content());
    assert!(editor.undo());
    assert!(!editor.has_content());
    assert!(!editor.undo());
}

#[test]
fn undo_then_redo_returns_the_drawing() {
    let mut editor = editor();

    stroke(&mut editor, (10.0, 10.0), (100.0, 10.0));

    assert!(editor.undo());
    assert!(!editor.has_content());
    assert!(editor.can_redo());

    assert!(editor.redo());
    assert!(editor.has_content());
    assert!(!editor.can_redo());
}

#[test]
fn a_stroke_that_leaves_the_document_stays_one_step() {
    let mut editor = editor();

    // The gesture starts on the sheet, goes far outside and comes back.
    editor.begin_stroke(sample(10.0, 10.0));
    editor.push_samples(&[
        sample(100.0, 10.0),
        sample(-500.0, -500.0),
        sample(200.0, 200.0),
    ]);
    assert!(editor.end_stroke());

    assert!(editor.undo());
    assert!(!editor.has_content());
    assert!(!editor.can_undo());
}

#[test]
fn a_stroke_without_pixels_does_not_touch_the_history() {
    let mut editor = editor();

    editor.begin_stroke(sample(-500.0, -500.0));
    editor.push_samples(&[sample(-400.0, -500.0)]);

    assert!(!editor.end_stroke());
    assert!(!editor.can_undo());
}

#[test]
fn clearing_a_layer_can_be_undone() {
    let mut editor = editor();

    stroke(&mut editor, (10.0, 10.0), (100.0, 10.0));
    assert!(editor.clear_layer());
    assert!(!editor.has_content());
    assert!(!editor.clear_layer());

    assert!(editor.undo());
    assert!(editor.has_content());
}

#[test]
fn brush_and_tool_do_not_change_during_a_stroke() {
    let mut editor = editor();

    editor.begin_stroke(sample(10.0, 10.0));

    assert!(!editor.set_brush(BrushSettings {
        color: String::from("#00ff00"),
        ..brush()
    }));
    assert!(!editor.set_tool(Tool::Eraser));
    assert_eq!(editor.brush().color, "#ff0000");
    assert_ne!(editor.tool(), Tool::Eraser);
}

#[test]
fn eraser_subtracts_alpha_from_the_layer() {
    let mut editor = editor();

    stroke(&mut editor, (10.0, 10.0), (100.0, 10.0));

    let painted = editor.sample(Point::new(50.0, 10.0)).unwrap();
    assert_eq!(painted, Color::new(255, 0, 0));

    let before = alpha_sum(&editor, 1);

    editor.set_tool(Tool::Eraser);
    stroke(&mut editor, (10.0, 10.0), (100.0, 10.0));

    assert_eq!(editor.sample(Point::new(50.0, 10.0)), Some(Color::WHITE));
    // The eraser with the same path removes the core fully, while the falloff
    // edge keeps a sliver of alpha: coverage there is below one. Same as the
    // TypeScript version, so it is checked by a fraction, not by zero.
    assert!((alpha_sum(&editor, 1) as f64) < (before as f64) * 0.1);
}

#[test]
fn erasing_an_empty_area_creates_nothing() {
    let mut editor = editor();

    editor.set_tool(Tool::Eraser);
    stroke(&mut editor, (10.0, 10.0), (100.0, 10.0));

    assert!(!editor.has_content());
    assert!(editor.layer_tile_index(1).is_empty());
}

#[test]
fn overlay_appears_only_during_a_stroke() {
    let mut editor = editor();

    assert!(editor.overlay().is_none());

    editor.begin_stroke(sample(10.0, 10.0));

    let overlay = editor.overlay().unwrap();

    assert_eq!(overlay.layer_id, 1);
    assert_eq!(overlay.opacity, 1.0);
    assert!(
        !editor
            .overlay_index(Rect::new(0.0, 0.0, 512.0, 512.0))
            .is_empty()
    );

    editor.end_stroke();

    assert!(editor.overlay().is_none());
    assert!(
        editor
            .overlay_index(Rect::new(0.0, 0.0, 512.0, 512.0))
            .is_empty()
    );
}

#[test]
fn tile_index_reports_only_existing_tiles_in_the_rect() {
    let mut editor = editor();

    stroke(&mut editor, (10.0, 10.0), (100.0, 10.0));

    let whole = editor.tile_index(1, Rect::new(0.0, 0.0, 512.0, 512.0));

    assert_eq!(whole.len(), 1);
    assert_eq!(whole[0].0, tile_key(0, 0, 2));

    // A rectangle in the other corner of the document must not see this tile.
    assert!(
        editor
            .tile_index(1, Rect::new(300.0, 300.0, 100.0, 100.0))
            .is_empty()
    );

    stroke(&mut editor, (300.0, 300.0), (400.0, 400.0));

    let both = editor.tile_index(1, Rect::new(0.0, 0.0, 512.0, 512.0));

    assert_eq!(
        both.iter().map(|item| item.0).collect::<Vec<_>>(),
        vec![tile_key(0, 0, 2), tile_key(1, 1, 2)]
    );
}

#[test]
fn tile_grid_covers_the_whole_document_without_duplicates() {
    let keys = tiles_in_rect(Rect::new(0.0, 0.0, 512.0, 512.0), SIZE, 256);
    let mut unique = keys.clone();

    unique.sort_unstable();
    unique.dedup();

    assert_eq!(keys.len(), 4);
    assert_eq!(unique, keys);
}

#[test]
fn tile_index_carries_versions_for_the_output_cache() {
    let mut editor = editor();

    stroke(&mut editor, (10.0, 10.0), (100.0, 10.0));

    let first = editor.tile_index(1, Rect::new(0.0, 0.0, 512.0, 512.0))[0].1;

    stroke(&mut editor, (10.0, 40.0), (100.0, 40.0));

    let second = editor.tile_index(1, Rect::new(0.0, 0.0, 512.0, 512.0))[0].1;

    assert!(second > first);
}

#[test]
fn full_layer_index_lists_tiles_without_a_rect() {
    let mut editor = editor();

    stroke(&mut editor, (10.0, 10.0), (400.0, 400.0));

    let full = editor.layer_tile_index(1);

    assert_eq!(full.len(), 4);
    assert!(editor.layer_tile_index(99).is_empty());
}

#[test]
fn sampling_outside_the_document_gives_nothing() {
    let editor = editor();

    assert!(editor.sample(Point::new(-1.0, 10.0)).is_none());
    assert!(editor.sample(Point::new(10.0, 512.0)).is_none());
    assert_eq!(editor.sample(Point::new(10.0, 10.0)), Some(Color::WHITE));
}

#[test]
fn sampling_reads_the_visible_layers_bottom_up() {
    let mut editor = editor();

    editor.add_layer("Layer 2");
    editor.set_active_layer(1);
    editor.set_brush(BrushSettings {
        color: String::from("#0000ff"),
        ..brush()
    });
    stroke(&mut editor, (10.0, 10.0), (100.0, 10.0));

    editor.set_active_layer(2);
    editor.set_brush(BrushSettings {
        color: String::from("#ff0000"),
        ..brush()
    });
    stroke(&mut editor, (10.0, 10.0), (100.0, 10.0));

    assert_eq!(
        editor.sample(Point::new(50.0, 10.0)),
        Some(Color::new(255, 0, 0))
    );

    editor.set_layer_visible(2, false);

    assert_eq!(
        editor.sample(Point::new(50.0, 10.0)),
        Some(Color::new(0, 0, 255))
    );
}

#[test]
fn layer_infos_describe_the_tree_for_the_interface() {
    let mut editor = editor();

    editor.add_layer("Layer 2");
    editor.set_layer_opacity(2, 0.25);

    let infos = editor.layer_infos();

    assert_eq!(infos.len(), 2);
    assert_eq!(infos[1].name, "Layer 2");
    assert_eq!(infos[1].opacity, 0.25);
    assert!(infos[1].visible);
}

#[test]
fn setting_the_same_brush_reports_no_change() {
    let mut editor = editor();

    assert!(!editor.set_brush(brush()));
    assert!(editor.set_brush(BrushSettings {
        size: 20.0,
        ..brush()
    }));
}

#[test]
fn project_round_trip_restores_the_drawing() {
    let mut editor = editor();

    stroke(&mut editor, (10.0, 10.0), (200.0, 120.0));

    let loaded = Editor::from_project(&editor.save_project()).expect("project opens");

    assert_eq!(loaded.size(), editor.size());
    assert_eq!(loaded.active_layer_id(), editor.active_layer_id());
    assert_eq!(alpha_sum(&loaded, 1), alpha_sum(&editor, 1));
    assert!(loaded.has_content());
    // There are no past session steps to undo: history is not saved.
    assert!(!loaded.can_undo());
    assert!(!loaded.can_redo());
}

#[test]
fn strokes_survive_the_eraser_in_between() {
    let mut editor = editor();

    stroke(&mut editor, (10.0, 10.0), (200.0, 10.0));
    editor.set_tool(Tool::Eraser);
    stroke(&mut editor, (100.0, 0.0), (100.0, 20.0));

    let loaded = Editor::from_project(&editor.save_project()).expect("project opens");

    assert_eq!(alpha_sum(&loaded, 1), alpha_sum(&editor, 1));
    assert_eq!(loaded.tool(), Tool::Draw);
}

#[test]
fn loaded_project_can_be_drawn_on() {
    let mut editor = editor();

    stroke(&mut editor, (10.0, 10.0), (200.0, 120.0));

    let mut loaded = Editor::from_project(&editor.save_project()).expect("project opens");
    let before = alpha_sum(&loaded, 1);

    // A stroke after opening goes into the same document: tile grid, size and
    // stroke buffer must be built from the file, not from defaults.
    stroke(&mut loaded, (300.0, 300.0), (360.0, 340.0));

    assert!(alpha_sum(&loaded, 1) > before);
    assert!(loaded.can_undo());
}

#[test]
fn layers_survive_the_round_trip() {
    let mut editor = editor();

    editor.add_layer("Layer 2");
    editor.set_layer_opacity(2, 0.4);
    editor.set_layer_visible(2, false);
    editor.set_active_layer(2);
    stroke(&mut editor, (20.0, 20.0), (120.0, 20.0));

    let loaded = Editor::from_project(&editor.save_project()).expect("project opens");
    let infos = loaded.layer_infos();

    assert_eq!(infos.len(), 2);
    assert_eq!(infos[1].name, "Layer 2");
    assert_eq!(infos[1].opacity, 0.4);
    assert!(!infos[1].visible);
    assert_eq!(loaded.active_layer_id(), 2);
    assert_eq!(alpha_sum(&loaded, 1), 0);
    assert_eq!(alpha_sum(&loaded, 2), alpha_sum(&editor, 2));
}

#[test]
fn project_of_an_empty_document_is_an_empty_document() {
    let loaded = Editor::from_project(&editor().save_project()).expect("project opens");

    assert!(!loaded.has_content());
    assert_eq!(loaded.layer_infos().len(), 1);
}

#[test]
fn foreign_bytes_are_not_a_project() {
    assert!(Editor::from_project(b"not a project").is_err());
    assert!(Editor::from_project(&[]).is_err());
}

#[test]
fn fill_pours_the_region_and_stops_at_the_stroke() {
    let mut editor = editor();

    stroke(&mut editor, (10.0, 10.0), (100.0, 10.0));
    editor.set_brush(BrushSettings {
        color: String::from("#0000ff"),
        ..brush()
    });

    assert!(editor.fill(Point::new(5.0, 30.0)));

    // The sheet around the stroke is blue now, the stroke itself stays red.
    assert_eq!(
        editor.sample(Point::new(5.0, 30.0)),
        Some(Color::new(0, 0, 255))
    );
    assert_eq!(
        editor.sample(Point::new(50.0, 10.0)),
        Some(Color::new(255, 0, 0))
    );
    assert_eq!(
        editor.sample(Point::new(300.0, 300.0)),
        Some(Color::new(0, 0, 255))
    );
}

#[test]
fn fill_over_the_same_colour_is_not_a_change() {
    let mut editor = editor();

    assert!(editor.fill(Point::new(10.0, 10.0)));
    assert!(editor.can_undo());

    assert!(!editor.fill(Point::new(400.0, 400.0)));

    // The undo returns an empty sheet: tiles the fill created are removed,
    // not left transparent in the map.
    assert!(editor.undo());
    assert!(!editor.has_content());
    assert_eq!(editor.sample(Point::new(10.0, 10.0)), Some(Color::WHITE));
}

#[test]
fn fill_outside_the_document_does_nothing() {
    let mut editor = editor();

    assert!(!editor.fill(Point::new(-5.0, 10.0)));
    assert!(!editor.fill(Point::new(10.0, 600.0)));
    assert!(!editor.can_undo());
    assert!(!editor.has_content());
}

#[test]
fn fill_applies_the_brush_opacity() {
    let mut editor = editor();

    editor.set_brush(BrushSettings {
        opacity: 0.5,
        ..brush()
    });

    assert!(editor.fill(Point::new(10.0, 10.0)));

    // Half red over the white background of the sampler. The alpha byte is
    // 128, not 127.5, so the composite sits at 255 * 127 / 255.
    assert_eq!(
        editor.sample(Point::new(250.0, 250.0)),
        Some(Color::new(255, 127, 127))
    );
}
