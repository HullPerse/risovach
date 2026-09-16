//! Geometry primitives.
//! Floats everywhere so the arithmetic matches the frontend: document size
//! arrives as `f64`, not as an integer.

#[derive(Debug, Clone, Copy, PartialEq)]
pub struct Size {
    pub height: f64,
    pub width: f64,
}

#[derive(Debug, Clone, Copy, PartialEq)]
pub struct Point {
    pub x: f64,
    pub y: f64,
}

#[derive(Debug, Clone, Copy, PartialEq)]
pub struct Rect {
    pub height: f64,
    pub width: f64,
    pub x: f64,
    pub y: f64,
}

impl Size {
    pub const fn new(width: f64, height: f64) -> Self {
        Self { height, width }
    }
}

impl Point {
    pub const fn new(x: f64, y: f64) -> Self {
        Self { x, y }
    }
}

impl Rect {
    pub const fn new(x: f64, y: f64, width: f64, height: f64) -> Self {
        Self {
            height,
            width,
            x,
            y,
        }
    }
}
