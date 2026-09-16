//! Colour parsing and printing.
//! Mirrors `lib/color.utils.ts`: a three digit string expands, garbage gives
//! `None`, and printing uses uppercase.

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct Color {
    pub b: u8,
    pub g: u8,
    pub r: u8,
}

impl Color {
    pub const BLACK: Self = Self { b: 0, g: 0, r: 0 };
    pub const WHITE: Self = Self {
        b: 255,
        g: 255,
        r: 255,
    };

    pub const fn new(r: u8, g: u8, b: u8) -> Self {
        Self { b, g, r }
    }

    /// Accepts `#rrggbb`, `#rgb` and the same forms without a hash.
    pub fn from_hex(hex: &str) -> Option<Self> {
        let trimmed = hex.trim();
        let body = trimmed.strip_prefix('#').unwrap_or(trimmed);

        let expanded: String = if body.len() == 3 {
            body.chars().flat_map(|c| [c, c]).collect()
        } else {
            body.to_owned()
        };

        if expanded.len() != 6 || !expanded.chars().all(|c| c.is_ascii_hexdigit()) {
            return None;
        }

        Some(Self {
            b: u8::from_str_radix(&expanded[4..6], 16).ok()?,
            g: u8::from_str_radix(&expanded[2..4], 16).ok()?,
            r: u8::from_str_radix(&expanded[0..2], 16).ok()?,
        })
    }

    pub fn to_hex(self) -> String {
        format!("#{:02X}{:02X}{:02X}", self.r, self.g, self.b)
    }

    /// Packs into one number with the low byte red, to cross the wasm edge
    /// without strings.
    pub const fn to_u32(self) -> u32 {
        (self.r as u32) | ((self.g as u32) << 8) | ((self.b as u32) << 16)
    }

    pub const fn from_u32(value: u32) -> Self {
        Self {
            b: ((value >> 16) & 0xff) as u8,
            g: ((value >> 8) & 0xff) as u8,
            r: (value & 0xff) as u8,
        }
    }
}
