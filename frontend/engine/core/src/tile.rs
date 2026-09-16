//! Tiles: grid, keys, pixel storage and snapshots for history.
//!
//! The old `lib/tiles.utils.ts` lives on here, including the snapshot rule: a
//! key missing from the snapshot is removed. That is how clearing a layer and
//! committing a stroke that created a tile are undone.

use std::collections::HashMap;

use crate::TILE_BYTES;
use crate::geometry::{Point, Rect, Size};

pub type TileKey = u32;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct TileGrid {
    pub cols: u32,
    pub rows: u32,
}

#[derive(Debug, Clone)]
pub struct Tile {
    pub col: u32,
    pub empty: bool,
    pub pixels: Vec<u8>,
    pub row: u32,
    pub version: u32,
}

impl Tile {
    pub fn new(col: u32, row: u32) -> Self {
        Self {
            col,
            empty: true,
            pixels: vec![0; TILE_BYTES],
            row,
            version: 0,
        }
    }

    /// Full transparency means an empty tile. Alpha is checked, not colour:
    /// transparent black is indistinguishable from black by colour.
    pub fn is_empty(&self) -> bool {
        self.pixels
            .as_chunks::<4>()
            .0
            .iter()
            .all(|pixel| pixel[3] == 0)
    }

    pub fn refresh_empty(&mut self) {
        self.empty = self.is_empty();
    }
}

#[derive(Debug, Clone)]
pub struct TileSnapshot {
    pub key: TileKey,
    pub pixels: Vec<u8>,
}

/// Tile map of one layer. Keys come out sorted: `HashMap` iteration order is
/// undefined, while the tile list of a frame must be reproducible.
#[derive(Debug, Clone)]
pub struct TileMap {
    cols: u32,
    tiles: HashMap<TileKey, Tile>,
}

impl TileMap {
    pub fn new(cols: u32) -> Self {
        Self {
            cols,
            tiles: HashMap::new(),
        }
    }

    pub fn cols(&self) -> u32 {
        self.cols
    }

    pub fn len(&self) -> usize {
        self.tiles.len()
    }

    pub fn is_empty(&self) -> bool {
        self.tiles.is_empty()
    }

    pub fn get(&self, key: TileKey) -> Option<&Tile> {
        self.tiles.get(&key)
    }

    pub fn get_mut(&mut self, key: TileKey) -> Option<&mut Tile> {
        self.tiles.get_mut(&key)
    }

    pub fn contains(&self, key: TileKey) -> bool {
        self.tiles.contains_key(&key)
    }

    pub fn ensure(&mut self, key: TileKey) -> &mut Tile {
        let cols = self.cols;

        self.tiles
            .entry(key)
            .or_insert_with(|| Tile::new(tile_col(key, cols), tile_row(key, cols)))
    }

    pub fn remove(&mut self, key: TileKey) -> Option<Tile> {
        self.tiles.remove(&key)
    }

    pub fn keys(&self) -> Vec<TileKey> {
        let mut keys: Vec<TileKey> = self.tiles.keys().copied().collect();
        keys.sort_unstable();

        keys
    }

    pub fn clear(&mut self) -> Vec<TileKey> {
        let keys = self.keys();
        self.tiles.clear();

        keys
    }

    pub fn has_content(&self) -> bool {
        self.tiles.values().any(|tile| !tile.empty)
    }
}

pub fn tile_grid(size: Size, tile_size: usize) -> TileGrid {
    let cols = ((size.width / tile_size as f64).ceil() as u32).max(1);
    let rows = ((size.height / tile_size as f64).ceil() as u32).max(1);

    TileGrid { cols, rows }
}

pub fn tile_key(col: u32, row: u32, cols: u32) -> TileKey {
    row * cols + col
}

pub fn tile_col(key: TileKey, cols: u32) -> u32 {
    key % cols
}

pub fn tile_row(key: TileKey, cols: u32) -> u32 {
    key / cols
}

pub fn tile_rect(key: TileKey, cols: u32, tile_size: usize) -> Rect {
    let col = tile_col(key, cols) as f64;
    let row = tile_row(key, cols) as f64;
    let side = tile_size as f64;

    Rect::new(col * side, row * side, side, side)
}

fn clamp_rect(rect: Rect, size: Size) -> Rect {
    let x = rect.x.clamp(0.0, size.width);
    let y = rect.y.clamp(0.0, size.height);
    let right = (rect.x + rect.width).clamp(0.0, size.width);
    let bottom = (rect.y + rect.height).clamp(0.0, size.height);

    Rect::new(x, y, right - x, bottom - y)
}

/// Tiles under a document rectangle, clipped to the document: otherwise a
/// stroke outside the border would create tiles off the sheet.
pub fn tiles_in_rect(rect: Rect, size: Size, tile_size: usize) -> Vec<TileKey> {
    let bounds = clamp_rect(rect, size);

    if bounds.width <= 0.0 || bounds.height <= 0.0 {
        return Vec::new();
    }

    let TileGrid { cols, .. } = tile_grid(size, tile_size);
    let side = tile_size as f64;

    // The last column and row use ceil minus one. Subtracting f64::EPSILON
    // before the division does not work here: at 512 and 256 it rounds away,
    // and a full document rectangle returned keys of a column and row that the
    // grid does not have, with repeats.
    let first_col = (bounds.x / side).floor() as u32;
    let last_col = ((bounds.x + bounds.width) / side).ceil() as u32 - 1;
    let first_row = (bounds.y / side).floor() as u32;
    let last_row = ((bounds.y + bounds.height) / side).ceil() as u32 - 1;

    let mut keys = Vec::new();

    for row in first_row..=last_row {
        for col in first_col..=last_col {
            keys.push(tile_key(col, row, cols));
        }
    }

    keys
}

pub fn tiles_in_segment(
    from: Point,
    to: Point,
    radius: f64,
    size: Size,
    tile_size: usize,
) -> Vec<TileKey> {
    tiles_in_rect(
        Rect::new(
            from.x.min(to.x) - radius,
            from.y.min(to.y) - radius,
            (to.x - from.x).abs() + radius * 2.0,
            (to.y - from.y).abs() + radius * 2.0,
        ),
        size,
        tile_size,
    )
}

pub fn snapshot_tiles(tiles: &TileMap, keys: &[TileKey]) -> Vec<TileSnapshot> {
    let mut snapshot = Vec::new();

    for key in keys {
        if let Some(tile) = tiles.get(*key) {
            snapshot.push(TileSnapshot {
                key: *key,
                pixels: tile.pixels.clone(),
            });
        }
    }

    snapshot
}

/// Restores tiles to the snapshot. Keys missing from it are removed: that is
/// how clearing a layer and committing a stroke on empty tiles are undone.
pub fn apply_tiles(tiles: &mut TileMap, keys: &[TileKey], snapshot: &[TileSnapshot]) {
    let by_key: HashMap<TileKey, &Vec<u8>> = snapshot
        .iter()
        .map(|item| (item.key, &item.pixels))
        .collect();

    for key in keys {
        match by_key.get(key) {
            Some(pixels) => {
                let tile = tiles.ensure(*key);
                let length = pixels.len().min(tile.pixels.len());

                tile.pixels[..length].copy_from_slice(&pixels[..length]);
                tile.refresh_empty();
                tile.version += 1;
            }
            None => {
                tiles.remove(*key);
            }
        }
    }
}
