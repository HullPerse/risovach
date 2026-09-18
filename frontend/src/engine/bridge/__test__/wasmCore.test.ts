import { describe, expect, test } from "bun:test";
import { existsSync } from "node:fs";

import { loadDrawingEngine } from "@/engine/bridge/wasm.engine";
import { WasmDrawingCore } from "@/engine/bridge/wasmCore.engine";
import {
  tile_bytes as wasmTileBytes,
  tile_size as wasmTileSize,
} from "@/wasm/drawing/drawing_engine";
import type { StrokeSample } from "@/types/engine/brush";

/**
 * Tile pixels reach the output by address in module memory, not through a
 * buffer travelling in and back. Everything the single remaining copy depends
 * on is checked here: tile side and byte length come from the core, an
 * existing tile copies whole and repeatedly, a missing tile leaves the buffer
 * untouched, and a stroke buffer tile has an address of its own.
 *
 * The module is built by a separate command, so without the artifact these
 * tests are skipped: a clean clone without the Rust toolchain stays green.
 */
const WASM_PATH = "src/wasm/drawing/drawing_engine_bg.wasm";

/**
 * Tile pixel length in bytes. Asked from the core, not computed from a
 * frontend constant: the buffer must match what `readTile` copies.
 */
const tileBytes = (): number => wasmTileBytes();

const SIZE = { height: 512, width: 512 };

const skipWithoutEngine = existsSync(WASM_PATH) ? test : test.skip;

const sample = (x: number, y: number): StrokeSample => ({
  pressure: 1,
  tiltX: 0,
  tiltY: 0,
  time: 0,
  x,
  y,
});

const loadEngine = async () => {
  await loadDrawingEngine({
    module_or_path: await Bun.file(WASM_PATH).arrayBuffer(),
  });
};

/**
 * How many layer pixels of every alpha value the document holds. The pencil
 * is read through this: a strict tool leaves nothing but zeroes and 255s.
 */
const alphaHistogram = (core: WasmDrawingCore) => {
  const histogram = new Map<number, number>();
  const target = new Uint8Array(tileBytes());

  for (const ref of core.layerTiles(core.activeLayerId)) {
    if (!core.readTile(ref, target)) continue;

    for (let index = 3; index < target.length; index += 4) {
      const alpha = target[index];

      histogram.set(alpha, (histogram.get(alpha) ?? 0) + 1);
    }
  }

  return histogram;
};

describe("tile pixels across the edge", () => {
  skipWithoutEngine("tile side and length come from the core", async () => {
    await loadEngine();

    const core = await WasmDrawingCore.create(SIZE);

    expect(core.tileSize).toBe(wasmTileSize());
    expect(wasmTileBytes()).toBe(core.tileSize * core.tileSize * 4);

    core.dispose();
  });

  skipWithoutEngine("a tile copies into the buffer whole and repeats", async () => {
    await loadEngine();

    const core = await WasmDrawingCore.create(SIZE);

    core.beginStroke(sample(30, 30));
    core.pushSamples([sample(120, 90)]);
    core.endStroke();

    const [ref] = core.layerTiles(core.activeLayerId);

    expect(ref).toBeDefined();

    const first = new Uint8Array(tileBytes());

    expect(core.readTile(ref, first)).toBe(true);
    expect(first.some((byte) => byte !== 0)).toBe(true);

    // The buffer is filled whole, not partly: no leftover of the previous
    // read may stay in it
    const second = new Uint8Array(tileBytes()).fill(0xaa);

    expect(core.readTile(ref, second)).toBe(true);
    expect(second).toEqual(first);

    core.dispose();
  });

  skipWithoutEngine("a missing tile leaves the buffer alone", async () => {
    await loadEngine();

    const core = await WasmDrawingCore.create(SIZE);
    const target = new Uint8Array(tileBytes()).fill(7);

    expect(
      core.readTile(
        { key: 999, layerId: core.activeLayerId, source: "layer", version: 1 },
        target
      )
    ).toBe(false);
    expect([...target].every((byte) => byte === 7)).toBe(true);

    core.dispose();
  });

  skipWithoutEngine("the pencil paints strict pixels, the brush a fringe", async () => {
    await loadEngine();

    const core = await WasmDrawingCore.create(SIZE);

    core.setBrush({ color: "#000000", hardness: 1, opacity: 1, size: 1, spacing: 0.25 });

    // Both clicks land on a pixel corner: the pencil snaps to the pixel it
    // hit and leaves only that one, the brush spreads over the four corners
    // with partial coverage.
    expect(core.setTool("pencil")).toBe(true);
    expect(core.tool).toBe("pencil");

    core.beginStroke(sample(30, 30));
    core.endStroke();

    const pencil = alphaHistogram(core);

    expect(pencil.get(255)).toBe(1);
    expect([...pencil.keys()].every((alpha) => alpha === 0 || alpha === 255)).toBe(
      true
    );

    expect(core.setTool("draw")).toBe(true);

    core.beginStroke(sample(60, 60));
    core.endStroke();

    const brush = alphaHistogram(core);

    expect([...brush.keys()].some((alpha) => alpha !== 0 && alpha !== 255)).toBe(
      true
    );

    core.dispose();
  });

  skipWithoutEngine("a stroke buffer tile has an address of its own", async () => {
    await loadEngine();

    const core = await WasmDrawingCore.create(SIZE);

    core.beginStroke(sample(50, 50));

    const refs = core.overlayTiles();

    expect(refs.length).toBeGreaterThan(0);

    const target = new Uint8Array(tileBytes());

    expect(core.readTile(refs[0], target)).toBe(true);
    expect(target.some((byte) => byte !== 0)).toBe(true);

    core.endStroke();
    core.dispose();
  });
});
