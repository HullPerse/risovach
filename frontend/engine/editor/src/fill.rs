//! Region fill.
//!
//! The region is a flood over what the user sees: every pixel is compared by
//! the composite of all visible layers, the same blend the eyedropper reads.
//! Only the active layer is painted, with the brush colour and opacity, and
//! the whole region commits as one history step.

use std::collections::BTreeSet;

use drawing_core::TILE_SIZE;
use drawing_core::color::Color;
use drawing_core::document::Layer;
use drawing_core::geometry::{Point, Size};
use drawing_core::tile::{TileKey, TileMap, tile_grid, tile_key};
use drawing_raster::blend_source_over;

use crate::sample::pixel_color;

/// How far a pixel may sit from the seed colour and still belong to the
/// region. The bound absorbs the quiet blend around the seed without reaching
/// the nearest distinct palette colours: they sit more than 80 levels apart in
/// a channel. A wide antialiased fringe beyond the bound stays behind, as with
/// any strict fill; a dial for it is a candidate for the next version.
const COLOR_TOLERANCE: i32 = 64;

/// The fill compares against the seed colour, not against the neighbour: it
/// spreads strictly over the region the user clicked on, so a gradient ends
/// the region instead of flooding the whole sheet.
#[derive(Clone, Copy)]
struct SeedColor {
    blue: i32,
    green: i32,
    red: i32,
}

impl SeedColor {
    fn new(color: Color) -> Self {
        Self {
            blue: i32::from(color.b),
            green: i32::from(color.g),
            red: i32::from(color.r),
        }
    }

    fn matches(self, color: Color) -> bool {
        (i32::from(color.r) - self.red).abs() <= COLOR_TOLERANCE
            && (i32::from(color.g) - self.green).abs() <= COLOR_TOLERANCE
            && (i32::from(color.b) - self.blue).abs() <= COLOR_TOLERANCE
    }
}

/// Everything one fill touches: the region as flat pixel indices over the
/// document scanline. The command turns this plan into a history step.
pub struct FillPlan {
    pub indices: Vec<u32>,
    pub keys: Vec<TileKey>,
    pub width: usize,
}

/// Walks the region with a plain stack: the fill runs on the wasm stack, and
/// a recursive visitor would overflow it on a whole-sheet fill. Neighbours are
/// marked on push, so no pixel enters the stack twice.
pub fn plan_fill(layers: &[Layer], size: Size, seed: Point, opacity: f64) -> Option<FillPlan> {
    if opacity.clamp(0.0, 1.0) <= 0.0 {
        return None;
    }

    let width = (size.width.ceil() as usize).max(1);
    let height = (size.height.ceil() as usize).max(1);
    let (x, y) = (seed.x.floor(), seed.y.floor());

    if x < 0.0 || y < 0.0 {
        return None;
    }

    let (px, py) = (x as usize, y as usize);

    if px >= width || py >= height {
        return None;
    }

    let seed_color = pixel_color(layers, size, px, py)?;

    let region = SeedColor::new(seed_color);
    let mut visited = vec![false; width * height];
    let start = py * width + px;
    let mut stack = vec![start];
    let mut indices = Vec::new();

    visited[start] = true;

    while let Some(index) = stack.pop() {
        let cx = index % width;
        let cy = index / width;

        let Some(actual) = pixel_color(layers, size, cx, cy) else {
            continue;
        };

        if !region.matches(actual) {
            continue;
        }

        indices.push(index as u32);

        if cx + 1 < width {
            let next = index + 1;

            if !visited[next] {
                visited[next] = true;
                stack.push(next);
            }
        }

        if cx > 0 {
            let next = index - 1;

            if !visited[next] {
                visited[next] = true;
                stack.push(next);
            }
        }

        if cy + 1 < height {
            let next = index + width;

            if !visited[next] {
                visited[next] = true;
                stack.push(next);
            }
        }

        if cy > 0 {
            let next = index - width;

            if !visited[next] {
                visited[next] = true;
                stack.push(next);
            }
        }
    }

    let grid = tile_grid(size, TILE_SIZE);
    let keys: BTreeSet<TileKey> = indices
        .iter()
        .map(|&index| {
            let cx = index as usize % width;
            let cy = index as usize / width;

            tile_key((cx / TILE_SIZE) as u32, (cy / TILE_SIZE) as u32, grid.cols)
        })
        .collect();
    let keys: Vec<TileKey> = keys.into_iter().collect();

    Some(FillPlan { indices, keys, width })
}

/// Puts the fill colour into the region. Returns the tiles that really
/// changed: a colour over itself writes the same bytes and gives no history
/// step, as a stroke over the same colour does not.
pub fn paint_region(
    tiles: &mut TileMap,
    plan: &FillPlan,
    color: Color,
    opacity: f64,
) -> Vec<TileKey> {
    let alpha = opacity.clamp(0.0, 1.0);

    if alpha <= 0.0 {
        return Vec::new();
    }

    let width = plan.width;
    let cols = tiles.cols();
    let mut changed: BTreeSet<TileKey> = BTreeSet::new();
    let mut created: Vec<TileKey> = Vec::new();

    for &index in &plan.indices {
        let cx = index as usize % width;
        let cy = index as usize / width;
        let key = tile_key((cx / TILE_SIZE) as u32, (cy / TILE_SIZE) as u32, cols);

        if !tiles.contains(key) {
            created.push(key);
        }

        let tile = tiles.ensure(key);
        let offset = ((cy % TILE_SIZE) * TILE_SIZE + (cx % TILE_SIZE)) * 4;
        let was: [u8; 4] = tile.pixels[offset..offset + 4].try_into().expect("4 bytes");

        blend_source_over(&mut tile.pixels, offset, color, alpha);

        if tile.pixels[offset..offset + 4] != was {
            changed.insert(key);
        }
    }

    // A tile created under a pixel that the blend left unchanged holds no
    // content: without the removal it would stay in the map as an empty
    // entry the cache and the file writer would keep seeing.
    for key in created {
        if !changed.contains(&key) {
            tiles.remove(key);
        }
    }

    for key in &changed {
        if let Some(tile) = tiles.get_mut(*key) {
            tile.refresh_empty();
            tile.version += 1;
        }
    }

    changed.into_iter().collect()
}
