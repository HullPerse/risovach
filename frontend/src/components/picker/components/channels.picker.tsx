import { useRef, useState } from "react";
import type { ClipboardEvent, KeyboardEvent } from "react";

import { CHANNEL_CONFIG, FORMAT_PREFIX } from "@/config/color.config";
import {
  clamp,
  hslToRgb,
  hsvToChannelStrings,
  rgbToHsv,
} from "@/lib/color.utils";
import { cn } from "@/lib/index.utils";
import type { ChannelFormat, ChannelInputsProps } from "@/types/color";

const parseChannel = (n: string): number => {
  const value = Math.trunc(Number(n));
  return Number.isNaN(value) ? 0 : value;
};

const CHANNEL_LABELS: Record<ChannelFormat, [string, string, string]> = {
  hsl: ["h", "s", "l"],
  rgb: ["r", "g", "b"],
};

export const ChannelInputs = ({ format, hsv, commit }: ChannelInputsProps) => {
  const [draft, setDraft] = useState<[string, string, string]>(() =>
    hsvToChannelStrings(hsv, format)
  );
  const [isEditing, setIsEditing] = useState(false);
  const channelRefs = useRef<(HTMLInputElement | null)[]>([null, null, null]);
  const config = CHANNEL_CONFIG[format];

  const values = isEditing ? draft : hsvToChannelStrings(hsv, format);

  const commitChannels = (channels: [string, string, string]) => {
    const [a, b, c] = channels.map(parseChannel);
    if (format === "rgb") {
      commit(
        rgbToHsv({
          b: clamp(c, 0, 255),
          g: clamp(b, 0, 255),
          r: clamp(a, 0, 255),
        })
      );
    } else {
      commit(
        rgbToHsv(
          hslToRgb({
            h: clamp(a, 0, 360),
            l: clamp(c, 0, 100),
            s: clamp(b, 0, 100),
          })
        )
      );
    }
  };

  const handleChange = (index: number, rawValue: string) => {
    const cleaned = rawValue.replaceAll(/[^0-9]/gu, "");
    const numeric = parseChannel(cleaned);

    const next = [...draft] as [string, string, string];
    next[index] = cleaned === "" ? "" : String(numeric);
    setDraft(next);

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
    } else if (e.key === "Backspace" && values[index] === "" && index > 0) {
      e.preventDefault();
      channelRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (_index: number, e: ClipboardEvent<HTMLInputElement>) => {
    const text = e.clipboardData.getData("text");
    const numbers = text
      .replaceAll(/[^0-9.,\s]/gu, " ")
      .split(/[\s,]+/u)
      .filter(Boolean)
      .slice(0, 3)
      .map(parseChannel);

    if (numbers.length === 3) {
      e.preventDefault();
      const clamped = numbers.map((n, i) => clamp(n, 0, config.maxs[i])) as [
        number,
        number,
        number,
      ];
      const strings = clamped.map(String) as [string, string, string];
      setDraft(strings);
      commitChannels(strings);
      channelRefs.current[2]?.focus();
    }
  };

  const handleBlur = () => {
    setIsEditing(false);
    const cleaned = values.map((c, i) => {
      const n = c === "" ? 0 : parseChannel(c);
      return String(clamp(n, 0, config.maxs[i]));
    }) as [string, string, string];
    commitChannels(cleaned);
  };

  return (
    <div className="flex gap-1.5">
      {values.map((val, i) => (
        <input
          key={CHANNEL_LABELS[format][i]}
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
          onFocus={() => {
            setIsEditing(true);
            setDraft(hsvToChannelStrings(hsv, format));
          }}
          onBlur={handleBlur}
          className={cn(
            "border-border bg-input h-8 w-full min-w-0 border-2 px-1 py-2 text-center text-sm",
            "transition-colors outline-none",
            "focus-visible:outline-primary focus-visible:outline-2 focus-visible:outline-offset-2",
            "focus-visible:bg-card"
          )}
        />
      ))}
    </div>
  );
};
