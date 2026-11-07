/**
 * @nostr-post/outbox - Files that upload later
 *
 * A field that prepares a file to upload later (plugin-media: shrunk, hashed, its Blossom
 * authorization signed, its final URL known) defers it here. When the post is published, the
 * app (the composer) finds the deferred files its form data uses (`deferredUploadsIn`), and
 * queues the post with them in the outbox instead of publishing it.
 */

import type { OutboxUpload } from './item';

export interface DeferredUpload {
  upload: OutboxUpload;
  file: Blob;
}

// Module state: the files prepared on this page, by URL
const deferred = new Map<string, DeferredUpload>();

/** Keeps a prepared file until its post is queued */
export function deferUpload(upload: OutboxUpload, file: Blob): void {
  deferred.set(upload.url, { upload, file });
}

/** The prepared file of a URL, e.g. to preview it before it's on the server */
export const deferredUpload = (url: string): DeferredUpload | undefined => deferred.get(url);

/** The deferred files whose URLs a value uses (form data, an event), each once */
export function deferredUploadsIn(value: unknown): DeferredUpload[] {
  const text = typeof value === 'string' ? value : JSON.stringify(value ?? '');
  return [...deferred.values()].filter(({ upload }) => text.includes(upload.url));
}

/** Forgets deferred files, once queued */
export function forgetDeferredUploads(urls: string[]): void {
  for (const url of urls) deferred.delete(url);
}
