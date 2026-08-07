import { useCallback, useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input.component";
import { Slider } from "@/components/ui/slider.component";
import { FORMAT_PREFIX, FORMATS } from "@/config/color.config";
import { formatColor, hexToHsv, hsvToHex, parseColor } from "@/lib/color.utils";
import { cn } from "@/lib/index.utils";
import type { ColorFormat, ColorPickerPanelProps, HSV } from "@/types/color";
import { ChannelInputs } from "./channels.picker";
import { SaturationValueArea } from "./saturation.picker";

export function ColorPickerPanel({
  value,
  onChange,
  className,
}: ColorPickerPanelProps) {
  const [hsv, setHsv] = useState<HSV>(
    () => hexToHsv(value) ?? { h: 220, s: 40, v: 100 },
  );
  const [format, setFormat] = useState<ColorFormat>("hex");
  const [inputText, setInputText] = useState("");
  const [invalid, setInvalid] = useState(false);
  const editingRef = useRef(false);

  useEffect(() => {
    if (editingRef.current) return;
    const next = hexToHsv(value);
    setHsv((prev) => {
      if (next && hsvToHex(next) !== hsvToHex(prev)) return next;
      return prev;
    });
  }, [value]);

  useEffect(() => {
    if (!editingRef.current) {
      setInputText(formatColor(hsv, format));
      setInvalid(false);
    }
  }, [hsv, format]);

  const isChannelFormat = format === "rgb" || format === "hsl";

  const commit = useCallback(
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

  const currentHex = hsvToHex(hsv);

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
                "px-2 text-[0.7rem] font-bold tracking-wide transition-colors outline-none cursor-pointer",
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
          {isChannelFormat ? (
            <ChannelInputs format={format} hsv={hsv} commit={commit} />
          ) : (
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
          )}
        </div>
      </div>
    </div>
  );
}
