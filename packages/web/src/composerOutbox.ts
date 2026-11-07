/**
 * <nostr-post-composer> and the outbox (@nostr-post/outbox): a post whose files upload later
 * (plugin-media's "Upload later"), or a timed post (`schedule`), isn't published at once.
 *
 * - Files with a final URL (Blossom) or none: the publish runs as usual, plugins' publish hooks
 *   included, but the signed events are captured and queued (with the files). Nothing needs the
 *   signer later. A timed post keeps its signing date: many relays refuse events dated later.
 * - Files whose URL comes with the upload (nostr.build: sign later): the form is queued
 *   unsigned, with what's needed to publish it. Once the files are up, the `sign` job registered
 *   here builds the post with their URLs and signs it (the signer is asked then).
 *
 * The outbox uploads on wifi or when the user asks, and sends the post then, or at its time.
 */

import type { NostrPostManifest } from '@nostr-post/core/types';
import {
  captureEvents,
  type DeferredUpload,
  deferredUploadsIn,
  draftItem,
  forgetDeferredUploads,
  type OutboxItem,
  signedItem,
  withUploadedUrls,
} from '@nostr-post/outbox';
import {
  browserOutbox,
  connectionConditions,
  ensureOutboxRunner,
  registerOutboxJobs,
} from '@nostr-post/outbox/web';
import {
  type PublishWithHooksResult,
  publishWithHooks,
  validateAndCoordinate,
} from '@nostr-post/posts';
import { draftTitle } from './composerDrafts';
import { type ComposerMessages, DEFAULT_COMPOSER_MESSAGES } from './composerMessages';
import { ensurePluginsForManifest } from './pluginAutoLoad';
import { fetchManifestByATag, getPublicKey, type SignedEntry } from './signer';

/** A send time this close to now is now (s) */
const NOW_SECONDS = 30;

/** The composer's options of validateAndCoordinate, without the pubkey */
export type CoordinateOptions = Omit<Parameters<typeof validateAndCoordinate>[2], 'pubkey'>;

/** What a post signed later needs: its manifest, how to build it and where to send it */
export interface SignLaterContext {
  /** The manifest, or a published manifest's address */
  manifest: NostrPostManifest | string;
  options: CoordinateOptions;
  relays?: string[];
}

export interface PublishOrQueueResult {
  published: PublishWithHooksResult;
  /** The outbox item, when the post was queued */
  queued?: OutboxItem;
}

const filesOf = (deferred: DeferredUpload[]) =>
  Object.fromEntries(deferred.map((d) => [d.upload.fileKey, d.file]));

/** A post queued unsigned with its form: signed once its files are up */
const signLaterItem = (
  formData: Record<string, unknown>,
  pubkey: string,
  deferred: DeferredUpload[],
  context: SignLaterContext,
  sendAt: number | undefined
): OutboxItem => ({
  ...draftItem({
    pubkey,
    draft: {
      manifest: context.manifest,
      formData: { ...formData },
      publish: { ...context.options },
      ...(context.relays ? { relays: context.relays } : {}),
    },
    title: draftTitle(formData),
  }),
  state: 'waiting',
  uploads: deferred.map((d) => d.upload),
  signLater: true,
  wifiOnly: true,
  ...(sendAt !== undefined ? { sendAt } : {}),
});

const NOTHING_PUBLISHED: PublishWithHooksResult = { events: [], afterPublishErrors: [] };

/**
 * Publishes, or queues the post: when `formData` uses files that upload later, or `sendAt`
 * (unix seconds) is later than now. Files without a final URL queue it unsigned (`signLater`)
 */
export async function publishOrQueue(
  formData: Record<string, unknown>,
  pubkey: string,
  publish: () => Promise<PublishWithHooksResult>,
  { sendAt, signLater }: { sendAt?: number; signLater?: SignLaterContext } = {}
): Promise<PublishOrQueueResult> {
  const deferred = deferredUploadsIn(formData);
  const timed = sendAt !== undefined && sendAt > Date.now() / 1000 + NOW_SECONDS;
  if (deferred.length === 0 && !timed) return { published: await publish() };
  const box = browserOutbox();
  const unsigned = deferred.some((d) => !d.upload.auth);
  if (unsigned && !signLater) throw new Error('A file uploads later, but nothing can sign later');
  let published = NOTHING_PUBLISHED;
  let item: OutboxItem;
  if (unsigned && signLater) {
    item = signLaterItem(formData, pubkey, deferred, signLater, timed ? sendAt : undefined);
  } else {
    const captured = await captureEvents(publish);
    published = captured.result;
    item = signedItem({
      pubkey,
      events: captured.events,
      uploads: deferred.map((d) => d.upload),
      ...(deferred.length ? { wifiOnly: true } : {}),
      ...(timed ? { sendAt } : {}),
    });
  }
  await box.add(item, filesOf(deferred));
  forgetDeferredUploads(deferred.map((d) => d.upload.url));
  // On wifi already: upload and publish now; timed posts go at their time
  void box.run(item.id, connectionConditions());
  ensureOutboxRunner();
  return { published, queued: item };
}

/** What the composer says about a queued post: its time, or that its photos upload later */
export const queuedMessage = (item: OutboxItem, m: ComposerMessages): string =>
  item.sendAt !== undefined ? m.scheduled(new Date(item.sendAt * 1000)) : m.queued;

/**
 * The outbox's `sign` job: builds a sign-later post from its form with the uploaded URLs and
 * signs it, as the composer would (plugins' publish hooks included), without sending it
 */
export async function signQueuedPost(item: OutboxItem): Promise<SignedEntry[]> {
  const draft = item.draft;
  if (!draft) throw new Error('Nothing to sign');
  const pubkey = await getPublicKey();
  if (pubkey !== item.pubkey) throw new Error("Sign in as the post's author to publish it");
  const manifest =
    typeof draft.manifest === 'string'
      ? (await fetchManifestByATag(draft.manifest, draft.relays))?.manifest
      : (draft.manifest as NostrPostManifest);
  if (!manifest) throw new Error("Couldn't load the post's manifest");
  await ensurePluginsForManifest(manifest);
  const options = { selectedFormatId: '', ...(draft.publish as Partial<CoordinateOptions>) };
  const { events } = await captureEvents(() =>
    publishWithHooks({
      manifest,
      formData: withUploadedUrls(draft.formData, item.uploads),
      pubkey,
      relays: draft.relays,
      coordinate: (formData) =>
        validateAndCoordinate(manifest, formData as never, { pubkey, ...options }),
      messages: DEFAULT_COMPOSER_MESSAGES,
      onStep: () => {},
      isSigning: () => false,
    })
  );
  return events;
}

registerOutboxJobs({ sign: signQueuedPost });
