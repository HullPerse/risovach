import {
  ChevronDown,
  ChevronUp,
  EyeIcon,
  EyeOffIcon,
  InfinityIcon,
} from "lucide-react";
import { Input as InputPrimitive } from "@base-ui/react/input";
import { cn } from "@/lib/index.utils";
import { useRef, useState, type ChangeEvent, type ComponentProps } from "react";

function Input({
  className,
  type,
  value = "",
  arrows,
  amount,
  onChange,
  ...props
}: ComponentProps<"input"> & { arrows?: boolean; amount?: boolean }) {
  const [visiblePassword, setVisiblePassword] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [internalValue, setInternalValue] = useState(value);
  const inputValue = value !== undefined ? value : internalValue;

  const inputType = type === "password" && visiblePassword ? "text" : type;
  const showAmount = amount && (props.min || props.max);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const max = Number(props.max);
    const clampedValue =
      !isNaN(max) && e.target.value.length > max
        ? e.target.value.slice(0, max)
        : e.target.value;

    const syntheticEvent = {
      ...e,
      target: { ...e.target, value: clampedValue },
    };

    onChange?.(syntheticEvent);

    if (value === undefined) setInternalValue(clampedValue);
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
    const min = Number(props.min);
    const max = Number(props.max);
    const clamped = (() => {
      if (!isNaN(min) && next < min) return String(min);
      if (!isNaN(max) && next > max) return String(max);

      return String(next);
    })();

    updateValue(clamped);
  };

  const inputLen = String(inputValue).length;
  const isOverMax = props.max !== undefined && inputLen > Number(props.max);
  const isUnderMin = props.min !== undefined && inputLen < Number(props.min);

  return (
    <div className="relative w-full">
      <InputPrimitive
        ref={props.ref || inputRef}
        type={inputType}
        data-slot="input"
        className={cn(
          "h-8 w-full min-w-0 border-2 bg-input px-3 py-2 text-sm transition-colors outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive",
          inputType === "number" &&
            "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none",
          showAmount && "pr-16",
          className,
        )}
        value={inputValue}
        onChange={handleChange}
        {...props}
      />

      {arrows && inputType === "number" && (
        <div
          className="absolute right-2 top-0 text-muted-foreground flex flex-col items-center justify-center"
          aria-hidden={props.disabled ? "true" : "false"}
        >
          <button
            type="button"
            className="hover:text-foreground cursor-pointer disabled:cursor-not-allowed p-1"
            onClick={() => handleArrowClick(1)}
            disabled={props.disabled}
            aria-label="Increase number"
          >
            <ChevronUp size={14} />
          </button>
          <button
            type="button"
            className="hover:text-foreground cursor-pointer disabled:cursor-not-allowed p-1"
            onClick={() => handleArrowClick(-1)}
            disabled={props.disabled}
            aria-label="Decrease number"
          >
            <ChevronDown size={14} />
          </button>
        </div>
      )}

      {type === "password" && (
        <button
          type="button"
          tabIndex={-1}
          className={cn(
            "absolute right-3 text-muted-foreground hover:text-foreground cursor-pointer transition-colors",
            showAmount ? "top-1/4" : "top-1/2 -translate-y-1/2",
          )}
          onClick={() => setVisiblePassword((v) => !v)}
          disabled={props.disabled}
        >
          {visiblePassword ? <EyeOffIcon size={20} /> : <EyeIcon size={20} />}
        </button>
      )}

      {showAmount && (
        <div
          className={cn(
            "absolute right-2 bottom-1 text-xs font-bold inline-flex items-center gap-0.5 select-none",
            isOverMax || (type === "password" ? "text-muted-foreground" : ""),
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
            {inputLen}
          </span>
          <span className="text-muted-foreground">/</span>
          <span className="text-muted-foreground">
            {props.max ?? <InfinityIcon className="h-3 w-3" />}
          </span>
        </div>
      )}
    </div>
  );
}

export { Input };
