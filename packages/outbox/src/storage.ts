/**
 * @nostr-post/outbox - Where items and their files are kept
 *
 * The outbox works against these interfaces, so it doesn't depend on a browser: `/web` has the
 * IndexedDB storage (#281), `memoryStorage` keeps everything in memory (tests, servers).
 *
 * Items and files are apart: items are small records that could sync between devices (e.g. an
 * Evolu database through Evolustr), files are photos that stay on the device. `combineStorage`
 * puts an item store and a file store together.
 */

import type { OutboxItem } from './item';

/** Where items are kept: small records, which could sync between devices */
export interface OutboxItemStore {
  /** The items, oldest first; only `pubkey`'s when given */
  items(pubkey?: string): Promise<OutboxItem[]>;
  putItem(item: OutboxItem): Promise<void>;
  removeItem(id: string): Promise<void>;
}

/** Where the items' files are kept: on the device */
export interface OutboxFileStore {
  putFile(key: string, file: Blob): Promise<void>;
  file(key: string): Promise<Blob | undefined>;
  removeFile(key: string): Promise<void>;
}

export type OutboxStorage = OutboxItemStore & OutboxFileStore;

/** An outbox storage from an item store and a file store, e.g. synced items and local files */
export const combineStorage = (items: OutboxItemStore, files: OutboxFileStore): OutboxStorage => ({
  items: (pubkey) => items.items(pubkey),
  putItem: (item) => items.putItem(item),
  removeItem: (id) => items.removeItem(id),
  putFile: (key, file) => files.putFile(key, file),
  file: (key) => files.file(key),
  removeFile: (key) => files.removeFile(key),
});

/** Storage in memory: lost when the page or process ends */
export function memoryStorage(): OutboxStorage {
  const items = new Map<string, OutboxItem>();
  const files = new Map<string, Blob>();
  return {
    items: async (pubkey) =>
      [...items.values()]
        .filter((item) => pubkey === undefined || item.pubkey === pubkey)
        .sort((a, b) => a.createdAt - b.createdAt),
    putItem: async (item) => {
      items.set(item.id, item);
    },
    removeItem: async (id) => {
      items.delete(id);
    },
    putFile: async (key, file) => {
      files.set(key, file);
    },
    file: async (key) => files.get(key),
    removeFile: async (key) => {
      files.delete(key);
    },
  };
}
