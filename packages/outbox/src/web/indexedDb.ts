/**
 * @nostr-post/outbox/web - The outbox in the browser's IndexedDB
 *
 * Items and their files (photos are far too big for localStorage). Browsers may still clear
 * a site's data: `requestPersistentStorage` asks to keep it, and Safari clears it after 7 days
 * without use unless the app is installed, which is why the queue shows how long items wait.
 */

import type { OutboxItem } from '../item';
import type { OutboxStorage } from '../storage';

const ITEMS = 'items';
const FILES = 'files';

const request = <T>(req: IDBRequest<T>): Promise<T> =>
  new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });

const openDb = (name: string): Promise<IDBDatabase> => {
  const req = indexedDB.open(name, 1);
  req.onupgradeneeded = () => {
    const db = req.result;
    if (!db.objectStoreNames.contains(ITEMS)) {
      db.createObjectStore(ITEMS, { keyPath: 'id' }).createIndex('pubkey', 'pubkey');
    }
    if (!db.objectStoreNames.contains(FILES)) db.createObjectStore(FILES);
  };
  return request(req);
};

/** The outbox's storage in IndexedDB database `name` */
export function indexedDbStorage(name = 'nostr-post-outbox'): OutboxStorage {
  let db: Promise<IDBDatabase> | undefined;
  const store = async (storeName: string, mode: IDBTransactionMode) => {
    db ??= openDb(name);
    return (await db).transaction(storeName, mode).objectStore(storeName);
  };
  return {
    items: async (pubkey) => {
      const items = await store(ITEMS, 'readonly');
      const all = (await request(
        pubkey === undefined ? items.getAll() : items.index('pubkey').getAll(pubkey)
      )) as OutboxItem[];
      return all.sort((a, b) => a.createdAt - b.createdAt);
    },
    putItem: async (item) => {
      await request((await store(ITEMS, 'readwrite')).put(item));
    },
    removeItem: async (id) => {
      await request((await store(ITEMS, 'readwrite')).delete(id));
    },
    putFile: async (key, file) => {
      await request((await store(FILES, 'readwrite')).put(file, key));
    },
    file: async (key) =>
      (await request((await store(FILES, 'readonly')).get(key))) as Blob | undefined,
    removeFile: async (key) => {
      await request((await store(FILES, 'readwrite')).delete(key));
    },
  };
}

/** Asks the browser to keep the site's data (`navigator.storage.persist()`); whether it will */
export async function requestPersistentStorage(): Promise<boolean> {
  try {
    return (await navigator.storage?.persist?.()) ?? false;
  } catch {
    return false;
  }
}
