import { Box } from "lucide-react";

export const SmallLoader = () => (
  <main className="flex flex-row items-center justify-center gap-1">
    <div
      className="bg-accent border-border h-4 w-4 animate-bounce border-2"
      style={{ animationDelay: "-0.3s" }}
    />
    <div
      className="bg-secondary border-border h-4 w-4 animate-bounce border-2"
      style={{ animationDelay: "-0.6s" }}
    />
    <div
      className="bg-success border-border h-4 w-4 animate-bounce border-2"
      style={{ animationDelay: "-0.9s" }}
    />
  </main>
);

export const WindowLoader = () => <main>Hello Loader</main>;

export const BigLoader = () => (
  <main className="bg-primary text-card absolute flex h-screen w-screen flex-col items-center justify-center font-extrabold">
    <Box className="size-28 animate-spin" />
  </main>
);
