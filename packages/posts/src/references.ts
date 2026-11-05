/**
 * Posts that reference events: an addressable event by its address (`a`, and NIP-22 comments'
 * root `A`), others by id (`e`, `E`), whatever their kind, e.g. the comments of a calendar event
 * or everything linking a wiki page (all its versions' addresses). With the targets themselves,
 * e.g. for a gallery of an event and its comments (`<np-media-gallery>`).
 */

import {
  DEFAULT_RELAYS,
  type FetchFilter,
  fetchEvents,
  type SignedEvent,
} from '@nostr-post/signer';
import { addressOf } from './threads';

/** How many referencing posts are read at most */
export const REFERENCES_LIMIT = 500;

/** Relays may cap how many values one filter takes: ask in batches */
const BATCH = 50;

/** Whether a target is an address (`<kind>:<pubkey>:<d-tag>`), not an event id */
export const isAddress = (target: string): boolean => /^\d+:[0-9a-f]{64}:/.test(target);

const batches = (values: string[]): string[][] =>
  Array.from({ length: Math.ceil(values.length / BATCH) }, (_, i) =>
    values.slice(i * BATCH, (i + 1) * BATCH)
  );

/** Relay filters for posts referencing the targets; `kinds` undefined: any kind */
export function referenceFilters(
  targets: readonly string[],
  { kinds, limit = REFERENCES_LIMIT }: { kinds?: number[]; limit?: number } = {}
): FetchFilter[] {
  const base = { ...(kinds ? { kinds } : {}), limit };
  const addresses = targets.filter(isAddress);
  const ids = targets.filter((t) => !isAddress(t));
  return [
    ...batches(addresses).flatMap((batch) => [
      { ...base, '#a': batch },
      { ...base, '#A': batch },
    ]),
    ...batches(ids).flatMap((batch) => [
      { ...base, '#e': batch },
      { ...base, '#E': batch },
    ]),
  ];
}

/** Relay filters for the targets themselves: each address's event, and the ids */
export function targetFilters(targets: readonly string[]): FetchFilter[] {
  const ids = targets.filter((t) => !isAddress(t));
  const byAddress = targets.filter(isAddress).map((address) => {
    const [kind = '', pubkey = '', ...dTag] = address.split(':');
    return { kinds: [Number(kind)], authors: [pubkey], '#d': [dTag.join(':')] } as FetchFilter;
  });
  return [...byAddress, ...(ids.length > 0 ? [{ ids }] : [])];
}

/** The newest version of each address, and every other event once */
const newestVersions = (events: SignedEvent[]): SignedEvent[] => {
  const byKey = new Map<string, SignedEvent>();
  for (const event of events) {
    const key = addressOf(event) ?? event.id;
    const known = byKey.get(key);
    if (!known || event.created_at > known.created_at) byKey.set(key, event);
  }
  return [...byKey.values()];
};

/**
 * The targets (newest version of each address) and the posts referencing them (any version),
 * newest first. `targets: false` skips loading the targets themselves.
 */
export async function fetchReferences(
  targets: readonly string[],
  {
    kinds,
    limit = REFERENCES_LIMIT,
    relays = DEFAULT_RELAYS,
    loadTargets = true,
  }: { kinds?: number[]; limit?: number; relays?: string[]; loadTargets?: boolean } = {}
): Promise<{ targets: SignedEvent[]; posts: SignedEvent[] }> {
  if (targets.length === 0) return { targets: [], posts: [] };
  const [own, referencing] = await Promise.all([
    loadTargets
      ? fetchEvents(targetFilters(targets), relays, { waitForAll: true }).catch(() => [])
      : Promise.resolve([]),
    fetchEvents(referenceFilters(targets, { kinds, limit }), relays, { waitForAll: true }).catch(
      () => []
    ),
  ]);
  const ownIds = new Set(own.map((e) => e.id));
  const posts = [...new Map(referencing.map((e) => [e.id, e])).values()]
    .filter((e) => !ownIds.has(e.id))
    .sort((a, b) => b.created_at - a.created_at)
    .slice(0, limit);
  return { targets: newestVersions(own), posts };
}
