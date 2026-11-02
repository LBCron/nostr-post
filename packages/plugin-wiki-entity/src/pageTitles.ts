/**
 * @nostr-post/plugin-wiki-entity - The pages a picker's value links, and their titles: what a
 * post's view lists (`<np-wiki-entity-view>`), framework-free.
 */

import { fetchEvents } from '@nostr-post/signer';
import { WIKI_KIND } from '@nostr-post/wiki';
import { pickedEntities, type WikiEntityData } from './core';

/** The entities with a page, once each */
export const linkedEntities = (value: unknown): WikiEntityData[] => {
  const linked = pickedEntities(value as WikiEntityData | WikiEntityData[] | null).filter(
    (e) => !e.unlinked && e.dTag
  );
  return linked.filter((e, i) => linked.findIndex((o) => o.dTag === e.dTag) === i);
};

/** The pages' titles by d-tag, from one request for all of them; d-tags without one are left out */
export async function pageTitles(
  entities: WikiEntityData[],
  relays: string[]
): Promise<Map<string, string>> {
  if (!entities.length) return new Map();
  const events = await fetchEvents(
    [{ kinds: [WIKI_KIND], '#d': entities.map((e) => e.dTag) }],
    relays
  ).catch(() => []);
  const titles = new Map<string, string>();
  // The newest version's title of each d-tag
  for (const event of [...events].sort((a, b) => a.created_at - b.created_at)) {
    const dTag = event.tags.find((t) => t[0] === 'd')?.[1];
    const title = event.tags.find((t) => t[0] === 'title')?.[1];
    if (dTag && title) titles.set(dTag, title);
  }
  return titles;
}
