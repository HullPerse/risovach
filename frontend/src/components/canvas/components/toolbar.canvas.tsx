import {
  Eraser,
  Paintbrush,
  PaintBucket,
  Pencil,
  Pipette,
  Redo2,
  Undo2,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { ColorPicker } from "@/components/picker/index.picker";
import { Button } from "@/components/ui/button.component";
import { Slider } from "@/components/ui/slider.component";
import { PALETTE_COLORS } from "@/config/canvas.config";
import { cn } from "@/lib/index.utils";
import type { CanvasTool } from "@/types/engine/canvas";

const TOOL_BUTTON_CLASSES = "noShadow size-8";
const SELECTED_TOOL_CLASSES = "bg-primary border-border";
const UNSELECTED_TOOL_CLASSES =
  "border-border/30 hover:bg-primary/30 hover:border-border/60 bg-transparent";

const TOOLS = [
  { icon: Paintbrush, label: "Кисть", value: "draw" },
  { icon: Pencil, label: "Карандаш", value: "pencil" },
  { icon: Eraser, label: "Ластик", value: "eraser" },
  { icon: PaintBucket, label: "Заливка", value: "fill" },
  { icon: Pipette, label: "Пипетка", value: "eyedropper" },
] as const satisfies { icon: LucideIcon; label: string; value: CanvasTool }[];

export const CanvasToolbar = ({
  tool,
  onToolChange,
  color,
  onColorChange,
  size,
  onSizeChange,
  opacity,
  onOpacityChange,
  onUndo,
  onRedo,
}: {
  tool: CanvasTool;
  onToolChange: (tool: CanvasTool) => void;
  color: string;
  onColorChange: (color: string) => void;
  size: number;
  onSizeChange: (size: number) => void;
  opacity: number;
  onOpacityChange: (opacity: number) => void;
  onUndo?: () => void;
  onRedo?: () => void;
}) => {
  const selectColor = (next: string) => {
    if (!next.startsWith("#") || next.length > 7) return;
    onColorChange(next);
  };

  return (
    <section className="boxShadow border-border flex h-20 w-full flex-row border-2">
      <div className="grid grid-cols-3 grid-rows-2 gap-0.5 p-0.5">
        {TOOLS.map(({ icon: Icon, label, value }) => (
          <Button
            key={value}
            size="icon"
            className={cn(
              TOOL_BUTTON_CLASSES,
              tool === value ? SELECTED_TOOL_CLASSES : UNSELECTED_TOOL_CLASSES
            )}
            onClick={() => onToolChange(value)}
            aria-label={label}
          >
            <Icon className="size-4" />
          </Button>
        ))}
      </div>

      <div className="flex flex-col gap-1 p-1">
        <Button
          size="icon"
          className="noShadow border-border/30 hover:bg-primary/30 hover:border-border/60 size-8 bg-transparent"
          onClick={onUndo}
          aria-label="Отменить"
        >
          <Undo2 className="size-4" />
        </Button>
        <Button
          size="icon"
          className="noShadow border-border/30 hover:bg-primary/30 hover:border-border/60 size-8 bg-transparent"
          onClick={onRedo}
          aria-label="Повторить"
        >
          <Redo2 className="size-4" />
        </Button>
      </div>

      <div className="flex flex-row items-center gap-1 p-1">
        <div className="grid grid-cols-5 grid-rows-3 gap-1">
          {PALETTE_COLORS.map(({ name, hex }) => (
            <Button
              key={name}
              type="button"
              size="icon"
              className={cn(
                "noShadow size-5 cursor-pointer border-2 transition-transform hover:scale-110",
                color === hex
                  ? "border-text ring-text scale-110 ring-1"
                  : "border-border"
              )}
              style={{ backgroundColor: hex }}
              onClick={() => selectColor(hex)}
              disabled={color === hex}
              aria-label={name}
              title={name}
            />
          ))}
        </div>
      </div>

      <div className="flex flex-row items-center p-1">
        <ColorPicker value={color} onChange={selectColor}>
          <Button
            type="button"
            size="icon"
            className="border-border noShadow size-6 cursor-pointer border-2 p-0 transition-transform hover:scale-110"
            style={{ backgroundColor: color }}
            aria-label="Выбрать цвет"
            title="Выбрать цвет"
          />
        </ColorPicker>
      </div>

      <div className="flex flex-1 flex-col gap-4 p-1">
        <div className="flex w-full flex-col gap-2 leading-tight">
          <span className="text-muted text-[10px] font-bold tracking-widest uppercase">
            Размер: {size}px
          </span>
          <Slider
            min={1}
            max={100}
            value={size}
            onValueChange={(e) => onSizeChange(Number(e))}
            aria-label="Размер кисти"
          />
        </div>
        <div className="flex w-full flex-col gap-2 leading-tight">
          <span className="text-muted text-[10px] font-bold tracking-widest uppercase">
            Непрозрачность: {Math.round(opacity * 100)}%
          </span>
          <Slider
            min={0}
            max={1}
            step={0.01}
            value={opacity}
            onValueChange={(e) => onOpacityChange(Number(e))}
            aria-label="Непрозрачность"
          />
        </div>
      </div>
    </section>
  );
};
