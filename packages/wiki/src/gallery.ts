/**
 * A wiki page's gallery (`wikiConfig.gallery`): the photos and videos of the page and of every
 * post linking any version of it, shown by `<np-media-gallery>` (`@nostr-post/plugin-media`),
 * with an optional "Add" composer linking the page.
 */

import type { NostrPostManifest } from '@nostr-post/core/types';
import { fetchReferences, REFERENCES_LIMIT } from '@nostr-post/posts';
import { fetchEntityVersions } from './fetch';
import { DEFAULT_WIKI_RELAYS } from './nip54';
import { collectEntityATags, type WikiEvent } from './resolver';

/** A page's gallery (`wikiConfig.gallery`) */
export interface WikiGalleryConfig {
  /** Heading; default "Photos and videos" */
  label?: string;
  /**
   * Kinds whose photos and videos count, e.g. `[20, 21, 1]`; default every kind linking the page
   * except other wiki pages (a beer's label isn't a photo of its brewery)
   */
  kinds?: number[];
  /** Shown at first (default 12); "Show more" shows more */
  limit?: number;
  /**
   * An "Add" button: the composer of this manifest (its id, a published manifest's `30078:`
   * address, or the manifest), with `field` filled with a link to the page
   */
  add?: { manifest: string | NostrPostManifest; field: string };
}

/**
 * Every post linking the entity at `dTag` (any version of its page), newest first, and the
 * page's versions; `fetchReferences` over all versions' addresses
 */
export async function fetchLinkingPosts(
  dTag: string,
  {
    kinds,
    limit = REFERENCES_LIMIT,
    relays = DEFAULT_WIKI_RELAYS,
  }: { kinds?: number[]; limit?: number; relays?: string[] } = {}
): Promise<{ versions: WikiEvent[]; posts: WikiEvent[] }> {
  const versions = await fetchEntityVersions(dTag, relays);
  const { posts } = await fetchReferences(collectEntityATags(versions), {
    kinds,
    limit,
    relays,
    loadTargets: false,
  });
  return { versions, posts: posts as WikiEvent[] };
}

/**
 * A field value linking the entity's page, for the "Add" composer's `add.field`: both a picked
 * entity's shape (wiki-entity picker: `dTag`, `resolvedPubkey`) and a venue's (`wikiEntity`),
 * so either field type takes it
 */
export const pageLinkValue = (
  page: Pick<WikiEvent, 'pubkey' | 'tags'>
): Record<string, unknown> => {
  const dTag = page.tags.find((t) => t[0] === 'd')?.[1] ?? '';
  const title = page.tags.find((t) => t[0] === 'title')?.[1];
  return {
    dTag,
    resolvedPubkey: page.pubkey,
    externalIds: [],
    ...(title ? { title, name: title } : {}),
    wikiEntity: { pubkey: page.pubkey, dTag },
  };
};
