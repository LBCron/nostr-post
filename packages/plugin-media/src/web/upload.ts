/**
 * The text field's upload (its "Add media" button, paste and drop), reported as activities,
 * and the upload settings shared with <np-media-input>. The request itself: uploadRequest.ts.
 */

import { dismissActivity, startActivity } from '@nostr-post/plugins/activity';
import { requestSignIn } from '@nostr-post/plugins/signIn';
import type { PostField } from '@nostr-post/plugins/types';
import type { MediaPluginConfig, MediaQuality } from '../core';
import { compressImage, preferredQuality } from './compress';
import { formatBytes, type MediaMessages, mediaMessages } from './mediaMessages';
import { uploadFailureKind, uploadWithRetry } from './uploadRequest';

/** Largest file uploaded, after shrinking (MediaPluginConfig.maxSize) */
export const DEFAULT_MAX_SIZE = 10 * 1024 * 1024;

/** What uploading into a text field needs from the composer */
export interface ContentUploadContext {
  formData: Record<string, unknown>;
  /** The form as it is now; uploads take a while and the user keeps typing */
  getFormData?: () => Record<string, unknown>;
  onUpdateField: (fieldId: string, value: unknown) => void;
  /** The media field attached to the text field: its upload settings */
  attachedField?: PostField;
}

/**
 * Why an upload failed, for the user. When it needs a signed-in user, the app is asked to sign
 * them in (`requestSignIn`, e.g. it opens its login)
 */
export const uploadFailureText = (err: unknown, fileName: string, m: MediaMessages): string => {
  if (uploadFailureKind(err) === 'sign-in') {
    requestSignIn('upload');
    return m.signInToUpload(fileName);
  }
  const reason = err instanceof Error ? err.message : String(err);
  return `${m.uploadFailed(fileName)}: ${reason}`;
};

/** The quality to upload at: the user's choice, unless the field doesn't offer one */
export const uploadQuality = (config: MediaPluginConfig): MediaQuality =>
  config.qualityChoice === false ? (config.quality ?? 'mid') : preferredQuality(config);

/** Upload one file into the text field, reported as a cancellable activity */
async function uploadOneIntoContent(
  file: File,
  targetField: PostField,
  ctx: ContentUploadContext,
  config: MediaPluginConfig
): Promise<void> {
  const m = mediaMessages();
  const maxSize = config.maxSize ?? DEFAULT_MAX_SIZE;
  const controller = new AbortController();
  // The link goes into the text when it's done: the composer waits for it before publishing
  const activity = startActivity(m.preparing(file.name), {
    blocksPublish: true,
    cancel: () => controller.abort(),
  });
  try {
    const upload = await compressImage(file, uploadQuality(config));
    if (upload.size > maxSize) throw new Error(m.tooLarge(Math.round(maxSize / (1024 * 1024))));
    activity.update({
      label: m.uploading(file.name),
      detail: m.sizes(formatBytes(file.size), formatBytes(upload.size)),
      progress: 0,
    });
    const url = await uploadWithRetry(upload, {
      uploadUrl: config.uploadUrl,
      signal: controller.signal,
      onProgress: (progress) => activity.update({ progress }),
      onWait: (offline) =>
        activity.update({
          label: offline ? m.waitingForConnection(file.name) : m.interrupted(file.name),
          progress: undefined,
        }),
      onRetry: (attempt, attempts) =>
        activity.update({ label: m.retrying(file.name, attempt, attempts), progress: 0 }),
    });
    injectMediaUrlIntoContent(ctx, targetField.id, url);
    activity.done(m.uploaded(file.name));
  } catch (err) {
    // Cancelled (also while being shrunk): gone, and no longer holds publishing
    if (controller.signal.aborted) {
      dismissActivity(activity.id);
      return;
    }
    activity.fail(uploadFailureText(err, file.name, m));
  }
}

/**
 * Upload files one after another and add each URL to the text field. Photos are shrunk to
 * the chosen quality first. Progress, retries and failures are reported as activities
 * (`@nostr-post/plugins/activity`), each with a cancel, so the page stays usable meanwhile.
 */
export async function uploadIntoContent(
  files: File[],
  targetField: PostField,
  ctx: ContentUploadContext
): Promise<void> {
  const config = (ctx.attachedField?.metadata as MediaPluginConfig | undefined) ?? {};
  for (const file of files) await uploadOneIntoContent(file, targetField, ctx, config);
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
