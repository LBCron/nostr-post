/**
 * @nostr-post/plugin-wiki-entity - What a picker's value shows in a post's view
 * (`<np-wiki-entity-view>`), framework-free: the linked pages and their titles, the entities
 * without a page by name and links, and the event's other links. A page of the entity type created
 * after the post, with one of their links (`i` tag), shows them as linked.
 */

import { fetchEvents } from '@nostr-post/signer';
import { type EntityTypeAffixes, WIKI_KIND, type WikiEvent } from '@nostr-post/wiki';
import { matchesEntityType, pickedEntities, type WikiEntityData } from './core';
import { splitEventLinks } from './eventLinks';

/** The entities with a page, once each */
export const linkedEntities = (value: unknown): WikiEntityData[] => {
  const linked = pickedEntities(value as WikiEntityData | WikiEntityData[] | null).filter(
    (e) => !e.unlinked && e.dTag
  );
  return linked.filter((e, i) => linked.findIndex((o) => o.dTag === e.dTag) === i);
};

/**
 * The pages a picker's value shows, from one request: the linked entities' (by d-tag), and those
 * with one of the other entities' links (`#i`), created after the post
 */
export async function entityPages(value: unknown, relays: string[]): Promise<WikiEvent[]> {
  const dTags = linkedEntities(value).map((e) => e.dTag);
  const ids = [
    ...new Set(
      pickedEntities(value)
        .filter((e) => e.unlinked)
        .flatMap((e) => e.externalIds ?? [])
    ),
  ];
  const filters = [
    ...(dTags.length ? [{ kinds: [WIKI_KIND], '#d': dTags }] : []),
    ...(ids.length ? [{ kinds: [WIKI_KIND], '#i': ids }] : []),
  ];
  if (!filters.length) return [];
  return (await fetchEvents(filters, relays).catch(() => [])) as WikiEvent[];
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
  return titlesOf(await entityPages(linkedEntities(entities), relays));
}

const dTagOf = (page: WikiEvent): string => page.tags.find((t) => t[0] === 'd')?.[1] ?? '';

/** The newest page of the type with one of `ids` (an `i` tag) */
const pageByLinks = (ids: string[], pages: WikiEvent[]): WikiEvent | undefined =>
  pages
    .filter((p) => p.tags.some((t) => t[0] === 'i' && ids.includes(t[1] ?? '')))
    .sort((a, b) => b.created_at - a.created_at)[0];

const asLinked = (page: WikiEvent, entity: WikiEntityData): WikiEntityData => ({
  dTag: dTagOf(page),
  resolvedPubkey: page.pubkey,
  externalIds: entity.externalIds,
  ...(entity.displayName ? { displayName: entity.displayName } : {}),
});

/**
 * Entities without a page, and the event's other links, as the pages of the type created later
 * with one of their links; the rest as they were
 */
const withLaterPages = (values: WikiEntityData[], pages: WikiEvent[]): WikiEntityData[] =>
  values.flatMap((entity) => {
    if (!entity.unlinked) return [entity];
    if (entity.displayName) {
      const page = pageByLinks(entity.externalIds, pages);
      return [page ? asLinked(page, entity) : entity];
    }
    // The nameless value's links: a page per link that has one, the links left stay
    const found = entity.externalIds.map((id) => pageByLinks([id], pages));
    const left = entity.externalIds.filter((_, i) => !found[i]);
    return [
      ...found.flatMap((page, i) =>
        page
          ? [
              asLinked(page, {
                ...entity,
                displayName: '',
                externalIds: [entity.externalIds[i] ?? ''],
              }),
            ]
          : []
      ),
      ...(left.length ? [{ ...entity, externalIds: left }] : []),
    ];
  });

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
 * The rows of a picker's value, with the loaded `pages` (`entityPages`): their own links leave
 * the event's other links (`splitEventLinks`); a page of the type (`affixes`) with an unlinked
 * entity's link shows it as linked
 */
export const entityRows = (
  value: unknown,
  pages: WikiEvent[] = [],
  affixes?: EntityTypeAffixes
): EntityRows => {
  const ofType = affixes ? pages.filter((p) => matchesEntityType(dTagOf(p), affixes)) : pages;
  const values = withLaterPages(splitEventLinks(pickedEntities(value), pages), ofType);
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
