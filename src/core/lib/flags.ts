import sharp from 'sharp';
import { FLAG_HEIGHT, FLAG_WIDTH } from './flags-config';

/**
 * Turns an uploaded image into a flag like the others: a WebP cropped to
 * 455×304. Anything `sharp` cannot decode is not an image and gives `null`.
 */
export async function normalizeFlag(input: Uint8Array) {
  try {
    const output = await sharp(input)
      .rotate()
      .resize(FLAG_WIDTH, FLAG_HEIGHT, { fit: 'cover' })
      .webp({ quality: 85 })
      .toBuffer();

    return new Uint8Array(output);
  } catch (_) {
    return null;
  }
}
