/**
 * <nostr-post-composer>'s drafts (#283), kept in the outbox (@nostr-post/outbox): the form data,
 * unsigned, with its manifest. A draft's photos prepared to upload later are kept with it, so
 * reopening it restores them. Publishing a draft removes it.
 */

import type { NostrPostManifest } from '@nostr-post/core/types';
import {
  deferredUploadsIn,
  deferUpload,
  draftItem,
  nowSeconds,
  type OutboxItem,
} from '@nostr-post/outbox';
import { browserOutbox } from '@nostr-post/outbox/web';

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

/** Saves the form as a draft in the browser outbox, with its photos to upload later */
export async function saveDraft({
  pubkey,
  manifest,
  formData,
  dTag,
  draftId,
}: SaveDraftOptions): Promise<OutboxItem> {
  const box = browserOutbox();
  const deferred = deferredUploadsIn(formData);
  const previous = draftId ? (await box.list(pubkey)).find((i) => i.id === draftId) : undefined;
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
  return box.add(item, Object.fromEntries(deferred.map((d) => [d.upload.fileKey, d.file])));
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
export async function openDraft(item: OutboxItem): Promise<OpenedDraft> {
  const box = browserOutbox();
  for (const upload of item.uploads) {
    const file = await box.file(upload.fileKey);
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

/** Removes a draft, once published */
export const removeDraft = (id: string): Promise<void> => browserOutbox().remove(id);
