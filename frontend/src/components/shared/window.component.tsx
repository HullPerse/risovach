import { cn } from "@/lib/utils";
import { Button } from "../ui/button.component";
import { ChevronLeft } from "lucide-react";
import type { ReactNode } from "react";

export function WindowComponent({
  children,
  className,
  childrenClassName,
  label = "МЕНЮ",
  onBack,
  showBack = false,
}: {
  children: ReactNode;
  className?: string;
  childrenClassName?: string;
  label?: string;
  onBack?: () => void;
  showBack?: boolean;
}) {
  return (
    <main
      className={cn(
        "bg-background md:w-xl w-full h-64 border-2 border-border",
        className,
      )}
    >
      {/* HEADER */}
      <section className="relative flex flex-row w-full gap-1 bg-primary border-b-2 border-border p-2 items-center justify-center">
        {showBack && onBack && (
          <Button
            variant="error"
            size="icon"
            className="absolute left-1 size-8"
            disabled={!onBack}
            onClick={() => onBack?.()}
          >
            <ChevronLeft />
          </Button>
        )}
        <span className="font-bold ">{label}</span>
      </section>
      {/* CHILDREN */}
      <section className={cn("p-1 overflow-y-scroll", childrenClassName)}>
        {children}
      </section>
    </main>
  );
}
