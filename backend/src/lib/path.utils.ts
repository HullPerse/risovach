import path from "node:path";

/**
 * Backend project root (package.json, data/, ...).
 * First checks BACKEND_ROOT env var, then walks up from import.meta.dir,
 * and finally falls back to process.cwd().
 */

const getBackendRoot = (): string => {
  if (Bun.env.BACKEND_ROOT) return Bun.env.BACKEND_ROOT;

  let { dir } = import.meta;

  while (dir) {
    try {
      if (Bun.file(path.join(dir, "package.json")).size > 0) return dir;
    } catch {
      continue;
    }

    const parent = path.join(dir, "..");

    if (parent === dir) break;
    else dir = parent;
  }
  return process.cwd();
};

export const resolveBackendPath = (...segments: string[]): string =>
  path.join(getBackendRoot(), ...segments);
