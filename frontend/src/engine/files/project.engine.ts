import { PROJECT_EXTENSION, PROJECT_TYPE } from "@/config/api.config";
import type { DrawingCore } from "@/types/engine/drawing";

/**
 * Returns the project file for download. One copy: the core keeps the bytes
 * in module memory, and a `Uint8Array` carries them into the file.
 */
export const exportProject = ({
  core,
  name = "drawing",
}: {
  core: Pick<DrawingCore, "saveProject">;
  name?: string;
}): File | null => {
  const bytes = Uint8Array.from(core.saveProject());

  if (bytes.length === 0) return null;

  return new File([bytes], `${name}.${PROJECT_EXTENSION}`, {
    type: PROJECT_TYPE,
  });
};

/** Reads the picked file as bytes. Parsing the format is the core's job. */
export const readProjectFile = async (file: File): Promise<Uint8Array> => {
  const buffer = await file.arrayBuffer();

  return new Uint8Array(buffer);
};
