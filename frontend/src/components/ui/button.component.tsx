import { Button as ButtonPrimitive } from "@base-ui/react/button";
import type { VariantProps } from "class-variance-authority";

import { cn } from "@/lib/index.utils";

import { SmallLoader } from "../shared/loader.component";
import { buttonVariants } from "./button.variants";

export const Button = ({
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
  }) => {
  if (!rendered) {
    return null;
  }

  return (
    <ButtonPrimitive
      data-slot="button"
      disabled={disabled || loading}
      className={cn(buttonVariants({ className, size, variant }))}
      {...props}
    >
      {loading ? <SmallLoader /> : children}
    </ButtonPrimitive>
  );
};
