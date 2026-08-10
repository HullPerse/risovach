import {
  Pencil,
  Eraser,
  Pipette,
  Undo2,
  Redo2,
  RefreshCcw,
} from "lucide-react";
import { useRef, useState } from "react";

import { CanvasComponent } from "@/components/canvas/index.canvas";
import { ColorPicker } from "@/components/picker/index.picker";
import { Button } from "@/components/ui/button.component";
import { Slider } from "@/components/ui/slider.component";
import { PALETTE_COLORS } from "@/config/canvas.config";
import { cn } from "@/lib/index.utils";
import { useCanvasStore } from "@/stores/canvas.store";
import type { CanvasAPI, CanvasTool } from "@/types/canvas";

const TOOL_BUTTON_CLASSES = "noShadow size-8";
const SELECTED_TOOL_CLASSES = "bg-primary border-border";
const UNSELECTED_TOOL_CLASSES =
  "border-border/30 hover:bg-primary/30 hover:border-border/60 bg-transparent";

const CanvasRegister = ({
  setCurrentTab,
  onCreate,
}: {
  setCurrentTab: (value: "data" | "canvas" | "preview") => void;
  onCreate: (file: File | null) => void;
}) => {
  const canvasApiRef = useRef<CanvasAPI | null>(null);
  const lines = useCanvasStore((s) => s.lines);
  const [selectedTool, setSelectedTool] = useState<CanvasTool>("draw");
  const [selectedColor, setSelectedColor] = useState("#000000");
  const [selectedSize, setSelectedSize] = useState(8);
  const [selectedOpacity, setSelectedOpacity] = useState(1);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const prevToolRef = useRef<CanvasTool>("draw");

  const handleToolChange = (tool: CanvasTool) => {
    if (tool === "eyedropper") {
      prevToolRef.current = selectedTool;
    }
    setSelectedTool(tool);
  };

  const handleToolCancelEyedropper = () => {
    setSelectedTool(prevToolRef.current);
  };

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

  const handleColorChange = (color: string) => {
    if (!color.startsWith("#") || color.length > 7) {
      return;
    }
    setSelectedColor(color);
  };

  const handleSizeChange = (size: number) => {
    setSelectedSize(size);
  };

  const handleOpacityChange = (opacity: number) => {
    setSelectedOpacity(opacity);
  };

  const handleColorPick = (color: string) => {
    setSelectedColor(color);
  };

  const handleCreate = async () => {
    setIsCreating(true);
    try {
      const file = await canvasApiRef.current?.requestImage();
      onCreate(file ?? null);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <main className="flex w-full flex-col items-center gap-4">
      <CanvasComponent
        dimensions={{ height: 420, width: 420 }}
        color={selectedColor}
        brushSize={selectedSize}
        opacity={selectedOpacity}
        tool={selectedTool}
        ref={canvasApiRef}
        brushSizeRange={{ max: 100, min: 1 }}
        onBrushSizeChange={handleSizeChange}
        onOpacityChange={handleOpacityChange}
        onColorPick={handleColorPick}
        onToolChange={handleToolChange}
        onToolCancel={handleToolCancelEyedropper}
        zoom={{
          initialZoom: 1,
        }}
        className="boxShadow"
      />

      <section className="boxShadow border-border flex h-20 w-full flex-row border-2">
        {/*TOOLS*/}
        <div className="grid grid-cols-2 grid-rows-2 gap-0.5 p-0.5">
          <Button
            size="icon"
            className={cn(
              TOOL_BUTTON_CLASSES,
              selectedTool === "draw"
                ? SELECTED_TOOL_CLASSES
                : UNSELECTED_TOOL_CLASSES
            )}
            onClick={() => handleToolChange("draw")}
            aria-label="Кисть"
          >
            <Pencil className="size-4" />
          </Button>
          <Button
            size="icon"
            className={cn(
              TOOL_BUTTON_CLASSES,
              selectedTool === "eraser"
                ? SELECTED_TOOL_CLASSES
                : UNSELECTED_TOOL_CLASSES
            )}
            onClick={() => handleToolChange("eraser")}
            aria-label="Ластик"
          >
            <Eraser className="size-4" />
          </Button>
          <Button
            size="icon"
            className={cn(
              TOOL_BUTTON_CLASSES,
              selectedTool === "eyedropper"
                ? SELECTED_TOOL_CLASSES
                : UNSELECTED_TOOL_CLASSES
            )}
            onClick={() => handleToolChange("eyedropper")}
            aria-label="Пипетка"
          >
            <Pipette className="size-4" />
          </Button>
        </div>
        {/*UNDO REDO*/}
        <div className="flex flex-col gap-1 p-1">
          <Button
            size="icon"
            className="noShadow border-border/30 hover:bg-primary/30 hover:border-border/60 size-8 bg-transparent"
            onClick={handleUndo}
            aria-label="Отменить"
          >
            <Undo2 className="size-4" />
          </Button>
          <Button
            size="icon"
            className="noShadow border-border/30 hover:bg-primary/30 hover:border-border/60 size-8 bg-transparent"
            onClick={handleRedo}
            aria-label="Повторить"
          >
            <Redo2 className="size-4" />
          </Button>
        </div>
        {/*COLOR*/}
        <div className="flex flex-row items-center gap-1 p-1">
          <div className="grid grid-cols-5 grid-rows-3 gap-1">
            {PALETTE_COLORS.map(({ name, hex }) => (
              <Button
                key={name}
                type="button"
                size="icon"
                className={cn(
                  "noShadow size-5 cursor-pointer border-2 transition-transform hover:scale-110",
                  selectedColor === hex
                    ? "border-text ring-text scale-110 ring-1"
                    : "border-border"
                )}
                style={{ backgroundColor: hex }}
                onClick={() => handleColorChange(hex)}
                disabled={selectedColor === hex}
                aria-label={name}
                title={name}
              />
            ))}
          </div>
        </div>
        {/*CUSTOM COLOR*/}
        <div className="flex flex-row items-center p-1">
          <ColorPicker value={selectedColor} onChange={handleColorChange}>
            <Button
              type="button"
              size="icon"
              className="border-border noShadow size-6 cursor-pointer border-2 p-0 transition-transform hover:scale-110"
              style={{ backgroundColor: selectedColor }}
              aria-label="Выбрать цвет"
              title="Выбрать цвет"
            />
          </ColorPicker>
        </div>
        {/*SLIDERS*/}
        <div className="flex flex-1 flex-col gap-4 p-1">
          <div className="flex w-full flex-col gap-2 leading-tight">
            <span className="text-muted text-[10px] font-bold tracking-widest uppercase">
              Размер: {selectedSize}px
            </span>
            <Slider
              min={1}
              max={100}
              value={selectedSize}
              onValueChange={(e) => handleSizeChange(Number(e))}
              aria-label="Размер кисти"
            />
          </div>
          <div className="flex w-full flex-col gap-2 leading-tight">
            <span className="text-muted text-[10px] font-bold tracking-widest uppercase">
              Непрозрачность: {Math.round(selectedOpacity * 100)}%
            </span>
            <Slider
              min={0}
              max={1}
              step={0.01}
              value={selectedOpacity}
              onValueChange={(e) => handleOpacityChange(Number(e))}
              aria-label="Непрозрачность"
            />
          </div>
        </div>
      </section>

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
          disabled={lines.length === 0}
        >
          Создать
        </Button>
      </div>

      {showClearConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <dialog
            open
            aria-labelledby="clear-canvas-title"
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
        </div>
      )}
    </main>
  );
};

export default CanvasRegister;
