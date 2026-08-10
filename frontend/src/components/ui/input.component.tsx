import { Input as InputPrimitive } from "@base-ui/react/input";
import {
  ChevronDown,
  ChevronUp,
  EyeIcon,
  EyeOffIcon,
  InfinityIcon,
} from "lucide-react";
import { useState } from "react";
import type { ChangeEvent, ComponentProps, ReactNode } from "react";

import { cn } from "@/lib/index.utils";

const clampValue = (value: string, min: unknown, max: unknown): string => {
  const numeric = Number(value);
  const minNum = Number(min);
  const maxNum = Number(max);

  let clamped = value;
  if (!Number.isNaN(minNum) && numeric < minNum) {
    clamped = String(minNum);
  }
  if (!Number.isNaN(maxNum) && numeric > maxNum) {
    clamped = String(maxNum);
  }
  return clamped;
};

const Arrows = ({
  disabled,
  onDecrease,
  onIncrease,
}: {
  disabled: boolean;
  onDecrease: () => void;
  onIncrease: () => void;
}) => (
  <div
    className="text-muted-foreground absolute top-0 right-2 flex flex-col items-center justify-center"
    aria-hidden={disabled ? "true" : "false"}
  >
    <button
      type="button"
      className="hover:text-foreground cursor-pointer p-1 disabled:cursor-not-allowed"
      onClick={onIncrease}
      disabled={disabled}
      aria-label="Increase number"
    >
      <ChevronUp size={14} />
    </button>
    <button
      type="button"
      className="hover:text-foreground cursor-pointer p-1 disabled:cursor-not-allowed"
      onClick={onDecrease}
      disabled={disabled}
      aria-label="Decrease number"
    >
      <ChevronDown size={14} />
    </button>
  </div>
);

const Amount = ({
  count,
  isOverMax,
  isUnderMin,
  max,
  offsetTop,
}: {
  count: number;
  isOverMax: boolean;
  isUnderMin: boolean;
  max: ReactNode;
  offsetTop: boolean;
}) => (
  <div
    className={cn(
      "absolute right-2 bottom-1 inline-flex items-center gap-0.5 text-xs font-bold select-none",
      isOverMax || (offsetTop ? "text-muted-foreground" : "")
    )}
  >
    <span
      style={{
        color:
          isOverMax || isUnderMin
            ? "var(--color-error)"
            : "var(--color-success)",
      }}
    >
      {count}
    </span>
    <span className="text-muted-foreground">/</span>
    <span className="text-muted-foreground">
      {max ?? <InfinityIcon className="h-3 w-3" />}
    </span>
  </div>
);

export const Input = ({
  className,
  type,
  value = "",
  arrows,
  amount,
  onChange,
  ref,
  ...props
}: ComponentProps<"input"> & { arrows?: boolean; amount?: boolean }) => {
  const [visiblePassword, setVisiblePassword] = useState(false);
  const [internalValue, setInternalValue] = useState(value);
  const inputValue = value === undefined ? internalValue : value;

  const inputType = type === "password" && visiblePassword ? "text" : type;
  const showAmount = Boolean(amount && (props.min || props.max));

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const maxLen = Number(props.max);
    const clampedValue =
      !Number.isNaN(maxLen) && e.target.value.length > maxLen
        ? e.target.value.slice(0, maxLen)
        : e.target.value;

    const syntheticEvent = {
      ...e,
      target: { ...e.target, value: clampedValue },
    };

    onChange?.(syntheticEvent);

    if (value === undefined) {
      setInternalValue(clampedValue);
    }
  };

  const updateValue = (newValue: string) => {
    const syntheticEvent = {
      target: { value: newValue },
    } as ChangeEvent<HTMLInputElement>;
    handleChange(syntheticEvent);
  };

  const handleArrowClick = (delta: number) => {
    const current = Number(inputValue) || 0;
    const next = current + delta;
    updateValue(clampValue(String(next), props.min, props.max));
  };

  const inputLen = String(inputValue).length;
  const isOverMax = props.max !== undefined && inputLen > Number(props.max);
  const isUnderMin = props.min !== undefined && inputLen < Number(props.min);

  return (
    <div className="relative w-full">
      <InputPrimitive
        ref={ref}
        type={inputType}
        data-slot="input"
        className={cn(
          "file:text-foreground placeholder:text-muted-foreground focus-visible:outline-primary aria-invalid:border-destructive bg-card h-8 w-full min-w-0 border-2 px-3 py-2 text-sm transition-colors outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:outline-2 focus-visible:outline-offset-2 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
          inputType === "number" &&
            "[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none",
          showAmount && "pr-16",
          className
        )}
        value={inputValue}
        onChange={handleChange}
        {...props}
      />

      {arrows && inputType === "number" && (
        <Arrows
          disabled={Boolean(props.disabled)}
          onDecrease={() => handleArrowClick(-1)}
          onIncrease={() => handleArrowClick(1)}
        />
      )}

      {type === "password" && (
        <button
          type="button"
          tabIndex={-1}
          className={cn(
            "text-muted-foreground hover:text-foreground absolute right-3 cursor-pointer transition-colors",
            showAmount ? "top-1/4" : "top-1/2 -translate-y-1/2"
          )}
          onClick={() => setVisiblePassword((v) => !v)}
          disabled={props.disabled}
        >
          {visiblePassword ? <EyeOffIcon size={20} /> : <EyeIcon size={20} />}
        </button>
      )}

      {showAmount && (
        <Amount
          count={inputLen}
          isOverMax={isOverMax}
          isUnderMin={isUnderMin}
          max={props.max}
          offsetTop={type === "password"}
        />
      )}
    </div>
  );
};
