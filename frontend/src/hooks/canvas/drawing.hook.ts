import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

import { EMPTY_VIEWPORT } from "@/config/drawing.config";
import { DrawingBridge } from "@/engine/bridge/bridge.engine";
import { WasmDrawingCore } from "@/engine/bridge/wasmCore.engine";
import { exportDocument } from "@/engine/files/export.engine";
import { exportProject } from "@/engine/files/project.engine";
import { OverlaySurface } from "@/engine/render/overlaySurface.engine";
import { TileSurface } from "@/engine/render/tileSurface.engine";
import { attempt } from "@/lib/attempt.utils";
import type {
  DrawingHookOptions,
  DrawingHookResult,
  RequestImageOptions,
} from "@/types/engine/canvas";
import type {
  DrawingCanvasAPI,
  DrawingCanvasState,
  DrawingCore,
  OverlayState,
  RenderFrame,
  Size,
  Surfaces,
} from "@/types/engine/drawing";

// stable noop: useSyncExternalStore needs a subscribe even with no core yet
const NOOP_SUBSCRIBE = (): (() => void) => (): void => undefined;

const isCanvasStateEqual = (
  a: DrawingCanvasState,
  b: DrawingCanvasState
): boolean =>
  a.canRedo === b.canRedo &&
  a.canUndo === b.canUndo &&
  a.documentSize === b.documentSize &&
  a.empty === b.empty &&
  a.error === b.error &&
  a.zoom === b.zoom;

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
    minimapHover: false,
    pointer: null,
  });
  const frameRef = useRef(0);
  /** Last frame handed to the output: pointer moves reuse it as it is. */
  const frameCacheRef = useRef<RenderFrame | null>(null);
  const overlayOnlyRef = useRef(false);
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

  const { height, width } = documentSize;
  const [core, setCore] = useState<DrawingCore | null>(null);
  const [coreError, setCoreError] = useState<string | null>(null);
  const [loadedSize, setLoadedSize] = useState<Size>(documentSize);

  useEffect(() => {
    let active = true;

    (async () => {
      const [data, error] = await attempt(
        WasmDrawingCore.create({ height, width })
      );

      if (error) {
        console.error("Drawing core failed to start", error);

        if (active) setCoreError("Холст не загрузился");

        return;
      }

      if (!active) data.dispose();
      else {
        setCoreError(null);
        setLoadedSize(data.size);
        setCore(data);
      }
    })();

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
      cancelAnimationFrame(frameRef.current);
      frameRef.current = 0;
      core?.dispose();
    },
    [core]
  );

  const bridge = useMemo(
    () => (core ? new DrawingBridge({ core, viewport: EMPTY_VIEWPORT }) : null),
    [core]
  );

  /**
   * Surfaces are built on demand, not in an effect: the canvases exist from
   * the first commit, so any frame or measure can create them. This keeps
   * painting working no matter in which order effects run or re-run.
   */
  const ensureSurfaces = useCallback((): Surfaces | null => {
    if (surfacesRef.current) return surfacesRef.current;

    const surface = surfaceRef.current;
    const overlay = overlayRef.current;

    if (!surface || !overlay) return null;

    surfacesRef.current = {
      overlay: new OverlaySurface(overlay),
      tiles: new TileSurface(surface),
    };

    return surfacesRef.current;
  }, []);

  /** Builds one frame on demand: tiles go to the dirty area only. */
  const renderNow = useCallback(() => {
    frameRef.current = 0;

    let surfaces: Surfaces | null = null;

    try {
      surfaces = ensureSurfaces();
    } catch (error: unknown) {
      console.error("Drawing surfaces failed to start", error);
    }

    if (!surfaces || !bridge) return;

    // A pointer move changes nothing in the document. Reusing the last frame
    // skips the tile index and the frame maps, and those are the price of
    // every hover with the eyedropper.
    const cached = overlayOnlyRef.current ? frameCacheRef.current : null;

    overlayOnlyRef.current = false;

    const frame = cached ?? bridge.frame();
    // The minimap copies what the tile surface repainted, so the dirty
    // rectangle is part of the frame handover, not of the tile surface.
    const dirty = cached === null ? surfaces.tiles.render(frame, bridge.core) : null;

    frameCacheRef.current = frame;

    const overlay = overlayState.current;
    const pointer = overlay.inside ? overlay.pointer : null;

    surfaces.overlay.render({
      brush: bridge.brushSettings,
      camera: frame.camera,
      dirty,
      document: frame.document,
      hex: overlay.hex,
      // The source canvas feeds the loupe and the minimap: the second one
      // needs it even with no pointer over the sheet.
      minimapHover: overlay.minimapHover,
      pointer,
      source: surfaces.tiles.snapshot(),
      tileSize: bridge.core.tileSize,
      tool: bridge.toolName,
      viewport: frame.viewport,
    });
  }, [bridge, ensureSurfaces]);

  const schedule = useCallback(
    (overlayOnly: boolean) => {
      if (frameRef.current !== 0) {
        // A pending full frame absorbs an overlay-only request.
        if (!overlayOnly) overlayOnlyRef.current = false;

        return;
      }

      overlayOnlyRef.current = overlayOnly;
      frameRef.current = requestAnimationFrame(renderNow);
    },
    [renderNow]
  );

  const requestRender = useCallback(() => schedule(false), [schedule]);
  const requestOverlayRender = useCallback(() => schedule(true), [schedule]);

  useEffect(() => bridge?.subscribe(requestRender), [bridge, requestRender]);

  useEffect(() => {
    // A new core is a new document: the cached frame belongs to the old one.
    if (bridge) frameCacheRef.current = null;
  }, [bridge]);

  useEffect(() => {
    // a new document is fitted into the container again
    fittedRef.current = false;

    const measure = () => {
      const container = containerRef.current;

      if (!container || !bridge) return;

      // The canvases fill the padding box: the border is not theirs. Measured
      // by the border box the document was fitted and centred for a box four
      // pixels wider, and the right/bottom edge was clipped away.
      const viewport = {
        height: container.clientHeight,
        width: container.clientWidth,
      };

      if (viewport.width <= 0 || viewport.height <= 0) return;

      bridge.setViewport(viewport);

      if (!fittedRef.current) {
        fittedRef.current = true;
        bridge.fitView();
      }

      const surfaces = ensureSurfaces();
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

    if (container) observer.observe(container);

    const dprQuery = window.matchMedia(
      `(resolution: ${window.devicePixelRatio}dppx)`
    );

    dprQuery.addEventListener("change", measure);

    return () => {
      observer.disconnect();
      dprQuery.removeEventListener("change", measure);
    };
  }, [bridge, ensureSurfaces, requestRender]);

  useEffect(() => bridge?.setBrush(brush), [bridge, brush]);
  useEffect(() => bridge?.setTool(tool), [bridge, tool]);

  useEffect(() => {
    if (bridge && zoomLimits) bridge.setZoomLimits(zoomLimits);
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
      const [next, error] = await attempt(WasmDrawingCore.fromProject(bytes));

      if (error) {
        console.error("Project file failed to open", error);

        return false;
      }

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

    if (isCanvasStateEqual(previous, next)) return;

    stateRef.current = next;
    onStateChange?.(next);
  }, [canRedo, canUndo, coreError, empty, loadedSize, onStateChange, zoom]);

  const api = useMemo<DrawingCanvasAPI>(
    () => ({
      canRedo,
      canUndo,
      clear: () => bridge?.clearLayer(),
      loadProject,
      redo: () => bridge?.redo(),
      requestImage: (requestOptions?: RequestImageOptions) =>
        bridge
          ? exportDocument({
              core: bridge.core,
              filename: requestOptions?.filename ?? "canvas.png",
            })
          : Promise.resolve(null),
      requestProject: () =>
        bridge ? exportProject({ core: bridge.core }) : null,
      resetView: () => bridge?.fitView(),
      undo: () => bridge?.undo(),
    }),
    [bridge, canRedo, canUndo, loadProject]
  );

  return {
    api,
    bridge,
    containerRef,
    overlayRef,
    overlayState,
    requestOverlayRender,
    surfaceRef,
  };
};
