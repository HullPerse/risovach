//! Brush and stroke samples.
//!
//! A stroke is a row of stamps with spacing, not a smoothed polyline: only
//! this way the width follows pressure and every stamp lands pixel exact.

pub mod stroke;

#[cfg(test)]
mod tests;

use drawing_core::color::Color;

/// Share of the brush size below which pressure stops shrinking it.
pub const MIN_PRESSURE_SIZE_RATIO: f64 = 0.1;

/// Smallest spacing between stamps in document pixels.
pub const MIN_STAMP_DISTANCE: f64 = 0.5;

#[derive(Debug, Clone, PartialEq)]
pub struct BrushSettings {
    pub color: String,
    pub hardness: f64,
    pub opacity: f64,
    pub size: f64,
    pub spacing: f64,
}

/// Settings in a form ready for stamping. The colour is parsed once at stroke
/// start: parsing a string per stamp would be wasted work.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct StampStyle {
    pub color: Color,
    pub hardness: f64,
    pub size: f64,
    pub spacing: f64,
}

#[derive(Debug, Clone, Copy, PartialEq)]
pub struct StrokeSample {
    pub pressure: f64,
    pub tilt_x: f64,
    pub tilt_y: f64,
    pub time: f64,
    pub x: f64,
    pub y: f64,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Tool {
    Draw,
    Eraser,
}

impl BrushSettings {
    pub fn style(&self) -> StampStyle {
        StampStyle {
            color: Color::from_hex(&self.color).unwrap_or(Color::BLACK),
            hardness: self.hardness,
            size: self.size,
            spacing: self.spacing,
        }
    }

    pub fn same_as(&self, other: &Self) -> bool {
        self.color == other.color
            && self.hardness == other.hardness
            && self.opacity == other.opacity
            && self.size == other.size
            && self.spacing == other.spacing
    }
}

impl StampStyle {
    pub fn stamp_distance(&self) -> f64 {
        (self.size * self.spacing).max(MIN_STAMP_DISTANCE)
    }

    pub fn stamp_size(&self, pressure: f64) -> f64 {
        self.size
            * (MIN_PRESSURE_SIZE_RATIO + (1.0 - MIN_PRESSURE_SIZE_RATIO) * pressure.clamp(0.0, 1.0))
    }
}

impl StrokeSample {
    pub fn lerp(from: Self, to: Self, t: f64) -> Self {
        Self {
            pressure: from.pressure + (to.pressure - from.pressure) * t,
            tilt_x: from.tilt_x + (to.tilt_x - from.tilt_x) * t,
            tilt_y: from.tilt_y + (to.tilt_y - from.tilt_y) * t,
            time: from.time + (to.time - from.time) * t,
            x: from.x + (to.x - from.x) * t,
            y: from.y + (to.y - from.y) * t,
        }
    }
}

/// Places stamps along a segment, carrying the remainder into the next one:
/// without the carry every pointer event would drop part of a step and the
/// stroke would come out uneven.
pub fn stamp_distances(length: f64, spacing: f64, carry: f64) -> (f64, Vec<f64>) {
    if spacing <= 0.0 || length <= 0.0 {
        return (carry + length.max(0.0), Vec::new());
    }

    let mut distances = Vec::new();
    let mut next = spacing - (carry % spacing);

    while next <= length {
        distances.push(next);
        next += spacing;
    }

    let travelled = distances.last().copied().unwrap_or(-carry);

    (length - travelled, distances)
}
