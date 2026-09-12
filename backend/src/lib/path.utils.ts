import path from "node:path";

import { attemptSync } from "@/lib/attempt.utils";

/**
 * Backend project root (package.json, data/, ...).
 * First checks BACKEND_ROOT env var, then walks up from import.meta.dir,
 * and finally falls back to process.cwd().
 */

const hasPackageJson = (dir: string): boolean => {
  const [size, error] = attemptSync(() => Bun.file(path.join(dir, "package.json")).size);
  return !error && size > 0;
};

const getBackendRoot = (): string => {
  if (Bun.env.BACKEND_ROOT) return Bun.env.BACKEND_ROOT;

  let { dir } = import.meta;

  while (dir) {
    if (hasPackageJson(dir)) return dir;

    const parent = path.join(dir, "..");

    if (parent === dir) break;
    else dir = parent;
  }
  return process.cwd();
};

export const resolveBackendPath = (...segments: string[]): string =>
  path.join(getBackendRoot(), ...segments);
