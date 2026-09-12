import { attemptSync } from "@/lib/attempt.utils";
import { config } from "@/server.config";
import type { ProcessedAvatar } from "@/types/user";

export const processAvatar = async (file: File): Promise<ProcessedAvatar> => {
  if (file.size > config.avatarMaxBytes) {
    throw new Error(`Avatar exceeds ${config.avatarMaxBytes} bytes`);
  }

  const isMime = file.type.startsWith("image/");

  if (!isMime) throw new Error("Avatar must be an image file");

  const source = Buffer.from(await file.arrayBuffer());

  const [image, decodeError] = attemptSync(() => new Bun.Image(source));

  if (decodeError) throw new Error("Could not decode image");

  const full = Buffer.from(
    await image
      .resize(config.avatarFull, config.avatarFull, { fit: "fill" })
      .png()
      .toBuffer()
  );

  const thumb = Buffer.from(
    await image
      .resize(config.avatarThumb, config.avatarThumb, { fit: "fill" })
      .webp({ quality: 80 })
      .toBuffer()
  );

  return {
    full,
    thumb,
  };
};
