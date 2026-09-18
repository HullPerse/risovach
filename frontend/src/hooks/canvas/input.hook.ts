import { useEffect, useRef } from "react";

import { EDITABLE_SELECTOR, TOOL_KEYS } from "@/config/canvas.config";
import { BRUSH_START_MARGIN, CAMERA_ZOOM_STEP } from "@/config/drawing.config";
import { screenToDocument } from "@/lib/camera.utils";
import { isPointInCanvas } from "@/lib/canvas.utils";
import { pinchGesture, pointerPair } from "@/lib/gesture.utils";
import { minimapLayout, minimapPointDocument } from "@/lib/minimap.utils";
import type { StrokeSample } from "@/types/engine/brush";
import type {
  DrawingInputOptions,
  PointerPair,
  Point,
} from "@/types/engine/canvas";
import type { InputContext, PanStart } from "@/types/engine/drawing";

/** Canvas keys must not get in the way of text input. */
const isEditable = (target: EventTarget | null): boolean =>
  target instanceof Element && target.closest(EDITABLE_SELECTOR) !== null;

/**
 * Pressure is taken from a pen only. Mouse and finger report a constant 0.5,
 * which would make the stroke half the chosen size.
 */
const pointerPressure = (event: PointerEvent): number =>
  event.pointerType === "pen" && event.pressure > 0 ? event.pressure : 1;

/**
 * Attaches the input handlers to the container and returns their removal.
 * Without a container there is nothing to listen to yet.
 */
const setupInput = (context: InputContext): (() => void) | null => {
  const { bridge, containerRef, optionsRef, overlayState, requestOverlayRender } =
    context;
  const container = containerRef.current;

  if (!container || !bridge) return null;

  const pointers = new Map<number, Point>();
  let panStart: PanStart | null = null;
  let pinch: PointerPair | null = null;
  let spaceDown = false;
  let strokeId: number | null = null;
  let minimapId: number | null = null;

  // ponytail: rect cache ceiling is a position-only layout shift with no
  // scroll or resize; then it drifts until the next gesture invalidates it.
  let rect: DOMRect | null = null;
  const getRect = (): DOMRect => (rect ??= container.getBoundingClientRect());
  const invalidateRect = (): void => {
    rect = null;
  };

  const localPoint = (event: { clientX: number; clientY: number }): Point => {
    const box = getRect();
    // The canvas sits inside the border: the pointer origin is the padding box.
    const x = event.clientX - box.left - container.clientLeft;
    const y = event.clientY - box.top - container.clientTop;

    return { x, y };
  };

  const documentPoint = (point: Point): Point =>
    screenToDocument(bridge.camera, bridge.viewSize, bridge.size, point);

  const inViewport = (point: Point): boolean =>
    point.x >= 0 &&
    point.y >= 0 &&
    point.x <= bridge.viewSize.width &&
    point.y <= bridge.viewSize.height;

  /**
   * Document point under a pointer on the minimap, or null off the panel. The
   * panel rectangle comes from the same pure function the overlay draws with,
   * so the drag target and the drawn panel cannot drift apart.
   */
  const minimapPoint = (point: Point): Point | null =>
    minimapPointDocument(
      point,
      bridge.size,
      minimapLayout(bridge.size, bridge.viewSize)
    );

  const syncCursor = (): void => {
    // the fill shows no ring, so the system cursor stays visible: hiding it
    // would leave the pointer invisible over the sheet. The minimap is a
    // control, not the sheet: a hidden cursor could not take it.
    const hideCursor =
      overlayState.current.inside &&
      !overlayState.current.minimapHover &&
      !spaceDown &&
      bridge.toolName !== "fill";

    container.style.cursor = hideCursor ? "none" : "crosshair";
  };

  const syncOverlay = (point: Point | null): void => {
    const state = overlayState.current;

    if (point === null || !inViewport(point)) {
      state.hex = null;
      state.inside = false;
      state.minimapHover = false;
      state.pointer = null;

      return;
    }

    const document = documentPoint(point);

    state.minimapHover = minimapPoint(point) !== null;
    // the ring and the magnifier live strictly inside the document
    state.inside = isPointInCanvas(document, bridge.size);
    state.pointer = document;
    state.hex =
      state.inside && bridge.toolName === "eyedropper"
        ? bridge.sampleColor(document)
        : null;
  };

  const paintCursor = (): void => {
    syncCursor();
    // Nothing but the pointer changed, so the document is not rebuilt here.
    requestOverlayRender();
  };

  const refresh = (point: Point | null): void => {
    syncOverlay(point);
    paintCursor();
  };

  const capture = (event: PointerEvent): void => {
    if (!container.hasPointerCapture(event.pointerId)) {
      container.setPointerCapture(event.pointerId);
    }
  };

  const toSample = (event: PointerEvent): StrokeSample => {
    const point = documentPoint(localPoint(event));

    return {
      pressure: pointerPressure(event),
      tiltX: event.tiltX,
      tiltY: event.tiltY,
      time: event.timeStamp,
      x: point.x,
      y: point.y,
    };
  };

  /**
   * Coalesced events are every point the browser collected between frames.
   * Without them a fast stroke turns into a polyline.
   */
  const samplesFor = (event: PointerEvent): StrokeSample[] => {
    const coalesced = event.getCoalescedEvents();

    return (coalesced.length > 0 ? coalesced : [event]).map(toSample);
  };

  const onPointerDown = (event: PointerEvent): void => {
    invalidateRect();
    const local = localPoint(event);

    pointers.set(event.pointerId, local);

    if (pointers.size >= 2) {
      if (strokeId !== null) {
        bridge.endStroke();
        strokeId = null;
      }

      panStart = null;
      pinch = pointerPair(pointers);
      capture(event);

      return;
    }

    if (event.button === 1 || event.button === 2 || spaceDown) {
      event.preventDefault();
      panStart = { point: local, pointerId: event.pointerId };
      capture(event);
      syncCursor();

      return;
    }

    // The minimap is grabbed before any tool sees the pointer: a click on the
    // panel would otherwise draw a dot under it in the far corner of the sheet.
    const minimap = minimapPoint(local);

    if (event.button === 0 && minimap) {
      minimapId = event.pointerId;
      bridge.centerOn(minimap);
      capture(event);
      refresh(local);

      return;
    }

    const point = documentPoint(local);
    // a gesture may start just outside the document edge: a brush sitting on
    // the border does not lose its first movement
    const inside = isPointInCanvas(
      point,
      bridge.size,
      bridge.brushSettings.size + BRUSH_START_MARGIN
    );

    if (bridge.toolName === "eyedropper") {
      const hex = inside ? bridge.sampleColor(point) : null;

      syncOverlay(local);

      if (hex) {
        optionsRef.current.onColorPick(hex);
        // the eyedropper is temporary: after a colour is picked the canvas
        // returns to the tool used before it
        optionsRef.current.onToolCancel();
      }

      return;
    }

    if (bridge.toolName === "fill") {
      // the fill is a click action: it runs strictly inside the sheet, no
      // stroke starts and no pointer is captured, so nothing follows it up
      if (event.button === 0 && isPointInCanvas(point, bridge.size)) {
        bridge.fill(point);
      }

      return;
    }

    if (event.button !== 0 || !inside) {
      return;
    }

    strokeId = event.pointerId;
    bridge.beginStroke(toSample(event));
    capture(event);
  };

  const onPointerMove = (event: PointerEvent): void => {
    const local = localPoint(event);

    if (pointers.has(event.pointerId)) {
      pointers.set(event.pointerId, local);
    }

    if (pinch && pointers.size >= 2) {
      const pair = pointerPair(pointers);

      if (pair) {
        const gesture = pinchGesture(pinch, pair);

        bridge.zoomAt(gesture.anchor, gesture.zoomFactor);
        bridge.panBy(gesture.pan);
        pinch = pair;
      }
    } else if (panStart && panStart.pointerId === event.pointerId) {
      bridge.panBy({
        x: local.x - panStart.point.x,
        y: local.y - panStart.point.y,
      });
      panStart.point = local;
    } else if (minimapId === event.pointerId) {
      // Dragging keeps putting the grabbed point in the middle of the view: a
      // released pointer outside the panel cannot happen, it is captured.
      const minimap = minimapPoint(local);

      if (minimap) bridge.centerOn(minimap);
    } else if (strokeId === event.pointerId) {
      bridge.pushSamples(samplesFor(event));
    }

    refresh(local);
  };

  const onPointerUp = (event: PointerEvent): void => {
    const local = localPoint(event);

    pointers.delete(event.pointerId);

    if (pointers.size < 2) pinch = null;

    if (strokeId === event.pointerId) {
      bridge.endStroke();
      strokeId = null;
    }

    if (minimapId === event.pointerId) minimapId = null;

    if (panStart?.pointerId === event.pointerId) panStart = null;

    if (container.hasPointerCapture(event.pointerId)) {
      container.releasePointerCapture(event.pointerId);
    }

    if (pointers.size === 0) syncOverlay(local);

    paintCursor();
  };

  const onWheel = (event: WheelEvent): void => {
    event.preventDefault();
    invalidateRect();

    const local = localPoint(event);

    if (event.shiftKey) {
      // Shift turns the wheel into a scroll: the sheet follows the wheel the
      // way a page would, instead of the view zooming under the pointer.
      bridge.panBy({ x: -event.deltaX, y: -event.deltaY });
      // the sheet moved under the pointer: the ring, the loupe and the hex
      // name a different pixel now
      refresh(local);

      return;
    }

    bridge.zoomAt(
      local,
      event.deltaY > 0 ? 1 / CAMERA_ZOOM_STEP : CAMERA_ZOOM_STEP
    );
    // zoom moves the document under the pointer, so the cursor is recomputed
    // here as well, or it stays hidden over the background
    refresh(local);
  };

  /**
   * Leaving the container brings no further movements, so without these
   * handlers the ring and the magnifier stay drawn in the old place, and a
   * pen entering the hover area shows no cursor until it moves.
   */
  const onPointerLeave = (): void => {
    const state = overlayState.current;

    if (state.pointer === null && state.hex === null && !state.inside) return;

    syncOverlay(null);
    paintCursor();
  };

  const onPointerEnter = (event: PointerEvent): void => {
    invalidateRect();
    refresh(localPoint(event));
  };

  const onKeyDown = (event: KeyboardEvent): void => {
    if (isEditable(event.target)) return;

    if (event.code === "Space") {
      if (!event.repeat) {
        spaceDown = true;
        syncCursor();
      }

      return event.preventDefault();
    }

    if (event.key === "Escape" && bridge.toolName === "eyedropper") {
      return optionsRef.current.onToolCancel();
    }

    const center: Point = {
      x: bridge.viewSize.width / 2,
      y: bridge.viewSize.height / 2,
    };
    const zoomStep = (factor: number): void => {
      // The keyboard zooms about the middle of the view: there is no pointer
      // to anchor to, and the middle is what the eye expects.
      bridge.zoomAt(center, factor);
      paintCursor();
    };

    if (event.ctrlKey || event.metaKey) {
      // `Ctrl+0` fits the sheet, `Ctrl+1` is one pixel per screen pixel, the
      // pair Photoshop and Krita both use.
      if (event.key === "0") {
        event.preventDefault();
        bridge.fitView();
        paintCursor();
      } else if (event.key === "1") {
        event.preventDefault();
        bridge.zoomAt(center, 1 / bridge.zoom);
        paintCursor();
      }

      return;
    }

    if (event.altKey) return;

    if (event.key === "+" || event.key === "=") {
      return zoomStep(CAMERA_ZOOM_STEP);
    }

    if (event.key === "-" || event.key === "_") {
      return zoomStep(1 / CAMERA_ZOOM_STEP);
    }

    const tool = TOOL_KEYS[event.key.toLowerCase()];
    if (tool) optionsRef.current.onToolChange(tool);
  };

  const onKeyUp = (event: KeyboardEvent): void => {
    if (event.code === "Space") {
      spaceDown = false;
      syncCursor();
    }
  };

  const onBlur = (): void => {
    spaceDown = false;
    paintCursor();
  };

  const layoutObserver = new ResizeObserver(invalidateRect);
  layoutObserver.observe(container);

  container.addEventListener("pointerdown", onPointerDown);
  container.addEventListener("pointermove", onPointerMove);
  container.addEventListener("pointerup", onPointerUp);
  container.addEventListener("pointercancel", onPointerUp);
  container.addEventListener("pointerleave", onPointerLeave);
  container.addEventListener("pointerenter", onPointerEnter);
  container.addEventListener("wheel", onWheel, { passive: false });
  globalThis.addEventListener("blur", onBlur);
  globalThis.addEventListener("keydown", onKeyDown);
  globalThis.addEventListener("keyup", onKeyUp);
  globalThis.addEventListener("scroll", invalidateRect, true);
  globalThis.addEventListener("resize", invalidateRect);

  return () => {
    layoutObserver.disconnect();
    container.removeEventListener("pointerdown", onPointerDown);
    container.removeEventListener("pointermove", onPointerMove);
    container.removeEventListener("pointerup", onPointerUp);
    container.removeEventListener("pointercancel", onPointerUp);
    container.removeEventListener("pointerleave", onPointerLeave);
    container.removeEventListener("pointerenter", onPointerEnter);
    container.removeEventListener("wheel", onWheel);
    globalThis.removeEventListener("blur", onBlur);
    globalThis.removeEventListener("keydown", onKeyDown);
    globalThis.removeEventListener("keyup", onKeyUp);
    globalThis.removeEventListener("scroll", invalidateRect, true);
    globalThis.removeEventListener("resize", invalidateRect);
  };
};

export const useDrawingInput = (options: DrawingInputOptions): void => {
  const { bridge, containerRef, overlayState, requestOverlayRender } = options;
  const optionsRef = useRef(options);

  // latest callbacks without re-subscribing the listeners
  useEffect(() => {
    optionsRef.current = options;
  });

  useEffect(() => {
    const teardown = setupInput({
      bridge,
      containerRef,
      optionsRef,
      overlayState,
      requestOverlayRender,
    });

    return () => {
      teardown?.();
    };
  }, [bridge, containerRef, overlayState, requestOverlayRender]);
};
