

import type {} from "@tanstack/router-core";

declare module "@tanstack/router-core" {
  interface StaticDataRouteOption {
    frame?: {
      label?: string
      showBack?: boolean
      className?: string
    }
  }
}
