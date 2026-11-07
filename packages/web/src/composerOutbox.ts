/**
 * <nostr-post-composer>'s outbox in the browser: posts' queue and drafts (@nostr-post/posts,
 * `queuePost`, `saveDraftItem`, `draftForComposer`) with the browser outbox (`browserOutbox`),
 * and the outbox's `sign` job for posts signed later.
 */

import type { OutboxItem } from '@nostr-post/outbox';
import {
  browserOutbox,
  connectionConditions,
  ensureOutboxRunner,
  registerOutboxJobs,
} from '@nostr-post/outbox/web';
import {
  draftForComposer,
  type OpenedDraft,
  type QueuePostResult,
  queuePost,
  type SaveDraftOptions,
  saveDraftItem,
  signedInPubkey,
  signQueuedPost,
} from '@nostr-post/posts';
import { type ComposerMessages, DEFAULT_COMPOSER_MESSAGES } from './composerMessages';
import { ensurePluginsForManifest } from './pluginAutoLoad';

/** Publishes, or queues the post in the browser outbox and runs it (on wifi: at once) */
export async function publishOrQueue(
  ...args: Parameters<typeof queuePost> extends [unknown, ...infer Rest] ? Rest : never
): Promise<QueuePostResult> {
  const box = browserOutbox();
  const result = await queuePost(box, ...args);
  if (result.queued) {
    void box.run(result.queued.id, connectionConditions());
    ensureOutboxRunner();
  }
  return result;
}

/** Saves the form as a draft in the browser outbox */
export const saveDraft = (options: SaveDraftOptions): Promise<OutboxItem> =>
  saveDraftItem(browserOutbox(), options);

/** A composer's draft: saved under the signed-in user, or undefined when no one is */
export async function saveComposerDraft(
  composer: Omit<SaveDraftOptions, 'pubkey' | 'manifest'> & {
    pubkey?: string;
    autoPublish?: boolean;
    manifest: SaveDraftOptions['manifest'];
  }
): Promise<OutboxItem | undefined> {
  const pubkey = await signedInPubkey(composer.pubkey, composer.autoPublish ?? false);
  if (!pubkey) return undefined;
  const { manifest, formData, dTag, draftId } = composer;
  return saveDraft({ pubkey, manifest, formData, dTag, draftId });
}

/** A draft of the browser outbox for a composer (`manifest`/`manifestRef`, `prefill`, `draftId`) */
export const openDraft = (item: OutboxItem): Promise<OpenedDraft> =>
  draftForComposer(browserOutbox(), item);

/** Removes a draft, once published */
export const removeDraft = (id: string): Promise<void> => browserOutbox().remove(id);

/** What the composer says about a queued post: its time, or that its photos upload later */
export const queuedMessage = (item: OutboxItem, m: ComposerMessages): string =>
  item.sendAt !== undefined ? m.scheduled(new Date(item.sendAt * 1000)) : m.queued;

registerOutboxJobs({
  sign: (item) =>
    signQueuedPost(item, {
      ensurePlugins: async (manifest) => {
        await ensurePluginsForManifest(manifest);
      },
      messages: DEFAULT_COMPOSER_MESSAGES,
    }),
});
