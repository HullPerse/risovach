import { RefreshCcw } from "lucide-react";
import { useCallback, useMemo, useRef, useState } from "react";

import { CanvasToolbar } from "@/components/canvas/components/toolbar.canvas";
import { DrawingCanvas } from "@/components/canvas/drawing.canvas";
import { Button } from "@/components/ui/button.component";
import { DEFAULT_BRUSH } from "@/config/drawing.config";
import { useCanvasTool } from "@/hooks/canvas/tool.hook";
import type { RegisterStep } from "@/types/app/auth";
import type { BrushSettings } from "@/types/engine/brush";
import type {
  DrawingCanvasAPI,
  DrawingCanvasState,
  Size,
} from "@/types/engine/drawing";

const AVATAR_SIZE: Size = { height: 420, width: 420 };

const CanvasRegister = ({
  setCurrentTab,
  onCreate,
}: {
  setCurrentTab: (value: RegisterStep) => void;
  onCreate: (file: File | null) => void;
}) => {
  const canvasApiRef = useRef<DrawingCanvasAPI | null>(null);
  const { cancelTool, selectTool, tool } = useCanvasTool();
  const [selectedColor, setSelectedColor] = useState("#000000");
  const [selectedSize, setSelectedSize] = useState(8);
  const [selectedOpacity, setSelectedOpacity] = useState(1);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isEmpty, setIsEmpty] = useState(true);
  const [canvasError, setCanvasError] = useState<string | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);

  const brush = useMemo<BrushSettings>(
    () => ({
      ...DEFAULT_BRUSH,
      color: selectedColor,
      opacity: selectedOpacity,
      size: selectedSize,
    }),
    [selectedColor, selectedOpacity, selectedSize]
  );

  const handleStateChange = useCallback((state: DrawingCanvasState) => {
    setIsEmpty(state.empty);
    setCanvasError(state.error);
  }, []);

  const handleUndo = () => {
    canvasApiRef.current?.undo();
  };

  const handleRedo = () => {
    canvasApiRef.current?.redo();
  };

  const handleClear = () => {
    canvasApiRef.current?.clear();
    setShowClearConfirm(false);
  };

  /**
   * Hands the avatar to the next step. A missing file is shown as an error:
   * silently passing null left the preview empty with no explanation.
   */
  const handleCreate = () => {
    setIsCreating(true);
    setCreateError(null);

    const create = async () => {
      const file = await canvasApiRef.current?.requestImage();

      setIsCreating(false);

      if (!file) {
        setCreateError("PNG не собрался: обновите страницу и повторите");

        return;
      }

      onCreate(file);
    };

    void create();
  };

  const error = canvasError ?? createError;

  return (
    <main className="flex w-full flex-col items-center gap-4">
      <DrawingCanvas
        ref={canvasApiRef}
        brush={brush}
        documentSize={AVATAR_SIZE}
        tool={tool}
        onColorPick={setSelectedColor}
        onStateChange={handleStateChange}
        onToolCancel={cancelTool}
        onToolChange={selectTool}
        className="boxShadow box-content size-105"
      />

      <CanvasToolbar
        tool={tool}
        onToolChange={selectTool}
        color={selectedColor}
        onColorChange={setSelectedColor}
        size={selectedSize}
        onSizeChange={setSelectedSize}
        opacity={selectedOpacity}
        onOpacityChange={setSelectedOpacity}
        onUndo={handleUndo}
        onRedo={handleRedo}
      />

      {error ? (
        <span className="text-error text-xs font-bold">{error}</span>
      ) : null}

      <div className="flex w-full flex-row items-center gap-2">
        <Button
          size="icon"
          className="ml-auto size-9"
          onClick={() => setShowClearConfirm(true)}
          title="Очистить"
        >
          <RefreshCcw />
        </Button>
        <Button variant="error" onClick={() => setCurrentTab("data")}>
          Назад
        </Button>
        <Button
          variant="success"
          onClick={handleCreate}
          loading={isCreating}
          disabled={isEmpty}
        >
          Создать
        </Button>
      </div>

      {showClearConfirm && (
        <section className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <dialog
            open
            className="bg-background border-border boxShadow flex min-w-72 flex-col gap-4 border-4 p-6"
          >
            <span id="clear-canvas-title" className="text-center font-bold">
              Очистить холст?
            </span>
            <div className="flex flex-row justify-center gap-2">
              <Button
                variant="ghost"
                onClick={() => setShowClearConfirm(false)}
              >
                Отмена
              </Button>
              <Button variant="error" onClick={handleClear}>
                Очистить
              </Button>
            </div>
          </dialog>
        </section>
      )}
    </main>
  );
};

export default CanvasRegister;
