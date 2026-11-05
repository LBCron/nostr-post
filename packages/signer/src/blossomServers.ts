/**
 * A user's Blossom media servers (their kind 10063 list, BUD-03): where their uploads go, and
 * where to find a file of theirs by its hash when its URL fails.
 */

import { BLOSSOM_SERVER_LIST_KIND, blossomServersOf } from '@nostr-post/core/blossom';
import { DEFAULT_RELAYS, fetchEvents } from './fetch';
import type { SignedEvent } from './index';
import { INDEXER_RELAYS } from './relays';

// Module state: one lookup per user and relays for the session (a failed one is forgotten)
const cache = new Map<string, Promise<string[]>>();

/** The servers of the user's newest kind 10063 event, in its order; [] without one */
export const newestBlossomServers = (events: SignedEvent[]): string[] => {
  const newest = events
    .filter((e) => e.kind === BLOSSOM_SERVER_LIST_KIND)
    .sort((a, b) => b.created_at - a.created_at)[0];
  return newest ? blossomServersOf(newest) : [];
};

/** The user's Blossom servers, in their order of preference; [] when they have no list */
export function fetchBlossomServers(
  pubkey: string,
  relays: string[] = DEFAULT_RELAYS
): Promise<string[]> {
  const key = `${pubkey}|${relays.join(',')}`;
  let cached = cache.get(key);
  if (!cached) {
    const forget = (): string[] => {
      cache.delete(key);
      return [];
    };
    cached = fetchEvents(
      { authors: [pubkey], kinds: [BLOSSOM_SERVER_LIST_KIND] },
      [...new Set([...relays, ...INDEXER_RELAYS])],
      { waitForAll: true }
    ).then((events) => {
      const servers = newestBlossomServers(events);
      return servers.length > 0 ? servers : forget();
    }, forget);
    cache.set(key, cached);
  }
  return cached;
}
