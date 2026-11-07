/** The app's pages, as hash routes (a static site: any path serves the same page) */

import { decodeNaddr, encodeNaddr } from '@nostr-post/core/nip19';

export type Route =
  | { page: 'browse'; query: string }
  | { page: 'event'; address: string }
  | { page: 'artist'; dTag: string }
  | { page: 'artist-new'; name?: string }
  | { page: 'artist-edit'; dTag: string; additions?: Record<string, unknown> }
  | { page: 'add'; draftId?: string }
  | { page: 'mine' }
  | { page: 'outbox' }
  | { page: 'import' };

/** `?add=<JSON>` of a route, if valid */
const additionsOf = (query: string | undefined): Record<string, unknown> | undefined => {
  try {
    const value: unknown = JSON.parse(new URLSearchParams(query ?? '').get('add') ?? 'null');
    return value && typeof value === 'object' ? (value as Record<string, unknown>) : undefined;
  } catch {
    return undefined;
  }
};

const decode = (part: string | undefined) => decodeURIComponent(part ?? '');

/** Pages with a fixed link */
const FIXED: Record<string, Route> = {
  '#/add': { page: 'add' },
  '#/mine': { page: 'mine' },
  '#/outbox': { page: 'outbox' },
  '#/import': { page: 'import' },
};

/** The page a hash shows; anything unknown is browsing */
export const routeOf = (hash: string): Route => {
  let m = hash.match(/^#\/event\/(.+)$/);
  if (m) {
    const id = m[1] ?? '';
    const address = id.startsWith('naddr1') ? decodeNaddr(id) : decode(id);
    return { page: 'event', address: address ?? '' };
  }
  m = hash.match(/^#\/artist\/(.+)$/);
  if (m) return { page: 'artist', dTag: decode(m[1]) };
  m = hash.match(/^#\/artist-new(?:\/(.+))?$/);
  if (m) return { page: 'artist-new', name: m[1] ? decode(m[1]) : undefined };
  m = hash.match(/^#\/artist-edit\/([^?]+)(?:\?(.*))?$/);
  if (m) return { page: 'artist-edit', dTag: decode(m[1]), additions: additionsOf(m[2]) };
  m = hash.match(/^#\/add\?draft=(.+)$/);
  if (m) return { page: 'add', draftId: decode(m[1]) };
  return FIXED[hash] ?? { page: 'browse', query: hash.split('?')[1] ?? '' };
};

/** A gig's page */
export const eventLink = (address: string): string =>
  `#/event/${encodeNaddr(address) ?? encodeURIComponent(address)}`;

/** A musician's page */
export const artistLink = (dTag: string): string => `#/artist/${encodeURIComponent(dTag)}`;

/** Editing a musician's page, with `additions` (e.g. a gig's new links) added to it */
export const artistEditLink = (dTag: string, additions?: Record<string, unknown>): string =>
  `#/artist-edit/${encodeURIComponent(dTag)}${
    additions ? `?add=${encodeURIComponent(JSON.stringify(additions))}` : ''
  }`;

/** Editing a draft from the outbox in the Add a gig page */
export const draftLink = (id: string): string => `#/add?draft=${encodeURIComponent(id)}`;
