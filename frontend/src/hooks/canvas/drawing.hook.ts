import type { RefObject } from "react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

import { DrawingBridge } from "@/engine/bridge/bridge.engine";
import { WasmDrawingCore } from "@/engine/bridge/wasmCore.engine";
import { exportDocument } from "@/engine/files/export.engine";
import { exportProject } from "@/engine/files/project.engine";
import { OverlaySurface } from "@/engine/render/overlaySurface.engine";
import { TileSurface } from "@/engine/render/tileSurface.engine";
import type { BrushSettings } from "@/types/brush";
import type { CanvasTool, RequestImageOptions } from "@/types/canvas";
import type {
  DrawingCanvasAPI,
  DrawingCanvasState,
  DrawingCore,
  OverlayState,
  Size,
  ZoomLimits,
} from "@/types/drawing";

export interface DrawingHookOptions {
  brush: BrushSettings;
  documentSize: Size;
  onStateChange?: (state: DrawingCanvasState) => void;
  tool: CanvasTool;
  zoomLimits?: ZoomLimits;
}

export interface DrawingHookResult {
  api: DrawingCanvasAPI;
  bridge: DrawingBridge | null;
  containerRef: RefObject<HTMLDivElement | null>;
  overlayRef: RefObject<HTMLCanvasElement | null>;
  overlayState: RefObject<OverlayState>;
  requestRender: () => void;
  surfaceRef: RefObject<HTMLCanvasElement | null>;
}

const EMPTY_VIEWPORT: Size = { height: 0, width: 0 };

const noopUnsubscribe = (): void => {
  // no core yet, so there is nothing to unsubscribe from
};

const NOOP_SUBSCRIBE = (): (() => void) => noopUnsubscribe;

interface Surfaces {
  overlay: OverlaySurface;
  tiles: TileSurface;
}

export const useDrawingCanvas = ({
  brush,
  documentSize,
  onStateChange,
  tool,
  zoomLimits,
}: DrawingHookOptions): DrawingHookResult => {
  const containerRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const surfaceRef = useRef<HTMLCanvasElement>(null);
  const overlayState = useRef<OverlayState>({
    hex: null,
    inside: false,
    pointer: null,
  });
  const frameRef = useRef(0);
  const surfacesRef = useRef<Surfaces | null>(null);
  const fittedRef = useRef(false);
  const stateRef = useRef<DrawingCanvasState>({
    canRedo: false,
    canUndo: false,
    documentSize,
    empty: true,
    error: null,
    zoom: 1,
  });

  // The core is rebuilt only with the document sides: the comparison is by
  // numbers, so a new size object cannot wipe the document. Brush and tool
  // reach the core through the effects below: otherwise every slider move
  // would rebuild the core and erase the drawing.
  const { height, width } = documentSize;
  const [core, setCore] = useState<DrawingCore | null>(null);
  const [coreError, setCoreError] = useState<string | null>(null);
  const [loadedSize, setLoadedSize] = useState<Size>(documentSize);

  useEffect(() => {
    let active = true;

    const prepare = async () => {
      let next: DrawingCore;

      try {
        // The core is a WebAssembly module and loads asynchronously, so the
        // canvas stays empty until it is ready: half a core is worse.
        next = await WasmDrawingCore.create({ height, width });
      } catch (error: unknown) {
        console.error("Ядро рисования не создалось", error);

        // Without a message the page looks like an empty canvas that simply
        // refuses to draw, and nothing says why.
        if (active) {
          setCoreError("Движок рисования не загрузился: рисовать нельзя");
        }

        return;
      }

      if (active) {
        setCoreError(null);
        setLoadedSize(next.size);
        setCore(next);
      } else {
        // The core was born after a size change or a page leave and never
        // reached state, so nobody else will free it.
        next.dispose();
      }
    };

    void prepare();

    // a new document is fitted into the container again
    fittedRef.current = false;

    return () => {
      active = false;
    };
  }, [height, width]);

  /**
   * The core has one owner: whoever replaces it frees it, or the page leave
   * does. If its creator freed it, an opened project would leak whenever the
   * size of a new document changed.
   */
  useEffect(
    () => () => {
      core?.dispose();
    },
    [core]
  );

  const bridge = useMemo(
    () => (core ? new DrawingBridge({ core, viewport: EMPTY_VIEWPORT }) : null),
    [core]
  );

  /**
   * A frame is built on demand: tiles are written into the dirty area only,
   * and the overlay clears two rectangles instead of the whole canvas.
   */
  const renderNow = useCallback(() => {
    frameRef.current = 0;

    const surfaces = surfacesRef.current;

    if (!(surfaces && bridge)) {
      return;
    }

    const frame = bridge.frame();
    const state = overlayState.current;
    const pointer = state.inside ? state.pointer : null;

    surfaces.tiles.render(frame, bridge.core);
    surfaces.overlay.render({
      brush: bridge.brushSettings,
      camera: frame.camera,
      document: frame.document,
      hex: state.hex,
      pointer,
      source: pointer ? surfaces.tiles.snapshot() : null,
      tool: bridge.toolName,
      viewport: frame.viewport,
    });
  }, [bridge]);

  const requestRender = useCallback(() => {
    if (frameRef.current !== 0) {
      return;
    }

    frameRef.current = requestAnimationFrame(renderNow);
  }, [renderNow]);

  useEffect(() => {
    const surface = surfaceRef.current;
    const overlay = overlayRef.current;

    const teardown = () => {
      surfacesRef.current = null;
      cancelAnimationFrame(frameRef.current);
      frameRef.current = 0;
    };

    if (!(surface && overlay)) {
      return teardown;
    }

    surfacesRef.current = {
      overlay: new OverlaySurface(overlay),
      tiles: new TileSurface(surface),
    };
    requestRender();

    return teardown;
  }, [requestRender]);

  useEffect(() => bridge?.subscribe(requestRender), [bridge, requestRender]);

  useEffect(() => {
    // a new document is fitted into the container again
    fittedRef.current = false;

    const measure = () => {
      const container = containerRef.current;

      if (!(container && bridge)) {
        return;
      }

      const rect = container.getBoundingClientRect();
      const viewport = { height: rect.height, width: rect.width };

      if (viewport.width <= 0 || viewport.height <= 0) {
        return;
      }

      bridge.setViewport(viewport);

      if (!fittedRef.current) {
        fittedRef.current = true;
        bridge.fitView();
      }

      const surfaces = surfacesRef.current;
      const dpr = window.devicePixelRatio || 1;

      if (surfaces) {
        surfaces.tiles.resize(viewport, dpr);
        surfaces.overlay.resize(viewport, dpr);
      }

      requestRender();
    };

    measure();

    const observer = new ResizeObserver(measure);
    const container = containerRef.current;

    if (container) {
      observer.observe(container);
    }

    const dprQuery = window.matchMedia(
      `(resolution: ${window.devicePixelRatio}dppx)`
    );

    dprQuery.addEventListener("change", measure);

    return () => {
      observer.disconnect();
      dprQuery.removeEventListener("change", measure);
    };
  }, [bridge, requestRender]);

  useEffect(() => {
    bridge?.setBrush(brush);
  }, [bridge, brush]);

  useEffect(() => {
    bridge?.setTool(tool);
  }, [bridge, tool]);

  useEffect(() => {
    if (bridge && zoomLimits) {
      bridge.setZoomLimits(zoomLimits);
    }
  }, [bridge, zoomLimits]);

  const canUndo = useSyncExternalStore(
    bridge?.subscribe ?? NOOP_SUBSCRIBE,
    () => bridge?.canUndo ?? false
  );
  const canRedo = useSyncExternalStore(
    bridge?.subscribe ?? NOOP_SUBSCRIBE,
    () => bridge?.canRedo ?? false
  );
  const empty = useSyncExternalStore(
    bridge?.subscribe ?? NOOP_SUBSCRIBE,
    () => !(bridge?.hasContent ?? false)
  );
  const zoom = useSyncExternalStore(
    bridge?.subscribe ?? NOOP_SUBSCRIBE,
    () => bridge?.zoom ?? 1
  );

  /**
   * Opens a project instead of the current drawing. The core is created here
   * and as a whole, so a foreign file leaves the canvas alone: a parse error
   * returns `false` before anything was replaced.
   */
  const loadProject = useCallback(
    async (bytes: Uint8Array): Promise<boolean> => {
      let next: DrawingCore;

      try {
        next = await WasmDrawingCore.fromProject(bytes);
      } catch (error: unknown) {
        console.error("Проект не открывается", error);

        return false;
      }

      // An opened project brings its own canvas size, so the view is fitted
      // again: the old zoom and pan belonged to another sheet.
      fittedRef.current = false;
      setLoadedSize(next.size);
      setCore(next);

      return true;
    },
    []
  );

  // Only real changes go out: the engine subscription also fires on every
  // stroke point, where the state stays the same.
  useEffect(() => {
    const next: DrawingCanvasState = {
      canRedo,
      canUndo,
      documentSize: loadedSize,
      empty,
      error: coreError,
      zoom,
    };
    const previous = stateRef.current;

    if (
      previous.canRedo === next.canRedo &&
      previous.canUndo === next.canUndo &&
      previous.documentSize === next.documentSize &&
      previous.empty === next.empty &&
      previous.error === next.error &&
      previous.zoom === next.zoom
    ) {
      return;
    }

    stateRef.current = next;
    onStateChange?.(next);
  }, [canRedo, canUndo, coreError, empty, loadedSize, onStateChange, zoom]);

  const api = useMemo<DrawingCanvasAPI>(
    () => ({
      canRedo,
      canUndo,
      clear: () => {
        bridge?.clearLayer();
      },
      loadProject,
      redo: () => {
        bridge?.redo();
      },
      requestImage: (requestOptions?: RequestImageOptions) =>
        bridge
          ? exportDocument({
              core: bridge.core,
              filename: requestOptions?.filename ?? "canvas.png",
            })
          : Promise.resolve(null),
      requestProject: () =>
        bridge ? exportProject({ core: bridge.core }) : null,
      resetView: () => {
        bridge?.fitView();
      },
      undo: () => {
        bridge?.undo();
      },
    }),
    [bridge, canRedo, canUndo, loadProject]
  );

  return {
    api,
    bridge,
    containerRef,
    overlayRef,
    overlayState,
    requestRender,
    surfaceRef,
  };
};
