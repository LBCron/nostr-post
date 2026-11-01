/**
 * Shared upload utilities for @nostr-post/plugin-media: NIP-98 auth and upload with
 * progress, used by <np-media-input> and by the text field's upload (its "Add media"
 * button, paste and drop), which reports progress as activities.
 */

import { startActivity } from '@nostr-post/plugins/activity';
import type { PostField } from '@nostr-post/plugins/types';
import type { MediaPluginConfig, MediaQuality } from '../core';
import { compressImage, preferredQuality } from './compress';
import { formatBytes, mediaMessages } from './mediaMessages';

export const NOSTR_BUILD_UPLOAD = 'https://nostr.build/api/v2/upload/files';

/** Largest file uploaded, after shrinking (MediaPluginConfig.maxSize) */
export const DEFAULT_MAX_SIZE = 10 * 1024 * 1024;

/**
 * Build a NIP-98 HTTP Auth token for the given request.
 * Returns null (and logs a warning) when window.nostr is unavailable or signing fails.
 */
export async function createNip98AuthToken(url: string, method: string): Promise<string | null> {
  const nostr = (
    window as unknown as {
      nostr?: {
        getPublicKey(): Promise<string>;
        signEvent(e: unknown): Promise<unknown>;
      };
    }
  ).nostr;
  if (!nostr) return null;

  try {
    const pubkey = await nostr.getPublicKey();
    const unsignedEvent = {
      kind: 27235,
      created_at: Math.floor(Date.now() / 1000),
      tags: [
        ['u', url],
        ['method', method],
      ],
      content: '',
      pubkey,
    };
    const signedEvent = await nostr.signEvent(unsignedEvent);
    return btoa(JSON.stringify(signedEvent));
  } catch (err) {
    console.warn('NIP-98 auth failed:', err);
    return null;
  }
}

/** The hosted URL in an upload response (nostr.build and NIP-96-like servers) */
const uploadedUrl = (json: unknown): string | undefined => {
  const resp = json as
    | { url?: string; data?: { url?: string } | Array<{ url?: string }> }
    | undefined;
  const data = resp?.data;
  return (
    (Array.isArray(data) ? data[0]?.url : undefined) ??
    resp?.url ??
    (Array.isArray(data) ? undefined : data?.url)
  );
};

/**
 * Upload a single file to nostr.build (or a custom endpoint), calling `onProgress` with the
 * part sent (0–1) as it goes. Throws on failure; returns the hosted URL.
 */
export async function uploadWithProgress(
  file: File,
  uploadUrl = NOSTR_BUILD_UPLOAD,
  onProgress?: (fraction: number) => void
): Promise<string> {
  const body = new FormData();
  body.append('file', file);
  const token = await createNip98AuthToken(uploadUrl, 'POST');
  return new Promise<string>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable) onProgress?.(e.loaded / e.total);
    });
    xhr.addEventListener('load', () => {
      if (xhr.status < 200 || xhr.status >= 300) {
        reject(new Error(`Upload failed (HTTP ${xhr.status})`));
        return;
      }
      let url: string | undefined;
      try {
        url = uploadedUrl(JSON.parse(xhr.responseText));
      } catch {
        reject(new Error('Invalid upload response'));
        return;
      }
      if (url) resolve(url);
      else reject(new Error('No URL in upload response'));
    });
    xhr.addEventListener('error', () => reject(new Error('Upload failed (network error)')));
    xhr.addEventListener('abort', () => reject(new Error('Upload cancelled')));
    xhr.open('POST', uploadUrl);
    if (token) xhr.setRequestHeader('Authorization', `Nostr ${token}`);
    xhr.send(body);
  });
}

/** Upload a single file to nostr.build (or a custom endpoint); returns the hosted URL */
export function uploadToNostrBuild(file: File, uploadUrl = NOSTR_BUILD_UPLOAD): Promise<string> {
  return uploadWithProgress(file, uploadUrl);
}

/** What uploading into a text field needs from the composer */
export interface ContentUploadContext {
  formData: Record<string, unknown>;
  /** The form as it is now; uploads take a while and the user keeps typing */
  getFormData?: () => Record<string, unknown>;
  onUpdateField: (fieldId: string, value: unknown) => void;
  /** The media field attached to the text field: its upload settings */
  attachedField?: PostField;
}

/** The quality to upload at: the user's choice, unless the field doesn't offer one */
export const uploadQuality = (config: MediaPluginConfig): MediaQuality =>
  config.qualityChoice === false ? (config.quality ?? 'mid') : preferredQuality(config);

/**
 * Upload files one after another and add each URL to the text field. Photos are shrunk to
 * the chosen quality first. Progress and failures are reported as activities
 * (`@nostr-post/plugins/activity`), so the page stays usable meanwhile.
 */
export async function uploadIntoContent(
  files: File[],
  targetField: PostField,
  ctx: ContentUploadContext
): Promise<void> {
  const config = (ctx.attachedField?.metadata as MediaPluginConfig | undefined) ?? {};
  const maxSize = config.maxSize ?? DEFAULT_MAX_SIZE;
  const m = mediaMessages();
  for (const file of files) {
    // The link goes into the text when it's done: the composer waits for it before publishing
    const activity = startActivity(m.preparing(file.name), { blocksPublish: true });
    try {
      const upload = await compressImage(file, uploadQuality(config));
      if (upload.size > maxSize) throw new Error(m.tooLarge(Math.round(maxSize / (1024 * 1024))));
      activity.update({
        label: m.uploading(file.name),
        detail: m.sizes(formatBytes(file.size), formatBytes(upload.size)),
        progress: 0,
      });
      const url = await uploadWithProgress(upload, config.uploadUrl, (progress) =>
        activity.update({ progress })
      );
      injectMediaUrlIntoContent(ctx, targetField.id, url);
      activity.done(m.uploaded(file.name));
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      activity.fail(`${m.uploadFailed(file.name)}: ${reason}`);
    }
  }
}

/**
 * Handle clipboard paste on a textarea: upload the pasted image into the text.
 * Called by the composer when the media plugin is attached to the field.
 */
export async function handleMediaPaste(
  e: ClipboardEvent,
  field: PostField,
  ctx: ContentUploadContext
): Promise<void> {
  const items = Array.from(e.clipboardData?.items ?? []);
  const image = items.find((item) => item.kind === 'file' && item.type.startsWith('image/'));
  const file = image?.getAsFile();
  if (!file) return;
  e.preventDefault();
  await uploadIntoContent([file], field, ctx); // one image per paste
}

/**
 * Handle drag-drop on a textarea: upload the dropped images and videos into the text.
 * Called by the composer when the media plugin is attached to the field.
 */
export async function handleMediaDrop(
  e: DragEvent,
  field: PostField,
  ctx: ContentUploadContext
): Promise<void> {
  const files = Array.from(e.dataTransfer?.files ?? []).filter(
    (file) => file.type.startsWith('image/') || file.type.startsWith('video/')
  );
  if (!files.length) return;
  e.preventDefault();
  await uploadIntoContent(files, field, ctx);
}

/**
 * Append a media URL on a new line at the end of the content field, as it is now.
 */
function injectMediaUrlIntoContent(ctx: ContentUploadContext, fieldId: string, url: string): void {
  const current = String((ctx.getFormData?.() ?? ctx.formData)[fieldId] ?? '');
  const newContent = current ? `${current}\n${url}` : url;
  ctx.onUpdateField(fieldId, newContent);
}
