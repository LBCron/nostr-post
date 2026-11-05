/**
 * A wiki page's sections in <nostr-wiki-view> (`sections` of its manifest): `<nostr-post-sections>`
 * (`@nostr-post/web`, loaded by the app: the wiki package can't depend on it, web depends on the
 * wiki through the venue plugin) over every version of the page, with the page itself for
 * `self` sections, the wiki's roles as its own rule, and "Add" linking the page. The gallery
 * view comes from `@nostr-post/plugin-media`.
 */

import '@nostr-post/plugin-media/web';
import type { PostSection } from '@nostr-post/core/types';
import { sectionTarget } from '@nostr-post/posts';
import type { SignedEvent } from '@nostr-post/signer';
import { html, nothing, type TemplateResult } from 'lit';
import { pageLinkValue } from '../gallery';
import { infoboxRowLinks, WIKI_KIND } from '../nip54';
import type { WikiEvent } from '../resolver';

/** A section's `role`: only wiki pages whose role row (that field) links this page */
export const roleFilter =
  (dTag: string) =>
  (event: SignedEvent, section: PostSection): boolean =>
    !section.role ||
    (event.kind === WIKI_KIND && infoboxRowLinks(event.content, section.role).includes(dTag));

export const renderWikiSections = ({
  sections,
  page,
  versions,
  relays,
}: {
  sections: PostSection[] | undefined;
  /** The page shown: `self` sections' own item, and what "Add" links */
  page: WikiEvent | undefined;
  /** Every version of the page: posts linking any of them count */
  versions: WikiEvent[];
  relays: string[];
}): TemplateResult | typeof nothing => {
  const dTag = page?.tags.find((t) => t[0] === 'd')?.[1];
  if (!sections?.length || !page || !dTag) return nothing;
  return html`<nostr-post-sections
    .sections=${sections}
    .target=${sectionTarget((versions.length > 0 ? versions : [page]) as SignedEvent[])}
    .self=${[page]}
    .linkValue=${pageLinkValue(page)}
    .itemFilter=${roleFilter(dTag)}
    .relays=${relays}
  ></nostr-post-sections>`;
};
