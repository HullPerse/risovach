import { describe, expect, test } from "bun:test";

import { DrawingBridge } from "@/engine/bridge/bridge.engine";
import type { BrushSettings, StrokeSample } from "@/types/brush";
import type { CanvasTool } from "@/types/canvas";
import type {
  BlendMode,
  DrawingCore,
  LayerInfo,
  OverlayInfo,
  Size,
  TileRef,
} from "@/types/drawing";

const SIZE: Size = { height: 512, width: 512 };

const BRUSH: BrushSettings = {
  color: "#ff0000",
  hardness: 1,
  opacity: 1,
  size: 8,
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

/**
 * Stub core. Drawing lives in Rust and is tested there; only the camera,
 * frame building and subscription matter here, so pixels are not needed:
 * a frame carries tile references, not the tiles themselves.
 */
class FakeCore implements DrawingCore {
  activeLayerId = 1;
  brush = BRUSH;
  canRedo = false;
  canUndo = false;
  calls: string[] = [];
  hasContent = false;
  layerRefs: TileRef[] = [{ key: 0, layerId: 1, source: "layer", version: 0 }];
  layers: LayerInfo[] = [{ id: 1, name: "Layer 1", opacity: 1, visible: true }];
  mode: BlendMode = "source-over";
  overlay: OverlayInfo | null = null;
  overlayRefs: TileRef[] = [
    { key: 0, layerId: 1, source: "overlay", version: 1 },
  ];
  readable = true;
  size = SIZE;
  strokeActive = false;
  tileSize = 256;
  tool: CanvasTool = "draw";

  beginStroke(): void {
    this.calls.push("beginStroke");
    this.strokeActive = true;
    this.overlay = { layerId: 1, mode: this.mode, opacity: 1 };
  }

  clearLayer(): boolean {
    this.calls.push("clearLayer");

    return true;
  }

  dispose(): void {
    this.calls.push("dispose");
  }

  endStroke(): boolean {
    this.calls.push("endStroke");
    this.strokeActive = false;
    this.overlay = null;
    this.hasContent = true;
    this.canUndo = true;

    return true;
  }

  layerTiles(): TileRef[] {
    return this.layerRefs;
  }

  overlayTiles(): TileRef[] {
    return this.overlay ? this.overlayRefs : [];
  }

  pushSamples(): void {
    this.calls.push("pushSamples");
  }

  readTile(): boolean {
    return this.readable;
  }

  redo(): boolean {
    this.calls.push("redo");
    this.hasContent = true;

    return true;
  }

  saveProject(): Uint8Array {
    this.calls.push("saveProject");

    return new Uint8Array(0);
  }

  sampleColor(): string {
    this.calls.push("sampleColor");

    return "#ffffff";
  }

  setBrush(brush: BrushSettings): boolean {
    if (brush === this.brush) {
      return false;
    }

    this.brush = brush;

    return true;
  }

  setTool(tool: CanvasTool): boolean {
    if (tool === this.tool) {
      return false;
    }

    this.tool = tool;

    return true;
  }

  undo(): boolean {
    this.calls.push("undo");
    this.hasContent = false;
    this.canUndo = false;

    return true;
  }
}

const setup = (viewport: Size = SIZE, core = new FakeCore()) => {
  const bridge = new DrawingBridge({ core, viewport });
  let seen = 0;

  bridge.subscribe(() => {
    seen += 1;
  });

  return { bridge, core, seen: () => seen };
};

describe("drawing bridge", () => {
  test("camera fits the document by its smaller side", () => {
    const { bridge } = setup();

    expect(bridge.zoom).toBe(1);
    expect(bridge.camera).toEqual({ x: 0, y: 0, zoom: 1 });
  });

  test("a document smaller than the viewport is not stretched", () => {
    const { bridge } = setup({ height: 1024, width: 1024 });

    expect(bridge.zoom).toBe(1);
  });

  test("without a viewport the camera stays at one", () => {
    const { bridge } = setup({ height: 0, width: 0 });

    expect(bridge.camera).toEqual({ x: 0, y: 0, zoom: 1 });
  });

  test("zoom at a point is capped from above", () => {
    const { bridge } = setup();

    bridge.zoomAt({ x: 100, y: 100 }, 2);
    expect(bridge.zoom).toBeCloseTo(2, 6);

    bridge.zoomAt({ x: 100, y: 100 }, 100);
    expect(bridge.zoom).toBe(16);
  });

  test("custom zoom limits override the defaults", () => {
    const { bridge } = setup();

    bridge.setZoomLimits({ max: 3, min: 0.5 });
    bridge.zoomAt({ x: 100, y: 100 }, 100);

    expect(bridge.zoom).toBe(3);
  });

  test("resetting the view returns the fitting zoom", () => {
    const { bridge } = setup();

    bridge.zoomAt({ x: 100, y: 100 }, 4);
    bridge.fitView();

    expect(bridge.camera).toEqual({ x: 0, y: 0, zoom: 1 });
  });

  test("panning does not take the document off screen", () => {
    const { bridge } = setup();

    bridge.panBy({ x: 10_000, y: -10_000 });
    expect(bridge.camera).toEqual({ x: 0, y: 0, zoom: 1 });
  });

  test("a viewport wider than the document allows panning into free space", () => {
    const { bridge } = setup();

    bridge.setViewport({ height: 1024, width: 1024 });
    bridge.panBy({ x: 10_000, y: 0 });

    expect(bridge.camera).toEqual({ x: 256, y: 0, zoom: 1 });
  });

  test("an empty sample list does not bother subscribers", () => {
    const { bridge, seen } = setup();

    bridge.pushSamples([]);
    expect(seen()).toBe(0);

    bridge.pushSamples([sample(10, 10)]);
    expect(seen()).toBe(1);
  });

  test("a frame takes the stroke buffer only during a gesture", () => {
    const { bridge, core } = setup();

    expect(bridge.frame().overlay).toBeNull();

    bridge.beginStroke(sample(20, 20));
    expect(bridge.frame().overlay).toMatchObject({
      layerId: 1,
      mode: "source-over",
    });

    bridge.endStroke();
    expect(bridge.frame().overlay).toBeNull();

    core.mode = "destination-out";
    bridge.beginStroke(sample(20, 20));
    expect(bridge.frame().overlay?.mode).toBe("destination-out");
  });

  test("layer tiles reach the frame", () => {
    const { bridge } = setup();
    const [group] = bridge.frame().groups;

    expect(group.items.map((item) => item.source)).toEqual(["layer"]);
  });

  test("a brush and tool change reaches the core once", () => {
    const { bridge, core } = setup();

    bridge.setBrush(BRUSH);
    bridge.setTool("draw");
    expect(core.calls).toEqual([]);

    const next = { ...BRUSH, size: 12 };

    bridge.setBrush(next);
    bridge.setTool("eyedropper");

    expect(core.brush.size).toBe(12);
    expect(core.tool).toBe("eyedropper");
  });

  test("the bridge repeats core commands only on a real change", () => {
    const { bridge, core } = setup();

    bridge.beginStroke(sample(10, 10));
    expect(bridge.endStroke()).toBe(true);
    expect(bridge.undo()).toBe(true);
    expect(bridge.redo()).toBe(true);
    expect(bridge.clearLayer()).toBe(true);

    expect(core.calls).toEqual([
      "beginStroke",
      "endStroke",
      "undo",
      "redo",
      "clearLayer",
    ]);
  });

  test("a stroke that never happened is not a change", () => {
    const { bridge, core } = setup();

    expect(bridge.endStroke()).toBe(false);
    expect(core.calls).toEqual([]);
  });
});
