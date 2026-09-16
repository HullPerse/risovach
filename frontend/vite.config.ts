import path from "node:path";

import babel from "@rolldown/plugin-babel";
import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import react, { reactCompilerPreset } from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { compression } from "vite-plugin-compression2";

export default defineConfig(() => ({
  build: {
    sourcemap: false,
  },

  clearScreen: false,

  plugins: [
    tanstackRouter({
      target: "react",
      virtualRouteConfig: "@/routes/index.root.tsx",
    }),
    react(),
    tailwindcss(),
    compression({
      algorithms: ["gzip", "brotliCompress"],
    }),
    babel({ presets: [reactCompilerPreset()] }),
  ],

  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },

  server: {
    host: "127.0.0.1",
  },
}));
