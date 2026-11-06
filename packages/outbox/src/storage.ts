/**
 * @nostr-post/outbox - Where items and their files are kept
 *
 * The outbox works against this interface, so it doesn't depend on a browser: `/web` has the
 * IndexedDB storage (#281), `memoryStorage` keeps everything in memory (tests, servers).
 */

import type { OutboxItem } from './item';

export interface OutboxStorage {
  /** The items, oldest first; only `pubkey`'s when given */
  items(pubkey?: string): Promise<OutboxItem[]>;
  putItem(item: OutboxItem): Promise<void>;
  removeItem(id: string): Promise<void>;
  putFile(key: string, file: Blob): Promise<void>;
  file(key: string): Promise<Blob | undefined>;
  removeFile(key: string): Promise<void>;
}

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
