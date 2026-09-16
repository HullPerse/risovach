import type { DrawingCore } from "@/types/drawing";

/**
 * Extension and content type of a project file. The type is deliberately
 * generic: `.hpd` is our own format and must not pose as an image.
 */
const PROJECT_TYPE = "application/octet-stream";

export const PROJECT_EXTENSION = "hpd";

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
  // The copy is about the type, not order: the binding returns an array over
  // a buffer TypeScript does not call a plain `ArrayBuffer`, and `Blob`
  // rejects a shared one. One copy per file, only when saving.
  const bytes = Uint8Array.from(core.saveProject());

  if (bytes.length === 0) {
    return null;
  }

  return new File([bytes], `${name}.${PROJECT_EXTENSION}`, {
    type: PROJECT_TYPE,
  });
};

/** Reads the picked file as bytes. Parsing the format is the core's job. */
export const readProjectFile = async (file: File): Promise<Uint8Array> => {
  const buffer = await file.arrayBuffer();

  return new Uint8Array(buffer);
};
