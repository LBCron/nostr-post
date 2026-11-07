/** Template parts of <np-media-gallery>: the grid, and a photo or video opened large */

import { encodeNaddr, encodeNevent, encodeNpub } from '@nostr-post/core/nip19';
import { html, nothing, type TemplateResult } from 'lit';
import type { MediaItem } from '../eventMedia';
import type { MediaGalleryMessages } from './galleryMessages';

/** Where an item's post opens (a NIP-19 link: naddr for addressable posts, else nevent) */
export const postLink = (item: MediaItem, base = 'https://njump.me/'): string => {
  const { id, pubkey, kind, tags } = item.event;
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

const date = (item: MediaItem) => new Date(item.event.created_at * 1000).toLocaleDateString();

const tile = (item: MediaItem, alt: string, m: MediaGalleryMessages) => {
  if (item.media === 'image') {
    return html`<img src=${item.url} alt=${alt} loading="lazy" referrerpolicy="no-referrer" />`;
  }
  // A video: its thumbnail if the post has one, else its first frame
  const preview = item.image
    ? html`<img src=${item.image} alt=${alt} loading="lazy" referrerpolicy="no-referrer" />`
    : html`<video src=${item.url} preload="metadata" muted></video>`;
  return html`${preview}<span class="badge" aria-label=${m.video}>▶</span>`;
};

export const renderGrid = (
  items: MediaItem[],
  names: ReadonlyMap<string, string>,
  m: MediaGalleryMessages,
  onOpen: (item: MediaItem) => void
): TemplateResult => html`<div class="grid">
  ${items.map((item) => {
    const alt = item.alt ?? m.photoAlt(authorName(item.event.pubkey, names));
    return html`<button type="button" class="thumb" title=${alt} @click=${() => onOpen(item)}>
      ${tile(item, alt, m)}
    </button>`;
  })}
</div>`;

export const renderLarge = (
  item: MediaItem | undefined,
  names: ReadonlyMap<string, string>,
  m: MediaGalleryMessages,
  onClose: () => void
): TemplateResult | typeof nothing => {
  if (!item) return nothing;
  const author = authorName(item.event.pubkey, names);
  const alt = item.alt ?? m.photoAlt(author);
  return html`<figure class="large">
    ${
      item.media === 'video'
        ? html`<video src=${item.url} poster=${item.image ?? nothing} controls autoplay></video>`
        : html`<img src=${item.url} alt=${alt} referrerpolicy="no-referrer" />`
    }
    <figcaption>
      ${item.alt ? html`<div class="alt">${item.alt}</div>` : nothing}
      <div class="byline">${m.byline(author, date(item))}</div>
      <a href=${postLink(item)} target="_blank" rel="noopener noreferrer">${m.openPost}</a>
      <button type="button" class="close np-button np-text np-small" part="button" @click=${onClose}>${m.close}</button>
    </figcaption>
  </figure>`;
};
