/**
 * Photos and videos of a venue: a NIP-68 picture (kind 20) or a NIP-71 video (kind 21, or 22 for a
 * short portrait one) linking the venue's wiki page, shown in the page's photos and videos
 * section (VENUE_SECTIONS), which offers "Add" with it.
 */

import type { NostrPostManifest, PostSection } from '@nostr-post/core/types';

const ALL = [20, 21, 22];

export const VENUE_MEDIA_MANIFEST: NostrPostManifest = {
  id: 'venue-media-v1',
  version: '1.0.0',
  publishFormats: [
    {
      id: 'picture',
      label: 'Photos',
      description: 'A photo post (NIP-68, kind 20), shown by Nostr photo apps',
      kinds: [20],
      default: true,
      userSelectable: true,
    },
    {
      id: 'video',
      label: 'Video',
      description: 'A video post (NIP-71, kind 21), shown by Nostr video apps',
      kinds: [21],
      userSelectable: true,
    },
    {
      id: 'short-video',
      label: 'Short video',
      description: 'A short portrait video (NIP-71, kind 22), like a story or reel',
      kinds: [22],
      userSelectable: true,
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
      id: 'video',
      type: 'string',
      uiPlugin: 'media',
      required: true,
      mapTo: [
        { kind: 21, target: 'tag', tagName: 'imeta' },
        { kind: 22, target: 'tag', tagName: 'imeta' },
      ],
      metadata: {
        label: 'Video',
        accept: ['video/*'],
        maxFiles: 1,
        maxSize: 100 * 1024 * 1024,
        allowUrl: false,
      },
    },
    {
      id: 'title',
      type: 'string',
      uiPlugin: 'text',
      mapTo: ALL.map((kind) => ({ kind, target: 'tag' as const, tagName: 'title' })),
      metadata: { label: 'Title', placeholder: 'e.g. The terrace at sunset' },
    },
    {
      id: 'caption',
      type: 'string',
      uiPlugin: 'textarea',
      mapTo: ALL.map((kind) => ({ kind, target: 'content' as const })),
      metadata: { label: 'Caption' },
    },
    {
      id: 'venue',
      type: 'geo',
      uiPlugin: 'venue',
      required: true,
      // Link only: the venue's page as an `a` tag, no venue tags
      mapTo: ALL.map((kind) => ({ kind, target: 'tag' as const, tagName: 'a' })),
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
      mapTo: ALL.map((kind) => ({ kind, target: 'tag' as const, tagName: 't' })),
      metadata: { label: 'Tags', suggestions: ['food', 'drinks', 'interior', 'menu', 'outside'] },
    },
  ],
  metadata: {
    name: 'Venue photos and videos',
    description:
      "Photos (NIP-68, kind 20) or a video (NIP-71, kind 21 or 22) of a venue, shown in the venue page's gallery",
    tags: ['venue', 'photo', 'video', 'nip68', 'nip71'],
  },
};

/**
 * A venue page's sections: photos and videos of everything linking it ("Add" with
 * VENUE_MEDIA_MANIFEST), its reviews ("Add" a review) and its upcoming events
 */
export const VENUE_SECTIONS: PostSection[] = [
  {
    id: 'media',
    label: 'Photos and videos',
    view: 'gallery',
    self: true,
    add: { manifest: VENUE_MEDIA_MANIFEST.id, field: 'venue' },
  },
  {
    id: 'reviews',
    label: 'Reviews',
    kinds: [1, 30078],
    manifests: ['venue-review-v1'],
    stats: { tag: 'rating', max: 5 },
    add: { manifest: 'venue-review-v1', field: 'venue' },
  },
  {
    id: 'events',
    label: 'Upcoming events',
    kinds: [31922, 31923],
    view: 'agenda',
    add: { manifest: 'calendar-event-venue-v1', field: 'location' },
  },
];
