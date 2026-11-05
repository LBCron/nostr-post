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
  acceptsType,
  scaledSize,
  type UploadFailureKind,
  UPLOAD_STALL_MS,
  UPLOAD_RETRY_DELAYS_MS,
  isRetryableUpload,
} from './core';
export {
  blossomResult,
  blossomUploadUrl,
  NOSTR_BUILD_UPLOAD,
  nip96Result,
  nip98AuthEvent,
  readNip96Response,
  targetHost,
  tryNextServer,
  type UploadAnswer,
  type UploadFailure,
  uploadFailure,
  uploadFailureKind,
  type UploadTarget,
  uploadTargets,
} from './uploadServers';
export {
  imetaUrls,
  mediaFileOf,
  mediaImetaTags,
  readsImeta,
  rememberMediaFile,
  writesImeta,
} from './mediaFiles';
export { sha256Hex } from './hash';
export { exifOrientation, stripJpegMetadata } from './exif';
export {
  eventMedia,
  isImageFileUrl,
  isVideoFileUrl,
  type MediaItem,
  type MediaSource,
  mediaOfEvents,
  PICTURE_KIND,
  SHORT_VIDEO_KIND,
  VIDEO_KIND,
} from './eventMedia';
