//! `.hpd` project file format.
//!
//! The raster is the truth: a file stores what is drawn, not what drew it.
//! Rebuilding a drawing by replaying strokes would tie the picture to the
//! rasterizer version: a change to brush softness would silently alter every
//! old file. Coordinate streams are also not sparse, so two hundred strokes
//! would weigh more than the compressed tiles of the whole drawing.
//!
//! Layout:
//!
//! ```text
//! header: magic HPD1, version, flags, width, height, active layer, chunks
//! chunk:  kind, compression, length before and in file, body
//! ```
//!
//! Layers and tiles travel in separate chunks: the layer description is needed
//! whole and at once, while tiles are read layer by layer, and their unpack
//! limit follows from the canvas tile count. An unknown chunk is skipped whole,
//! so a file from a newer version still opens here.
//!
//! The crate knows only about `drawing-core` and compression. No browser, no
//! JavaScript, no viewport, so a native application reads the same format.

mod bytes;
mod chunk;

#[cfg(test)]
mod tests;

use std::fmt::{self, Display, Formatter};

use bytes::{ByteReader, ByteWriter};
use chunk::{KIND_LAYERS, KIND_TILES, read_body, write_chunk};
use drawing_core::document::{Document, Layer, LayerId};
use drawing_core::geometry::Size;
use drawing_core::tile::{TileKey, TileMap, tile_grid};
use drawing_core::{TILE_BYTES, TILE_SIZE};

/// File magic.
const MAGIC: [u8; 4] = *b"HPD1";

/// Layout version. A reader must refuse a foreign version instead of parsing
/// it at random.
pub const VERSION: u16 = 1;

/// Layer count limit. A guard against a planted header, not a product
/// restriction.
const MAX_LAYERS: usize = 512;

/// Chunk count limit in a file.
const MAX_CHUNKS: usize = 4096;

/// Document side limit. An 8000 by 6000 canvas fits with room to spare.
const MAX_DIMENSION: f64 = 16384.0;

/// Limit of the total tile count of a document.
const MAX_TILES: usize = 4096;

#[derive(Debug)]
pub enum LoadError {
    /// Magic mismatch: this is not a project file.
    NotAProject,
    /// Layout version is not supported.
    UnsupportedVersion(u16),
    /// Compression method is not supported.
    UnsupportedCodec(u32),
    /// Less data than the header promises.
    Truncated,
    /// A number from the file is above the limit.
    TooLarge(usize),
    /// Layer name is not valid UTF-8 text.
    BadText,
    /// The compressed piece does not unpack.
    Decompress,
    /// Numbers inside the file contradict each other.
    Corrupt(&'static str),
    /// The document from the file is not a valid one.
    InvalidDocument(&'static str),
    /// A required chunk is missing from the file.
    Missing(&'static str),
}

impl Display for LoadError {
    fn fmt(&self, formatter: &mut Formatter<'_>) -> fmt::Result {
        match self {
            Self::NotAProject => write!(formatter, "это не файл проекта"),
            Self::UnsupportedVersion(version) => {
                write!(formatter, "версия файла {version} не поддерживается")
            }
            Self::UnsupportedCodec(codec) => {
                write!(formatter, "способ сжатия {codec} не поддерживается")
            }
            Self::Truncated => write!(formatter, "файл обрывается"),
            Self::TooLarge(value) => write!(formatter, "недопустимое число в файле: {value}"),
            Self::BadText => write!(formatter, "имя слоя не читается как текст"),
            Self::Decompress => write!(formatter, "сжатые данные не распаковываются"),
            Self::Corrupt(what) => write!(formatter, "повреждённый файл: {what}"),
            Self::InvalidDocument(what) => write!(formatter, "документ не собирается: {what}"),
            Self::Missing(what) => write!(formatter, "в файле нет обязательного чанка: {what}"),
        }
    }
}

impl core::error::Error for LoadError {}

/// File header: everything read before chunks. A separate step is needed
/// because checking a header and parsing contents are different operations,
/// and the first must work on its own.
struct Header {
    active_id: LayerId,
    chunks: usize,
    size: Size,
    tiles_total: usize,
}

fn read_header(source: &[u8]) -> Result<(Header, ByteReader<'_>), LoadError> {
    let mut reader = ByteReader::new(source);

    if reader.take(4)? != MAGIC {
        return Err(LoadError::NotAProject);
    }

    let version = reader.u16()?;

    if version != VERSION {
        return Err(LoadError::UnsupportedVersion(version));
    }

    let _flags = reader.u16()?;

    let size = Size::new(reader.u32()? as f64, reader.u32()? as f64);
    let active_id = reader.u32()?;
    let chunks = reader.count(MAX_CHUNKS)?;

    if size.width <= 0.0 || size.height <= 0.0 {
        return Err(LoadError::InvalidDocument("нулевой размер холста"));
    }

    if size.width > MAX_DIMENSION || size.height > MAX_DIMENSION {
        return Err(LoadError::InvalidDocument("холст больше допустимого"));
    }

    let grid = tile_grid(size, TILE_SIZE);
    let tiles_total = (grid.cols as usize) * (grid.rows as usize);

    if tiles_total > MAX_TILES {
        return Err(LoadError::InvalidDocument("в холсте слишком много тайлов"));
    }

    Ok((
        Header {
            active_id,
            chunks,
            size,
            tiles_total,
        },
        reader,
    ))
}

struct SavedLayer {
    id: LayerId,
    name: String,
    opacity: f64,
    tiles: Vec<(TileKey, Vec<u8>)>,
    visible: bool,
}

struct LayerRow {
    id: LayerId,
    name: String,
    opacity: f64,
    visible: bool,
}

struct TileSet {
    layer_id: LayerId,
    tiles: Vec<(TileKey, Vec<u8>)>,
}

/// Builds the project file. Fully transparent tiles are not written: an empty
/// tile means no tile, not megabytes of zeros.
pub fn save(document: &Document) -> Vec<u8> {
    let mut layers = Vec::new();

    for layer in document.layers() {
        let mut tiles = Vec::new();

        for key in layer.tiles.keys() {
            if let Some(tile) = layer.tiles.get(key)
                && !tile.is_empty()
            {
                tiles.push((key, tile.pixels.clone()));
            }
        }

        layers.push(SavedLayer {
            id: layer.id,
            name: layer.name.clone(),
            opacity: layer.opacity,
            tiles,
            visible: layer.visible,
        });
    }

    let mut chunks: Vec<(u32, Vec<u8>)> = vec![(KIND_LAYERS, encode_layers(&layers))];

    for layer in &layers {
        if !layer.tiles.is_empty() {
            chunks.push((KIND_TILES, encode_tiles(layer)));
        }
    }

    let size = document.size();
    let mut writer = ByteWriter::new();

    writer.raw(&MAGIC);
    writer.u16(VERSION);
    writer.u16(0);
    writer.u32(dimension(size.width));
    writer.u32(dimension(size.height));
    writer.u32(document.active_layer_id());
    writer.u32(chunks.len() as u32);

    for (kind, raw) in chunks {
        write_chunk(&mut writer, kind, &raw);
    }

    writer.into_bytes()
}

/// Reads a project file. Any surprise is an error rather than a panic: the
/// file comes from outside.
pub fn load(source: &[u8]) -> Result<Document, LoadError> {
    let (header, mut reader) = read_header(source)?;

    let size = header.size;
    let active_id = header.active_id;
    let chunks = header.chunks;
    let grid = tile_grid(size, TILE_SIZE);
    let tiles_total = header.tiles_total;

    // Unpack limits are known before chunks are read, so a planted number
    // cannot make us allocate gigabytes.
    let layers_limit = MAX_LAYERS * 64;
    let tiles_limit = 8 + tiles_total * (8 + TILE_BYTES);

    let mut rows: Option<Vec<LayerRow>> = None;
    let mut sets: Vec<TileSet> = Vec::new();

    for _ in 0..chunks {
        let header = chunk::read_header(&mut reader)?;

        match header.kind {
            KIND_LAYERS => rows = Some(decode_layers(&mut reader, &header, layers_limit)?),
            KIND_TILES => {
                let raw = read_body(&mut reader, &header, tiles_limit)?;

                sets.push(decode_tiles(&raw, tiles_total)?);
            }
            _ => {
                // A chunk of unknown kind is skipped whole and without
                // unpacking: there is nothing to parse it with.
                reader.take(header.stored_length)?;
            }
        }
    }

    let rows = rows.ok_or(LoadError::Missing("описание слоёв"))?;

    if rows.is_empty() {
        return Err(LoadError::InvalidDocument("в файле нет ни одного слоя"));
    }

    let mut layers: Vec<Layer> = rows
        .into_iter()
        .map(|row| Layer {
            id: row.id,
            name: row.name,
            opacity: row.opacity,
            tiles: TileMap::new(grid.cols),
            visible: row.visible,
        })
        .collect();

    for set in sets {
        let Some(layer) = layers.iter_mut().find(|item| item.id == set.layer_id) else {
            return Err(LoadError::InvalidDocument("тайлы ссылаются на чужой слой"));
        };

        for (key, pixels) in set.tiles {
            let tile = layer.tiles.ensure(key);

            tile.pixels.copy_from_slice(&pixels);
            tile.refresh_empty();
            tile.version = 0;
        }
    }

    Document::restore(size, layers, active_id).ok_or(LoadError::InvalidDocument(
        "слои или активный слой не сходятся",
    ))
}

/// Document size in a file is a whole number of pixels. A fractional canvas
/// size from the layout rounds: a pixel is a unit, not a fraction.
fn dimension(value: f64) -> u32 {
    value.round().clamp(0.0, u32::MAX as f64) as u32
}

fn encode_layers(layers: &[SavedLayer]) -> Vec<u8> {
    let mut writer = ByteWriter::new();

    writer.u32(layers.len() as u32);

    for layer in layers {
        writer.u32(layer.id);
        writer.f64(layer.opacity);
        writer.u8(u8::from(layer.visible));
        writer.text(&layer.name);
    }

    writer.into_bytes()
}

fn encode_tiles(layer: &SavedLayer) -> Vec<u8> {
    let mut writer = ByteWriter::new();

    writer.u32(layer.id);
    writer.u32(layer.tiles.len() as u32);

    for (key, pixels) in &layer.tiles {
        writer.u32(*key);
        writer.u32(pixels.len() as u32);
        writer.raw(pixels);
    }

    writer.into_bytes()
}

fn decode_layers(
    reader: &mut ByteReader,
    header: &chunk::ChunkHeader,
    limit: usize,
) -> Result<Vec<LayerRow>, LoadError> {
    let raw = read_body(reader, header, limit)?;
    let mut body = ByteReader::new(&raw);
    let count = body.count(MAX_LAYERS)?;
    let mut rows = Vec::with_capacity(count);
    let mut seen: Vec<LayerId> = Vec::with_capacity(count);

    for _ in 0..count {
        let id = body.u32()?;
        let opacity = body.f64()?;
        let visible = body.u8()? != 0;
        let name = body.text()?;

        if seen.contains(&id) {
            return Err(LoadError::InvalidDocument(
                "идентификаторы слоёв повторяются",
            ));
        }

        if !opacity.is_finite() {
            return Err(LoadError::InvalidDocument("непрозрачность слоя не число"));
        }

        seen.push(id);

        rows.push(LayerRow {
            id,
            name,
            opacity: opacity.clamp(0.0, 1.0),
            visible,
        });
    }

    Ok(rows)
}

fn decode_tiles(raw: &[u8], tiles_total: usize) -> Result<TileSet, LoadError> {
    let mut body = ByteReader::new(raw);
    let layer_id = body.u32()?;
    let count = body.count(tiles_total)?;
    let mut tiles = Vec::with_capacity(count);

    for _ in 0..count {
        let key = body.u32()?;
        let length = body.u32()? as usize;

        if key as usize >= tiles_total {
            return Err(LoadError::InvalidDocument("ключ тайла вне сетки холста"));
        }

        if length != TILE_BYTES {
            return Err(LoadError::Corrupt("размер тайла не тот"));
        }

        tiles.push((key, body.take(length)?.to_vec()));
    }

    Ok(TileSet { layer_id, tiles })
}
