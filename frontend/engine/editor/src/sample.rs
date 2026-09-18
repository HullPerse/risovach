//! Colour sampling from the document.
//!
//! Colour is read from tiles, not from the output canvas: the result then does
//! not depend on zoom, pixel density or anything drawn on top.

use drawing_core::TILE_SIZE;
use drawing_core::color::Color;
use drawing_core::document::Layer;
use drawing_core::geometry::{Point, Size};
use drawing_core::tile::{Tile, tile_grid, tile_key};

/// Blends one channel over what is accumulated so far. Channels stay float and
/// round once at the end: rounding per layer would shift the colour.
fn over(source: f64, source_alpha: f64, target: f64, target_alpha: f64) -> f64 {
    let out = source_alpha + target_alpha * (1.0 - source_alpha);
    let kept = (target_alpha * (1.0 - source_alpha)) / out;
    let added = source_alpha / out;

    source * added + target * kept
}

/// Document colour at a point: layers bottom to top over a white background.
pub fn sample_color(layers: &[Layer], size: Size, point: Point) -> Option<Color> {
    let x = point.x.floor();
    let y = point.y.floor();

    if x < 0.0 || y < 0.0 {
        return None;
    }

    pixel_color(layers, size, x as usize, y as usize)
}

/// Colour of one document pixel by its integer coordinates. Everything that
/// compares the picture against what the user sees, like the region fill,
/// goes through here: a second blend would drift apart from the eyedropper.
pub(crate) fn pixel_color(layers: &[Layer], size: Size, x: usize, y: usize) -> Option<Color> {
    if x as f64 >= size.width || y as f64 >= size.height {
        return None;
    }

    let grid = tile_grid(size, TILE_SIZE);
    let key = tile_key((x / TILE_SIZE) as u32, (y / TILE_SIZE) as u32, grid.cols);
    let index = ((y % TILE_SIZE) * TILE_SIZE + (x % TILE_SIZE)) * 4;

    Some(compose(layers, index, |_, layer| layer.tiles.get(key)).0)
}

/// Largest channel difference between two colours. The fill compares colours
/// by this one number: at a tolerance of 255 anything matches, at zero only
/// the exact colour does.
pub fn color_distance(from: Color, to: Color) -> u8 {
    let red = (i16::from(from.r) - i16::from(to.r)).unsigned_abs();
    let green = (i16::from(from.g) - i16::from(to.g)).unsigned_abs();
    let blue = (i16::from(from.b) - i16::from(to.b)).unsigned_abs();

    red.max(green).max(blue).min(255) as u8
}

/// One pixel of the picture: colour over white, plus the alpha of the content
/// itself. The fill asks whether a pixel is solid before it lets the grow ring
/// through; the eyedropper wants only the colour.
fn compose<'a>(
    layers: &'a [Layer],
    index: usize,
    tile_at: impl Fn(usize, &'a Layer) -> Option<&'a Tile>,
) -> (Color, f64) {
    let mut red = 255.0;
    let mut green = 255.0;
    let mut blue = 255.0;
    let mut alpha = 1.0;
    let mut cover = 0.0;

    for (position, layer) in layers.iter().enumerate() {
        if !layer.visible {
            continue;
        }

        let Some(tile) = tile_at(position, layer) else {
            continue;
        };

        let source_alpha = (tile.pixels[index + 3] as f64 / 255.0) * layer.opacity;

        if source_alpha <= 0.0 {
            continue;
        }

        red = over(tile.pixels[index] as f64, source_alpha, red, alpha);
        green = over(tile.pixels[index + 1] as f64, source_alpha, green, alpha);
        blue = over(tile.pixels[index + 2] as f64, source_alpha, blue, alpha);
        alpha = source_alpha + alpha * (1.0 - source_alpha);
        cover = source_alpha + cover * (1.0 - source_alpha);
    }

    (
        Color::new(
            red.round() as u8,
            green.round() as u8,
            blue.round() as u8,
        ),
        cover,
    )
}

/// Document colours with every tile found up front.
///
/// A fill walks hundreds of thousands of pixels, and per pixel it used to
/// recompute the tile grid and look the tile up in a map. Both are paid once
/// here instead: the walk reads a pointer out of a flat list.
pub struct Colors<'a> {
    cols: usize,
    height: usize,
    layers: &'a [Layer],
    tiles: Vec<Vec<Option<&'a Tile>>>,
    width: usize,
}

impl<'a> Colors<'a> {
    pub fn new(layers: &'a [Layer], size: Size) -> Self {
        let grid = tile_grid(size, TILE_SIZE);
        let cols = grid.cols as usize;
        let count = cols * grid.rows as usize;
        let tiles = layers
            .iter()
            .map(|layer| (0..count).map(|key| layer.tiles.get(key as u32)).collect())
            .collect();

        Self {
            cols,
            height: (size.height.ceil() as usize).max(1),
            layers,
            tiles,
            width: (size.width.ceil() as usize).max(1),
        }
    }

    pub const fn height(&self) -> usize {
        self.height
    }

    pub const fn width(&self) -> usize {
        self.width
    }

    /// Colour of a pixel over white and the alpha of the content over it.
    /// `None` outside the document.
    pub fn rgba(&self, x: usize, y: usize) -> Option<(Color, f64)> {
        if x >= self.width || y >= self.height {
            return None;
        }

        let key = tile_key((x / TILE_SIZE) as u32, (y / TILE_SIZE) as u32, self.cols as u32)
            as usize;
        let index = ((y % TILE_SIZE) * TILE_SIZE + (x % TILE_SIZE)) * 4;
        let (color, cover) = compose(self.layers, index, |position, _| {
            self.tiles[position][key]
        });

        Some((color, cover))
    }
}
