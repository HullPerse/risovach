import { Construction } from "lucide-react";

export const SmallError = () => null;
export const WindowError = () => null;
export const BigError = () => null;

export const EmptyError = () => (
  <div className="flex w-full flex-col items-center justify-center gap-2 p-4">
    <Construction className="text-muted size-14" />
    <span className="text-muted text-xl font-bold">В разработке</span>
  </div>
);
