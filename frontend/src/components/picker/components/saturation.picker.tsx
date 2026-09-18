import { useRef } from "react";
import type { KeyboardEvent, PointerEvent } from "react";

import { clamp, hsvToHex } from "@/lib/color.utils";
import { cn } from "@/lib/index.utils";
import type { SaturationValueAreaProps } from "@/types/shared/color";

export const SaturationValueArea = ({
  hue,
  saturation,
  value,
  onChange,
  className,
}: SaturationValueAreaProps) => {
  const areaRef = useRef<HTMLInputElement>(null);
  const draggingRef = useRef(false);

  const updateFromPointer = (clientX: number, clientY: number) => {
    const el = areaRef.current;
    if (!el) {
      return;
    }
    const rect = el.getBoundingClientRect();
    const x = clamp(clientX - rect.left, 0, rect.width);
    const y = clamp(clientY - rect.top, 0, rect.height);
    onChange({
      saturation: Math.round((x / rect.width) * 100),
      value: Math.round((1 - y / rect.height) * 100),
    });
  };

  const handlePointerDown = (e: PointerEvent<HTMLInputElement>) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    draggingRef.current = true;
    updateFromPointer(e.clientX, e.clientY);
  };

  const handlePointerMove = (e: PointerEvent<HTMLInputElement>) => {
    if (draggingRef.current) {
      return updateFromPointer(e.clientX, e.clientY);
    }
  };

  const handlePointerUp = (e: PointerEvent<HTMLInputElement>) => {
    draggingRef.current = false;
    e.currentTarget.releasePointerCapture(e.pointerId);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    const step = e.shiftKey ? 10 : 1;
    let s = saturation;
    let v = value;
    switch (e.key) {
      case "ArrowLeft": {
        s = clamp(s - step, 0, 100);
        break;
      }
      case "ArrowRight": {
        s = clamp(s + step, 0, 100);
        break;
      }
      case "ArrowUp": {
        v = clamp(v + step, 0, 100);
        break;
      }
      case "ArrowDown": {
        v = clamp(v - step, 0, 100);
        break;
      }
      default: {
        return;
      }
    }
    e.preventDefault();
    onChange({ saturation: s, value: v });
  };

  return (
    <div
      className={cn(
        "border-border boxShadowSmall relative h-40 w-full cursor-crosshair touch-none overflow-hidden border-2",
        className
      )}
      style={{ backgroundColor: hsvToHex({ h: hue, s: 100, v: 100 }) }}
    >
      <input
        ref={areaRef}
        type="range"
        aria-label="Saturation and brightness"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={value}
        aria-valuetext={`Saturation ${saturation}%, brightness ${value}%`}
        tabIndex={0}
        className="absolute inset-0 z-10 size-full cursor-crosshair opacity-0 outline-none"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onKeyDown={handleKeyDown}
      />
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: "linear-gradient(to right, #fff, rgba(255,255,255,0))",
        }}
      />
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: "linear-gradient(to top, #000, rgba(0,0,0,0))" }}
      />
      <div
        className="border-border pointer-events-none absolute size-4 -translate-x-1/2 -translate-y-1/2 border-2 shadow-[0_0_0_2px_#fff]"
        style={{
          backgroundColor: hsvToHex({ h: hue, s: saturation, v: value }),
          left: `${saturation}%`,
          top: `${100 - value}%`,
        }}
      />
    </div>
  );
};
