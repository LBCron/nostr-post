/**
 * <nostr-post-composer> and the outbox (@nostr-post/outbox): a post whose files upload later
 * (plugin-media's "Upload later"), or a timed post (`schedule`), isn't published at once. Its
 * publish runs as usual, plugins' publish hooks included, but the signed events are captured
 * and queued (with the files); the outbox uploads them on wifi or when the user asks, and sends
 * the post then, or at its time. A timed post is signed now: many relays refuse events dated in
 * the future, so it keeps the signing date.
 */

import {
  captureEvents,
  deferredUploadsIn,
  forgetDeferredUploads,
  type OutboxItem,
  signedItem,
} from '@nostr-post/outbox';
import { browserOutbox, connectionConditions, ensureOutboxRunner } from '@nostr-post/outbox/web';
import type { PublishWithHooksResult } from '@nostr-post/posts';
import type { ComposerMessages } from './composerMessages';

/** A send time this close to now is now (s) */
const NOW_SECONDS = 30;

export interface PublishOrQueueResult {
  published: PublishWithHooksResult;
  /** The outbox item, when the post was queued */
  queued?: OutboxItem;
}

/**
 * Publishes, or queues the post: when `formData` uses files that upload later, or `sendAt`
 * (unix seconds) is later than now
 */
export async function publishOrQueue(
  formData: Record<string, unknown>,
  pubkey: string,
  publish: () => Promise<PublishWithHooksResult>,
  { sendAt }: { sendAt?: number } = {}
): Promise<PublishOrQueueResult> {
  const deferred = deferredUploadsIn(formData);
  const timed = sendAt !== undefined && sendAt > Date.now() / 1000 + NOW_SECONDS;
  if (deferred.length === 0 && !timed) return { published: await publish() };
  const { result, events } = await captureEvents(publish);
  const box = browserOutbox();
  const item = await box.add(
    signedItem({
      pubkey,
      events,
      uploads: deferred.map((d) => d.upload),
      ...(deferred.length ? { wifiOnly: true } : {}),
      ...(timed ? { sendAt } : {}),
    }),
    Object.fromEntries(deferred.map((d) => [d.upload.fileKey, d.file]))
  );
  forgetDeferredUploads(deferred.map((d) => d.upload.url));
  // On wifi already: upload and publish now; timed posts go at their time
  void box.run(item.id, connectionConditions());
  ensureOutboxRunner();
  return { published: result, queued: item };
}

/** What the composer says about a queued post: its time, or that its photos upload later */
export const queuedMessage = (item: OutboxItem, m: ComposerMessages): string =>
  item.sendAt !== undefined ? m.scheduled(new Date(item.sendAt * 1000)) : m.queued;
