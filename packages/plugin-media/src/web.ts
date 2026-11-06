/**
 * @nostr-post/plugin-media/web
 *
 * Importing this module:
 * 1. Defines <np-media-input> and <np-media-view> custom elements
 * 2. Registers the media plugin (with tag names + textarea event handlers) in the shared PluginRegistry
 *
 * Usage:
 *   import '@nostr-post/plugin-media/web';
 *   // Now media plugin is available in composer/view automatically
 */

import { registerOutboxJobs } from '@nostr-post/outbox/web';
import { registerSectionView } from '@nostr-post/plugins/entities';
import { pluginRegistry } from '@nostr-post/plugins/registry';
import {
  isMediaQuality,
  MEDIA_QUALITIES,
  MEDIA_QUALITY_PRESETS,
  type MediaPluginConfig,
  mediaPlugin,
} from './core';

// Import web components (side-effect: defines custom elements)
import './web/input';
import './web/view';
import './web/gallery';
import { uploadPrepared } from './web/uploadLater';

// The outbox uploads files prepared to upload later (`prepareUploadLater`)
registerOutboxJobs({ upload: uploadPrepared });

// A page section's `gallery` view (`sections` of a manifest)
registerSectionView({ view: 'gallery', tagName: 'np-media-gallery' });

import { rememberQuality } from './web/compress';
import { mediaMessages } from './web/mediaMessages';
import { handleMediaDrop, handleMediaPaste, uploadIntoContent, uploadQuality } from './web/upload';

const isMediaFile = (file: File) => /^(image|video)\//.test(file.type);

// Register the plugin with its web component tag names + textarea event handlers
pluginRegistry.register({
  ...mediaPlugin,
  inputTagName: 'np-media-input',
  viewTagName: 'np-media-view',
  handleTextareaPaste: handleMediaPaste,
  handleTextareaDrop: handleMediaDrop,
  getFieldActions: (field) => {
    const config = (field.metadata as MediaPluginConfig | undefined) ?? {};
    const m = mediaMessages();
    return [
      {
        id: 'media-upload',
        icon: '🖼️',
        label: m.addMedia,
        // With the quality choice the button opens a panel: choose or drop files, pick quality
        runLabel: m.chooseMedia,
        dropLabel: m.dropMedia,
        onDropFiles: (files, { targetField, formData, getFormData, onUpdateField }) =>
          uploadIntoContent(files.filter(isMediaFile), targetField, {
            formData,
            getFormData,
            onUpdateField,
            attachedField: field,
          }),
        setting:
          config.qualityChoice === false
            ? undefined
            : {
                label: m.quality,
                options: MEDIA_QUALITIES.map((value) => ({
                  value,
                  label: m.qualityLevels[value],
                  description: m.qualityDescription(value, MEDIA_QUALITY_PRESETS[value]?.maxSide),
                })),
                value: uploadQuality(config),
                onChange: (value) => {
                  if (isMediaQuality(value)) rememberQuality(value);
                },
                hint: config.keepMetadata ? m.qualityHintKeepsMetadata : m.qualityHint,
              },
        onClick: ({ targetField, formData, getFormData, onUpdateField }) => {
          const input = document.createElement('input');
          input.type = 'file';
          input.accept = config.accept?.join(',') ?? 'image/*,video/*';
          input.multiple = true;
          input.onchange = () => {
            const files = Array.from(input.files ?? []);
            if (!files.length) return;
            void uploadIntoContent(files, targetField, {
              formData,
              getFormData,
              onUpdateField,
              attachedField: field,
            });
          };
          input.click();
        },
      },
    ];
  },
});

// Re-export components for direct usage
export { NpMediaInput } from './web/input';
export { NpMediaView } from './web/view';
export { type MediaGalleryConfig, NpMediaGallery } from './web/gallery';
export {
  DEFAULT_MEDIA_GALLERY_MESSAGES,
  type MediaGalleryMessages,
} from './web/galleryMessages';
export { mediaPlugin } from './core';

// Re-export upload utilities so consumers (e.g. the composer's paste/drop handler) can reuse
// the shared upload (Blossom, then NIP-96 / nostr.build) without duplicating it.
export {
  handleMediaPaste,
  handleMediaDrop,
  uploadIntoContent,
  type ContentUploadContext,
} from './web/upload';
export {
  uploadToNostrBuild,
  createNip98AuthToken,
  NOSTR_BUILD_UPLOAD,
  uploadBlossom,
  uploadNip96,
  uploadWithProgress,
  uploadWithRetry,
  uploadFailureKind,
  sendUpload,
  signerPubkey,
  signWithBrowser,
  withRetries,
  type UploadFailure,
  type UploadOptions,
  type RetryOptions,
} from './web/uploadRequest';
export {
  BLOSSOM_AUTH_SECONDS,
  imageDim,
  type UploadMediaOptions,
  uploadMedia,
  withoutMetadata,
} from './web/uploadMedia';
export { otherServersOf } from './web/otherServers';
export {
  prefersUploadLater,
  prepareUploadLater,
  previewUrl,
  rememberUploadLater,
  UPLOAD_LATER_AUTH_SECONDS,
  uploadLaterServer,
  uploadPrepared,
} from './web/uploadLater';
export { compressImage, preferredQuality, rememberQuality } from './web/compress';
export {
  DEFAULT_MEDIA_MESSAGES,
  type MediaMessages,
  setMediaMessages,
} from './web/mediaMessages';
