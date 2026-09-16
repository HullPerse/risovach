//! Edit history.
//!
//! Not whole document snapshots but only the touched tiles before and after:
//! a step costs as much as the edited area, not the drawing. One gesture gives
//! one step, because a stroke commits once.

use std::collections::VecDeque;

use drawing_core::HISTORY_LIMIT;
use drawing_core::document::{Document, LayerId};
use drawing_core::tile::{TileKey, TileSnapshot, apply_tiles};

#[cfg(test)]
mod tests;

#[derive(Debug, Clone)]
pub struct HistoryPatch {
    pub after: Vec<TileSnapshot>,
    pub before: Vec<TileSnapshot>,
    pub keys: Vec<TileKey>,
    pub layer_id: LayerId,
}

#[derive(Debug)]
pub struct History {
    future: Vec<HistoryPatch>,
    limit: usize,
    past: VecDeque<HistoryPatch>,
}

impl History {
    pub fn new(limit: usize) -> Self {
        Self {
            future: Vec::new(),
            limit: limit.max(1),
            past: VecDeque::new(),
        }
    }

    pub fn with_default_limit() -> Self {
        Self::new(HISTORY_LIMIT)
    }

    pub fn can_redo(&self) -> bool {
        !self.future.is_empty()
    }

    pub fn can_undo(&self) -> bool {
        !self.past.is_empty()
    }

    pub fn record(&mut self, patch: HistoryPatch) {
        self.past.push_back(patch);

        while self.past.len() > self.limit {
            self.past.pop_front();
        }

        self.future.clear();
    }

    pub fn clear(&mut self) {
        self.future.clear();
        self.past.clear();
    }

    /// Returns the layer the undo touched. `None` means there is nothing to
    /// undo.
    pub fn undo(&mut self, document: &mut Document) -> Option<LayerId> {
        let patch = self.past.pop_back()?;

        let layer_id = patch.layer_id;
        let keys = patch.keys.clone();

        if let Some(layer) = document.layer_mut(layer_id) {
            apply_tiles(&mut layer.tiles, &keys, &patch.before);
        }

        self.future.push(patch);

        Some(layer_id)
    }

    pub fn redo(&mut self, document: &mut Document) -> Option<LayerId> {
        let patch = self.future.pop()?;

        let layer_id = patch.layer_id;
        let keys = patch.keys.clone();

        if let Some(layer) = document.layer_mut(layer_id) {
            apply_tiles(&mut layer.tiles, &keys, &patch.after);
        }

        self.past.push_back(patch);

        Some(layer_id)
    }
}
