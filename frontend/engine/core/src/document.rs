//! Document and layers.
//! Layers keep insertion order: zero is the bottom one and is drawn first.

use crate::geometry::Size;
use crate::tile::{TileGrid, TileKey, TileMap, tile_grid};

pub type LayerId = u32;

#[derive(Debug, Clone)]
pub struct Layer {
    pub id: LayerId,
    pub name: String,
    pub opacity: f64,
    pub tiles: TileMap,
    pub visible: bool,
}

#[derive(Debug, Clone)]
pub struct Document {
    active_id: LayerId,
    grid: TileGrid,
    layers: Vec<Layer>,
    next_layer_id: LayerId,
    size: Size,
}

impl Document {
    pub fn new(size: Size) -> Self {
        let grid = tile_grid(size, crate::TILE_SIZE);
        let mut document = Self {
            active_id: 0,
            grid,
            layers: Vec::new(),
            next_layer_id: 1,
            size,
        };

        document.active_id = document.add_layer("Слой 1");

        document
    }

    /// Builds a document from ready layers, for reading a project file: there
    /// the file sets ids and order, so `add_layer` cannot be used.
    ///
    /// Returns `None` when the parts give no valid document: a size that is
    /// not a positive number, no layers, repeated ids, or an active id that is
    /// not among them.
    pub fn restore(size: Size, layers: Vec<Layer>, active_id: LayerId) -> Option<Self> {
        if !size.width.is_finite() || !size.height.is_finite() {
            return None;
        }

        if size.width <= 0.0 || size.height <= 0.0 || layers.is_empty() {
            return None;
        }

        if layers.iter().filter(|layer| layer.id == active_id).count() != 1 {
            return None;
        }

        let mut seen: Vec<LayerId> = Vec::with_capacity(layers.len());
        let mut next_layer_id = 1;

        for layer in &layers {
            if seen.contains(&layer.id) {
                return None;
            }

            next_layer_id = next_layer_id.max(layer.id + 1);
            seen.push(layer.id);
        }

        Some(Self {
            active_id,
            grid: tile_grid(size, crate::TILE_SIZE),
            layers,
            next_layer_id,
            size,
        })
    }

    pub const fn size(&self) -> Size {
        self.size
    }

    pub const fn grid(&self) -> TileGrid {
        self.grid
    }

    pub const fn active_layer_id(&self) -> LayerId {
        self.active_id
    }

    pub fn active_layer(&self) -> Option<&Layer> {
        self.layer(self.active_id)
    }

    pub fn active_layer_mut(&mut self) -> Option<&mut Layer> {
        let id = self.active_id;

        self.layer_mut(id)
    }

    pub fn add_layer(&mut self, name: &str) -> LayerId {
        let id = self.next_layer_id;

        self.next_layer_id += 1;
        self.layers.push(Layer {
            id,
            name: name.to_owned(),
            opacity: 1.0,
            tiles: TileMap::new(self.grid.cols),
            visible: true,
        });

        id
    }

    pub fn layers(&self) -> &[Layer] {
        &self.layers
    }

    pub fn layer(&self, id: LayerId) -> Option<&Layer> {
        self.layers.iter().find(|layer| layer.id == id)
    }

    pub fn layer_mut(&mut self, id: LayerId) -> Option<&mut Layer> {
        self.layers.iter_mut().find(|layer| layer.id == id)
    }

    pub fn set_active_layer(&mut self, id: LayerId) -> bool {
        if self.layer(id).is_none() {
            return false;
        }

        self.active_id = id;

        true
    }

    pub fn set_layer_opacity(&mut self, id: LayerId, opacity: f64) -> bool {
        match self.layer_mut(id) {
            Some(layer) => {
                layer.opacity = opacity;

                true
            }
            None => false,
        }
    }

    pub fn set_layer_visible(&mut self, id: LayerId, visible: bool) -> bool {
        match self.layer_mut(id) {
            Some(layer) => {
                layer.visible = visible;

                true
            }
            None => false,
        }
    }

    pub fn clear_layer(&mut self, id: LayerId) -> Vec<TileKey> {
        match self.layer_mut(id) {
            Some(layer) => layer.tiles.clear(),
            None => Vec::new(),
        }
    }

    /// Whether there is a drawing. Layer visibility is ignored on purpose:
    /// a hidden layer with pixels still means a non empty document.
    pub fn has_content(&self) -> bool {
        self.layers.iter().any(|layer| layer.tiles.has_content())
    }
}
