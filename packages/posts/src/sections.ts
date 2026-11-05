/**
 * A page's sections (`sections` of its manifest, `PostSection`): which posts referencing the
 * event each lists (kinds, manifests, tags, the event's `i` links, d-tag suffix), loaded and
 * matched here, framework-free; `<nostr-post-sections>` (`@nostr-post/web`) shows them. Also
 * a post's short text and a section's stats.
 */

import { eventUsesManifest } from '@nostr-post/core/nip78';
import { parsePostRoles } from '@nostr-post/core/postRoles';
import type { PostSection } from '@nostr-post/core/types';
import {
  DEFAULT_RELAYS,
  type FetchFilter,
  fetchEvents,
  type SignedEvent,
} from '@nostr-post/signer';
import { referenceFilters, targetFilters } from './references';
import { addressOf } from './threads';

/** What a page's sections reference: its addresses (every version), ids, and `i` links */
export interface SectionTarget {
  addresses: string[];
  ids: string[];
  links: string[];
}

/** How many posts a section reads when it filters or counts more than it lists */
export const SECTION_READ_LIMIT = 500;

const WIKI_KIND = 30818;
/** Never items: reactions and deletions */
const NOT_ITEMS = [5, 7];

/** The target of events (e.g. a wiki page's versions): their addresses or ids, and `i` links */
export const sectionTarget = (events: readonly SignedEvent[]): SectionTarget => ({
  addresses: [...new Set(events.flatMap((e) => addressOf(e) ?? []))],
  ids: events.filter((e) => !addressOf(e)).map((e) => e.id),
  links: [
    ...new Set(
      events.flatMap((e) => e.tags.filter((t) => t[0] === 'i' && t[1]).map((t) => t[1] as string))
    ),
  ],
});

/** How many posts to ask relays for: more when the section filters or counts on the client */
export const sectionReadLimit = (section: PostSection): number =>
  section.view === 'gallery' || section.stats || section.dTagSuffix || section.role
    ? SECTION_READ_LIMIT
    : Math.max((section.limit ?? 20) * 2, 50);

const BATCH = 50;

/** Relay filters for a section's posts: referencing the target, or with its `i` links */
export function sectionFilters(
  section: PostSection,
  target: SectionTarget,
  limit = sectionReadLimit(section)
): FetchFilter[] {
  const extra: Record<string, string[]> = {
    ...(section.manifests?.length ? { '#l': section.manifests } : {}),
    ...Object.fromEntries(Object.entries(section.tags ?? {}).map(([name, v]) => [`#${name}`, v])),
  };
  const references = referenceFilters([...target.addresses, ...target.ids], {
    kinds: section.kinds,
    limit,
  });
  const links = section.links
    ? Array.from({ length: Math.ceil(target.links.length / BATCH) }, (_, i) => ({
        ...(section.kinds ? { kinds: section.kinds } : {}),
        '#i': target.links.slice(i * BATCH, (i + 1) * BATCH),
        limit,
      }))
    : [];
  return [...references, ...links].map((filter) => ({ ...filter, ...extra }) as FetchFilter);
}

const dTagOf = (event: SignedEvent): string | undefined =>
  event.tags.find((t) => t[0] === 'd')?.[1];

/** Whether an event is one of the section's items (checked on the client: relays may not filter) */
export function matchesSection(
  event: SignedEvent,
  section: PostSection,
  target: SectionTarget
): boolean {
  if (NOT_ITEMS.includes(event.kind)) return false;
  if (section.kinds ? !section.kinds.includes(event.kind) : event.kind === WIKI_KIND) return false;
  if (
    section.manifests?.length &&
    !section.manifests.some((m) => eventUsesManifest(event.tags, m))
  ) {
    return false;
  }
  for (const [name, values] of Object.entries(section.tags ?? {})) {
    if (!event.tags.some((t) => t[0] === name && values.includes(t[1] ?? ''))) return false;
  }
  if (section.dTagSuffix && !dTagOf(event)?.endsWith(section.dTagSuffix)) return false;
  // Not the target itself (an earlier version of a page links the newer one, e.g.)
  const address = addressOf(event);
  return !(address ? target.addresses.includes(address) : target.ids.includes(event.id));
}

/**
 * The newest version of each item: per address, and per d-tag for wiki pages (every author's
 * version of a page is the same entity); newest first
 */
export const newestItems = (events: readonly SignedEvent[]): SignedEvent[] => {
  const byKey = new Map<string, SignedEvent>();
  for (const event of events) {
    const key = event.kind === WIKI_KIND ? `wiki:${dTagOf(event)}` : (addressOf(event) ?? event.id);
    const known = byKey.get(key);
    if (!known || event.created_at > known.created_at) byKey.set(key, event);
  }
  return [...byKey.values()].sort((a, b) => b.created_at - a.created_at);
};

/**
 * A section's items: the posts matching it (newest version each, newest first), after the
 * target's own events when `self` (given, else loaded). `matches` adds a page's own rule, e.g.
 * a wiki role.
 */
export async function fetchSection(
  section: PostSection,
  target: SectionTarget,
  {
    relays = DEFAULT_RELAYS,
    self,
    matches,
  }: {
    relays?: string[];
    /** The target's own events, if loaded (for `self`) */
    self?: SignedEvent[];
    matches?: (event: SignedEvent, section: PostSection) => boolean;
  } = {}
): Promise<SignedEvent[]> {
  const targets = [...target.addresses, ...target.ids];
  const [found, own] = await Promise.all([
    fetchEvents(sectionFilters(section, target), relays, { waitForAll: true }).catch(() => []),
    section.self && !self && targets.length > 0
      ? fetchEvents(targetFilters(targets), relays, { waitForAll: true }).catch(() => [])
      : Promise.resolve(self ?? []),
  ]);
  const items = newestItems(
    found.filter((e) => matchesSection(e, section, target) && (matches?.(e, section) ?? true))
  );
  return section.self ? [...newestItems(own), ...items] : items;
}

/** The number of posts and the average of a numeric tag (e.g. `rating`) among those that have it */
export function sectionStats(
  events: readonly SignedEvent[],
  tag: string
): { count: number; rated: number; average?: number } {
  // An empty value isn't a rating (Number('') would count it as 0)
  const values = events
    .map((e) => e.tags.find((t) => t[0] === tag)?.[1]?.trim())
    .filter((v): v is string => !!v)
    .map(Number)
    .filter((n) => Number.isFinite(n));
  const sum = values.reduce((a, b) => a + b, 0);
  return {
    count: events.length,
    rated: values.length,
    average: values.length > 0 ? sum / values.length : undefined,
  };
}

/** A short text for a listed post: kind 1 without role lines, JSON content its first text value */
export function postSnippet(
  event: Pick<SignedEvent, 'kind' | 'content' | 'tags'>,
  maxLength = 200
): string {
  let text = event.content;
  // Role lines (`Tasted at: nostr:naddr1…`) aren't part of the text
  if (event.kind === 1) text = parsePostRoles(event.content, []).text;
  else if (event.content.trim().startsWith('{')) {
    try {
      const data = JSON.parse(event.content) as Record<string, unknown>;
      text = String(Object.values(data).find((v) => typeof v === 'string') ?? '');
    } catch {
      // Not JSON: the content as is
    }
  }
  const title = event.tags.find((t) => t[0] === 'title')?.[1];
  const line = text.replace(/\s+/g, ' ').trim() || title || '';
  return line.length > maxLength ? `${line.slice(0, maxLength - 1)}…` : line;
}
