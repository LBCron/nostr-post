/**
 * A wiki page's gallery in <nostr-wiki-view> (the manifest's `gallery`): `<np-media-gallery>`
 * (`@nostr-post/plugin-media`) over every version of the page and the posts linking them, with
 * "Add" opening the configured manifest's composer, the page linked.
 */

import '@nostr-post/plugin-media/web';
import type { GalleryConfig } from '@nostr-post/core/types';
import { html, type nothing, type TemplateResult } from 'lit';
import { pageLinkValue } from '../gallery';
import { WIKI_KIND } from '../nip54';
import { resolveEntityManifest } from '../registry';
import { collectEntityATags, type WikiEvent } from '../resolver';

export const renderWikiGallery = ({
  config,
  page,
  versions,
  relays,
}: {
  config: GalleryConfig;
  /** The page shown: its media first, and what "Add" links */
  page: WikiEvent;
  /** Every version of the page: posts linking any of them count */
  versions: WikiEvent[];
  relays: string[];
}): TemplateResult | typeof nothing => {
  const field = config.add?.field;
  return html`<np-media-gallery
    .targets=${collectEntityATags(versions.length > 0 ? versions : [page])}
    .events=${[page]}
    .config=${config}
    .excludeKinds=${config.kinds ? undefined : [WIKI_KIND]}
    .relays=${relays}
    .resolveManifest=${(ref: string) => resolveEntityManifest(ref, relays)}
    .addPrefill=${field ? { [field]: pageLinkValue(page) } : undefined}
  ></np-media-gallery>`;
};
