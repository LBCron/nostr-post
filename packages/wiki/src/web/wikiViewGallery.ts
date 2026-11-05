/**
 * A wiki page's gallery in <nostr-wiki-view> (`wikiConfig.gallery`): `<np-media-gallery>`
 * (`@nostr-post/plugin-media`) over every version of the page and the posts linking them, with
 * "Add" opening the configured manifest's composer, the page linked.
 */

import '@nostr-post/plugin-media/web';
import type { NostrPostManifest } from '@nostr-post/core/types';
import { html, type nothing, type TemplateResult } from 'lit';
import { pageLinkValue, type WikiGalleryConfig } from '../gallery';
import { WIKI_KIND } from '../nip54';
import { resolveEntityManifest } from '../registry';
import { collectEntityATags, type WikiEvent } from '../resolver';

/** The "Add" composer's manifest (an id, a `30078:` address or the manifest); undefined if none */
export const resolveGalleryAdd = (
  config: WikiGalleryConfig | undefined,
  relays?: string[]
): Promise<NostrPostManifest | undefined> =>
  config?.add ? resolveEntityManifest(config.add.manifest, relays) : Promise.resolve(undefined);

export const renderWikiGallery = ({
  config,
  page,
  versions,
  relays,
  addManifest,
}: {
  config: WikiGalleryConfig;
  /** The page shown: its media first, and what "Add" links */
  page: WikiEvent;
  /** Every version of the page: posts linking any of them count */
  versions: WikiEvent[];
  relays: string[];
  addManifest?: NostrPostManifest;
}): TemplateResult | typeof nothing => {
  const field = config.add?.field;
  return html`<np-media-gallery
    .targets=${collectEntityATags(versions.length > 0 ? versions : [page])}
    .events=${[page]}
    .kinds=${config.kinds}
    .excludeKinds=${config.kinds ? undefined : [WIKI_KIND]}
    .limit=${config.limit ?? 12}
    .label=${config.label}
    .relays=${relays}
    .addManifest=${addManifest}
    .addPrefill=${field ? { [field]: pageLinkValue(page) } : undefined}
  ></np-media-gallery>`;
};
