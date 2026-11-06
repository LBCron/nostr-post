/**
 * @nostr-post/outbox - The outbox: adding, listing, running and removing items
 *
 * `createOutbox(storage, jobs)` keeps items in `storage` and runs them: uploads their files
 * (the `upload` job, e.g. plugin-media's Blossom upload with the authorization signed at
 * capture), then sends their events (`publishSignedEvents`), and removes them once published.
 * Listeners hear about every change, e.g. a queue element.
 */

import {
  publishSignedEvents,
  type SignedEntry,
  type SignedPublishResult,
} from '@nostr-post/signer';
import {
  nextStep,
  nowSeconds,
  type OutboxItem,
  type OutboxUpload,
  type RunConditions,
  withState,
} from './item';
import type { OutboxStorage } from './storage';

export interface OutboxJobs {
  /**
   * Uploads a file with its authorization signed at capture; resolves once the server has it
   * (with the same hash), throws with the reason otherwise
   */
  upload?: (upload: OutboxUpload, file: Blob) => Promise<void>;
  /** Sends signed events; default `publishSignedEvents` (in test mode only logged) */
  publish?: (entries: SignedEntry[]) => Promise<SignedPublishResult[]>;
}

/** What changed: an item added, updated (its state) or removed (published or by the user) */
export interface OutboxChange {
  type: 'added' | 'updated' | 'removed';
  item: OutboxItem;
}

export interface Outbox {
  /** The items, oldest first; only `pubkey`'s when given */
  list(pubkey?: string): Promise<OutboxItem[]>;
  /** Adds an item with its files (by `fileKey`) */
  add(item: OutboxItem, files?: Record<string, Blob>): Promise<OutboxItem>;
  /** Replaces an item, e.g. an edited draft */
  update(item: OutboxItem): Promise<OutboxItem>;
  /** Removes an item and its files */
  remove(id: string): Promise<void>;
  /** An item's file, e.g. for a thumbnail */
  file(key: string): Promise<Blob | undefined>;
  /** Runs an item's next step (`nextStep`): uploads, then publishes; the item as it ends */
  run(id: string, conditions?: RunConditions): Promise<OutboxItem | undefined>;
  /** Runs every item of `pubkey` that has a step to take now, one after the other */
  runAll(pubkey: string, conditions?: RunConditions): Promise<OutboxItem[]>;
  /** Hears every change; returns the function that stops it */
  subscribe(listener: (change: OutboxChange) => void): () => void;
}

const message = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

/**
 * The outbox over `storage`. `jobs` may be a function, read when an item runs, so jobs
 * registered later (e.g. plugin-media's upload) apply
 */
export function createOutbox(
  storage: OutboxStorage,
  jobsOrGetter: OutboxJobs | (() => OutboxJobs) = {}
): Outbox {
  const jobsNow = (): OutboxJobs =>
    typeof jobsOrGetter === 'function' ? jobsOrGetter() : jobsOrGetter;
  const listeners = new Set<(change: OutboxChange) => void>();
  const notify = (type: OutboxChange['type'], item: OutboxItem) => {
    for (const listener of listeners) listener({ type, item });
  };
  const save = async (item: OutboxItem): Promise<OutboxItem> => {
    await storage.putItem(item);
    notify('updated', item);
    return item;
  };
  const removeWithFiles = async (item: OutboxItem): Promise<void> => {
    await Promise.all(item.uploads.map((u) => storage.removeFile(u.fileKey)));
    await storage.removeItem(item.id);
    notify('removed', item);
  };
  // Items running now: a second run of the same item waits for nothing and does nothing
  const running = new Set<string>();

  const upload = async (item: OutboxItem): Promise<OutboxItem> => {
    let current = await save(withState(item, 'uploading'));
    const jobs = jobsNow();
    for (const file of current.uploads.filter((u) => !u.uploaded)) {
      if (!jobs.upload) throw new Error('No upload job');
      const blob = await storage.file(file.fileKey);
      if (!blob) throw new Error(`The file of ${file.name ?? file.url} is gone`);
      await jobs.upload(file, blob);
      current = await save({
        ...current,
        uploads: current.uploads.map((u) => (u === file ? { ...u, uploaded: true } : u)),
      });
    }
    return current;
  };

  const publish = async (item: OutboxItem): Promise<OutboxItem> => {
    const current = await save(withState(item, 'publishing'));
    const results = await (jobsNow().publish ?? ((e) => publishSignedEvents(e)))(current.events);
    const failed = results.filter((r) => !r.ok);
    if (failed.length === 0) {
      const published = withState(current, 'published');
      await removeWithFiles(published);
      return published;
    }
    // Published events leave the item: a retry sends the others
    const sent = new Set(results.filter((r) => r.ok).map((r) => r.id));
    return save(
      withState(
        { ...current, events: current.events.filter((e) => !sent.has(e.event.id)) },
        'failed',
        { error: failed.map((r) => r.error).join('; ') }
      )
    );
  };

  const run = async (id: string, conditions: RunConditions = {}) => {
    const item = (await storage.items()).find((i) => i.id === id);
    if (!item || running.has(id)) return item;
    const step = nextStep(item, conditions);
    if (step !== 'upload' && step !== 'publish') return item;
    running.add(id);
    let current = item;
    try {
      if (step === 'upload') current = await upload(current);
      return await publish(current);
    } catch (error) {
      const latest = (await storage.items()).find((i) => i.id === id) ?? current;
      return save(withState(latest, 'failed', { error: message(error) }));
    } finally {
      running.delete(id);
    }
  };

  return {
    list: (pubkey) => storage.items(pubkey),
    add: async (item, files = {}) => {
      for (const [key, file] of Object.entries(files)) await storage.putFile(key, file);
      await storage.putItem(item);
      notify('added', item);
      return item;
    },
    update: (item) => save({ ...item, updatedAt: nowSeconds() }),
    remove: async (id) => {
      const item = (await storage.items()).find((i) => i.id === id);
      if (item) await removeWithFiles(item);
    },
    file: (key) => storage.file(key),
    run,
    runAll: async (pubkey, conditions = {}) => {
      const ran: OutboxItem[] = [];
      for (const item of await storage.items(pubkey)) {
        const step = nextStep(item, conditions);
        if (step === 'upload' || step === 'publish') {
          const result = await run(item.id, conditions);
          if (result) ran.push(result);
        }
      }
      return ran;
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
