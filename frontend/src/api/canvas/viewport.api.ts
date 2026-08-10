import type Konva from "konva";

import { clampOffset } from "@/lib/canvas.utils";
import { useCanvasStore } from "@/stores/canvas.store";
import type {
  CanvasInteractionProps,
  CanvasTransform,
  PanStart,
  Point,
} from "@/types/canvas";

const getStore = () => useCanvasStore.getState();

export class CanvasViewport {
  private props!: CanvasInteractionProps;
  private transform!: CanvasTransform;
  private panStart: PanStart | null = null;

  setContext(props: CanvasInteractionProps, transform: CanvasTransform): void {
    this.props = props;
    this.transform = transform;
  }

  resetView = (): void => {
    const { zoomConfig } = this.props;
    const clampedZoom = Math.max(
      zoomConfig.zoomMin,
      Math.min(zoomConfig.zoomMax, zoomConfig.initialZoom)
    );
    getStore().resetView(clampedZoom);
  };

  reset(): void {
    this.panStart = null;
    getStore().setIsPanning(false);
  }

  wheel(e: Konva.KonvaEventObject<WheelEvent>): void {
    e.evt.preventDefault();
    const stage = e.target.getStage();
    if (!stage) {
      return;
    }

    stage.setPointersPositions(e.evt);
    const pointer = stage.getPointerPosition();
    if (!pointer) {
      return;
    }

    const zoom = this.computeZoom(e.evt.deltaY > 0 ? -1 : 1);
    getStore().setZoomLevel(zoom.zoom);
    getStore().setPanOffset(this.computePanOffset(pointer, zoom));
  }

  startPan(e: Konva.KonvaEventObject<MouseEvent>): boolean {
    const stage = e.target.getStage();
    if (!stage) {
      return false;
    }

    const pn = this.props.panning ?? {
      allowLeftClickPan: false,
      allowMiddleClickPan: false,
      allowRightClickPan: true,
    };
    const { button } = e.evt;
    const store = getStore();

    const panButtons: Record<number, boolean | undefined> = {
      0: pn.allowLeftClickPan,
      1: pn.allowMiddleClickPan,
      2: pn.allowRightClickPan,
    };
    const panButton =
      panButtons[button] || (store.isSpacePressed && button === 0);

    if (!panButton) {
      return false;
    }

    e.evt.preventDefault();
    store.setIsPanning(true);
    const pos = stage.getPointerPosition();
    if (pos) {
      this.panStart = {
        offsetX: store.panOffset.x,
        offsetY: store.panOffset.y,
        pointerX: pos.x,
        pointerY: pos.y,
      };
    }
    return true;
  }

  movePan(e: Konva.KonvaEventObject<MouseEvent>): boolean {
    const store = getStore();
    if (!store.isPanning) {
      return false;
    }

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
          this.props.limitToBounds
        )
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
    const zoom = Math.max(
      zoomConfig.zoomMin,
      Math.min(
        zoomConfig.zoomMax,
        getStore().zoomLevel *
          (direction > 0 ? zoomConfig.zoomStep : 1 / zoomConfig.zoomStep)
      )
    );
    return { center: centerOnInit ? zoom : 1, scale: zoom, zoom };
  }

  private computePanOffset(
    pointer: Point,
    zoom: { scale: number; center: number }
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
      this.props.limitToBounds
    );
  }
}
