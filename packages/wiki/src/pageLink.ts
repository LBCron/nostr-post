/**
 * A field value linking a wiki page, for a section's "Add" (`add.field` of `sections`): both a
 * picked entity's shape (wiki-entity picker: `dTag`, `resolvedPubkey`) and a venue's
 * (`wikiEntity`), so either field type takes it
 */

import type { WikiEvent } from './resolver';

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
