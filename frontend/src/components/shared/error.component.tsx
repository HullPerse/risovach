import { Construction } from "lucide-react";

import { cn } from "@/lib/index.utils";

import { buttonVariants } from "../ui/button.variants";

export const SmallError = () => null;
export const WindowError = () => null;

interface BigErrorProps {
  error?: unknown;
  onRetry?: () => void;
}

export const BigError = ({ error, onRetry }: BigErrorProps) => (
  <main className="bg-primary text-card absolute flex h-screen w-screen flex-col items-center justify-center gap-4 font-extrabold">
    <Construction className="size-16" />
    <h1 className="text-2xl">Что-то сломалось</h1>
    {error instanceof Error ? (
      <p className="max-w-md text-center text-sm">{error.message}</p>
    ) : null}
    {onRetry ? (
      <button
        className={cn(buttonVariants({ variant: "error" }))}
        onClick={onRetry}
        type="button"
      >
        Попробовать снова
      </button>
    ) : null}
  </main>
);

export const EmptyError = () => (
  <div className="flex w-full flex-col items-center justify-center gap-2 p-4">
    <Construction className="text-muted size-14" />
    <span className="text-muted text-xl font-bold">В разработке</span>
  </div>
);
