/** Template parts of <nostr-wiki-gallery>: the grid and the photo opened large */

import { encodeNaddr, encodeNevent, encodeNpub } from '@nostr-post/core/nip19';
import { html, nothing, type TemplateResult } from 'lit';
import type { GalleryPhoto } from '../gallery';
import type { WikiGalleryMessages } from './galleryMessages';

/** Where a photo's post opens (a NIP-19 link: naddr for addressable posts, else nevent) */
export const postLink = (photo: GalleryPhoto, base = 'https://njump.me/'): string => {
  const { id, pubkey, kind, tags } = photo.event;
  const dTag = tags.find((t) => t[0] === 'd')?.[1];
  const naddr =
    kind >= 30000 && kind < 40000 && dTag !== undefined
      ? encodeNaddr(`${kind}:${pubkey}:${dTag}`)
      : undefined;
  return `${base}${naddr ?? encodeNevent(id, { author: pubkey, kind }) ?? id}`;
};

/** A pubkey as its profile name, else a short npub */
export const authorName = (pubkey: string, names: ReadonlyMap<string, string>): string => {
  const name = names.get(pubkey);
  if (name) return name;
  const npub = encodeNpub(pubkey) ?? pubkey;
  return `${npub.slice(0, 12)}…`;
};

const date = (photo: GalleryPhoto) => new Date(photo.event.created_at * 1000).toLocaleDateString();

export const renderGrid = (
  photos: GalleryPhoto[],
  names: ReadonlyMap<string, string>,
  m: WikiGalleryMessages,
  onOpen: (photo: GalleryPhoto) => void
): TemplateResult => html`<div class="grid">
  ${photos.map((photo) => {
    const author = authorName(photo.event.pubkey, names);
    return html`<button type="button" class="thumb" @click=${() => onOpen(photo)}>
      <img
        src=${photo.url}
        alt=${photo.alt ?? m.photoAlt(author)}
        loading="lazy"
        referrerpolicy="no-referrer"
      />
    </button>`;
  })}
</div>`;

export const renderLightbox = (
  photo: GalleryPhoto | undefined,
  names: ReadonlyMap<string, string>,
  m: WikiGalleryMessages,
  onClose: () => void
): TemplateResult | typeof nothing => {
  if (!photo) return nothing;
  const author = authorName(photo.event.pubkey, names);
  return html`<figure class="large">
    <img src=${photo.url} alt=${photo.alt ?? m.photoAlt(author)} referrerpolicy="no-referrer" />
    <figcaption>
      ${photo.alt ? html`<div class="alt">${photo.alt}</div>` : nothing}
      <div class="byline">${m.byline(author, date(photo))}</div>
      <a href=${postLink(photo)} target="_blank" rel="noopener noreferrer">${m.openPost}</a>
      <button type="button" class="close" @click=${onClose}>${m.close}</button>
    </figcaption>
  </figure>`;
};
