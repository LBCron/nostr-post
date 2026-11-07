/**
 * @nostr-post/posts - Drafts in an outbox (@nostr-post/outbox)
 *
 * A draft is a form, unsigned, with its manifest: saved, reopened in a composer, removed once
 * published. Its photos prepared to upload later are kept with it, so reopening it restores
 * them. The outbox is passed in (in a browser `browserOutbox()` of @nostr-post/outbox/web).
 */

import type { NostrPostManifest } from '@nostr-post/core/types';
import {
  deferredUploadsIn,
  deferUpload,
  draftItem,
  nowSeconds,
  type Outbox,
  type OutboxItem,
} from '@nostr-post/outbox';

/** A draft's name: the form's first text */
export const draftTitle = (formData: Record<string, unknown>, maxLength = 60): string => {
  const text = Object.values(formData)
    .find((v): v is string => typeof v === 'string' && v.trim() !== '')
    ?.replace(/\s+/g, ' ')
    .trim();
  if (!text) return '';
  return text.length > maxLength ? `${text.slice(0, maxLength - 1).trimEnd()}…` : text;
};

export interface SaveDraftOptions {
  pubkey: string;
  /** The manifest, or a published manifest's address */
  manifest: NostrPostManifest | string;
  formData: Record<string, unknown>;
  dTag?: string;
  /** The draft to replace, when editing one */
  draftId?: string;
}

/** Saves a form as a draft in `outbox`, with its photos to upload later */
export async function saveDraftItem(
  outbox: Outbox,
  { pubkey, manifest, formData, dTag, draftId }: SaveDraftOptions
): Promise<OutboxItem> {
  const deferred = deferredUploadsIn(formData);
  const previous = draftId ? (await outbox.list(pubkey)).find((i) => i.id === draftId) : undefined;
  const fresh = draftItem({
    pubkey,
    draft: { manifest, formData: { ...formData }, ...(dTag ? { dTag } : {}) },
    title: draftTitle(formData),
    ...(previous ? { id: previous.id, now: previous.createdAt } : {}),
  });
  const item: OutboxItem = {
    ...fresh,
    updatedAt: nowSeconds(),
    uploads: deferred.map((d) => d.upload),
  };
  return outbox.add(item, Object.fromEntries(deferred.map((d) => [d.upload.fileKey, d.file])));
}

/** What a composer needs to edit a draft */
export interface OpenedDraft {
  manifest?: NostrPostManifest;
  manifestRef?: string;
  prefill: Record<string, unknown>;
  dTag?: string;
  draftId: string;
}

/**
 * A draft for a composer (`manifest` or `manifestRef`, `prefill`, `dTag`, `draftId`); its photos
 * to upload later are deferred again, so publishing queues them
 */
export async function draftForComposer(outbox: Outbox, item: OutboxItem): Promise<OpenedDraft> {
  for (const upload of item.uploads) {
    const file = await outbox.file(upload.fileKey);
    if (file) deferUpload(upload, file);
  }
  const manifest = item.draft?.manifest;
  return {
    ...(typeof manifest === 'string'
      ? { manifestRef: manifest }
      : { manifest: manifest as NostrPostManifest }),
    prefill: { ...(item.draft?.formData ?? {}) },
    ...(item.draft?.dTag ? { dTag: item.draft.dTag } : {}),
    draftId: item.id,
  };
}
