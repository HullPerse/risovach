import path from "node:path";

import babel from "@rolldown/plugin-babel";
import tailwindcss from "@tailwindcss/vite";
import react, { reactCompilerPreset } from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";
import compression from "vite-plugin-compression2";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, import.meta.dirname, "");

  return {
    build: {
      sourcemap: false,
    },

    clearScreen: false,

    define: {
      __APP_MODE__: JSON.stringify(env.MODE || "PROD"),
    },

    plugins: [
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
  };
});
