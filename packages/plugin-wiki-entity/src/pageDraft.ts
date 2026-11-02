/**
 * @nostr-post/plugin-wiki-entity - A page filled in in the picker's create dialog, published with
 * the post: the dialog doesn't publish it, the picked value becomes an unlinked entity with the
 * form as its `prefill` and `createPage`, and the post's publish creates the page and links it
 * (`createEntityPage`), as the venue hub does for venues. One signature per page, with the post.
 */

import type { NostrPostManifest } from '@nostr-post/core/types';
import { entityNameField, type WikiEntityData } from './core';

/** What the create dialog's `<nostr-wiki-composer>` submits (`nostr-wiki-submit`) */
export interface PageForm {
  event: { tags: string[][] };
  formData: Record<string, unknown>;
}

/**
 * The unlinked entity a filled-in create form stands for: named by its name field, with the page's
 * `i` tags (and those of the entity it `replaces`) and the form to create the page from
 */
export const entityFromPageForm = (
  manifest: NostrPostManifest,
  form: PageForm,
  replaces?: WikiEntityData
): WikiEntityData => {
  const nameField = entityNameField(manifest);
  const name = nameField ? form.formData[nameField] : undefined;
  const title = form.event.tags.find((t) => t[0] === 'title')?.[1];
  const ids = form.event.tags.filter((t) => t[0] === 'i' && t[1]).map((t) => t[1] as string);
  return {
    dTag: '',
    resolvedPubkey: '',
    externalIds: [...new Set([...ids, ...(replaces?.externalIds ?? [])])],
    displayName: (typeof name === 'string' && name.trim()) || title || replaces?.displayName,
    unlinked: true,
    prefill: { ...form.formData },
    createPage: true,
  };
};

/** The picked entities with `entity` in the place of `replaces`, else added */
export const withEntity = (
  picked: WikiEntityData[],
  entity: WikiEntityData,
  replaces?: WikiEntityData
): WikiEntityData[] =>
  replaces && picked.includes(replaces)
    ? picked.map((e) => (e === replaces ? entity : e))
    : [...picked, entity];
