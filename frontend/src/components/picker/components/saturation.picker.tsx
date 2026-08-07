import {
  useCallback,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
} from "react";
import { clamp, hsvToHex } from "@/lib/color.utils";
import { cn } from "@/lib/index.utils";
import type { SaturationValueAreaProps } from "@/types/color";

export function SaturationValueArea({
  hue,
  saturation,
  value,
  onChange,
  className,
}: SaturationValueAreaProps) {
  const areaRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);

  const updateFromPointer = useCallback(
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

  const handlePointerDown = (e: PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragging(true);
    updateFromPointer(e.clientX, e.clientY);
  };

  const handlePointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (dragging) return updateFromPointer(e.clientX, e.clientY);
  };

  const handlePointerUp = (e: PointerEvent<HTMLDivElement>) => {
    setDragging(false);
    e.currentTarget.releasePointerCapture(e.pointerId);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
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
