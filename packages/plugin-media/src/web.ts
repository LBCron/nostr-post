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

import { pluginRegistry } from '@nostr-post/plugins/registry';
import { isMediaQuality, MEDIA_QUALITIES, type MediaPluginConfig, mediaPlugin } from './core';

// Import web components (side-effect: defines custom elements)
import './web/input';
import './web/view';

import { rememberQuality } from './web/compress';
import { mediaMessages } from './web/mediaMessages';
import { handleMediaDrop, handleMediaPaste, uploadIntoContent, uploadQuality } from './web/upload';

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
        setting:
          config.qualityChoice === false
            ? undefined
            : {
                label: m.quality,
                options: MEDIA_QUALITIES.map((value) => ({
                  value,
                  label: m.qualityLevels[value],
                })),
                value: uploadQuality(config),
                onChange: (value) => {
                  if (isMediaQuality(value)) rememberQuality(value);
                },
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
export { mediaPlugin } from './core';

// Re-export upload utilities so consumers (e.g. the composer's paste/drop handler)
// can reuse the shared NIP-98 auth + upload logic without duplicating it.
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
  uploadWithProgress,
  uploadWithRetry,
  uploadFailureKind,
  type UploadFailure,
  type UploadOptions,
  type RetryOptions,
} from './web/uploadRequest';
export { compressImage, preferredQuality, rememberQuality } from './web/compress';
export {
  DEFAULT_MEDIA_MESSAGES,
  type MediaMessages,
  setMediaMessages,
} from './web/mediaMessages';
