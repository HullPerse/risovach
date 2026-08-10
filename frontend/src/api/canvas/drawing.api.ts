import { clipPointsToCanvas, isPointInCanvas } from "@/lib/canvas.utils";
import { useCanvasStore } from "@/stores/canvas.store";
import type { CanvasInteractionProps, Point } from "@/types/canvas";

const getStore = () => useCanvasStore.getState();

export class CanvasDrawing {
  private props!: CanvasInteractionProps;
  private wasOutside = false;

  setContext(props: CanvasInteractionProps): void {
    this.props = props;
  }

  start(canvasPos: Point): void {
    getStore().setIsDrawing(true);
    getStore().setCurrentPoints(
      clipPointsToCanvas([canvasPos], this.props.dimensions)
    );
  }

  move(canvasPos: Point): void {
    const store = getStore();
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
        clipPointsToCanvas([canvasPos], this.props.dimensions)
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
    const store = getStore();
    if (!store.isDrawing) {
      return;
    }
    store.setIsDrawing(false);
    this.wasOutside = false;

    if (store.currentPoints.length === 0) {
      store.setMousePos(null);
      return;
    }

    this.saveStroke();
  }

  saveStroke(): void {
    getStore().saveStroke(
      this.props.tool,
      this.props.color,
      this.props.brushSize,
      this.props.opacity
    );
  }

  reset(): void {
    getStore().setIsDrawing(false);
    getStore().setCurrentPoints([]);
    getStore().setMousePos(null);
    this.wasOutside = false;
  }
}
