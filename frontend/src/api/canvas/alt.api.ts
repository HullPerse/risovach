import type Konva from "konva";

import { useCanvasStore } from "@/stores/canvas.store";
import type { AltStart, CanvasInteractionProps, Point } from "@/types/canvas";

const LOCK_THRESHOLD = 5;

const getStore = () => useCanvasStore.getState();

export class CanvasAltAdjust {
  private props!: CanvasInteractionProps;
  private altStart: AltStart | null = null;
  private lockedAxis: "x" | "y" | null = null;
  private lastPos: Point | null = null;

  setContext(props: CanvasInteractionProps): void {
    this.props = props;
  }

  rememberPos(pos: Point): void {
    this.lastPos = pos;
  }

  handle(
    e: Konva.KonvaEventObject<MouseEvent>,
    pos: Point,
    canvasPos: Point
  ): boolean {
    const store = getStore();
    if (!(e.evt.altKey && !store.isDrawing)) {
      return false;
    }

    if (!this.altStart) {
      this.beginAdjust(pos, canvasPos);
      return true;
    }

    this.applyAdjust(pos);
    return true;
  }

  reset(): void {
    this.altStart = null;
    this.lockedAxis = null;
    if (this.lastPos) {
      getStore().setMousePos(this.lastPos);
    }
    this.lastPos = null;
  }

  isActive(): boolean {
    return this.altStart !== null;
  }

  private beginAdjust(pos: Point, canvasPos: Point): void {
    this.altStart = {
      opacity: this.props.opacity,
      size: this.props.brushSize,
      x: pos.x,
      y: pos.y,
    };
    getStore().setMousePos(canvasPos);
  }

  private applyAdjust(pos: Point): void {
    const start = this.altStart;
    if (!start) {
      return;
    }
    const deltaX = pos.x - start.x;
    const deltaY = pos.y - start.y;
    const abs =
      Math.abs(deltaX) >= LOCK_THRESHOLD || Math.abs(deltaY) >= LOCK_THRESHOLD;

    let axis = this.lockedAxis;
    if (!axis && abs) {
      axis = Math.abs(deltaX) >= Math.abs(deltaY) ? "x" : "y";
      this.lockedAxis = axis;
    }
    if (!axis) {
      return;
    }

    if (axis !== "y") {
      this.applyBrushSize(start, deltaX);
    }
    if (axis !== "x") {
      this.applyOpacity(start, deltaY);
    }
  }

  private applyBrushSize(start: AltStart, deltaX: number): void {
    const { brushSizeRange, brushSize, onBrushSizeChange } = this.props;
    const newSize = Math.max(
      brushSizeRange.min,
      Math.min(brushSizeRange.max, Math.round(start.size + deltaX))
    );
    if (newSize !== brushSize) {
      onBrushSizeChange?.(newSize);
    }
  }

  private applyOpacity(start: AltStart, deltaY: number): void {
    const { opacity, onOpacityChange } = this.props;
    const newOpacity = Math.max(0, Math.min(1, start.opacity - deltaY / 200));
    if (newOpacity !== opacity) {
      onOpacityChange?.(newOpacity);
    }
  }
}
