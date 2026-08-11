import type { ReactNode, SVGProps } from "react";

import { cn } from "@/lib/index.utils";

interface SvgWrapperProps extends SVGProps<SVGSVGElement> {
  viewBox: string;
  children: ReactNode;
  title: string;
  desc?: string;
  decorative?: boolean;
}

export function SvgWrapper({
  viewBox,
  children,
  title,
  desc,
  decorative = false,
  className,
  ...props
}: SvgWrapperProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={viewBox}
      className={cn(className)}
      aria-hidden={decorative ? "true" : undefined}
      role={decorative ? "presentation" : "img"}
      {...props}
    >
      <title>{title}</title>
      {desc && <desc>{desc}</desc>}
      {children}
    </svg>
  );
}
