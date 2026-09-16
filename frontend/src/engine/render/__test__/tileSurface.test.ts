import { describe, expect, test } from "bun:test";

import { documentScreenRect } from "@/engine/render/tileSurface.engine";
import type { Camera } from "@/types/drawing";

const SIZE = { height: 512, width: 512 };
const VIEWPORT = { height: 512, width: 512 };
const CAMERA: Camera = { x: 0, y: 0, zoom: 1 };

describe("document rectangle on screen", () => {
  test("at an equal size the document fills the viewport", () => {
    expect(
      documentScreenRect({ camera: CAMERA, document: SIZE, viewport: VIEWPORT })
    ).toEqual({ height: 512, width: 512, x: 0, y: 0 });
  });

  test("zoom grows the rectangle around the centre", () => {
    expect(
      documentScreenRect({
        camera: { x: 0, y: 0, zoom: 2 },
        document: SIZE,
        viewport: VIEWPORT,
      })
    ).toEqual({ height: 1024, width: 1024, x: -256, y: -256 });
  });
});
