/**
 * Shrinking photos on the device before upload, and the user's photo quality choice
 * (remembered in localStorage across fields and visits).
 */

import {
  isCompressibleImage,
  isMediaQuality,
  MEDIA_QUALITY_PRESETS,
  type MediaPluginConfig,
  type MediaQuality,
  scaledSize,
} from '../core';

const QUALITY_KEY = 'nostr-post:media-quality';

/** The user's last quality choice, else the field's `quality`, else 'mid' */
export function preferredQuality(config: MediaPluginConfig = {}): MediaQuality {
  try {
    const saved = globalThis.localStorage?.getItem(QUALITY_KEY);
    if (isMediaQuality(saved)) return saved;
  } catch {
    // Storage blocked (private mode, sandboxed frame): fall back to the default
  }
  return config.quality ?? 'mid';
}

/** Remember the user's quality choice for the next uploads */
export function rememberQuality(quality: MediaQuality): void {
  try {
    globalThis.localStorage?.setItem(QUALITY_KEY, quality);
  } catch {
    // Not remembered, but this upload still uses it
  }
}

/**
 * The photo shrunk to the quality's size as JPEG (EXIF, including location, is dropped).
 * The original when the quality is 'full', the file isn't a photo, the browser can't decode
 * it, or shrinking wouldn't make it smaller.
 */
export async function compressImage(file: File, quality: MediaQuality): Promise<File> {
  const preset = MEDIA_QUALITY_PRESETS[quality];
  if (!preset || !isCompressibleImage(file.type) || typeof createImageBitmap !== 'function') {
    return file;
  }
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
    const { width, height } = scaledSize(bitmap.width, bitmap.height, preset.maxSide);
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) return file;
    // JPEG has no transparency: transparent parts of a PNG become white, not black
    context.fillStyle = '#fff';
    context.fillRect(0, 0, width, height);
    context.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', preset.jpegQuality)
    );
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], `${file.name.replace(/\.[^.]+$/, '')}.jpg`, { type: 'image/jpeg' });
  } catch {
    return file;
  }
}
