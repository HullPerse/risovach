import init, {
  DrawingEngine,
  engine_version as wasmEngineVersion,
  tile_size as wasmTileSize,
} from "@/wasm/drawing/drawing_engine";
import type {
  InitInput,
  InitOutput,
} from "@/wasm/drawing/drawing_engine";

/**
 * The module initializes once per page: another `init` call would wipe the
 * document, so the promise is kept instead of recomputed.
 * `source` is for tests only: the app resolves the file itself.
 */
let loading: Promise<InitOutput> | null = null;
let memory: WebAssembly.Memory | null = null;

const initialize = async (source?: InitInput): Promise<InitOutput> => {
  loading ??= init(source);

  const output = await loading;

  ({ memory } = output);

  return output;
};

/**
 * Returns the engine constructor. Nothing may touch the core before this
 * resolves, so callers await it before showing the canvas.
 */
export const loadDrawingEngine = async (
  source?: InitInput
): Promise<typeof DrawingEngine> => {
  await initialize(source);

  return DrawingEngine;
};

/**
 * View into tile pixels inside module memory.
 * Valid until the next core call: an allocation can move the memory, and a
 * freed tile can hand it to another tile. Take it and copy at once.
 */
export const drawingEnginePixels = (
  address: number,
  length: number
): Uint8Array => {
  if (!memory) {
    throw new Error("Engine not loaded: module doesnt exist yet");
  }

  return new Uint8Array(memory.buffer, address, length);
};

/** Version of the built core, so the page can show what it runs on. */
export const drawingEngineVersion = (): string => wasmEngineVersion();

/**
 * Tile side taken from the core. The only source of this number: grid,
 * buffers and screen placement all derive from it, not from a frontend copy.
 */
export const drawingEngineTileSize = (): number => wasmTileSize();
