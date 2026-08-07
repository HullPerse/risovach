import type Konva from "konva";
import { clampOffset } from "@/lib/canvas.utils";
import { useCanvasStore } from "@/stores/canvas.store";
import type {
  CanvasInteractionProps,
  CanvasTransform,
  PanStart,
  Point,
} from "@/types/canvas";

export class CanvasViewport {
  private props!: CanvasInteractionProps;
  private transform!: CanvasTransform;
  private panStart: PanStart | null = null;

  setContext(props: CanvasInteractionProps, transform: CanvasTransform): void {
    this.props = props;
    this.transform = transform;
  }

  private get store() {
    return useCanvasStore.getState();
  }

  resetView = (): void => {
    const { zoomConfig } = this.props;
    const clampedZoom = Math.max(
      zoomConfig.zoomMin,
      Math.min(zoomConfig.zoomMax, zoomConfig.initialZoom),
    );
    this.store.resetView(clampedZoom);
  };

  reset(): void {
    this.panStart = null;
    this.store.setIsPanning(false);
  }

  wheel(e: Konva.KonvaEventObject<WheelEvent>): void {
    e.evt.preventDefault();
    const stage = e.target.getStage();
    if (!stage) return;

    stage.setPointersPositions(e.evt);
    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    const zoom = this.computeZoom(e.evt.deltaY > 0 ? -1 : 1);
    this.store.setZoomLevel(zoom.zoom);
    this.store.setPanOffset(this.computePanOffset(pointer, zoom));
  }

  startPan(e: Konva.KonvaEventObject<MouseEvent>): boolean {
    const stage = e.target.getStage();
    if (!stage) return false;

    const pn = this.props.panning ?? {
      allowLeftClickPan: false,
      allowMiddleClickPan: false,
      allowRightClickPan: true,
    };
    const button = e.evt.button;
    const store = this.store;

    const panButton =
      (button === 0 && pn.allowLeftClickPan) ||
      (button === 1 && pn.allowMiddleClickPan) ||
      (button === 2 && pn.allowRightClickPan) ||
      (store.isSpacePressed && button === 0);

    if (!panButton) return false;

    e.evt.preventDefault();
    store.setIsPanning(true);
    const pos = stage.getPointerPosition();
    if (pos) {
      this.panStart = {
        pointerX: pos.x,
        pointerY: pos.y,
        offsetX: store.panOffset.x,
        offsetY: store.panOffset.y,
      };
    }
    return true;
  }

  movePan(e: Konva.KonvaEventObject<MouseEvent>): boolean {
    const store = this.store;
    if (!store.isPanning) return false;

    const pos = e.target.getStage()?.getPointerPosition();
    const start = this.panStart;
    if (pos && start) {
      store.setPanOffset(
        clampOffset(
          {
            x: start.offsetX + (pos.x - start.pointerX),
            y: start.offsetY + (pos.y - start.pointerY),
          },
          this.props.dimensions,
          this.transform.centerScale,
          this.transform.effectiveScale,
          this.props.limitToBounds,
        ),
      );
    }
    return true;
  }

  private computeZoom(direction: 1 | -1): {
    zoom: number;
    scale: number;
    center: number;
  } {
    const { zoomConfig, centerOnInit } = this.props;
    const { fitScale } = this.transform;
    const zoom = Math.max(
      zoomConfig.zoomMin,
      Math.min(
        zoomConfig.zoomMax,
        this.store.zoomLevel *
          (direction > 0 ? zoomConfig.zoomStep : 1 / zoomConfig.zoomStep),
      ),
    );
    const scale = fitScale * zoom;
    return { zoom, scale, center: centerOnInit ? scale : fitScale };
  }

  private computePanOffset(
    pointer: Point,
    zoom: { scale: number; center: number },
  ): Point {
    const { effectiveScale, effectiveX, effectiveY } = this.transform;
    const canvasX = (pointer.x - effectiveX) / effectiveScale;
    const canvasY = (pointer.y - effectiveY) / effectiveScale;
    return clampOffset(
      {
        x:
          pointer.x -
          canvasX * zoom.scale -
          (this.props.dimensions.width -
            this.props.dimensions.width * zoom.center) /
            2,
        y:
          pointer.y -
          canvasY * zoom.scale -
          (this.props.dimensions.height -
            this.props.dimensions.height * zoom.center) /
            2,
      },
      this.props.dimensions,
      zoom.center,
      zoom.scale,
      this.props.limitToBounds,
    );
  }
}
