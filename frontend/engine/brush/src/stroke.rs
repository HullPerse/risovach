//! Stroke buffer and its commit into a layer.
//!
//! Stamps accumulate in a separate tile map, and opacity and blend mode apply
//! once, at commit. Otherwise, with a stamp step of a quarter brush size, the
//! stroke would saturate itself to full opacity.

use drawing_core::TILE_SIZE;
use drawing_core::geometry::{Rect, Size};
use drawing_core::tile::{TileKey, TileMap, tile_rect, tiles_in_rect};
use drawing_raster::{BlendMode, StampOptions, composite_tile, paint_stamp};

use crate::{BrushSettings, StampStyle, StrokeSample, Tool, stamp_distances};

#[derive(Debug)]
pub struct StrokeEngine {
    buffer: TileMap,
    carry: f64,
    last: Option<StrokeSample>,
    opacity: f64,
    size: Size,
    style: Option<StampStyle>,
    tool: Tool,
}

impl StrokeEngine {
    pub fn new(size: Size, cols: u32) -> Self {
        Self {
            buffer: TileMap::new(cols),
            carry: 0.0,
            last: None,
            opacity: 1.0,
            size,
            style: None,
            tool: Tool::Draw,
        }
    }

    pub fn buffer(&self) -> &TileMap {
        &self.buffer
    }

    pub const fn is_active(&self) -> bool {
        self.style.is_some()
    }

    pub const fn tool(&self) -> Tool {
        self.tool
    }

    pub const fn opacity(&self) -> f64 {
        self.opacity
    }

    pub fn begin(&mut self, sample: StrokeSample, brush: &BrushSettings, tool: Tool) {
        self.buffer = TileMap::new(self.buffer.cols());
        // One place decides where the tool turns into stamp settings: the
        // pencil keeps its own edge and step, whatever the brush sliders say.
        self.style = Some(if tool == Tool::Pencil {
            brush.style().hard_edged()
        } else {
            brush.style()
        });
        self.opacity = brush.opacity;
        self.tool = tool;
        self.carry = 0.0;
        self.last = Some(sample);
        self.stamp(sample);
    }

    /// Extends the stroke to a new sample, placing stamps along the way.
    pub fn add(&mut self, sample: StrokeSample) {
        let Some(style) = self.style else {
            return;
        };
        let Some(last) = self.last else {
            return;
        };

        let length = (sample.x - last.x).hypot(sample.y - last.y);
        let (carry, distances) = stamp_distances(length, style.stamp_distance(), self.carry);

        self.carry = carry;

        for offset in distances {
            self.stamp(StrokeSample::lerp(last, sample, offset / length));
        }

        self.last = Some(sample);
    }

    /// Moves the buffer into layer tiles. Returns the keys that changed.
    pub fn commit_to(&mut self, tiles: &mut TileMap) -> Vec<TileKey> {
        if self.style.is_none() || self.opacity <= 0.0 {
            return Vec::new();
        }

        let mode = if self.tool == Tool::Eraser {
            BlendMode::DestinationOut
        } else {
            BlendMode::SourceOver
        };

        let mut changed = Vec::new();

        for key in self.buffer.keys() {
            let exists = tiles.contains(key);

            if !exists && mode == BlendMode::DestinationOut {
                continue;
            }

            let Some(source) = self.buffer.get(key) else {
                continue;
            };

            let opacity = self.opacity;
            let target = tiles.ensure(key);

            if composite_tile(target, source, opacity, mode) {
                target.refresh_empty();
                changed.push(key);
            }
        }

        changed
    }

    pub fn reset(&mut self) {
        self.buffer = TileMap::new(self.buffer.cols());
        self.carry = 0.0;
        self.last = None;
        self.style = None;
        self.tool = Tool::Draw;
    }

    fn stamp(&mut self, sample: StrokeSample) {
        let Some(style) = self.style else {
            return;
        };

        let radius = style.stamp_size(sample.pressure) / 2.0;

        if radius <= 0.0 {
            return;
        }

        let size = self.size;
        let keys = tiles_in_rect(
            Rect::new(
                sample.x - radius,
                sample.y - radius,
                radius * 2.0,
                radius * 2.0,
            ),
            size,
            TILE_SIZE,
        );

        for key in keys {
            let tile_box = tile_rect(key, self.buffer.cols(), TILE_SIZE);
            // Clip to the document: without it stamps bleed past the sheet
            // into tile overhang that the output draws outside the white.
            let clip = Rect::new(
                tile_box.x.max(0.0),
                tile_box.y.max(0.0),
                (tile_box.x + tile_box.width).min(size.width) - tile_box.x.max(0.0),
                (tile_box.y + tile_box.height).min(size.height) - tile_box.y.max(0.0),
            );

            paint_stamp(
                self.buffer.ensure(key),
                &StampOptions {
                    alpha: 1.0,
                    center_x: sample.x,
                    center_y: sample.y,
                    clip,
                    color: style.color,
                    hard_edge: style.hard_edge,
                    hardness: style.hardness,
                    radius,
                },
            );
        }
    }
}
