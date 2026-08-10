import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "@tanstack/react-router";

import "./index.css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { QueryConfig } from "./config/query.config.ts";
import { router } from "./routes/__root.tsx";

const queryClient = new QueryClient(QueryConfig);

const rootElement = document.querySelector("#root");
if (!rootElement) {
  throw new Error("Root element not found");
}

createRoot(rootElement).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>
);
