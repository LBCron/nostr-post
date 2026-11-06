/**
 * @nostr-post/signer - Publishing logged (dry-run) events for real
 *
 * A post published in test mode is signed, so it can still be sent to relays as it is (the
 * signature stays valid; its date is the signing time). It may link events that were logged
 * with it, e.g. the venue and artist pages a gig created: `dryRunBundle` gives the post with
 * the logged events it links, transitively, `newerOnRelays` the ones relays already have in a
 * newer version, and `publishDryRunEntries` sends them, then removes them from the log.
 * Building blocks for any queue of signed events (the outbox, #268).
 */

import { type DryRunEntry, getDryRunEntries, removeDryRunEntries } from './dryRun';
import { fetchEvents } from './fetch';
import type { SignedEvent } from './index';
import { publishSignedEvents, type SignedPublishResult } from './publishSigned';

/**
 * An addressable or replaceable event's address, `<kind>:<pubkey>:<d-tag>` (`<kind>:<pubkey>:`
 * for replaceable kinds); undefined for other kinds
 */
export function addressOf(
  event: Pick<SignedEvent, 'kind' | 'pubkey' | 'tags'>
): string | undefined {
  const { kind, pubkey } = event;
  if (kind >= 30000 && kind < 40000) {
    return `${kind}:${pubkey}:${event.tags.find((t) => t[0] === 'd')?.[1] ?? ''}`;
  }
  const replaceable = kind === 0 || kind === 3 || (kind >= 10000 && kind < 20000);
  return replaceable ? `${kind}:${pubkey}:` : undefined;
}

/**
 * The logged events, once each with every relay it was logged for (each relay of
 * `publishToRelay` logs it again), newest first
 */
export function dryRunEvents(entries: DryRunEntry[] = getDryRunEntries()): DryRunEntry[] {
  const byId = new Map<string, DryRunEntry>();
  for (const { event, relays } of entries) {
    const known = byId.get(event.id);
    byId.set(event.id, {
      event,
      relays: [...new Set([...(known?.relays ?? []), ...relays])],
    });
  }
  return [...byId.values()].sort((a, b) => b.event.created_at - a.event.created_at);
}

/** The logged events `event` links: by address (`a`, `A` tags) and by id (`e`, `E` tags) */
const linkedLogged = (
  event: SignedEvent,
  byAddress: Map<string, DryRunEntry>,
  byId: Map<string, DryRunEntry>
): DryRunEntry[] =>
  event.tags.flatMap((t) => {
    const [name = '', value = ''] = t;
    const linked = /^[aA]$/.test(name)
      ? byAddress.get(value)
      : /^[eE]$/.test(name)
        ? byId.get(value)
        : undefined;
    return linked ? [linked] : [];
  });

/**
 * A logged post and the logged events it links, transitively (by address the newest logged
 * version), the post first; [] when `id` isn't logged
 */
export function dryRunBundle(id: string, entries: DryRunEntry[] = dryRunEvents()): DryRunEntry[] {
  const merged = dryRunEvents(entries);
  const byId = new Map(merged.map((e) => [e.event.id, e]));
  const byAddress = new Map<string, DryRunEntry>();
  // Oldest first, so the newest version of an address wins
  for (const entry of [...merged].reverse()) {
    const address = addressOf(entry.event);
    if (address) byAddress.set(address, entry);
  }
  const start = byId.get(id);
  const bundle: DryRunEntry[] = [];
  const queue = start ? [start] : [];
  for (let entry = queue.shift(); entry; entry = queue.shift()) {
    if (bundle.includes(entry)) continue;
    bundle.push(entry);
    queue.push(...linkedLogged(entry.event, byAddress, byId));
  }
  return bundle;
}

/**
 * The ids of the logged addressable events the relays already have in a newer version (sending
 * them is harmless, relays keep the newest, but pointless). Logged events aren't counted.
 */
export async function newerOnRelays(entries: DryRunEntry[]): Promise<Set<string>> {
  const addressed = entries.flatMap((entry) => {
    const address = addressOf(entry.event);
    return address ? [{ entry, address }] : [];
  });
  if (addressed.length === 0) return new Set();
  const filters = addressed.map(({ entry }) => ({
    kinds: [entry.event.kind],
    authors: [entry.event.pubkey],
    ...(entry.event.kind >= 30000
      ? { '#d': [entry.event.tags.find((t) => t[0] === 'd')?.[1] ?? ''] }
      : {}),
  }));
  const relays = [...new Set(entries.flatMap((e) => e.relays))];
  const logged = new Set(getDryRunEntries().map((e) => e.event.id));
  const found = (await fetchEvents(filters, relays, { waitForAll: true }).catch(
    () => []
  )) as SignedEvent[];
  const newest = new Map<string, number>();
  for (const event of found) {
    const address = addressOf(event);
    if (!address || logged.has(event.id)) continue;
    newest.set(address, Math.max(newest.get(address) ?? 0, event.created_at));
  }
  return new Set(
    addressed
      .filter(({ entry, address }) => (newest.get(address) ?? 0) > entry.event.created_at)
      .map(({ entry }) => entry.event.id)
  );
}

/** How publishing a logged event for real went */
export type DryRunPublishResult = SignedPublishResult;

/**
 * Sends logged events to the relays they were logged for, also in dry-run mode, linked events
 * before the posts that link them (a bundle's order reversed); removes the published ones from
 * the log. `fallbackRelays` for events logged without relays.
 */
export async function publishDryRunEntries(
  entries: DryRunEntry[],
  fallbackRelays?: string[]
): Promise<DryRunPublishResult[]> {
  const results = await publishSignedEvents(entries, { fallbackRelays, ignoreDryRun: true });
  removeDryRunEntries(results.filter((r) => r.ok).map((r) => r.id));
  return results;
}
