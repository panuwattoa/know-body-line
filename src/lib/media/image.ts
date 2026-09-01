import sharp from "sharp";

export interface CompressedImage {
  buffer: Buffer;
  mediaType: "image/jpeg";
}

/**
 * Downscale + re-encode a user photo to keep Supabase Storage and egress small,
 * while staying legible enough for food/label recognition.
 *
 * Defaults: longest edge 1280px, JPEG quality 82 — typically shrinks a LINE photo
 * by 3–6×. On any failure we fall back to the original bytes so a meal is never
 * lost to a bad encode.
 */
export async function compressImage(
  input: Buffer,
  opts: { maxEdge?: number; quality?: number } = {},
): Promise<CompressedImage> {
  const maxEdge = opts.maxEdge ?? 1280;
  const quality = opts.quality ?? 82;
  try {
    const buffer = await sharp(input, { failOn: "none" })
      .rotate() // respect EXIF orientation
      .resize(maxEdge, maxEdge, { fit: "inside", withoutEnlargement: true })
      .jpeg({ quality, mozjpeg: true })
      .toBuffer();
    // If compression somehow produced something larger, keep the original.
    if (buffer.length >= input.length) {
      return { buffer: input as Buffer, mediaType: "image/jpeg" };
    }
    return { buffer, mediaType: "image/jpeg" };
  } catch (e) {
    console.error("compressImage failed, using original", e);
    return { buffer: input, mediaType: "image/jpeg" };
  }
}
