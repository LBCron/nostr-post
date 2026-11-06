/**
 * @nostr-post/outbox - Items and their states
 *
 * An item is a post that isn't published at once: a draft (unsigned form data), or signed
 * events waiting to go out, maybe after their files are uploaded (upload later) or at a set
 * time (a timed post). Pure functions over immutable items; storage and running live elsewhere.
 *
 * draft → (signed) waiting → uploading → publishing → published (leaves the outbox), or failed
 * with its reason (retry).
 */

import type { SignedEntry, SignedEvent } from '@nostr-post/signer';

export type OutboxState = 'draft' | 'waiting' | 'uploading' | 'publishing' | 'published' | 'failed';

/** A file the item's events point to, uploaded later with an authorization signed at capture */
export interface OutboxUpload {
  /** The file's key in the outbox storage */
  fileKey: string;
  /** SHA-256 of the file as uploaded (its Blossom address) */
  sha256: string;
  /** Its URL in the events, final before the upload (a Blossom server's `<server>/<sha256>`) */
  url: string;
  /** The Blossom server it goes to */
  server: string;
  type: string;
  size: number;
  name?: string;
  /** The upload's authorization (Blossom kind 24242, scoped to `sha256`), signed at capture */
  auth: SignedEvent;
  /** On the server already */
  uploaded?: boolean;
}

/** A post the user is still working on: its form data and manifest, unsigned */
export interface OutboxDraft {
  /** The manifest, or a published manifest's address */
  manifest: unknown;
  formData: Record<string, unknown>;
  /** Kinds to publish, if the user picked them */
  kinds?: number[];
  /** Editing an existing addressable event */
  dTag?: string;
}

export interface OutboxItem {
  id: string;
  /** Whose item it is: items are listed and sent per signed-in pubkey */
  pubkey: string;
  state: OutboxState;
  /** A short name for lists */
  title: string;
  /** Unix seconds */
  createdAt: number;
  updatedAt: number;
  /** The signed events, the post first, then the events it links (e.g. pages it created) */
  events: SignedEntry[];
  uploads: OutboxUpload[];
  draft?: OutboxDraft;
  /** Unix seconds: send at this time (a timed post) */
  sendAt?: number;
  /** Upload only on wifi, unless the user asks to upload now */
  wifiOnly?: boolean;
  /** Why the last attempt failed */
  error?: string;
  attempts: number;
}

/** Unix seconds */
export const nowSeconds = (): number => Math.floor(Date.now() / 1000);

export const newItemId = (): string =>
  globalThis.crypto?.randomUUID?.() ??
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;

/** A short name of an event: its `title` or `name` tag, else its d tag, else its text */
export const titleOf = (event: Pick<SignedEvent, 'tags' | 'content'>, maxLength = 60): string => {
  const tag = (name: string) => event.tags.find((t) => t[0] === name)?.[1]?.trim();
  const text = tag('title') || tag('name') || tag('d') || event.content.replace(/\s+/g, ' ').trim();
  return text.length > maxLength ? `${text.slice(0, maxLength - 1).trimEnd()}…` : text;
};

/**
 * Captured publishes as an item's events: each event once with all its relays, the last
 * published first (a post is published after the pages its hooks created)
 */
export const capturedEntries = (captured: SignedEntry[]): SignedEntry[] => {
  const byId = new Map<string, SignedEntry>();
  for (const { event, relays } of captured) {
    const known = byId.get(event.id);
    byId.set(event.id, { event, relays: [...new Set([...(known?.relays ?? []), ...relays])] });
  }
  return [...byId.values()].reverse();
};

export interface SignedItemOptions {
  pubkey: string;
  events: SignedEntry[];
  uploads?: OutboxUpload[];
  title?: string;
  sendAt?: number;
  wifiOnly?: boolean;
  id?: string;
  now?: number;
}

/** An item of signed events, waiting to go out */
export const signedItem = ({
  pubkey,
  events,
  uploads = [],
  title,
  sendAt,
  wifiOnly,
  id = newItemId(),
  now = nowSeconds(),
}: SignedItemOptions): OutboxItem => ({
  id,
  pubkey,
  state: 'waiting',
  title: title ?? (events[0] ? titleOf(events[0].event) : ''),
  createdAt: now,
  updatedAt: now,
  events,
  uploads,
  ...(sendAt !== undefined ? { sendAt } : {}),
  ...(wifiOnly ? { wifiOnly } : {}),
  attempts: 0,
});

/** A draft item */
export const draftItem = ({
  pubkey,
  draft,
  title = '',
  id = newItemId(),
  now = nowSeconds(),
}: {
  pubkey: string;
  draft: OutboxDraft;
  title?: string;
  id?: string;
  now?: number;
}): OutboxItem => ({
  id,
  pubkey,
  state: 'draft',
  title,
  createdAt: now,
  updatedAt: now,
  events: [],
  uploads: [],
  draft,
  attempts: 0,
});

/** The item in another state; `error` only with failed */
export const withState = (
  item: OutboxItem,
  state: OutboxState,
  { now = nowSeconds(), error }: { now?: number; error?: string } = {}
): OutboxItem => {
  const { error: _previous, ...rest } = item;
  return {
    ...rest,
    state,
    updatedAt: now,
    ...(state === 'failed' ? { error: error ?? 'Failed', attempts: item.attempts + 1 } : {}),
  };
};

/** What the browser says about the connection, and whether the user asked to send now */
export interface RunConditions {
  /** Unix seconds */
  now?: number;
  /** On wifi (or another unmetered connection); undefined when the browser can't tell */
  wifi?: boolean;
  /** The user asked: upload now, retry, send a timed post now */
  force?: boolean;
}

/** What to do with an item next: upload its files, publish it, wait, or nothing */
export type OutboxStep = 'upload' | 'publish' | 'wait' | 'none';

export const nextStep = (item: OutboxItem, conditions: RunConditions = {}): OutboxStep => {
  const { now = nowSeconds(), wifi, force = false } = conditions;
  if (item.state === 'failed' ? !force : item.state !== 'waiting') return 'none';
  if (item.events.length === 0) return 'none';
  if (item.sendAt !== undefined && item.sendAt > now && !force) return 'wait';
  if (item.uploads.some((u) => !u.uploaded)) {
    return item.wifiOnly && wifi !== true && !force ? 'wait' : 'upload';
  }
  return 'publish';
};

/** A timed post whose time has passed (sent late, e.g. the app was closed) */
export const isLate = (item: OutboxItem, now = nowSeconds()): boolean =>
  item.sendAt !== undefined && item.state === 'waiting' && item.sendAt < now - 60;

/** How long an item has waited, in seconds */
export const waitingFor = (item: OutboxItem, now = nowSeconds()): number =>
  Math.max(0, now - item.createdAt);

/** What the user can do with an item */
export type OutboxAction = 'upload-now' | 'send-now' | 'retry' | 'edit' | 'remove';

/**
 * The actions an item offers: a draft is edited, files waiting for wifi can go now, a timed
 * post can go now, a failed item is retried; every item can be removed
 */
export const itemActions = (item: OutboxItem, now = nowSeconds()): OutboxAction[] => {
  const actions: OutboxAction[] = [];
  if (item.state === 'draft') actions.push('edit');
  if (item.state === 'failed') actions.push('retry');
  if (item.state === 'waiting') {
    const timed = item.sendAt !== undefined && item.sendAt > now;
    if (timed) actions.push('send-now');
    else if (item.uploads.some((u) => !u.uploaded)) actions.push('upload-now');
  }
  if (item.state !== 'uploading' && item.state !== 'publishing') actions.push('remove');
  return actions;
};

/** Bytes still to upload */
export const pendingBytes = (item: OutboxItem): number =>
  item.uploads.filter((u) => !u.uploaded).reduce((sum, u) => sum + u.size, 0);
