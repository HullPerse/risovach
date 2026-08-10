import { cva } from "class-variance-authority";

export const buttonVariants = cva(
  "text-text boxShadow inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 border-2 text-sm font-extrabold whitespace-nowrap outline-none hover:brightness-110 active:brightness-90 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    defaultVariants: {
      size: "default",
      variant: "default",
    },
    variants: {
      size: {
        default: "h-9 px-4 py-2 has-[>svg]:px-3",
        icon: "size-9",
        lg: "h-10 px-6 has-[>svg]:px-4",
        sm: "h-8 gap-1.5 px-3 has-[>svg]:px-2.5",
      },
      variant: {
        default: "bg-primary border-border",
        error: "bg-error border-border",
        ghost: "noShadow border-transparent bg-transparent",
        link: "noShadow border-transparent bg-transparent underline-offset-4 shadow-none hover:underline",
        success: "bg-success border-border",
      },
    },
  }
);
