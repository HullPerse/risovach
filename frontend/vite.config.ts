import { defineConfig } from "vite";
import react, { reactCompilerPreset } from "@vitejs/plugin-react";
import babel from "@rolldown/plugin-babel";
import tailwindcss from "@tailwindcss/vite";
import compression from "vite-plugin-compression2";
import { resolve } from "node:path";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    compression({
      algorithms: ["gzip", "brotliCompress"],
    }),
    babel({ presets: [reactCompilerPreset()] }),
  ],

  clearScreen: false,
  build: {
    sourcemap: false,
  },
  resolve: {
    alias: {
      "@": resolve(import.meta.dirname, "./src"),
    },
  },

  server: {
    host: "127.0.0.1",
  },
});
