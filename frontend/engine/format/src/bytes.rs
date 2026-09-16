//! Number reading and writing for the project format.
//!
//! Both directions are little endian and rely on no in memory struct layout: a
//! file written on one platform must read on any other, and the WebAssembly
//! module must not depend on how the compiler placed fields.
//!
//! Reading checks the length before every access and returns an error instead
//! of panicking. The file comes from outside, anyone may open anything, and no
//! read is allowed to panic.

use crate::LoadError;

#[derive(Debug, Default)]
pub struct ByteWriter {
    bytes: Vec<u8>,
}

impl ByteWriter {
    pub const fn new() -> Self {
        Self { bytes: Vec::new() }
    }

    pub fn u8(&mut self, value: u8) {
        self.bytes.push(value);
    }

    pub fn u16(&mut self, value: u16) {
        self.bytes.extend_from_slice(&value.to_le_bytes());
    }

    pub fn u32(&mut self, value: u32) {
        self.bytes.extend_from_slice(&value.to_le_bytes());
    }

    pub fn f64(&mut self, value: f64) {
        self.bytes.extend_from_slice(&value.to_le_bytes());
    }

    pub fn raw(&mut self, value: &[u8]) {
        self.bytes.extend_from_slice(value);
    }

    /// String with a two byte length in front. Layer names longer than 65535
    /// bytes are cut: a name is a label, not data.
    pub fn text(&mut self, value: &str) {
        let bytes = value.as_bytes();
        let length = bytes.len().min(usize::from(u16::MAX)) as u16;

        self.u16(length);
        self.raw(&bytes[..usize::from(length)]);
    }

    pub fn into_bytes(self) -> Vec<u8> {
        self.bytes
    }
}

#[derive(Debug, Clone, Copy)]
pub struct ByteReader<'a> {
    bytes: &'a [u8],
    position: usize,
}

impl<'a> ByteReader<'a> {
    pub const fn new(bytes: &'a [u8]) -> Self {
        Self { bytes, position: 0 }
    }

    pub const fn remaining(&self) -> usize {
        self.bytes.len() - self.position
    }

    pub fn take(&mut self, length: usize) -> Result<&'a [u8], LoadError> {
        if self.remaining() < length {
            return Err(LoadError::Truncated);
        }

        let slice = &self.bytes[self.position..self.position + length];

        self.position += length;

        Ok(slice)
    }

    pub fn u8(&mut self) -> Result<u8, LoadError> {
        Ok(self.take(1)?[0])
    }

    pub fn u16(&mut self) -> Result<u16, LoadError> {
        let bytes = self.take(2)?;

        Ok(u16::from_le_bytes([bytes[0], bytes[1]]))
    }

    pub fn u32(&mut self) -> Result<u32, LoadError> {
        let bytes = self.take(4)?;

        Ok(u32::from_le_bytes([bytes[0], bytes[1], bytes[2], bytes[3]]))
    }

    pub fn f64(&mut self) -> Result<f64, LoadError> {
        let bytes = self.take(8)?;
        let mut raw = [0_u8; 8];

        raw.copy_from_slice(bytes);

        Ok(f64::from_le_bytes(raw))
    }

    /// Element count with a limit check. The limit exists because a number
    /// from a file must not become a vector length unchecked: one bit in the
    /// top byte asks for gigabytes.
    pub fn count(&mut self, limit: usize) -> Result<usize, LoadError> {
        let value = self.u32()? as usize;

        if value > limit {
            return Err(LoadError::TooLarge(value));
        }

        Ok(value)
    }

    pub fn text(&mut self) -> Result<String, LoadError> {
        let length = usize::from(self.u16()?);

        String::from_utf8(self.take(length)?.to_vec()).map_err(|_| LoadError::BadText)
    }
}
