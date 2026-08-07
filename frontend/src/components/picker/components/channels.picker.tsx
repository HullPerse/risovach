import {
  useEffect,
  useRef,
  useState,
  type ClipboardEvent,
  type KeyboardEvent,
} from "react";
import { CHANNEL_CONFIG, FORMAT_PREFIX } from "@/config/color.config";
import {
  clamp,
  hslToRgb,
  hsvToChannelStrings,
  rgbToHsv,
} from "@/lib/color.utils";
import { cn } from "@/lib/index.utils";
import type { ChannelInputsProps } from "@/types/color";

export function ChannelInputs({ format, hsv, commit }: ChannelInputsProps) {
  const [channelValues, setChannelValues] = useState<[string, string, string]>([
    "0",
    "0",
    "0",
  ]);
  const [focusedField, setFocusedField] = useState<number | null>(null);
  const channelRefs = useRef<(HTMLInputElement | null)[]>([null, null, null]);
  const config = CHANNEL_CONFIG[format];

  useEffect(() => {
    if (focusedField !== null) return;
    setChannelValues(hsvToChannelStrings(hsv, format));
  }, [hsv, format, focusedField]);

  const commitChannels = (channels: [string, string, string]) => {
    const [a, b, c] = channels.map((n) => parseInt(n, 10) || 0);
    if (format === "rgb") {
      commit(
        rgbToHsv({
          r: clamp(a, 0, 255),
          g: clamp(b, 0, 255),
          b: clamp(c, 0, 255),
        }),
      );
    } else {
      commit(
        rgbToHsv(
          hslToRgb({
            h: clamp(a, 0, 360),
            s: clamp(b, 0, 100),
            l: clamp(c, 0, 100),
          }),
        ),
      );
    }
  };

  const handleChange = (index: number, rawValue: string) => {
    const cleaned = rawValue.replace(/[^0-9]/g, "");
    const numeric = parseInt(cleaned, 10) || 0;

    const next = [...channelValues] as [string, string, string];
    next[index] = cleaned === "" ? "" : String(numeric);
    setChannelValues(next);

    if (next.every((c) => c !== "")) {
      commitChannels(next);
    }

    if (numeric > config.thresholds[index] && index < 2) {
      channelRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === "Tab") {
      if (index < 2) {
        e.preventDefault();
        channelRefs.current[index + 1]?.focus();
      }
    } else if (
      e.key === "Backspace" &&
      channelValues[index] === "" &&
      index > 0
    ) {
      e.preventDefault();
      channelRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (_index: number, e: ClipboardEvent<HTMLInputElement>) => {
    const text = e.clipboardData.getData("text");
    const numbers = text
      .replace(/[^0-9.,\s]/g, " ")
      .split(/[\s,]+/)
      .filter(Boolean)
      .slice(0, 3)
      .map((n) => parseInt(n, 10) || 0);

    if (numbers.length === 3) {
      e.preventDefault();
      const clamped = numbers.map((n, i) => clamp(n, 0, config.maxs[i])) as [
        number,
        number,
        number,
      ];
      const strings = clamped.map(String) as [string, string, string];
      setChannelValues(strings);
      commitChannels(strings);
      channelRefs.current[2]?.focus();
    }
  };

  const handleBlur = () => {
    setFocusedField(null);
    const cleaned = channelValues.map((c, i) => {
      const n = c === "" ? 0 : parseInt(c, 10) || 0;
      return String(clamp(n, 0, config.maxs[i]));
    }) as [string, string, string];
    setChannelValues(cleaned);
    commitChannels(cleaned);
  };

  return (
    <div className="flex gap-1.5">
      {channelValues.map((val, i) => (
        <input
          key={i}
          ref={(el) => {
            channelRefs.current[i] = el;
          }}
          type="text"
          inputMode="numeric"
          aria-label={`${FORMAT_PREFIX[format]} channel ${i + 1}`}
          value={val}
          spellCheck={false}
          autoComplete="off"
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={(e) => handlePaste(i, e)}
          onFocus={() => setFocusedField(i)}
          onBlur={handleBlur}
          className={cn(
            "h-8 w-full min-w-0 border-2 border-border bg-input px-1 py-2 text-center text-sm",
            "outline-none transition-colors",
            "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
            "focus-visible:bg-card",
          )}
        />
      ))}
    </div>
  );
}
