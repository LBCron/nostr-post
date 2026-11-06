/**
 * Upload later (#282): a photo is prepared now and uploaded on wifi or when the user asks.
 *
 * Preparing (`prepareUploadLater`): its metadata removed, hashed, its Blossom authorization
 * (kind 24242, scoped to the hash) signed now and valid for a few days. A Blossom file's URL
 * is its hash, so the URL is final before the upload and the post can be signed with it. The
 * file is deferred (`deferUpload`, @nostr-post/outbox): the composer then queues the post with
 * it in the outbox. Needs a Blossom server: nostr.build chooses the URL itself.
 *
 * Uploading (`uploadPrepared`, the outbox's upload job): the file with the authorization signed
 * at capture, with retries; the server must store the same hash.
 */

import { blobUrl, blossomUploadAuth } from '@nostr-post/core/blossom';
import type { MediaFileInfo } from '@nostr-post/core/imeta';
import { deferredUpload, deferUpload, type OutboxUpload } from '@nostr-post/outbox';
import type { MediaPluginConfig } from '../core';
import { sha256Hex } from '../hash';
import { rememberMediaFile } from '../mediaFiles';
import { uploadFailure, uploadTargets } from '../uploadServers';
import { imageDim, userServers, withoutMetadata } from './uploadMedia';
import { signWithBrowser, uploadBlossom, withRetries } from './uploadRequest';

/** How long an upload-later authorization is valid (s): the file may wait days for wifi */
export const UPLOAD_LATER_AUTH_SECONDS = 7 * 24 * 60 * 60;

const UPLOAD_LATER_KEY = 'nostr-post:upload-later';

/** Whether the user chose to upload later (remembered in the browser) */
export function prefersUploadLater(): boolean {
  try {
    return localStorage.getItem(UPLOAD_LATER_KEY) === '1';
  } catch {
    return false;
  }
}

export function rememberUploadLater(on: boolean): void {
  try {
    localStorage.setItem(UPLOAD_LATER_KEY, on ? '1' : '0');
  } catch {
    // Not remembered
  }
}

/** The Blossom server a file uploaded later goes to: the user's first, else the field's */
export async function uploadLaterServer(
  config: MediaPluginConfig = {}
): Promise<string | undefined> {
  const target = uploadTargets(config, await userServers(config)).find((t) => t.type === 'blossom');
  return target?.type === 'blossom' ? target.server : undefined;
}

/**
 * Prepares `file` to upload later and defers it: its final URL. Throws `rejected` without a
 * Blossom server, `sign-in` without a signer
 */
export async function prepareUploadLater(
  file: File,
  config: MediaPluginConfig = {}
): Promise<MediaFileInfo> {
  const prepared = config.keepMetadata ? file : await withoutMetadata(file);
  const [sha256, dim, server] = await Promise.all([
    sha256Hex(prepared),
    imageDim(prepared),
    uploadLaterServer(config),
  ]);
  if (!server) throw uploadFailure('rejected', 'Upload later needs a Blossom server');
  const auth = await signWithBrowser(
    blossomUploadAuth({
      sha256,
      expiration: Math.floor(Date.now() / 1000) + UPLOAD_LATER_AUTH_SECONDS,
    })
  );
  if (!auth) throw uploadFailure('sign-in', 'Sign in to upload');
  const url = blobUrl(server, sha256, prepared.type);
  const info: MediaFileInfo = {
    url,
    type: prepared.type,
    sha256,
    size: prepared.size,
    ...(dim ? { dim } : {}),
  };
  const upload: OutboxUpload = {
    fileKey: `upload-${sha256}`,
    sha256,
    url,
    server,
    type: prepared.type,
    size: prepared.size,
    name: file.name,
    auth: auth as OutboxUpload['auth'],
  };
  deferUpload(upload, prepared);
  rememberMediaFile(info);
  return info;
}

/** The outbox's upload job: the file with its authorization signed at capture */
export async function uploadPrepared(upload: OutboxUpload, file: Blob): Promise<void> {
  await withRetries(() => uploadBlossom(file, upload.server, upload.sha256, upload.auth));
}

// Module state: previews of files not on their server yet, by URL
const previews = new Map<string, string>();

/** A URL to show a file uploaded later from, until it's on its server (the URL itself then) */
export function previewUrl(url: string): string {
  const known = previews.get(url);
  if (known) return known;
  const pending = deferredUpload(url);
  if (!pending || typeof URL.createObjectURL !== 'function') return url;
  const preview = URL.createObjectURL(pending.file);
  previews.set(url, preview);
  return preview;
}
