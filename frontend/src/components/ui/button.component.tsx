import { Button as ButtonPrimitive } from "@base-ui/react/button";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";
import { SmallLoader } from "../shared/loader.component";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none cursor-pointer opacity-70 hover:opacity-100 text-center font-bold disabled:cursor-not-allowed border-2",
  {
    variants: {
      variant: {
        default:
          "bg-primary/20 text-text border-primary hover:bg-primary/20 hover:text-text active:bg-primary/40",
        success:
          "bg-success/20 text-text border-success hover:bg-success/60 active:bg-success/50",
        error:
          "bg-error/20 text-text border-error hover:bg-error/60 active:bg-error/50",
        ghost:
          "hover:bg-border/20 hover:text-text active:translate-x-0 active:translate-y-0 border-border",
        link: "text-text underline-offset-2 hover:underline border-0",
      },
      size: {
        default: "h-9 px-4 py-2 has-[>svg]:px-3",
        sm: "h-8 gap-1.5 px-3 has-[>svg]:px-2.5",
        lg: "h-10 px-6 has-[>svg]:px-4",
        icon: "size-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

function Button({
  className,
  variant = "default",
  size = "default",
  rendered = true,
  loading = false,
  disabled,
  children,
  ...props
}: ButtonPrimitive.Props &
  VariantProps<typeof buttonVariants> & {
    rendered?: boolean;
    loading?: boolean;
  }) {
  if (!rendered) return;

  return (
    <ButtonPrimitive
      role="button"
      data-slot="button"
      disabled={disabled || loading}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    >
      {loading ? <SmallLoader /> : children}
    </ButtonPrimitive>
  );
}

export { Button, buttonVariants };
