import { defineConfig } from "oxlint";
import core from "ultracite/oxlint/core";
import jsPlugins from "ultracite/oxlint/js-plugins";
import react from "ultracite/oxlint/react";
import tanstack from "ultracite/oxlint/tanstack";
import tanstackJsPlugins from "ultracite/oxlint/tanstack/js-plugins";

export default defineConfig({
  extends: [core, react, tanstack, jsPlugins, tanstackJsPlugins],
  ignorePatterns: core.ignorePatterns,
  rules: {
    curly: "off",
    "no-else-return": "off",
    "unicorn/prefer-ternary": "off",
  },
});
