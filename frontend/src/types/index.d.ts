// The import keeps this file a module, so the block below augments the router
// types instead of replacing them.
import "@tanstack/router-core";

declare module "@tanstack/router-core" {
  interface StaticDataRouteOption {
    frame?: {
      label?: string;
      showBack?: boolean;
      className?: string;
    };
  }
}
