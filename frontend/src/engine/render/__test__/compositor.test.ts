import { describe, expect, test } from "bun:test";

import {
  diffFrames,
  indexFrame,
  renderFrame,
  visibleDocumentRect,
} from "@/engine/render/compositor.engine";
import { tileGrid, tileRect } from "@/lib/tiles.utils";
import type {
  Camera,
  LayerInfo,
  OverlayInfo,
  Rect,
  Size,
  TileRef,
  TileRefSource,
  TileSourceKind,
} from "@/types/drawing";

const SIZE: Size = { height: 512, width: 512 };
const CAMERA: Camera = { x: 0, y: 0, zoom: 1 };

/** Tile side is a frame building input here, not a value from the core. */
const TILE = 256;

interface FakeLayer extends LayerInfo {
  refs: TileRef[];
}

const ref = (
  key: number,
  {
    layerId = 1,
    source = "layer",
    version = 0,
  }: { layerId?: number; source?: TileSourceKind; version?: number } = {}
): TileRef => ({ key, layerId, source, version });

const layer = (
  id: number,
  refs: TileRef[],
  extra?: Partial<LayerInfo>
): FakeLayer => ({
  id,
  name: `Layer ${id}`,
  opacity: 1,
  refs,
  visible: true,
  ...extra,
});

/** Cells falling into the document rect. Mirrors the core's own selection. */
const inRect = (refs: TileRef[], rect: Rect, size: Size): TileRef[] => {
  const { cols } = tileGrid(size, TILE);

  return refs.filter((item) => {
    const box = tileRect(item.key, cols, TILE);

    return (
      box.x < rect.x + rect.width &&
      box.x + box.width > rect.x &&
      box.y < rect.y + rect.height &&
      box.y + box.height > rect.y
    );
  });
};

/**
 * Tile reference source. No pixels here and none may appear: a frame carries
 * only key, layer and version, while the output pulls pixels by reference.
 */
const refSource = ({
  activeLayerId = 1,
  layers,
  overlay = null,
  overlayRefs = [],
  size = SIZE,
}: {
  activeLayerId?: number;
  layers: FakeLayer[];
  overlay?: OverlayInfo | null;
  overlayRefs?: TileRef[];
  size?: Size;
}): TileRefSource => ({
  activeLayerId,
  layers: layers.map(
    (item): LayerInfo => ({
      id: item.id,
      name: item.name,
      opacity: item.opacity,
      visible: item.visible,
    })
  ),
  layerTiles: (layerId, rect) => {
    const found = layers.find((item) => item.id === layerId);

    if (!found) {
      return [];
    }

    return rect ? inRect(found.refs, rect, size) : found.refs;
  },
  overlay,
  overlayTiles: (rect) =>
    rect ? inRect(overlayRefs, rect, size) : overlayRefs,
  size,
});

type FrameOptions = Parameters<typeof renderFrame>[0];

const frame = (options: Partial<FrameOptions> = {}) =>
  renderFrame({
    camera: CAMERA,
    source: refSource({ layers: [layer(1, [ref(0)])] }),
    tileSize: TILE,
    viewport: SIZE,
    ...options,
  });

const OVERLAY: OverlayInfo = {
  layerId: 1,
  mode: "source-over",
  opacity: 1,
};

describe("output frame", () => {
  test("the visible rectangle matches the document at an equal viewport", () => {
    expect(visibleDocumentRect(CAMERA, SIZE, SIZE)).toEqual({
      height: 512,
      width: 512,
      x: 0,
      y: 0,
    });
  });

  test("a hidden layer stays out of the frame, visible ones keep order", () => {
    const result = frame({
      source: refSource({
        layers: [
          layer(1, [ref(0)]),
          layer(2, [ref(0)], { visible: false }),
          layer(3, [ref(0)], { opacity: 0.5 }),
        ],
      }),
    });

    expect(result.groups.map((group) => [group.layerId, group.opacity])).toEqual(
      [
        [1, 1],
        [3, 0.5],
      ]
    );
  });

  test("tiles outside the visible area stay out of the frame", () => {
    const result = frame({
      source: refSource({
        layers: [layer(1, [ref(0), ref(1)])],
        size: { height: 512, width: 1024 },
      }),
      viewport: { height: 256, width: 256 },
    });

    expect(result.groups[0].items.map((item) => item.key)).toEqual([1]);
    expect(result.groups[0].items[0].x).toBe(-128);
  });

  test("tile scale follows the camera zoom", () => {
    const result = frame({ camera: { x: 0, y: 0, zoom: 2 } });

    expect(result.groups[0].items[0].size).toBe(512);
  });

  test("the frame holds no pixels, only a tile reference", () => {
    const [item] = frame().groups[0].items;

    expect(Object.keys(item).toSorted()).toEqual([
      "key",
      "layerId",
      "size",
      "source",
      "version",
      "x",
      "y",
    ]);
  });

  test("the stroke buffer reaches the frame only on the active layer", () => {
    const source = (layerId: number) =>
      refSource({
        activeLayerId: 1,
        layers: [layer(1, [ref(0)])],
        overlay: { ...OVERLAY, layerId },
        overlayRefs: [ref(0, { source: "overlay", version: 1 })],
      });

    expect(frame({ source: source(2) }).overlay).toBeNull();

    expect(frame({ source: source(1) }).overlay).toMatchObject({
      layerId: 1,
      mode: "source-over",
      opacity: 1,
    });
  });

  test("buffer tiles are marked as overlay", () => {
    const result = frame({
      source: refSource({
        layers: [layer(1, [ref(0)])],
        overlay: OVERLAY,
        overlayRefs: [ref(0, { source: "overlay", version: 1 })],
      }),
    });

    expect(result.overlay?.items[0].source).toBe("overlay");
    expect(result.groups[0].items[0].source).toBe("layer");
  });
});

describe("frame index", () => {
  test("keys tell a layer from the overlay", () => {
    const index = indexFrame(
      frame({
        source: refSource({
          layers: [layer(1, [ref(0)]), layer(2, [ref(0)])],
          overlay: OVERLAY,
          overlayRefs: [ref(0, { source: "overlay", version: 1 })],
        }),
      })
    );

    expect([...index.keys()].toSorted()).toEqual(["1:0", "2:0", "overlay:0"]);
  });

  test("the tile version carries into the index", () => {
    const index = indexFrame(
      frame({ source: refSource({ layers: [layer(1, [ref(0, { version: 7 })])] }) })
    );

    expect(index.get("1:0")?.version).toBe(7);
  });
});

describe("dirty rectangle", () => {
  test("the first frame paints the whole viewport", () => {
    expect(diffFrames(null, indexFrame(frame()), SIZE, false)).toEqual({
      height: 512,
      width: 512,
      x: 0,
      y: 0,
    });
  });

  test("an unchanged frame gives no area", () => {
    const index = indexFrame(frame());

    expect(diffFrames(index, indexFrame(frame()), SIZE, false)).toBeNull();
  });

  test("a version change gives only that tile rectangle", () => {
    const build = (version: number) =>
      frame({ source: refSource({ layers: [layer(1, [ref(0, { version })])] }) });

    expect(
      diffFrames(indexFrame(build(0)), indexFrame(build(1)), SIZE, false)
    ).toEqual({ height: 257, width: 257, x: 0, y: 0 });
  });

  test("a camera change repaints everything", () => {
    const index = indexFrame(frame());

    expect(diffFrames(index, indexFrame(frame()), SIZE, true)).toEqual({
      height: 512,
      width: 512,
      x: 0,
      y: 0,
    });
  });

  test("a gone tile is marked dirty too", () => {
    const before = indexFrame(frame());
    const after = indexFrame(
      frame({ source: refSource({ layers: [layer(1, [])] }) })
    );

    expect(diffFrames(before, after, SIZE, false)).toEqual({
      height: 257,
      width: 257,
      x: 0,
      y: 0,
    });
  });
});
