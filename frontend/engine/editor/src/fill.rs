//! Region fill.
//!
//! The region is a flood over what the user sees: every pixel is compared by
//! the composite of all visible layers, the same blend the eyedropper reads.
//! Only the active layer is painted, with the brush colour and opacity, and
//! the whole region commits as one history step.
//!
//! The plan of a fill is one byte per document pixel, not a list of indices:
//! the flood marks a pixel in the bitmap instead of writing it into an output
//! vector, so a whole sheet fill costs a byte per pixel instead of five, and
//! painting walks the rectangle the fill touched.

use std::collections::BTreeSet;

use drawing_core::TILE_SIZE;
use drawing_core::color::Color;
use drawing_core::document::Layer;
use drawing_core::geometry::{Point, Size};
use drawing_core::tile::{TileKey, TileMap, tile_grid, tile_key};
use drawing_raster::blend_source_over;

use crate::sample::{Colors, color_distance};

/// Colour distance a pixel may sit at and still join the region, 0..=255.
pub const MAX_TOLERANCE: u8 = 255;
/// Largest setting of the grow and feather dials.
pub const MAX_GROW: u8 = 8;
pub const MAX_FEATHER: u8 = 4;
/// Colour distance one step of the feather dial covers, in levels.
const FEATHER_STEP: f64 = 64.0;
/// Region size above which no outline is built: the outline of a whole sheet is
/// not worth its cost, and a preview walks the region before painting. The
/// walk costs a few nanoseconds per pixel, so this is the price of one preview.
pub const PREVIEW_PIXELS: usize = 250_000;
/// Sheet size above which the preview is not attempted at all.
pub const PREVIEW_AREA: usize = 4_000_000;
/// Cap of the outline, in segments of four numbers.
pub const PREVIEW_SEGMENTS: usize = 4096;
/// A pixel this opaque is solid content: the grow ring stops on it instead of
/// leaking over a line into the next region.
const DENSE_COVER: f64 = 0.95;

/// Coverage of one pixel in the plan bitmap. Zero is untouched, one is visited
/// and refused, and the values between two and 254 are the softened edge. A
/// pixel above one is painted.
const VISITED: u8 = 1;
const REGION: u8 = 255;

/// Steps to the neighbours of a pixel. Eight of them cross a diagonal gap;
/// four keep the fill from squeezing through a one pixel corner.
const STEPS: [(i32, i32); 8] = [
    (1, 0),
    (-1, 0),
    (0, 1),
    (0, -1),
    (1, 1),
    (1, -1),
    (-1, 1),
    (-1, -1),
];

/// What the front send along with a fill. Values outside the dials are clamped,
/// not refused: the sliders are the only caller, and a stray number must not
/// turn into a broken fill.
#[derive(Clone, Copy, Debug, PartialEq)]
pub struct FillSettings {
    /// Eight neighbours instead of four: the fill crosses a diagonal gap.
    pub diagonal: bool,
    /// How far into the colour distance the softened edge reaches, in steps of
    /// 64 levels. The ring itself is one pixel wide either way.
    pub feather: u8,
    /// Ring painted around the region whatever the seed colour is, in pixels.
    pub grow: u8,
    /// The whole layer instead of the connected region.
    pub similar: bool,
    pub tolerance: u8,
}

impl Default for FillSettings {
    fn default() -> Self {
        Self {
            diagonal: false,
            feather: 0,
            grow: 0,
            similar: false,
            tolerance: 64,
        }
    }
}

impl FillSettings {
    pub fn sane(self) -> Self {
        Self {
            feather: self.feather.min(MAX_FEATHER),
            grow: self.grow.min(MAX_GROW),
            tolerance: self.tolerance.min(MAX_TOLERANCE),
            ..self
        }
    }
}

/// What a fill did. A refusal carries a reason: a hidden layer used to take the
/// pixels and show nothing at all.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum FillOutcome {
    /// Nothing to do: outside the document, an empty brush, or the colour over
    /// itself. Not an error.
    Nothing,
    Filled,
    /// The active layer is hidden, so the paint would be invisible.
    LayerHidden,
}

/// Document rectangle in whole pixels: painting and the outline walk this part
/// of the sheet and nothing else.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
struct Area {
    height: usize,
    width: usize,
    x: usize,
    y: usize,
}

/// Everything one fill touches. The command turns this plan into a history
/// step; the preview asks it for the outline instead.
pub struct FillPlan {
    area: Area,
    coverage: Vec<u8>,
    height: usize,
    painted: usize,
    pub keys: Vec<TileKey>,
    /// Document width: the coverage bitmap is row major over the whole sheet.
    pub width: usize,
}

impl FillPlan {
    pub const fn is_empty(&self) -> bool {
        self.painted == 0
    }

    pub const fn painted(&self) -> usize {
        self.painted
    }

    /// Outline of the painted region as flat segments, four numbers each in
    /// document pixels: `x1, y1, x2, y2`. `None` when the region is too big, or
    /// the outline too broken up, for a preview to mean anything.
    pub fn outline(&self) -> Option<Vec<f32>> {
        if self.painted == 0 || self.painted > PREVIEW_PIXELS {
            return None;
        }

        let mut segments = Vec::new();
        let rows = self.area.y..self.area.y + self.area.height;
        let columns = self.area.x..self.area.x + self.area.width;

        // The top and bottom edges run along rows, the left and right edges
        // along columns. Consecutive pixels merge into one segment: a rectangle
        // comes out as four segments instead of one per pixel.
        for line in rows.clone() {
            self.walk(&mut segments, line, false, false);
            self.walk(&mut segments, line, false, true);
        }

        for line in columns {
            self.walk(&mut segments, line, true, false);
            self.walk(&mut segments, line, true, true);
        }

        if segments.is_empty() || segments.len() / 4 >= PREVIEW_SEGMENTS {
            return None;
        }

        Some(segments)
    }

    fn painted_at(&self, x: usize, y: usize) -> bool {
        x < self.width && y < self.height && self.coverage[y * self.width + x] > VISITED
    }

    /// Collects runs of one kind of edge along a row or a column. `vertical`
    /// picks the direction, `far` the far side of the pixel, bottom or right.
    fn walk(&self, segments: &mut Vec<f32>, line: usize, vertical: bool, far: bool) {
        let (start, end) = if vertical {
            (self.area.y, self.area.y + self.area.height)
        } else {
            (self.area.x, self.area.x + self.area.width)
        };
        let mut run: Option<usize> = None;

        for step in start..end {
            let (x, y) = if vertical { (line, step) } else { (step, line) };
            let edge = self.painted_at(x, y)
                && !if far {
                    if vertical {
                        self.painted_at(x + 1, y)
                    } else {
                        self.painted_at(x, y + 1)
                    }
                } else if vertical {
                    x > 0 && self.painted_at(x - 1, y)
                } else {
                    y > 0 && self.painted_at(x, y - 1)
                };

            match (edge, run) {
                (true, None) => run = Some(step),
                (false, Some(from)) => {
                    push_segment(segments, from, step, line, vertical, far);
                    run = None;
                }
                _ => {}
            }
        }

        if let Some(from) = run {
            push_segment(segments, from, end, line, vertical, far);
        }
    }
}

/// One edge segment between two pixels of a row or a column, in document
/// coordinates: the edge of the pixel, not its middle.
fn push_segment(
    segments: &mut Vec<f32>,
    from: usize,
    to: usize,
    line: usize,
    vertical: bool,
    far: bool,
) {
    let edge = if far { line + 1 } else { line } as f32;
    let (from, to) = (from as f32, to as f32);

    if vertical {
        segments.extend_from_slice(&[edge, from, edge, to]);
    } else {
        segments.extend_from_slice(&[from, edge, to, edge]);
    }
}

/// Visits the neighbours of a pixel that are inside the document.
fn for_each_neighbour(
    x: usize,
    y: usize,
    width: usize,
    height: usize,
    diagonal: bool,
    visit: &mut impl FnMut(usize, usize),
) {
    let count = if diagonal { 8 } else { 4 };

    for (dx, dy) in &STEPS[..count] {
        let nx = x as i32 + dx;
        let ny = y as i32 + dy;

        if nx < 0 || ny < 0 || nx as usize >= width || ny as usize >= height {
            continue;
        }

        visit(nx as usize, ny as usize);
    }
}

/// The plan being built: the coverage bitmap, the rectangle it touches and the
/// tiles it reaches. Every write goes through here, so all three stay in step.
struct Builder {
    area: Area,
    cols: usize,
    coverage: Vec<u8>,
    height: usize,
    keys: Vec<TileKey>,
    painted: usize,
    touched: Vec<bool>,
    width: usize,
}

impl Builder {
    fn new(width: usize, height: usize, cols: usize, rows: usize) -> Self {
        Self {
            area: Area {
                height: 0,
                width: 0,
                x: width,
                y: height,
            },
            cols,
            coverage: vec![0; width * height],
            height,
            keys: Vec::new(),
            painted: 0,
            touched: vec![false; cols * rows],
            width,
        }
    }

    const fn index(&self, x: usize, y: usize) -> usize {
        y * self.width + x
    }

    fn coverage_at(&self, x: usize, y: usize) -> u8 {
        self.coverage[self.index(x, y)]
    }

    fn painted_at(&self, x: usize, y: usize) -> bool {
        self.coverage_at(x, y) > VISITED
    }

    /// Marks a pixel. The area and the tile list follow the marks, so nothing
    /// has to be walked afterwards to find out what the fill touched.
    fn mark(&mut self, x: usize, y: usize, value: u8) {
        let index = self.index(x, y);

        if value > VISITED && self.coverage[index] <= VISITED {
            self.painted += 1;
            self.area.x = self.area.x.min(x);
            self.area.y = self.area.y.min(y);
            self.area.width = self.area.width.max(x + 1 - self.area.x);
            self.area.height = self.area.height.max(y + 1 - self.area.y);

            let key = tile_key((x / TILE_SIZE) as u32, (y / TILE_SIZE) as u32, self.cols as u32);

            if !self.touched[key as usize] {
                self.touched[key as usize] = true;
                self.keys.push(key);
            }
        }

        self.coverage[index] = value;
    }

    fn painted_pixels(&self) -> Vec<usize> {
        let mut pixels = Vec::new();
        let area = self.area;

        for y in area.y..area.y + area.height {
            for x in area.x..area.x + area.width {
                if self.coverage_at(x, y) == REGION {
                    pixels.push(self.index(x, y));
                }
            }
        }

        pixels
    }

    /// Whether a pixel sits next to the painted region. The rings are built
    /// from this instead of from a list of region pixels: the plan holds no
    /// such list, and one pass over the touched rectangle has to be enough.
    fn near_region(&self, x: usize, y: usize, diagonal: bool) -> bool {
        let mut found = false;

        for_each_neighbour(x, y, self.width, self.height, diagonal, &mut |nx, ny| {
            if self.painted_at(nx, ny) {
                found = true;
            }
        });

        found
    }
}

/// Walks the connected region from the seed and marks it. A plain stack: the
/// fill runs on the wasm stack, and a recursive visitor would overflow it on a
/// whole sheet fill. Neighbours are marked the moment they are pushed, so no
/// pixel enters the stack twice.
fn flood(
    colors: &Colors,
    builder: &mut Builder,
    seed: (usize, usize),
    seed_color: Color,
    settings: FillSettings,
) {
    builder.mark(seed.0, seed.1, REGION);

    let mut stack = vec![builder.index(seed.0, seed.1)];

    while let Some(index) = stack.pop() {
        let (x, y) = (index % builder.width, index / builder.width);
        let mut next: Vec<(usize, usize)> = Vec::new();

        for_each_neighbour(
            x,
            y,
            builder.width,
            builder.height,
            settings.diagonal,
            &mut |nx, ny| next.push((nx, ny)),
        );

        for (nx, ny) in next {
            if builder.coverage_at(nx, ny) != 0 {
                continue;
            }

            let Some((color, _)) = colors.rgba(nx, ny) else {
                continue;
            };

            if color_distance(color, seed_color) > settings.tolerance {
                builder.mark(nx, ny, VISITED);

                continue;
            }

            builder.mark(nx, ny, REGION);
            stack.push(builder.index(nx, ny));
        }
    }
}

/// Marks every pixel of the layer that matches the seed, connected or not.
fn mark_similar(colors: &Colors, builder: &mut Builder, seed_color: Color, settings: FillSettings) {
    for y in 0..builder.height {
        for x in 0..builder.width {
            let Some((color, _)) = colors.rgba(x, y) else {
                continue;
            };

            if color_distance(color, seed_color) <= settings.tolerance {
                builder.mark(x, y, REGION);
            }
        }
    }
}

/// Ring around the region: pixels the seed comparison refused, painted anyway,
/// up to `grow` pixels out. Solid content stops it: without that the ring leaks
/// over the line the fill was meant to stop at, which is what a large grow
/// value does in every editor that offers one.
///
/// The ring is built a layer at a time, like a breadth first walk: a single
/// pass that marks as it goes would carry the ring further than the dial says,
/// and by an amount that depends on the order the pixels are visited in.
fn grow_ring(
    colors: &Colors,
    builder: &mut Builder,
    seed_color: Color,
    settings: FillSettings,
) {
    if settings.grow == 0 {
        return;
    }

    let mut frontier = builder.painted_pixels();

    for _ in 0..settings.grow {
        let mut next = Vec::new();

        for index in frontier {
            let (x, y) = (index % builder.width, index / builder.width);
            let mut candidates: Vec<(usize, usize)> = Vec::new();

            for_each_neighbour(
                x,
                y,
                builder.width,
                builder.height,
                settings.diagonal,
                &mut |nx, ny| candidates.push((nx, ny)),
            );

            for (nx, ny) in candidates {
                if builder.painted_at(nx, ny) {
                    continue;
                }

                let Some((color, cover)) = colors.rgba(nx, ny) else {
                    continue;
                };

                // A pixel of the region the flood could not reach belongs to the
                // region; it is not the ring's business.
                if color_distance(color, seed_color) <= settings.tolerance {
                    continue;
                }

                if cover >= DENSE_COVER {
                    continue;
                }

                builder.mark(nx, ny, REGION);
                next.push(builder.index(nx, ny));
            }
        }

        if next.is_empty() {
            return;
        }

        frontier = next;
    }
}

/// Softened edge: a pixel next to the region takes partial coverage from how
/// far its colour sits from the seed. Simple by design, not a curve fitted to
/// the neighbours: full up to the tolerance, nothing a feather width past it,
/// which is enough to eat the antialiased fringe the strict flood left behind.
fn feather_ring(
    colors: &Colors,
    builder: &mut Builder,
    seed_color: Color,
    settings: FillSettings,
) {
    if settings.feather == 0 {
        return;
    }

    let area = builder.area;
    let band = f64::from(settings.feather) * FEATHER_STEP;
    let tolerance = f64::from(settings.tolerance);

    for y in area.y..area.y + area.height {
        for x in area.x..area.x + area.width {
            if builder.painted_at(x, y) || !builder.near_region(x, y, settings.diagonal) {
                continue;
            }

            let Some((color, _)) = colors.rgba(x, y) else {
                continue;
            };

            let distance = f64::from(color_distance(color, seed_color));

            // A pixel of the region the flood could not reach: marking it here
            // would let the fill across a gap the connectivity forbids.
            if distance <= tolerance {
                continue;
            }

            let value = (1.0 - (distance - tolerance) / band) * 255.0;

            if value < 2.0 {
                continue;
            }

            builder.mark(x, y, value.round().clamp(2.0, 254.0) as u8);
        }
    }
}

/// Plans the region a click would pour into. `None` when the seed is outside
/// the document.
pub fn plan_fill(
    layers: &[Layer],
    size: Size,
    seed: Point,
    settings: FillSettings,
) -> Option<FillPlan> {
    let settings = settings.sane();
    let colors = Colors::new(layers, size);
    let (width, height) = (colors.width(), colors.height());
    let x = seed.x.floor();
    let y = seed.y.floor();

    if x < 0.0 || y < 0.0 {
        return None;
    }

    let (px, py) = (x as usize, y as usize);

    if px >= width || py >= height {
        return None;
    }

    let (seed_color, _) = colors.rgba(px, py)?;

    let grid = tile_grid(size, TILE_SIZE);
    let mut builder = Builder::new(width, height, grid.cols as usize, grid.rows as usize);

    if settings.similar {
        mark_similar(&colors, &mut builder, seed_color, settings);
    } else {
        flood(&colors, &mut builder, (px, py), seed_color, settings);
    }

    grow_ring(&colors, &mut builder, seed_color, settings);
    feather_ring(&colors, &mut builder, seed_color, settings);

    let Builder {
        area,
        coverage,
        keys,
        painted,
        ..
    } = builder;

    Some(FillPlan {
        area,
        coverage,
        height,
        keys,
        painted,
        width,
    })
}

/// Puts the fill colour into the region. Returns the tiles that really changed:
/// a colour over itself writes the same bytes and gives no history step, as a
/// stroke over the same colour does not.
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

    for y in plan.area.y..plan.area.y + plan.area.height {
        for x in plan.area.x..plan.area.x + plan.area.width {
            let coverage = plan.coverage[y * width + x];

            if coverage <= VISITED {
                continue;
            }

            let key = tile_key((x / TILE_SIZE) as u32, (y / TILE_SIZE) as u32, cols);

            if !tiles.contains(key) {
                created.push(key);
            }

            let tile = tiles.ensure(key);
            let offset = ((y % TILE_SIZE) * TILE_SIZE + (x % TILE_SIZE)) * 4;
            let was: [u8; 4] = tile.pixels[offset..offset + 4].try_into().expect("4 bytes");

            blend_source_over(
                &mut tile.pixels,
                offset,
                color,
                alpha * f64::from(coverage) / 255.0,
            );

            if tile.pixels[offset..offset + 4] != was {
                changed.insert(key);
            }
        }
    }

    // A tile created under a pixel that the blend left unchanged holds no
    // content: without the removal it would stay in the map as an empty entry
    // the cache and the file writer would keep seeing.
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

/// Outline of the region a click would pour into, for the preview under the
/// pointer. `None` when there is nothing to show: outside the document, or a
/// region too big for a hint to be useful.
pub fn plan_outline(
    layers: &[Layer],
    size: Size,
    seed: Point,
    settings: FillSettings,
) -> Option<Vec<f32>> {
    let width = (size.width.ceil() as usize).max(1);
    let height = (size.height.ceil() as usize).max(1);

    if width * height > PREVIEW_AREA {
        return None;
    }

    plan_fill(layers, size, seed, settings)?.outline()
}
