import { Button } from "@/components/ui/button.component";
import { Input } from "@/components/ui/input.component";
import { Slider } from "@/components/ui/slider";
import { CanvasComponent } from "@/components/shared/canvas.component";
import { cn } from "@/lib/utils";
import { useRef, useState, useCallback } from "react";
import { Pencil, Eraser, Undo2, Redo2, Trash2, RefreshCcw } from "lucide-react";
import type { CanvasAPI, CanvasTool } from "@/types/canvas";
import { PALETTE_COLORS } from "@/config/canvas.config";

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

  const handleMount = useCallback((api: CanvasAPI) => {
    canvasApiRef.current = api;
  }, []);

  const handleToolChange = useCallback((tool: CanvasTool) => {
    setSelectedTool(tool);
  }, []);

  const handleUndo = useCallback(() => {
    canvasApiRef.current?.undo();
  }, []);

  const handleRedo = useCallback(() => {
    canvasApiRef.current?.redo();
  }, []);

  const handleClear = useCallback(() => {
    canvasApiRef.current?.clear();
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
        zoom={{
          initialZoom: 1,
        }}
        className="boxShadow"
      />

      <section className="flex flex-row w-full h-20 boxShadow border-2 border-border">
        {/*TOOLS*/}
        <div className="grid grid-cols-1 grid-rows-2 p-1 gap-1">
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
          <Input
            type="color"
            value={selectedColor}
            onChange={(e) => handleColorChange(e.target.value)}
            className={cn(
              "size-6 p-0 border-2 border-border cursor-pointer [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:border-none [&::-webkit-color-swatch]:rounded-none",
            )}
          />
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
        <Button variant="success" onClick={handleCreate}>
          Создать
        </Button>
      </div>
    </main>
  );
}

export default CanvasRegister;
