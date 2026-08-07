import { clipPointsToCanvas, isPointInCanvas } from "@/lib/canvas.utils";
import { useCanvasStore } from "@/stores/canvas.store";
import type { CanvasInteractionProps, Point } from "@/types/canvas";

export class CanvasDrawing {
  private props!: CanvasInteractionProps;
  private wasOutside: boolean = false;

  setContext(props: CanvasInteractionProps): void {
    this.props = props;
  }

  private get store() {
    return useCanvasStore.getState();
  }

  start(canvasPos: Point): void {
    this.store.setIsDrawing(true);
    this.store.setCurrentPoints(
      clipPointsToCanvas([canvasPos], this.props.dimensions),
    );
  }

  move(canvasPos: Point): void {
    const store = this.store;
    const margin = this.props.brushSize + 5;

    if (!isPointInCanvas(canvasPos, this.props.dimensions, margin)) {
      if (store.currentPoints.length > 0) {
        this.saveStroke();
        this.wasOutside = true;
      }
      store.setMousePos(canvasPos);
      return;
    }

    store.setMousePos(canvasPos);

    if (this.wasOutside) {
      this.wasOutside = false;
      store.setCurrentPoints(
        clipPointsToCanvas([canvasPos], this.props.dimensions),
      );
      return;
    }

    const clipped = clipPointsToCanvas([canvasPos], this.props.dimensions);
    const prev = store.currentPoints;
    if (prev.length === 0) {
      store.setCurrentPoints(clipped);
    } else {
      store.setCurrentPoints([...prev, clipped[0]]);
    }
  }

  end(): void {
    const store = this.store;
    if (!store.isDrawing) return;
    store.setIsDrawing(false);
    this.wasOutside = false;

    if (store.currentPoints.length === 0) {
      store.setMousePos(null);
      return;
    }

    this.saveStroke();
  }

  saveStroke(): void {
    this.store.saveStroke(
      this.props.tool,
      this.props.color,
      this.props.brushSize,
      this.props.opacity,
    );
  }

  reset(): void {
    this.store.setIsDrawing(false);
    this.store.setCurrentPoints([]);
    this.store.setMousePos(null);
    this.wasOutside = false;
  }
}
