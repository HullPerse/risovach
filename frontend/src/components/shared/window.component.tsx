import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import { type ReactNode } from "react";

export function WindowComponent({
  children,
  className,
  childrenClassName,
  label = "МЕНЮ",
}: {
  children: ReactNode;
  className?: string;
  childrenClassName?: string;
  label?: string;
}) {
  return (
    <main
      className={cn(
        "bg-background md:w-xl w-full border-4 border-border boxShadow max-h-[calc(100dvh-10rem)] flex flex-col",
        className,
      )}
    >
      {/* HEADER */}
      <section className="flex flex-row w-full gap-1 bg-primary border-b-4 border-border p-1 items-center justify-center select-none">
        <div className="absolute left-2 flex gap-1">
          <div className="size-3 border-2 border-border bg-error" />
          <div className="size-3 border-2 border-border bg-success" />
        </div>

        <span className="font-bold text-sm">{label}</span>
      </section>

      {/* CHILDREN */}
      <AnimatePresence mode="wait">
        <motion.div
          key={label}
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{
            height: { duration: 0.3, ease: "easeInOut" },
            opacity: { duration: 0.2, ease: "easeInOut" },
          }}
          style={{ overflow: "auto" }}
        >
          <section className={cn("p-1 overflow-y-auto", childrenClassName)}>
            {children}
          </section>
        </motion.div>
      </AnimatePresence>
    </main>
  );
}
