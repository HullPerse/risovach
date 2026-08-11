import { cn } from "@/lib/index.utils";

const Flag = ({
  alt,
  className,
  code,
  width = 20,
}: {
  alt: string;
  className?: string;
  code: string;
  width?: number;
}) => (
  <img
    src={`https://flagcdn.com/w40/${code.toLowerCase()}.png`}
    alt={alt}
    width={width}
    loading="lazy"
    decoding="async"
    className={cn("h-3 w-auto shrink-0 object-cover", className)}
  />
);

export const UnknownFlag = ({
  ariaLabel,
  className,
  onClick,
}: {
  ariaLabel?: string;
  className?: string;
  onClick?: () => void;
}) => (
  <button
    type="button"
    onClick={onClick}
    aria-label={ariaLabel}
    className={cn(
      "border-border boxShadowSmall bg-muted flex h-3 w-10 shrink-0 cursor-pointer items-center justify-center border-2",
      className
    )}
  >
    <span className="text-text text-[7px] leading-none font-extrabold">?</span>
  </button>
);

export default Flag;
