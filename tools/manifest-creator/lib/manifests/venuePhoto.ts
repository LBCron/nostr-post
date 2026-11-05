/**
 * Photos of a venue: a NIP-68 picture (kind 20) linking the venue's wiki page, shown in the
 * page's gallery (`wikiConfig.gallery` of the venue entity), which offers "Add photo" with it.
 */

import type { NostrPostManifest } from '@nostr-post/core/types';
import type { WikiGalleryConfig } from '@nostr-post/wiki';

export const VENUE_PHOTO_MANIFEST: NostrPostManifest = {
  id: 'venue-photo-v1',
  version: '1.0.0',
  publishFormats: [
    {
      id: 'picture',
      label: 'Picture (NIP-68)',
      description: 'A photo post (kind 20), shown by Nostr photo apps',
      kinds: [20],
      default: true,
    },
  ],
  fields: [
    {
      id: 'photos',
      type: 'string',
      uiPlugin: 'media',
      required: true,
      // One `imeta` tag per photo (url, type, hash, size, dimensions, description)
      mapTo: { kind: 20, target: 'tag', tagName: 'imeta' },
      metadata: {
        label: 'Photos',
        description: 'Photos of the place, inside or out, its food or drinks, its menu',
        accept: ['image/*'],
        maxFiles: 10,
        alt: true,
        allowUrl: false,
      },
    },
    {
      id: 'title',
      type: 'string',
      uiPlugin: 'text',
      mapTo: { kind: 20, target: 'tag', tagName: 'title' },
      metadata: { label: 'Title', placeholder: 'e.g. The terrace at sunset' },
    },
    {
      id: 'caption',
      type: 'string',
      uiPlugin: 'textarea',
      mapTo: { kind: 20, target: 'content' },
      metadata: { label: 'Caption' },
    },
    {
      id: 'venue',
      type: 'geo',
      uiPlugin: 'venue',
      required: true,
      // Link only: the venue's page as an `a` tag, no venue tags
      mapTo: { kind: 20, target: 'tag', tagName: 'a' },
      metadata: {
        label: 'Venue',
        description: 'Search OpenStreetMap for the place; its venue page is created or linked',
        providers: ['osm'],
        linkOnly: true,
        wikiEntity: 'venue-entity-v1',
      },
    },
    {
      id: 'tags',
      type: 'string',
      uiPlugin: 'hashtag',
      mapTo: { kind: 20, target: 'tag', tagName: 't' },
      metadata: { label: 'Tags', suggestions: ['food', 'drinks', 'interior', 'menu', 'outside'] },
    },
  ],
  metadata: {
    name: 'Venue photo',
    description:
      "Photos of a venue as a NIP-68 picture (kind 20), shown in the venue page's gallery",
    tags: ['venue', 'photo', 'nip68'],
  },
};

/** A venue page's gallery: photos of every post linking it, "Add photo" with VENUE_PHOTO_MANIFEST */
export const VENUE_GALLERY: WikiGalleryConfig = {
  add: { manifest: VENUE_PHOTO_MANIFEST.id, field: 'venue' },
};
