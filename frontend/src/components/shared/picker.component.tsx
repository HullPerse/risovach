"use client";

import * as React from "react";
import { Popover } from "@base-ui/react/popover";

import type { ColorFormat, HSV } from "@/types/color";
import {
  clamp,
  formatColor,
  hexToHsv,
  hsvToHex,
  parseColor,
} from "@/lib/color";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input.component";
import { Slider } from "@/components/ui/slider";

type ColorPickerContextValue = {
  value: string;
  onChange: (hex: string) => void;
};

const ColorPickerContext = React.createContext<ColorPickerContextValue | null>(
  null,
);

function useColorPicker() {
  const ctx = React.useContext(ColorPickerContext);
  if (!ctx)
    throw new Error(
      "ColorPicker sub-components must be used within <ColorPicker>",
    );
  return ctx;
}

type SaturationValueAreaProps = {
  hue: number;
  saturation: number;
  value: number;
  onChange: (next: { saturation: number; value: number }) => void;
  className?: string;
};

function SaturationValueArea({
  hue,
  saturation,
  value,
  onChange,
  className,
}: SaturationValueAreaProps) {
  const areaRef = React.useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = React.useState(false);

  const updateFromPointer = React.useCallback(
    (clientX: number, clientY: number) => {
      const el = areaRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const x = clamp(clientX - rect.left, 0, rect.width);
      const y = clamp(clientY - rect.top, 0, rect.height);
      onChange({
        saturation: Math.round((x / rect.width) * 100),
        value: Math.round((1 - y / rect.height) * 100),
      });
    },
    [onChange],
  );

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragging(true);
    updateFromPointer(e.clientX, e.clientY);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging) return;
    updateFromPointer(e.clientX, e.clientY);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    setDragging(false);
    e.currentTarget.releasePointerCapture(e.pointerId);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const step = e.shiftKey ? 10 : 1;
    let s = saturation;
    let v = value;
    switch (e.key) {
      case "ArrowLeft":
        s = clamp(s - step, 0, 100);
        break;
      case "ArrowRight":
        s = clamp(s + step, 0, 100);
        break;
      case "ArrowUp":
        v = clamp(v + step, 0, 100);
        break;
      case "ArrowDown":
        v = clamp(v - step, 0, 100);
        break;
      default:
        return;
    }
    e.preventDefault();
    onChange({ saturation: s, value: v });
  };

  return (
    <div
      ref={areaRef}
      role="slider"
      tabIndex={0}
      aria-label="Saturation and brightness"
      aria-valuetext={`Saturation ${saturation}%, brightness ${value}%`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onKeyDown={handleKeyDown}
      className={cn(
        "relative h-40 w-full cursor-crosshair touch-none overflow-hidden border-2 border-border boxShadowSmall outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
        className,
      )}
      style={{ backgroundColor: hsvToHex({ h: hue, s: 100, v: 100 }) }}
    >
      <div
        className="absolute inset-0"
        style={{
          background: "linear-gradient(to right, #fff, rgba(255,255,255,0))",
        }}
      />
      <div
        className="absolute inset-0"
        style={{ background: "linear-gradient(to top, #000, rgba(0,0,0,0))" }}
      />
      <div
        className="pointer-events-none absolute size-4 -translate-x-1/2 -translate-y-1/2 border-2 border-border shadow-[0_0_0_2px_#fff]"
        style={{
          left: `${saturation}%`,
          top: `${100 - value}%`,
          backgroundColor: hsvToHex({ h: hue, s: saturation, v: value }),
        }}
      />
    </div>
  );
}

const FORMATS: ColorFormat[] = ["hex", "rgb", "hsl"];

const FORMAT_PREFIX: Record<ColorFormat, string> = {
  hex: "HEX",
  rgb: "RGB",
  hsl: "HSL",
};

function ColorPickerPanel({ className }: { className?: string }) {
  const { value, onChange } = useColorPicker();

  const [hsv, setHsv] = React.useState<HSV>(
    () => hexToHsv(value) ?? { h: 220, s: 40, v: 100 },
  );
  const [format, setFormat] = React.useState<ColorFormat>("hex");
  const [inputText, setInputText] = React.useState("");
  const [invalid, setInvalid] = React.useState(false);
  const editingRef = React.useRef(false);
  React.useEffect(() => {
    if (editingRef.current) return;
    const next = hexToHsv(value);
    if (next && hsvToHex(next) !== hsvToHex(hsv)) {
      setHsv(next);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  React.useEffect(() => {
    if (!editingRef.current) {
      setInputText(formatColor(hsv, format));
      setInvalid(false);
    }
  }, [hsv, format]);

  const currentHex = hsvToHex(hsv);

  const commit = React.useCallback(
    (next: HSV) => {
      setHsv(next);
      onChange(hsvToHex(next));
    },
    [onChange],
  );

  const handleInputChange = (text: string) => {
    editingRef.current = true;
    setInputText(text);
    const parsed = parseColor(text, format);
    if (parsed) {
      setInvalid(false);
      commit(parsed);
    } else {
      setInvalid(true);
    }
  };

  const handleInputBlur = () => {
    editingRef.current = false;
    setInputText(formatColor(hsv, format));
    setInvalid(false);
  };

  return (
    <div className={cn("flex w-full flex-col gap-4", className)}>
      <SaturationValueArea
        hue={hsv.h}
        saturation={hsv.s}
        value={hsv.v}
        onChange={({ saturation, value }) =>
          commit({ ...hsv, s: saturation, v: value })
        }
      />

      <div className="flex items-center gap-3">
        <div
          aria-hidden
          className="size-11 shrink-0 border-2 border-border boxShadowSmall"
          style={{ backgroundColor: currentHex }}
        />
        <div className="flex-1">
          <label className="mb-1 block text-[0.65rem] font-bold tracking-widest text-muted uppercase">
            Hue
          </label>
          <Slider
            aria-label="Hue"
            min={0}
            max={360}
            value={hsv.h}
            showIndicator={false}
            onValueChange={(h) => commit({ ...hsv, h: h as number })}
            trackStyle={{
              background:
                "linear-gradient(to right, #f00 0%, #ff0 17%, #0f0 33%, #0ff 50%, #00f 67%, #f0f 83%, #f00 100%)",
            }}
          />
        </div>
      </div>

      <div className="flex items-stretch gap-2">
        <div className="flex overflow-hidden border-2 border-border boxShadowSmall">
          {FORMATS.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFormat(f)}
              aria-pressed={format === f}
              className={cn(
                "px-2 text-[0.7rem] font-bold tracking-wide transition-colors outline-none",
                "border-r-2 border-border last:border-r-0",
                "focus-visible:bg-accent focus-visible:text-text",
                format === f
                  ? "bg-primary text-text"
                  : "bg-card text-text hover:bg-muted",
              )}
            >
              {FORMAT_PREFIX[f]}
            </button>
          ))}
        </div>
        <div className="relative flex-1">
          <Input
            aria-label={`${FORMAT_PREFIX[format]} value`}
            value={inputText}
            aria-invalid={invalid}
            spellCheck={false}
            autoComplete="off"
            onChange={(e) => handleInputChange(e.target.value)}
            onFocus={() => {
              editingRef.current = true;
            }}
            onBlur={handleInputBlur}
          />
        </div>
      </div>
    </div>
  );
}

type ColorPickerProps = {
  value: string;
  onChange: (hex: string) => void;
  children?: React.ReactNode;
  side?: "top" | "right" | "bottom" | "left";
  align?: "start" | "center" | "end";
};

export function ColorPicker({
  value,
  onChange,
  children,
  side = "bottom",
  align = "start",
}: ColorPickerProps) {
  return (
    <ColorPickerContext.Provider value={{ value, onChange }}>
      <Popover.Root>
        <Popover.Trigger>
          {children ?? (
            <span
              aria-hidden
              className="size-7 shrink-0 border-2 border-border"
              style={{ backgroundColor: value }}
            />
          )}
        </Popover.Trigger>

        <Popover.Portal>
          <Popover.Positioner
            side={side}
            align={align}
            sideOffset={10}
            collisionPadding={12}
            className="z-50 outline-none"
          >
            <Popover.Popup
              className={cn(
                "w-72 origin-(--transform-origin) border-2 border-border bg-card p-4 text-text boxShadow",
                "transition-[transform,opacity] duration-150",
                "data-starting-style:scale-95 data-starting-style:opacity-0",
                "data-ending-style:scale-95 data-ending-style:opacity-0",
              )}
            >
              <ColorPickerPanel />
            </Popover.Popup>
          </Popover.Positioner>
        </Popover.Portal>
      </Popover.Root>
    </ColorPickerContext.Provider>
  );
}
