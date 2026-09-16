import { describe, expect, test } from "bun:test";
import { existsSync } from "node:fs";

import { loadDrawingEngine } from "@/engine/bridge/wasm.engine";
import { WasmDrawingCore } from "@/engine/bridge/wasmCore.engine";
import { exportProject, readProjectFile } from "@/engine/files/project.engine";
import type { BrushSettings, StrokeSample } from "@/types/brush";
import type { DrawingCore, Size } from "@/types/drawing";

/**
 * Whole project file path: draw, save, reopen, compare pixels. Rust tests
 * cover the format and the editor commands apart, while here the WebAssembly
 * edge is exercised, which nothing else touches.
 *
 * The module is built by a separate command, so without the artifact these
 * tests are skipped: a clean clone without the Rust toolchain stays green.
 */
const WASM_PATH = "src/wasm/drawing/drawing_engine_bg.wasm";

const SIZE: Size = { height: 512, width: 512 };

const BRUSH: BrushSettings = {
  color: "#ff0000",
  hardness: 1,
  opacity: 0.5,
  size: 12,
  spacing: 0.25,
};

const sample = (x: number, y: number): StrokeSample => ({
  pressure: 1,
  tiltX: 0,
  tiltY: 0,
  time: 0,
  x,
  y,
});

const skipWithoutEngine = existsSync(WASM_PATH) ? test : test.skip;

const loadEngine = async () => {
  await loadDrawingEngine({
    module_or_path: await Bun.file(WASM_PATH).arrayBuffer(),
  });
};

/** Pixels of every layer tile by key: this is how two documents compare. */
const readTiles = (core: DrawingCore, layerId: number) => {
  const tiles = new Map<number, Uint8Array>();

  const bytes = core.tileSize * core.tileSize * 4;

  for (const ref of core.layerTiles(layerId)) {
    const pixels = new Uint8Array(bytes);

    if (core.readTile(ref, pixels)) {
      tiles.set(ref.key, pixels);
    }
  }

  return tiles;
};

const draw = (core: DrawingCore, from: [number, number], to: [number, number]) => {
  core.beginStroke(sample(from[0], from[1]));
  core.pushSamples([sample(to[0], to[1])]);
  core.endStroke();
};

describe("project file", () => {
  skipWithoutEngine(
    "a saved project opens with the same pixels",
    async () => {
      await loadEngine();

      const core = await WasmDrawingCore.create(SIZE);

      core.setBrush(BRUSH);
      draw(core, [20, 20], [200, 120]);
      draw(core, [40, 300], [460, 340]);

      const before = readTiles(core, 1);
      const bytes = core.saveProject();

      core.dispose();

      expect(before.size).toBeGreaterThan(0);
      expect(bytes.length).toBeGreaterThan(0);

      const reopened = await WasmDrawingCore.fromProject(bytes);

      expect(reopened.size).toEqual(SIZE);
      expect(reopened.hasContent).toBe(true);

      const after = readTiles(reopened, 1);

      expect([...after.keys()].toSorted((a, b) => a - b)).toEqual(
        [...before.keys()].toSorted((a, b) => a - b)
      );

      for (const [key, pixels] of before) {
        expect(after.get(key)).toEqual(pixels);
      }

      reopened.dispose();
    }
  );

  skipWithoutEngine("an opened project can be drawn on", async () => {
    await loadEngine();

    const core = await WasmDrawingCore.create(SIZE);

    core.setBrush(BRUSH);
    draw(core, [20, 20], [200, 120]);

    const reopened = await WasmDrawingCore.fromProject(core.saveProject());

    core.dispose();

    expect(reopened.canUndo).toBe(false);

    const before = readTiles(reopened, 1).size;

    draw(reopened, [250, 250], [400, 400]);

    expect(reopened.canUndo).toBe(true);
    expect(readTiles(reopened, 1).size).toBeGreaterThanOrEqual(before);

    reopened.dispose();
  });

  skipWithoutEngine("a foreign file does not open", async () => {
    await loadEngine();

    const notProject = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);
    let failure: unknown = null;

    try {
      await WasmDrawingCore.fromProject(notProject);
    } catch (error: unknown) {
      failure = error;
    }

    // The core reports an error instead of a silently empty document:
    // a file must never open "half way".
    expect(failure).toBeInstanceOf(Error);
  });
});

describe("project file output", () => {
  const core = { saveProject: () => Uint8Array.from([1, 2, 3]) };

  test("the file gets a name, extension and content type", () => {
    const file = exportProject({ core, name: "sample" });

    expect(file?.name).toBe("sample.hpd");
    expect(file?.type).toBe("application/octet-stream");
  });

  test("an empty project is not handed out as a file", () => {
    expect(exportProject({ core: { saveProject: () => new Uint8Array(0) } })).toBeNull();
  });

  test("a read file comes back as bytes", async () => {
    const bytes = await readProjectFile(
      new File([Uint8Array.from([1, 2, 3])], "sample.hpd")
    );

    expect([...bytes]).toEqual([1, 2, 3]);
  });
});
