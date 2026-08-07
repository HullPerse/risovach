import { Button as ButtonPrimitive } from "@base-ui/react/button";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/index.utils";
import { SmallLoader } from "../shared/loader.component";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm text-text disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none cursor-pointer disabled:cursor-not-allowed font-extrabold border-2 boxShadow hover:brightness-110 active:brightness-90",
  {
    variants: {
      variant: {
        default: "bg-primary border-border",
        success: "bg-success border-border",
        error: "bg-error border-border",
        ghost: "border-transparent bg-transparent noShadow",
        link: "underline-offset-4 hover:underline border-transparent shadow-none bg-transparent noShadow",
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

export { Button };
