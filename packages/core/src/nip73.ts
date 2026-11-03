/**
 * @nostr-post/core - NIP-73 external content IDs: the `k` tag next to `i` tags
 *
 * NIP-73 pairs each `i` tag (an external ID) with a `k` tag naming its kind, so relays can
 * return every event about, e.g., any country (`#k: ["iso3166"]`). The kind is the ID's
 * prefix: `iso3166:CZ` → `iso3166`, `podcast:item:guid:…` → `podcast:item:guid`; a URL is
 * `web`, a hashtag (`#topic`) is `#`. Our own namespaces follow the same rule (`osm:node:123` →
 * `osm:node`, `gcid:…` → `gcid`).
 */

type Tag = [string, ...string[]];

/** The NIP-73 kind of an external ID (an `i` tag value); undefined when it has none */
export const externalIdKind = (id: string): string | undefined => {
  if (/^https?:\/\//i.test(id)) return 'web';
  if (id.startsWith('#')) return id.length > 1 ? '#' : undefined;
  const last = id.lastIndexOf(':');
  return last > 0 ? id.slice(0, last) : undefined;
};

/** The tags with a `k` tag for each kind of their `i` tags that has none yet, after the others */
export const withExternalIdKinds = <T extends readonly string[]>(tags: T[]): (T | Tag)[] => {
  const kinds = new Set(tags.filter((t) => t[0] === 'k' && t[1]).map((t) => t[1] as string));
  const added: Tag[] = [];
  for (const tag of tags) {
    if (tag[0] !== 'i' || !tag[1]) continue;
    const kind = externalIdKind(tag[1]);
    if (!kind || kinds.has(kind)) continue;
    kinds.add(kind);
    added.push(['k', kind]);
  }
  return added.length ? [...tags, ...added] : tags;
};
