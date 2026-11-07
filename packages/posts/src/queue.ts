/**
 * @nostr-post/posts - Posts that wait in an outbox (@nostr-post/outbox)
 *
 * A post whose files upload later, or a timed post, isn't published at once:
 *
 * - Files with a final URL (Blossom) or none: the publish runs as usual, plugins' publish hooks
 *   included, but its signed events are captured and queued with the files. Nothing needs the
 *   signer later. A timed post keeps its signing date: many relays refuse events dated later.
 * - Files whose URL comes with the upload (nostr.build): the form is queued unsigned (sign
 *   later), with what's needed to publish it. Once the files are up, `signQueuedPost` (the
 *   outbox's `sign` job) builds the post with their URLs and signs it, the signer asked then.
 *
 * The outbox is passed in (in a browser `browserOutbox()` of @nostr-post/outbox/web), so this
 * stays free of UI and storage.
 */

import type { NostrPostManifest } from '@nostr-post/core/types';
import {
  captureEvents,
  type DeferredUpload,
  deferredUploadsIn,
  draftItem,
  forgetDeferredUploads,
  type Outbox,
  type OutboxItem,
  signedItem,
  withUploadedUrls,
} from '@nostr-post/outbox';
import { fetchManifestByATag, getPublicKey, type SignedEntry } from '@nostr-post/signer';
import { draftTitle } from './drafts';
import { type PublishWithHooksResult, publishWithHooks, validateAndCoordinate } from './publish';
import { DEFAULT_PUBLISH_MESSAGES, type PublishMessages } from './publishMessages';

/** A send time this close to now is now (s) */
const NOW_SECONDS = 30;

/** validateAndCoordinate's options, without the pubkey: how a composer builds the post */
export type CoordinateOptions = Omit<Parameters<typeof validateAndCoordinate>[2], 'pubkey'>;

/** What a post signed later needs: its manifest, how to build it and where to send it */
export interface SignLaterContext {
  /** The manifest, or a published manifest's address */
  manifest: NostrPostManifest | string;
  options: CoordinateOptions;
  relays?: string[];
}

export interface QueuePostResult {
  /** What the publish did now (nothing for a post signed later) */
  published: PublishWithHooksResult;
  /** The outbox item, when the post was queued */
  queued?: OutboxItem;
}

const NOTHING_PUBLISHED: PublishWithHooksResult = { events: [], afterPublishErrors: [] };

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

/**
 * Publishes, or queues the post in `outbox`: when `formData` uses files that upload later
 * (`deferredUploadsIn`), or `sendAt` (unix seconds) is later than now. Files without a final
 * URL queue it unsigned (`signLater` needed). The caller runs the item (`outbox.run`)
 */
export async function queuePost(
  outbox: Outbox,
  formData: Record<string, unknown>,
  pubkey: string,
  publish: () => Promise<PublishWithHooksResult>,
  { sendAt, signLater }: { sendAt?: number; signLater?: SignLaterContext } = {}
): Promise<QueuePostResult> {
  const deferred = deferredUploadsIn(formData);
  const timed = sendAt !== undefined && sendAt > Date.now() / 1000 + NOW_SECONDS;
  if (deferred.length === 0 && !timed) return { published: await publish() };
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
  await outbox.add(item, Object.fromEntries(deferred.map((d) => [d.upload.fileKey, d.file])));
  forgetDeferredUploads(deferred.map((d) => d.upload.url));
  return { published, queued: item };
}

export interface SignQueuedPostOptions {
  /** Loads the plugins the manifest's fields need (in a browser, web's plugin autoload) */
  ensurePlugins?: (manifest: NostrPostManifest) => Promise<void>;
  messages?: PublishMessages;
}

/**
 * The outbox's `sign` job: builds a sign-later post from its form with the uploaded URLs and
 * signs it, as a composer would (plugins' publish hooks included), without sending it. The
 * signer must be the item's author
 */
export async function signQueuedPost(
  item: OutboxItem,
  { ensurePlugins, messages = DEFAULT_PUBLISH_MESSAGES }: SignQueuedPostOptions = {}
): Promise<SignedEntry[]> {
  const draft = item.draft;
  if (!draft) throw new Error('Nothing to sign');
  const pubkey = await getPublicKey();
  if (pubkey !== item.pubkey) throw new Error("Sign in as the post's author to publish it");
  const manifest =
    typeof draft.manifest === 'string'
      ? (await fetchManifestByATag(draft.manifest, draft.relays))?.manifest
      : (draft.manifest as NostrPostManifest);
  if (!manifest) throw new Error("Couldn't load the post's manifest");
  await ensurePlugins?.(manifest);
  const options = { selectedFormatId: '', ...(draft.publish as Partial<CoordinateOptions>) };
  const { events } = await captureEvents(() =>
    publishWithHooks({
      manifest,
      formData: withUploadedUrls(draft.formData, item.uploads),
      pubkey,
      relays: draft.relays,
      coordinate: (formData) =>
        validateAndCoordinate(manifest, formData as never, { pubkey, ...options }),
      messages,
      onStep: () => {},
      isSigning: () => false,
    })
  );
  return events;
}
