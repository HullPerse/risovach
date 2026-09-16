//! Chunks: frame, compression and limits.
//!
//! A file is a header plus a sequence of chunks. A chunk is a kind, a
//! compression, two lengths and the data itself. The frame gives two things it
//! exists for: an unknown chunk can be skipped without understanding it, and
//! the unpack limit is known before unpacking.
//!
//! Compression is deflate. Tile pixels are almost fully transparent, and
//! sparse alpha shrinks tenfold, so a project file weighs kilobytes, not
//! megabytes. A compressed piece no smaller than the source is stored as is:
//! on noise deflate saves a few percent, and parsing it again is pointless.

use miniz_oxide::deflate::compress_to_vec_zlib;
use miniz_oxide::inflate::decompress_to_vec_zlib_with_limit;

use crate::LoadError;
use crate::bytes::{ByteReader, ByteWriter};

/// Layer description: id, name, opacity, visibility.
pub const KIND_LAYERS: u32 = 1;

/// Tiles of one layer, with their keys.
pub const KIND_TILES: u32 = 2;

const CODEC_RAW: u32 = 0;
const CODEC_DEFLATE: u32 = 1;

/// Compression level. Six is the middle: a file is written once and read many
/// times, so chasing the last percent of size is pointless.
const LEVEL: u8 = 6;

#[derive(Debug, Clone, Copy)]
pub struct ChunkHeader {
    pub codec: u32,
    pub kind: u32,
    pub raw_length: usize,
    pub stored_length: usize,
}

pub fn write_chunk(writer: &mut ByteWriter, kind: u32, raw: &[u8]) {
    let compressed = compress_to_vec_zlib(raw, LEVEL);
    let stored: &[u8] = if compressed.len() < raw.len() {
        &compressed
    } else {
        raw
    };
    let codec = if stored.len() == raw.len() {
        CODEC_RAW
    } else {
        CODEC_DEFLATE
    };

    writer.u32(kind);
    writer.u32(codec);
    writer.u32(raw.len() as u32);
    writer.u32(stored.len() as u32);
    writer.raw(stored);
}

pub fn read_header(reader: &mut ByteReader) -> Result<ChunkHeader, LoadError> {
    Ok(ChunkHeader {
        kind: reader.u32()?,
        codec: reader.u32()?,
        raw_length: reader.u32()? as usize,
        stored_length: reader.u32()? as usize,
    })
}

/// Reads and unpacks a chunk body. The unpack limit comes from outside and is
/// known before the call: it follows from the document tile count, so a
/// planted header cannot make us allocate gigabytes.
pub fn read_body(
    reader: &mut ByteReader,
    header: &ChunkHeader,
    limit: usize,
) -> Result<Vec<u8>, LoadError> {
    if header.raw_length > limit {
        return Err(LoadError::TooLarge(header.raw_length));
    }

    let stored = reader.take(header.stored_length)?;

    match header.codec {
        CODEC_RAW => {
            if header.stored_length != header.raw_length {
                return Err(LoadError::Corrupt("длина тела не сходится"));
            }

            Ok(stored.to_vec())
        }
        CODEC_DEFLATE => {
            let raw = decompress_to_vec_zlib_with_limit(stored, limit)
                .map_err(|_| LoadError::Decompress)?;

            if raw.len() != header.raw_length {
                return Err(LoadError::Corrupt("длина после распаковки не сходится"));
            }

            Ok(raw)
        }
        other => Err(LoadError::UnsupportedCodec(other)),
    }
}
