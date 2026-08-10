import type Konva from "konva";

import { hexFromPixelComposite } from "@/lib/canvas.utils";
import type {
  CanvasInteractionProps,
  CanvasTransform,
  Point,
} from "@/types/canvas";

export class CanvasEyedropper {
  private props!: CanvasInteractionProps;
  private transform!: CanvasTransform;

  setContext(props: CanvasInteractionProps, transform: CanvasTransform): void {
    this.props = props;
    this.transform = transform;
  }

  samplePixelData(canvasPos: Point): Uint8ClampedArray | null {
    const layer = this.props.drawingLayerRef.current;
    if (!layer) {
      return null;
    }
    const canvas = layer.getCanvas();
    const screenX = Math.round(
      canvasPos.x * this.transform.effectiveScale + this.transform.effectiveX
    );
    const screenY = Math.round(
      canvasPos.y * this.transform.effectiveScale + this.transform.effectiveY
    );
    if (
      screenX < 0 ||
      screenY < 0 ||
      screenX >= canvas.getWidth() ||
      screenY >= canvas.getHeight()
    ) {
      return null;
    }
    try {
      return canvas.getContext().getImageData(screenX, screenY, 1, 1).data;
    } catch {
      return null;
    }
  }

  samplePixelHex(canvasPos: Point): string | null {
    const data = this.samplePixelData(canvasPos);
    return data ? hexFromPixelComposite(data) : null;
  }

  cancel(e: Konva.KonvaEventObject<MouseEvent>): boolean {
    const { button } = e.evt;
    if (this.props.tool !== "eyedropper" || (button !== 1 && button !== 2)) {
      return false;
    }
    e.evt.preventDefault();
    this.props.onToolCancel?.();
    return true;
  }

  pick(canvasPos: Point): boolean {
    if (this.props.tool !== "eyedropper") {
      return false;
    }
    const hex = this.samplePixelHex(canvasPos);
    if (hex) {
      this.props.onColorPick?.(hex);
      this.props.onToolChange?.("draw");
    }
    return true;
  }
}
