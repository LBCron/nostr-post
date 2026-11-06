/**
 * @nostr-post/plugin-wiki-entity - What a picker's value shows in a post's view
 * (`<np-wiki-entity-view>`), framework-free: the linked pages and their titles, the entities
 * without a page by name and links, and the event's other links.
 */

import { fetchEvents } from '@nostr-post/signer';
import { WIKI_KIND, type WikiEvent } from '@nostr-post/wiki';
import { pickedEntities, type WikiEntityData } from './core';
import { splitEventLinks } from './eventLinks';

/** The entities with a page, once each */
export const linkedEntities = (value: unknown): WikiEntityData[] => {
  const linked = pickedEntities(value as WikiEntityData | WikiEntityData[] | null).filter(
    (e) => !e.unlinked && e.dTag
  );
  return linked.filter((e, i) => linked.findIndex((o) => o.dTag === e.dTag) === i);
};

/** The pages of the entities, from one request for all of them */
export async function entityPages(
  entities: WikiEntityData[],
  relays: string[]
): Promise<WikiEvent[]> {
  if (!entities.length) return [];
  return (await fetchEvents(
    [{ kinds: [WIKI_KIND], '#d': entities.map((e) => e.dTag) }],
    relays
  ).catch(() => [])) as WikiEvent[];
}

/** The pages' titles by d-tag, the newest version's; d-tags without one are left out */
export const titlesOf = (pages: WikiEvent[]): Map<string, string> => {
  const titles = new Map<string, string>();
  for (const event of [...pages].sort((a, b) => a.created_at - b.created_at)) {
    const dTag = event.tags.find((t) => t[0] === 'd')?.[1];
    const title = event.tags.find((t) => t[0] === 'title')?.[1];
    if (dTag && title) titles.set(dTag, title);
  }
  return titles;
};

/** The pages' titles by d-tag, from one request for all of them */
export async function pageTitles(
  entities: WikiEntityData[],
  relays: string[]
): Promise<Map<string, string>> {
  return titlesOf(await entityPages(entities, relays));
}

const isWebLink = (id: string): boolean => /^https?:\/\/\S+$/.test(id);

/** What a view lists of a picker's value */
export interface EntityRows {
  /** The entities with a page */
  linked: WikiEntityData[];
  /** The entities without a page, by name, with their web links */
  named: { name: string; links: string[] }[];
  /** The event's web links that are none of the shown pages' (e.g. of artists the text names) */
  links: string[];
}

/**
 * The rows of a picker's value, with the loaded `pages`: their own links leave the event's
 * other links (`splitEventLinks`)
 */
export const entityRows = (value: unknown, pages: WikiEvent[] = []): EntityRows => {
  const values = splitEventLinks(pickedEntities(value), pages);
  const unlinked = values.filter((e) => e.unlinked);
  const linksOf = (e: WikiEntityData) => (e.externalIds ?? []).filter(isWebLink);
  return {
    linked: linkedEntities(values),
    named: unlinked.flatMap((e) =>
      e.displayName ? [{ name: e.displayName, links: linksOf(e) }] : []
    ),
    links: [...new Set(unlinked.filter((e) => !e.displayName).flatMap(linksOf))],
  };
};
