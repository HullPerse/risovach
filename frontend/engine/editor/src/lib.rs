//! Editor assembly: commands over the document, the stroke and the history.
//!
//! Everything that is the product rather than the environment lives here:
//! begin a stroke, extend it, commit it as one history step, undo, redo, clear
//! a layer. Camera, viewport and input stay outside, so the same crate fits a
//! native editor.
//!
//! The crate knows nothing about the browser or JavaScript.

mod sample;

#[cfg(test)]
mod tests;

pub use sample::sample_color;

use drawing_brush::stroke::StrokeEngine;
use drawing_brush::{BrushSettings, StrokeSample, Tool};
use drawing_core::TILE_SIZE;
use drawing_core::document::{Document, Layer, LayerId};
use drawing_core::geometry::{Point, Rect, Size};
use drawing_core::tile::{Tile, TileKey, snapshot_tiles, tiles_in_rect};
use drawing_format::LoadError;
use drawing_history::{History, HistoryPatch};
use drawing_raster::BlendMode;
use serde::Serialize;

/// Layer description for the UI. There are no pixels here: the output pulls
/// them, and only for tiles that really changed.
#[derive(Debug, Clone, Serialize)]
pub struct LayerInfo {
    pub id: LayerId,
    pub name: String,
    pub opacity: f64,
    pub visible: bool,
}

#[derive(Debug, Clone, Copy, PartialEq)]
pub struct OverlayInfo {
    pub layer_id: LayerId,
    pub mode: BlendMode,
    pub opacity: f64,
}

#[derive(Debug)]
pub struct Editor {
    brush: BrushSettings,
    document: Document,
    history: History,
    stroke: StrokeEngine,
    tool: Tool,
}

impl Editor {
    pub fn new(size: Size, brush: BrushSettings) -> Self {
        Self::with_document(Document::new(size), brush)
    }

    /// Opens a `.hpd` project file. Brush and tool fall back to defaults: they
    /// belong to the UI, not the document, and the caller sets them right
    /// after opening.
    ///
    /// History is not reopened: undoing steps of a past session makes no
    /// sense, and the file gives it no room.
    pub fn from_project(source: &[u8]) -> Result<Self, LoadError> {
        let document = drawing_format::load(source)?;

        Ok(Self::with_document(
            document,
            BrushSettings {
                color: String::from("#000000"),
                hardness: 1.0,
                opacity: 1.0,
                size: 8.0,
                spacing: 0.25,
            },
        ))
    }

    /// Builds the whole project file: document, layers and tiles, no history.
    pub fn save_project(&self) -> Vec<u8> {
        drawing_format::save(&self.document)
    }

    fn with_document(document: Document, brush: BrushSettings) -> Self {
        let stroke = StrokeEngine::new(document.size(), document.grid().cols);

        Self {
            brush,
            document,
            history: History::with_default_limit(),
            stroke,
            tool: Tool::Draw,
        }
    }

    pub const fn size(&self) -> Size {
        self.document.size()
    }

    pub const fn active_layer_id(&self) -> LayerId {
        self.document.active_layer_id()
    }

    pub fn layers(&self) -> &[Layer] {
        self.document.layers()
    }

    pub fn layer_infos(&self) -> Vec<LayerInfo> {
        self.document
            .layers()
            .iter()
            .map(|layer| LayerInfo {
                id: layer.id,
                name: layer.name.clone(),
                opacity: layer.opacity,
                visible: layer.visible,
            })
            .collect()
    }

    pub fn add_layer(&mut self, name: &str) -> LayerId {
        self.document.add_layer(name)
    }

    pub fn set_active_layer(&mut self, id: LayerId) -> bool {
        self.document.set_active_layer(id)
    }

    pub fn set_layer_opacity(&mut self, id: LayerId, opacity: f64) -> bool {
        self.document.set_layer_opacity(id, opacity)
    }

    pub fn set_layer_visible(&mut self, id: LayerId, visible: bool) -> bool {
        self.document.set_layer_visible(id, visible)
    }

    pub fn brush(&self) -> &BrushSettings {
        &self.brush
    }

    /// A brush change during a stroke is ignored: otherwise the stroke would
    /// change look half way, and opacity would apply to it twice.
    pub fn set_brush(&mut self, brush: BrushSettings) -> bool {
        if self.stroke.is_active() || self.brush.same_as(&brush) {
            return false;
        }

        self.brush = brush;

        true
    }

    pub const fn tool(&self) -> Tool {
        self.tool
    }

    pub fn set_tool(&mut self, tool: Tool) -> bool {
        if self.stroke.is_active() || tool == self.tool {
            return false;
        }

        self.tool = tool;

        true
    }

    pub const fn stroke_active(&self) -> bool {
        self.stroke.is_active()
    }

    pub fn begin_stroke(&mut self, sample: StrokeSample) {
        let brush = self.brush.clone();

        self.stroke.begin(sample, &brush, self.tool);
    }

    pub fn push_samples(&mut self, samples: &[StrokeSample]) {
        if !self.stroke.is_active() {
            return;
        }

        for sample in samples {
            self.stroke.add(*sample);
        }
    }

    /// One gesture gives one history step, even when the pointer left the
    /// document: stamps gather in a buffer and commit once, here.
    pub fn end_stroke(&mut self) -> bool {
        if !self.stroke.is_active() {
            return false;
        }

        let layer_id = self.document.active_layer_id();
        let keys = self.stroke.buffer().keys();

        let outcome = {
            let Some(layer) = self.document.layer_mut(layer_id) else {
                self.stroke.reset();

                return false;
            };

            let before = snapshot_tiles(&layer.tiles, &keys);
            let changed = self.stroke.commit_to(&mut layer.tiles);

            if changed.is_empty() {
                None
            } else {
                Some((before, snapshot_tiles(&layer.tiles, &keys)))
            }
        };

        self.stroke.reset();

        if let Some((before, after)) = outcome {
            self.history.record(HistoryPatch {
                after,
                before,
                keys,
                layer_id,
            });

            return true;
        }

        false
    }

    pub fn can_undo(&self) -> bool {
        self.history.can_undo()
    }

    pub fn can_redo(&self) -> bool {
        self.history.can_redo()
    }

    pub fn undo(&mut self) -> bool {
        self.history.undo(&mut self.document).is_some()
    }

    pub fn redo(&mut self) -> bool {
        self.history.redo(&mut self.document).is_some()
    }

    pub fn clear_layer(&mut self) -> bool {
        let layer_id = self.document.active_layer_id();

        let Some(layer) = self.document.layer_mut(layer_id) else {
            return false;
        };

        if layer.tiles.is_empty() {
            return false;
        }

        let keys = layer.tiles.keys();
        let before = snapshot_tiles(&layer.tiles, &keys);

        layer.tiles.clear();

        self.history.record(HistoryPatch {
            after: Vec::new(),
            before,
            keys,
            layer_id,
        });

        true
    }

    pub fn has_content(&self) -> bool {
        self.document.has_content()
    }

    pub fn sample(&self, point: Point) -> Option<drawing_core::color::Color> {
        sample_color(self.document.layers(), self.document.size(), point)
    }

    /// Layer tiles inside a rectangle, with versions. A changed version is
    /// exactly the "this tile goes into the output cache" signal.
    pub fn tile_index(&self, layer_id: LayerId, rect: Rect) -> Vec<(TileKey, u32)> {
        let Some(layer) = self.document.layer(layer_id) else {
            return Vec::new();
        };

        tiles_in_rect(rect, self.document.size(), TILE_SIZE)
            .into_iter()
            .filter_map(|key| layer.tiles.get(key).map(|tile| (key, tile.version)))
            .collect()
    }

    pub fn tile(&self, layer_id: LayerId, key: TileKey) -> Option<&Tile> {
        self.document.layer(layer_id)?.tiles.get(key)
    }

    /// Layer under the stroke and how to blend it. `None` means no stroke runs
    /// and the output has nothing to apply.
    pub fn overlay(&self) -> Option<OverlayInfo> {
        if !self.stroke.is_active() || self.stroke.buffer().is_empty() {
            return None;
        }

        Some(OverlayInfo {
            layer_id: self.document.active_layer_id(),
            mode: if self.stroke.tool() == Tool::Eraser {
                BlendMode::DestinationOut
            } else {
                BlendMode::SourceOver
            },
            opacity: self.stroke.opacity(),
        })
    }

    pub fn overlay_index(&self, rect: Rect) -> Vec<(TileKey, u32)> {
        if self.overlay().is_none() {
            return Vec::new();
        }

        tiles_in_rect(rect, self.document.size(), TILE_SIZE)
            .into_iter()
            .filter_map(|key| {
                self.stroke
                    .buffer()
                    .get(key)
                    .map(|tile| (key, tile.version))
            })
            .collect()
    }

    pub fn overlay_tile(&self, key: TileKey) -> Option<&Tile> {
        self.stroke.buffer().get(key)
    }

    /// Full tile list of a layer. Needed when writing a file, where no visible
    /// rectangle exists.
    pub fn layer_tile_index(&self, layer_id: LayerId) -> Vec<(TileKey, u32)> {
        let Some(layer) = self.document.layer(layer_id) else {
            return Vec::new();
        };

        layer
            .tiles
            .keys()
            .into_iter()
            .filter_map(|key| layer.tiles.get(key).map(|tile| (key, tile.version)))
            .collect()
    }
}
