//! Format tests: file round trip, compression and behaviour on foreign data.
//!
//! Half of the tests are corrupted input. A file comes from outside, anyone may
//! open anything, so every read must return an error rather than a panic or
//! gigabytes of allocation.

use drawing_core::TILE_BYTES;
use drawing_core::TILE_SIZE;
use drawing_core::document::{Document, LayerId};
use drawing_core::geometry::Size;
use drawing_core::tile::{tile_grid, tile_key};

use super::bytes::ByteWriter;
use super::chunk::{KIND_LAYERS, KIND_TILES, write_chunk};
use super::{LoadError, MAGIC, SavedLayer, VERSION, encode_layers, encode_tiles, load, save};

fn size() -> Size {
    Size::new(512.0, 512.0)
}

fn document() -> Document {
    Document::new(size())
}

fn paint(document: &mut Document, layer_id: LayerId, x: usize, y: usize, rgba: [u8; 4]) {
    let cols = tile_grid(document.size(), TILE_SIZE).cols;
    let key = tile_key((x / TILE_SIZE) as u32, (y / TILE_SIZE) as u32, cols);
    let layer = document.layer_mut(layer_id).expect("layer exists");
    let tile = layer.tiles.ensure(key);
    let index = ((y % TILE_SIZE) * TILE_SIZE + (x % TILE_SIZE)) * 4;

    tile.pixels[index..index + 4].copy_from_slice(&rgba);
    tile.refresh_empty();
    tile.version += 1;
}

fn painted() -> Document {
    let mut document = document();

    paint(&mut document, 1, 10, 10, [0, 0, 0, 255]);
    paint(&mut document, 1, 300, 10, [255, 0, 0, 128]);
    paint(&mut document, 1, 511, 511, [0, 128, 255, 255]);

    let second = document.add_layer("Second layer");

    paint(&mut document, second, 100, 400, [12, 34, 56, 200]);

    document.set_layer_opacity(second, 0.5);
    document.set_layer_visible(second, false);

    document
}

/// A small one tile document. Corrupted input runs on it: where every parse
/// unpacks a megabyte, a test would take a minute.
fn small() -> Document {
    let mut document = Document::new(Size::new(256.0, 256.0));

    paint(&mut document, 1, 10, 10, [0, 0, 0, 255]);

    document
}

/// Compares a document with itself after a file round trip. Tile versions stay
/// out: they belong to an output session, not to the file.
fn compare_round_trip(original: &Document) {
    let loaded = load(&save(original)).expect("file reads");

    assert_eq!(original.size(), loaded.size());
    assert_eq!(original.active_layer_id(), loaded.active_layer_id());
    assert_eq!(original.layers().len(), loaded.layers().len());

    for (left, right) in original.layers().iter().zip(loaded.layers()) {
        assert_eq!(left.id, right.id);
        assert_eq!(left.name, right.name);
        assert_eq!(left.opacity, right.opacity);
        assert_eq!(left.visible, right.visible);
        assert_eq!(left.tiles.keys(), right.tiles.keys());

        for key in left.tiles.keys() {
            let before = left.tiles.get(key).expect("tile exists");
            let after = right.tiles.get(key).expect("tile exists");

            assert_eq!(before.pixels, after.pixels, "tile {key} differs");
            assert_eq!(before.empty, after.empty);
        }
    }
}

/// Builds a file from arbitrary chunks. Needed to check reading on data a
/// correct writer never produces.
fn build(size: Size, active: LayerId, chunks: &[(u32, Vec<u8>)]) -> Vec<u8> {
    let mut writer = ByteWriter::new();

    writer.raw(&MAGIC);
    writer.u16(VERSION);
    writer.u16(0);
    writer.u32(size.width as u32);
    writer.u32(size.height as u32);
    writer.u32(active);
    writer.u32(chunks.len() as u32);

    for (kind, raw) in chunks {
        write_chunk(&mut writer, *kind, raw);
    }

    writer.into_bytes()
}

fn saved_layer(id: LayerId, tiles: Vec<(u32, Vec<u8>)>) -> SavedLayer {
    SavedLayer {
        id,
        name: format!("Layer {id}"),
        opacity: 1.0,
        tiles,
        visible: true,
    }
}

fn one_tile() -> Vec<u8> {
    vec![255_u8; TILE_BYTES]
}

#[test]
fn round_trip_keeps_every_pixel() {
    compare_round_trip(&painted());
}

#[test]
fn empty_document_round_trips() {
    compare_round_trip(&document());
}

#[test]
fn transparent_tiles_are_not_written() {
    let mut document = document();

    // The tile exists but its pixels are transparent: nothing of it may stay
    // in the file, or an empty canvas would weigh megabytes.
    let layer = document.layer_mut(1).expect("layer exists");

    layer.tiles.ensure(0);

    let bytes = save(&document);
    let loaded = load(&bytes).expect("file reads");

    assert!(bytes.len() < TILE_BYTES / 4);
    assert_eq!(loaded.layers()[0].tiles.len(), 0);
}

#[test]
fn compression_shrinks_a_thin_line() {
    let mut document = document();

    for x in 0..512 {
        paint(&mut document, 1, x, 200, [0, 0, 0, 255]);
    }

    let bytes = save(&document);
    let raw = 4 * TILE_BYTES;

    assert!(
        bytes.len() * 20 < raw,
        "file is {} bytes against {} uncompressed",
        bytes.len(),
        raw
    );
}

#[test]
fn active_layer_survives_the_round_trip() {
    let mut document = document();

    document.add_layer("Second layer");
    document.set_active_layer(2);

    compare_round_trip(&document);
}

#[test]
fn out_of_range_opacity_is_clamped() {
    let mut document = document();

    document.set_layer_opacity(1, 5.0);

    let loaded = load(&save(&document)).expect("file reads");

    assert_eq!(loaded.layers()[0].opacity, 1.0);
}

#[test]
fn foreign_file_is_rejected() {
    assert!(matches!(
        load(b"not a project"),
        Err(LoadError::NotAProject)
    ));
}

#[test]
fn future_version_is_rejected() {
    let mut bytes = save(&document());

    bytes[4..6].copy_from_slice(&99_u16.to_le_bytes());

    assert!(matches!(
        load(&bytes),
        Err(LoadError::UnsupportedVersion(99))
    ));
}

#[test]
fn unknown_chunk_is_skipped() {
    let mut bytes = save(&painted());
    let count = u32::from_le_bytes(bytes[20..24].try_into().expect("chunk count"));

    bytes[20..24].copy_from_slice(&(count + 1).to_le_bytes());

    let mut writer = ByteWriter::new();

    write_chunk(&mut writer, 7777, b"chunk from a future version");

    bytes.extend_from_slice(&writer.into_bytes());

    let loaded = load(&bytes).expect("a foreign chunk does not interfere");

    assert_eq!(loaded.layers().len(), 2);
}

#[test]
fn unknown_codec_is_rejected() {
    let mut writer = ByteWriter::new();

    writer.u32(KIND_LAYERS);
    writer.u32(7);
    writer.u32(4);
    writer.u32(4);
    writer.raw(&[0, 0, 0, 0]);

    let bytes = build(size(), 1, &[(KIND_LAYERS, Vec::new())]);
    let mut broken = bytes[..24].to_vec();

    broken.extend_from_slice(&writer.into_bytes());

    assert!(matches!(load(&broken), Err(LoadError::UnsupportedCodec(7))));
}

#[test]
fn corrupt_deflate_is_rejected() {
    let junk = b"not a zlib stream at all";

    let mut writer = ByteWriter::new();

    writer.u32(KIND_LAYERS);
    writer.u32(1);
    writer.u32(64);
    writer.u32(junk.len() as u32);
    writer.raw(junk);

    let mut bytes = build(size(), 1, &[(KIND_LAYERS, Vec::new())])[..24].to_vec();

    bytes.extend_from_slice(&writer.into_bytes());

    assert!(matches!(load(&bytes), Err(LoadError::Decompress)));
}

#[test]
fn missing_layers_chunk_is_rejected() {
    let chunk = encode_tiles(&saved_layer(1, vec![(0, one_tile())]));
    let bytes = build(size(), 1, &[(KIND_TILES, chunk)]);

    assert!(matches!(load(&bytes), Err(LoadError::Missing(_))));
}

#[test]
fn empty_layer_list_is_rejected() {
    let bytes = build(size(), 1, &[(KIND_LAYERS, encode_layers(&[]))]);

    assert!(matches!(load(&bytes), Err(LoadError::InvalidDocument(_))));
}

#[test]
fn duplicate_layer_ids_are_rejected() {
    let chunk = encode_layers(&[saved_layer(1, Vec::new()), saved_layer(1, Vec::new())]);
    let bytes = build(size(), 1, &[(KIND_LAYERS, chunk)]);

    assert!(matches!(load(&bytes), Err(LoadError::InvalidDocument(_))));
}

#[test]
fn missing_active_layer_is_rejected() {
    let chunk = encode_layers(&[saved_layer(1, Vec::new())]);
    let bytes = build(size(), 7, &[(KIND_LAYERS, chunk)]);

    assert!(matches!(load(&bytes), Err(LoadError::InvalidDocument(_))));
}

#[test]
fn tiles_of_a_foreign_layer_are_rejected() {
    let layers = encode_layers(&[saved_layer(1, Vec::new())]);
    let tiles = encode_tiles(&saved_layer(42, vec![(0, one_tile())]));
    let bytes = build(size(), 1, &[(KIND_LAYERS, layers), (KIND_TILES, tiles)]);

    assert!(matches!(load(&bytes), Err(LoadError::InvalidDocument(_))));
}

#[test]
fn tile_key_outside_the_grid_is_rejected() {
    let layers = encode_layers(&[saved_layer(1, Vec::new())]);
    let tiles = encode_tiles(&saved_layer(1, vec![(999, one_tile())]));
    let bytes = build(size(), 1, &[(KIND_LAYERS, layers), (KIND_TILES, tiles)]);

    assert!(matches!(load(&bytes), Err(LoadError::InvalidDocument(_))));
}

#[test]
fn hostile_canvas_size_is_rejected() {
    let chunk = encode_layers(&[saved_layer(1, Vec::new())]);
    let bytes = build(Size::new(100_000.0, 100_000.0), 1, &[(KIND_LAYERS, chunk)]);

    assert!(matches!(load(&bytes), Err(LoadError::InvalidDocument(_))));
}

#[test]
fn zero_canvas_size_is_rejected() {
    let chunk = encode_layers(&[saved_layer(1, Vec::new())]);
    let bytes = build(Size::new(0.0, 100.0), 1, &[(KIND_LAYERS, chunk)]);

    assert!(matches!(load(&bytes), Err(LoadError::InvalidDocument(_))));
}

#[test]
fn truncated_file_returns_an_error() {
    let bytes = save(&small());

    for length in 0..bytes.len() {
        assert!(
            load(&bytes[..length]).is_err(),
            "a file cut to {length} bytes read"
        );
    }
}

#[test]
fn damaged_file_never_panics() {
    let source = save(&small());

    for index in 0..source.len() {
        for patch in [0x00_u8, 0xff] {
            let mut bytes = source.clone();

            bytes[index] = patch;

            // The outcome does not matter: a corrupted byte must not panic and
            // must not allocate an unreasonable amount of memory.
            let _ = load(&bytes);
        }
    }
}
