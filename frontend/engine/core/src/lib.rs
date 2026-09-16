//! Document base: geometry, colour, tiles and layers.
//!
//! The crate knows nothing about the browser, JavaScript or the GPU. It must
//! not import `web-sys`, `wgpu` or any runtime environment, or moving later to
//! native Rust or a GPU would turn into a rewrite.

pub mod color;
pub mod document;
pub mod geometry;
pub mod tile;

#[cfg(test)]
mod tests;

/// Tile side in pixels. Exposed through `tile_size`, so the frontend keeps no
/// second copy of this number.
pub const TILE_SIZE: usize = 256;

/// Pixel buffer length of one tile in bytes: RGBA, one byte per channel.
pub const TILE_BYTES: usize = TILE_SIZE * TILE_SIZE * 4;

/// History depth limit. The frontend keeps no copy of this number.
pub const HISTORY_LIMIT: usize = 100;
