import { Button } from "@/components/ui/button.component";
import { Slider } from "@/components/ui/slider";
import { CanvasComponent } from "@/components/canvas/index.canvas";
import { cn } from "@/lib/utils";
import { useRef, useState, useCallback } from "react";
import {
  Pencil,
  Eraser,
  Pipette,
  Undo2,
  Redo2,
  RefreshCcw,
} from "lucide-react";
import type { CanvasAPI, CanvasTool } from "@/types/canvas";
import { PALETTE_COLORS } from "@/config/canvas.config";
import { ColorPicker } from "@/components/shared/picker.component";

function CanvasRegister({
  setCurrentTab,
}: {
  setCurrentTab: (value: "data" | "canvas") => void;
}) {
  const canvasApiRef = useRef<CanvasAPI | null>(null);
  const [selectedTool, setSelectedTool] = useState<CanvasTool>("draw");
  const [selectedColor, setSelectedColor] = useState("#000000");
  const [selectedSize, setSelectedSize] = useState(8);
  const [selectedOpacity, setSelectedOpacity] = useState(1);
  const prevToolRef = useRef<CanvasTool>("draw");

  const handleMount = useCallback((api: CanvasAPI) => {
    canvasApiRef.current = api;
  }, []);

  const handleToolChange = useCallback(
    (tool: CanvasTool) => {
      if (tool === "eyedropper") {
        prevToolRef.current = selectedTool;
      }
      setSelectedTool(tool);
    },
    [selectedTool],
  );

  const handleToolCancelEyedropper = useCallback(() => {
    setSelectedTool(prevToolRef.current);
  }, []);

  const handleUndo = useCallback(() => {
    canvasApiRef.current?.undo();
  }, []);

  const handleRedo = useCallback(() => {
    canvasApiRef.current?.redo();
  }, []);

  const handleClear = useCallback(() => {
    if (confirm("Вы уверены?")) return canvasApiRef.current?.clear();
  }, []);

  const handleColorChange = useCallback((color: string) => {
    if (!color.startsWith("#") || color.length > 7) return;
    setSelectedColor(color);
  }, []);

  const handleSizeChange = useCallback((size: number) => {
    setSelectedSize(size);
  }, []);

  const handleOpacityChange = useCallback((opacity: number) => {
    setSelectedOpacity(opacity);
  }, []);

  const handleColorPick = useCallback((color: string) => {
    setSelectedColor(color);
  }, []);

  const handleCreate = useCallback(() => {}, []);

  return (
    <main className="flex flex-col gap-4 w-full items-center">
      <CanvasComponent
        dimensions={{ width: 420, height: 420 }}
        color={selectedColor}
        brushSize={selectedSize}
        opacity={selectedOpacity}
        tool={selectedTool}
        onMount={handleMount}
        brushSizeRange={{ min: 1, max: 100 }}
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

      <section className="flex flex-row w-full h-20 boxShadow border-2 border-border">
        {/*TOOLS*/}
        <div className="grid grid-cols-2 grid-rows-2 p-0.5 gap-0.5">
          <Button
            size="icon"
            className={cn(
              "size-8 noShadow",
              selectedTool === "draw"
                ? "bg-primary border-border"
                : "bg-transparent border-border/30 hover:bg-primary/30 hover:border-border/60",
            )}
            onClick={() => handleToolChange("draw")}
            aria-label="Кисть"
          >
            <Pencil className="size-4" />
          </Button>
          <Button
            size="icon"
            className={cn(
              "size-8 noShadow",
              selectedTool === "eraser"
                ? "bg-primary border-border"
                : "bg-transparent border-border/30 hover:bg-primary/30 hover:border-border/60",
            )}
            onClick={() => handleToolChange("eraser")}
            aria-label="Ластик"
          >
            <Eraser className="size-4" />
          </Button>
          <Button
            size="icon"
            className={cn(
              "size-8 noShadow",
              selectedTool === "eyedropper"
                ? "bg-primary border-border"
                : "bg-transparent border-border/30 hover:bg-primary/30 hover:border-border/60",
            )}
            onClick={() => handleToolChange("eyedropper")}
            aria-label="Пипетка"
          >
            <Pipette className="size-4" />
          </Button>
        </div>
        {/*UNDO REDO*/}
        <div className="flex flex-col p-1 gap-1">
          <Button
            size="icon"
            className="size-8 noShadow bg-transparent border-border/30 hover:bg-primary/30 hover:border-border/60"
            onClick={handleUndo}
            aria-label="Отменить"
          >
            <Undo2 className="size-4" />
          </Button>
          <Button
            size="icon"
            className="size-8 noShadow bg-transparent border-border/30 hover:bg-primary/30 hover:border-border/60"
            onClick={handleRedo}
            aria-label="Повторить"
          >
            <Redo2 className="size-4" />
          </Button>
        </div>
        {/*COLOR*/}
        <div className="flex flex-row p-1 gap-1 items-center">
          <div className="grid grid-rows-3 grid-cols-5 gap-1">
            {PALETTE_COLORS.map(({ name, hex }) => (
              <Button
                key={name}
                type="button"
                size="icon"
                className={cn(
                  "size-5 noShadow border-2 cursor-pointer transition-all hover:scale-110",
                  selectedColor === hex
                    ? "border-text scale-110 ring-1 ring-text"
                    : "border-border",
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
        <div className="flex flex-row p-1 items-center">
          <ColorPicker value={selectedColor} onChange={handleColorChange}>
            <div
              role="button"
              className="size-6 border-border border-2 noShadow cursor-pointer transition-all hover:scale-110 p-0"
              style={{
                backgroundColor: selectedColor,
              }}
              title="Выбрать цвет"
            />
          </ColorPicker>
        </div>
        {/*SLIDERS*/}
        <div className="flex flex-col gap-4 flex-1 p-1">
          <div className="w-full leading-tight flex flex-col gap-2">
            <span className="text-muted text-[10px] font-bold uppercase tracking-widest">
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
          <div className="w-full leading-tight flex flex-col gap-2">
            <span className="text-muted text-[10px] font-bold uppercase tracking-widest">
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

      <div className="flex flex-row gap-2 items-center w-full">
        <Button
          size="icon"
          className="size-9 ml-auto"
          onClick={handleClear}
          title="Очистить"
        >
          <RefreshCcw />
        </Button>
        <Button variant="error" onClick={() => setCurrentTab("data")}>
          Назад
        </Button>
        <Button variant="success" onClick={handleCreate} disabled={!!true}>
          Создать
        </Button>
      </div>
    </main>
  );
}

export default CanvasRegister;
