import { defineConfig } from "oxlint";
import core from "ultracite/oxlint/core";

export default defineConfig({
  extends: [core],
  ignorePatterns: core.ignorePatterns,
  rules: {
    curly: "off",
    "no-else-return": "off",
    "unicorn/prefer-ternary": "off",
  },
});
