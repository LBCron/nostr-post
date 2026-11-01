/**
 * User-facing text of the media plugin's upload (<np-media-input>, the text field's
 * "Add media" button, paste and drop), with English defaults. Apps override any of it with
 * <np-media-input>'s `messages` property, or setMediaMessages for the text field's upload.
 */

import type { MediaQuality } from '../core';

export interface MediaMessages {
  /** The text field's button */
  addMedia: string;
  /** Label of the photo quality choice */
  quality: string;
  qualityLevels: Record<MediaQuality, string>;
  /** While a photo is shrunk on the device */
  preparing: (fileName: string) => string;
  uploading: (fileName: string) => string;
  /** Shown with the upload: original and uploaded size */
  sizes: (original: string, uploaded: string) => string;
  uploaded: (fileName: string) => string;
  uploadFailed: (fileName: string) => string;
  tooLarge: (maxMb: number) => string;
  /** <np-media-input>'s drop zone */
  dropFiles: string;
  /** Under it: where files go and the size limit */
  dropHint: (host: string, maxMb: number) => string;
  /** Between the drop zone and the URL input */
  or: string;
  urlPlaceholder: string;
  remove: string;
  /** Files added out of the most allowed */
  fileCount: (count: number, max: number) => string;
}

export const DEFAULT_MEDIA_MESSAGES: MediaMessages = {
  addMedia: 'Add media',
  quality: 'Photo quality',
  qualityLevels: { low: 'Low (fastest)', mid: 'Medium', full: 'Full (original)' },
  preparing: (name) => `Preparing ${name}…`,
  uploading: (name) => `Uploading ${name}`,
  sizes: (original, uploaded) => (original === uploaded ? uploaded : `${original} → ${uploaded}`),
  uploaded: (name) => `${name} added`,
  uploadFailed: (name) => `Couldn't upload ${name}`,
  tooLarge: (maxMb) => `File too large (max ${maxMb} MB)`,
  dropFiles: 'Drop files here, or click to browse',
  dropHint: (host, maxMb) => `Uploads to ${host} (max ${maxMb} MB each)`,
  or: 'or',
  urlPlaceholder: 'Paste a URL and press Enter',
  remove: 'Remove',
  fileCount: (count, max) => `${count}/${max} files`,
};

let appMessages: Partial<MediaMessages> = {};

/** Override the text of the text field's upload (button, progress), e.g. for translations */
export function setMediaMessages(messages: Partial<MediaMessages>): void {
  appMessages = messages;
}

/** The defaults with the app's overrides (setMediaMessages) and then `messages` */
export const mediaMessages = (messages: Partial<MediaMessages> = {}): MediaMessages => ({
  ...DEFAULT_MEDIA_MESSAGES,
  ...appMessages,
  ...messages,
});

/** A byte count as "840 KB" or "4.2 MB" */
export const formatBytes = (bytes: number): string =>
  bytes < 1024 * 1024
    ? `${Math.max(1, Math.round(bytes / 1024))} KB`
    : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
