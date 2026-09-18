//! Edge with JavaScript.
//!
//! The only crate that knows about WebAssembly and JS. Commands and output
//! data stick out, never the whole document state: passing a document object
//! across on every pointer move is out of the question.
//!
//! Transfer format: numbers, ids and indices are numbers, tile lists are typed
//! arrays, and layer descriptions are plain objects.
//!
//! Tile pixels leave as an address in module memory, not as a copy through a
//! caller buffer. A buffer cost two copies per tile: one travelling in, though
//! the core writes over it, and one back. The address removes the first, so
//! exactly one copy to the caller remains.
//!
//! Address contract: valid until the next core call. Any allocation can move
//! module memory, and a freed tile can hand its memory to another tile. So the
//! caller must view that memory and copy the pixels at once, with no core call
//! in between.

use drawing_brush::{BrushSettings, StrokeSample, Tool};
use drawing_core::color::Color;
use drawing_core::geometry::{Point, Rect, Size};
use drawing_core::{TILE_BYTES, TILE_SIZE};
use drawing_editor::Editor;
use drawing_editor::fill::{FillOutcome, FillSettings};
use drawing_format::LoadError;
use drawing_raster::BlendMode;
use wasm_bindgen::prelude::*;

/// Blend mode of the stroke buffer.
const MODE_SOURCE_OVER: u32 = 0;
const MODE_DESTINATION_OUT: u32 = 1;

/// Tool ids. They must match `CORE_TOOL` in `src/config/drawing.config.ts`:
/// a mismatch silently picks another brush instead of failing loudly.
const TOOL_DRAW: u32 = 0;
const TOOL_ERASER: u32 = 1;
const TOOL_PENCIL: u32 = 2;

/// What a fill did. They must match `FILL_STATUS` in the same config file.
const FILL_NOTHING: u32 = 0;
const FILL_DONE: u32 = 1;
const FILL_LAYER_HIDDEN: u32 = 2;

/// Colour sample value outside the document.
const NO_COLOR: u32 = u32::MAX;

const SAMPLE_STRIDE: usize = 6;

#[wasm_bindgen]
pub struct DrawingEngine {
    editor: Editor,
}

#[wasm_bindgen]
impl DrawingEngine {
    #[wasm_bindgen(constructor)]
    pub fn new(width: f64, height: f64) -> Self {
        Self {
            editor: Editor::new(
                Size::new(width, height),
                BrushSettings {
                    color: String::from("#000000"),
                    hardness: 1.0,
                    opacity: 1.0,
                    size: 8.0,
                    spacing: 0.25,
                },
            ),
        }
    }
    /// Opens a project file. Canvas size comes from the file, so no core of
    /// the expected size has to be created up front.
    pub fn load(bytes: &[u8]) -> Result<DrawingEngine, JsValue> {
        let editor = Editor::from_project(bytes).map_err(to_js_error)?;

        Ok(Self { editor })
    }

    /// Builds the project file for download.
    pub fn save_project(&self) -> Vec<u8> {
        self.editor.save_project()
    }

    pub fn width(&self) -> f64 {
        self.editor.size().width
    }

    pub fn height(&self) -> f64 {
        self.editor.size().height
    }

    /// Layers for the UI: id, name, opacity, visibility.
    pub fn layers(&self) -> Result<JsValue, JsValue> {
        serde_wasm_bindgen::to_value(&self.editor.layer_infos()).map_err(Into::into)
    }

    /// Active layer id. Zero is reserved for "no layer".
    pub fn active_layer_id(&self) -> u32 {
        self.editor.active_layer_id()
    }

    pub fn add_layer(&mut self, name: &str) -> u32 {
        self.editor.add_layer(name)
    }

    pub fn set_active_layer(&mut self, id: u32) -> bool {
        self.editor.set_active_layer(id)
    }

    pub fn set_layer_opacity(&mut self, id: u32, opacity: f64) -> bool {
        self.editor.set_layer_opacity(id, opacity)
    }

    pub fn set_layer_visible(&mut self, id: u32, visible: bool) -> bool {
        self.editor.set_layer_visible(id, visible)
    }

    pub fn set_brush(
        &mut self,
        color: &str,
        size: f64,
        opacity: f64,
        hardness: f64,
        spacing: f64,
    ) -> bool {
        self.editor.set_brush(BrushSettings {
            color: color.to_owned(),
            hardness,
            opacity,
            size,
            spacing,
        })
    }

    /// Tools that paint are all the core knows: the eyedropper and the fill
    /// change nothing about how a stroke is stamped, so they are not here.
    /// An unknown id draws, which is the safe fallback.
    pub fn set_tool(&mut self, mode: u32) -> bool {
        let tool = match mode {
            TOOL_ERASER => Tool::Eraser,
            TOOL_PENCIL => Tool::Pencil,
            _ => Tool::Draw,
        };

        self.editor.set_tool(tool)
    }

    /// Tool the core holds now, as an id from the same list.
    pub fn tool(&self) -> u32 {
        match self.editor.tool() {
            Tool::Eraser => TOOL_ERASER,
            Tool::Pencil => TOOL_PENCIL,
            Tool::Draw => TOOL_DRAW,
        }
    }

    pub fn begin_stroke(
        &mut self,
        x: f64,
        y: f64,
        pressure: f64,
        tilt_x: f64,
        tilt_y: f64,
        time: f64,
    ) {
        self.editor.begin_stroke(StrokeSample {
            pressure,
            tilt_x,
            tilt_y,
            time,
            x,
            y,
        });
    }

    /// Stroke continuation in a batch: six numbers per sample, ordered
    /// x, y, pressure, tilt x, tilt y, time.
    pub fn push_samples(&mut self, packed: &[f64]) {
        let samples: Vec<StrokeSample> = packed
            .as_chunks::<SAMPLE_STRIDE>()
            .0
            .iter()
            .map(|chunk| StrokeSample {
                pressure: chunk[2],
                tilt_x: chunk[3],
                tilt_y: chunk[4],
                time: chunk[5],
                x: chunk[0],
                y: chunk[1],
            })
            .collect();

        self.editor.push_samples(&samples);
    }

    pub fn end_stroke(&mut self) -> bool {
        self.editor.end_stroke()
    }

    pub fn stroke_active(&self) -> bool {
        self.editor.stroke_active()
    }

    pub fn can_undo(&self) -> bool {
        self.editor.can_undo()
    }

    pub fn can_redo(&self) -> bool {
        self.editor.can_redo()
    }

    pub fn undo(&mut self) -> bool {
        self.editor.undo()
    }

    pub fn redo(&mut self) -> bool {
        self.editor.redo()
    }

    pub fn clear_layer(&mut self) -> bool {
        self.editor.clear_layer()
    }

    /// Region fill at a point with the brush colour and opacity. The settings
    /// come as plain numbers: a struct through the edge would cost more than
    /// the numbers themselves. Returns what it did, so the page can say why
    /// nothing appeared instead of showing a silent nothing.
    #[allow(clippy::too_many_arguments)]
    pub fn fill(
        &mut self,
        x: f64,
        y: f64,
        tolerance: u32,
        grow: u32,
        feather: u32,
        diagonal: bool,
        similar: bool,
    ) -> u32 {
        match self.editor.fill(
            Point::new(x, y),
            fill_settings(tolerance, grow, feather, diagonal, similar),
        ) {
            FillOutcome::Filled => FILL_DONE,
            FillOutcome::LayerHidden => FILL_LAYER_HIDDEN,
            FillOutcome::Nothing => FILL_NOTHING,
        }
    }

    /// Outline of the region a fill at this point would touch: flat
    /// `x1, y1, x2, y2` segments in document pixels. Empty when there is
    /// nothing to show.
    #[allow(clippy::too_many_arguments)]
    pub fn fill_outline(
        &self,
        x: f64,
        y: f64,
        tolerance: u32,
        grow: u32,
        feather: u32,
        diagonal: bool,
        similar: bool,
    ) -> Vec<f32> {
        self.editor
            .fill_outline(
                Point::new(x, y),
                fill_settings(tolerance, grow, feather, diagonal, similar),
            )
            .unwrap_or_default()
    }

    pub fn has_content(&self) -> bool {
        self.editor.has_content()
    }

    /// Layer under the stroke, or zero when no stroke runs.
    pub fn overlay_layer_id(&self) -> u32 {
        self.editor.overlay().map_or(0, |info| info.layer_id)
    }

    pub fn overlay_mode(&self) -> u32 {
        match self.editor.overlay() {
            Some(info) if info.mode == BlendMode::DestinationOut => MODE_DESTINATION_OUT,
            _ => MODE_SOURCE_OVER,
        }
    }

    pub fn overlay_opacity(&self) -> f64 {
        self.editor.overlay().map_or(0.0, |info| info.opacity)
    }

    /// Layer tiles inside a rectangle: "key, version" pairs.
    pub fn tile_index(&self, layer_id: u32, x: f64, y: f64, width: f64, height: f64) -> Vec<u32> {
        flatten_pairs(self.editor.tile_index(layer_id, rect(x, y, width, height)))
    }

    /// "key, version" pairs for the whole layer. Needed to write a file.
    pub fn full_layer_index(&self, layer_id: u32) -> Vec<u32> {
        flatten_pairs(self.editor.layer_tile_index(layer_id))
    }

    /// Stroke buffer tiles inside a rectangle: "key, version" pairs.
    pub fn overlay_index(&self, x: f64, y: f64, width: f64, height: f64) -> Vec<u32> {
        flatten_pairs(self.editor.overlay_index(rect(x, y, width, height)))
    }

    /// Address of tile pixels in module memory, or zero when there is none.
    pub fn tile_pointer(&self, layer_id: u32, key: u32) -> usize {
        self.editor
            .tile(layer_id, key)
            .map_or(0, |tile| tile.pixels.as_ptr() as usize)
    }

    /// The same for a stroke buffer tile.
    pub fn overlay_tile_pointer(&self, key: u32) -> usize {
        self.editor
            .overlay_tile(key)
            .map_or(0, |tile| tile.pixels.as_ptr() as usize)
    }

    /// Document colour at a point as 0xRRGGBB, or `NO_COLOR` outside it.
    pub fn sample_color(&self, x: f64, y: f64) -> u32 {
        self.editor
            .sample(Point::new(x, y))
            .map_or(NO_COLOR, Color::to_u32)
    }
}

/// Tile side. Exposed so the frontend keeps no second copy: a difference here
/// gives seams between tiles.
#[wasm_bindgen]
pub fn tile_size() -> u32 {
    TILE_SIZE as u32
}

/// Tile pixel length in bytes. The output needs it to view module memory:
/// a shorter length would silently cut the copy.
#[wasm_bindgen]
pub fn tile_bytes() -> usize {
    TILE_BYTES
}

/// Core version. It shows the page runs the built engine, not an old cache.
#[wasm_bindgen]
pub fn engine_version() -> String {
    env!("CARGO_PKG_VERSION").to_owned()
}

fn to_js_error(error: LoadError) -> JsValue {
    JsValue::from_str(&error.to_string())
}

fn rect(x: f64, y: f64, width: f64, height: f64) -> Rect {
    Rect::new(x, y, width, height)
}

/// Fill settings from the numbers the frontend sends. Everything is clamped
/// in the core as well: the edge is not a place to trust.
fn fill_settings(tolerance: u32, grow: u32, feather: u32, diagonal: bool, similar: bool) -> FillSettings {
    FillSettings {
        diagonal,
        feather: feather.min(u32::from(u8::MAX)) as u8,
        grow: grow.min(u32::from(u8::MAX)) as u8,
        similar,
        tolerance: tolerance.min(u32::from(u8::MAX)) as u8,
    }
    .sane()
}

fn flatten_pairs(pairs: Vec<(u32, u32)>) -> Vec<u32> {
    let mut flat = Vec::with_capacity(pairs.len() * 2);

    for (key, version) in pairs {
        flat.push(key);
        flat.push(version);
    }

    flat
}

#[cfg(test)]
mod tests;
