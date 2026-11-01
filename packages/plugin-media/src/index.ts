/**
 * @nostr-post/plugin-media - Core entrypoint
 *
 * Import this for headless usage (validation, serialization).
 * Import '@nostr-post/plugin-media/web' for Lit web components.
 */
export {
  mediaPlugin,
  type MediaPluginConfig,
  toArray,
  isImageUrl,
  isVideoUrl,
  extractMediaUrls,
  type MediaQuality,
  MEDIA_QUALITIES,
  MEDIA_QUALITY_PRESETS,
  isMediaQuality,
  isCompressibleImage,
  scaledSize,
} from './core';
