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

export default Flag;
