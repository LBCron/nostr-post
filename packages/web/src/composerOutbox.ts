/**
 * <nostr-post-composer> and the outbox (@nostr-post/outbox): a post whose files upload later
 * (plugin-media's "Upload later") isn't published at once. Its publish runs as usual, plugins'
 * publish hooks included, but the signed events are captured and queued with the files; the
 * outbox uploads them on wifi or when the user asks, then publishes the post.
 */

import {
  captureEvents,
  deferredUploadsIn,
  forgetDeferredUploads,
  type OutboxItem,
  signedItem,
} from '@nostr-post/outbox';
import { browserOutbox, connectionConditions } from '@nostr-post/outbox/web';
import type { PublishWithHooksResult } from '@nostr-post/posts';

export interface PublishOrQueueResult {
  published: PublishWithHooksResult;
  /** The outbox item, when the post was queued */
  queued?: OutboxItem;
}

/** Publishes, or queues the post when `formData` uses files that upload later */
export async function publishOrQueue(
  formData: Record<string, unknown>,
  pubkey: string,
  publish: () => Promise<PublishWithHooksResult>
): Promise<PublishOrQueueResult> {
  const deferred = deferredUploadsIn(formData);
  if (deferred.length === 0) return { published: await publish() };
  const { result, events } = await captureEvents(publish);
  const box = browserOutbox();
  const item = await box.add(
    signedItem({
      pubkey,
      events,
      uploads: deferred.map((d) => d.upload),
      wifiOnly: true,
    }),
    Object.fromEntries(deferred.map((d) => [d.upload.fileKey, d.file]))
  );
  forgetDeferredUploads(deferred.map((d) => d.upload.url));
  // On wifi already: upload and publish now
  void box.run(item.id, connectionConditions());
  return { published: result, queued: item };
}
