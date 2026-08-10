import { AnimatePresence, domAnimation, LazyMotion, m } from "framer-motion";
import type { ReactNode } from "react";

import { cn } from "@/lib/index.utils";

export const WindowComponent = ({
  children,
  className,
  childrenClassName,
  label = "МЕНЮ",
}: {
  children: ReactNode;
  className?: string;
  childrenClassName?: string;
  label?: string;
}) => (
  <main
    className={cn(
      "bg-background border-border boxShadow pointer-events-auto flex h-full w-full flex-col border-4 md:h-fit md:max-h-[calc(100dvh-4rem)] md:w-xl",
      className
    )}
  >
    {/* HEADER */}
    <section className="bg-primary border-border flex w-full flex-row items-center justify-center gap-1 border-b-4 p-1 select-none">
      <div className="absolute left-2 flex gap-1">
        <div className="border-border bg-error size-3 border-2" />
        <div className="border-border bg-success size-3 border-2" />
      </div>

      <span className="text-sm font-bold">{label}</span>
    </section>

    {/* CHILDREN */}
    <AnimatePresence mode="wait">
      <LazyMotion features={domAnimation}>
        <m.div
          key={label}
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{
            height: { duration: 0.3, ease: "easeInOut" },
            opacity: { duration: 0.3, ease: "easeInOut" },
          }}
          style={{
            contain: "layout paint",
            overflow: "auto",
            willChange: "transform",
          }}
        >
          <section className={cn("overflow-y-auto p-1", childrenClassName)}>
            {children}
          </section>
        </m.div>
      </LazyMotion>
    </AnimatePresence>
  </main>
);

export default WindowComponent;
