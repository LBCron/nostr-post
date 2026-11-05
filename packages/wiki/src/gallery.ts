/**
 * The photos of everything linked to a wiki entity (`wikiConfig.gallery`), e.g. a venue's
 * photos from its photo posts, reviews, events and comments: every post with an `a` tag to any
 * version of the entity's page, whatever its kind or manifest, and the page itself. Each kind
 * keeps its photos elsewhere: `imeta` tags (NIP-92, NIP-68 pictures), `image` / `thumb` tags
 * (articles, calendar events), image `r` tags, image links in the text, and image URLs in
 * structured (JSON) content. The same photo in several posts shows once (by its hash).
 */

import { blossomHash } from '@nostr-post/core/blossom';
import { readImeta } from '@nostr-post/core/imeta';
import type { NostrPostManifest } from '@nostr-post/core/types';
import { fetchEvents } from '@nostr-post/signer';
import { fetchEntityVersions } from './fetch';
import { DEFAULT_WIKI_RELAYS, WIKI_KIND } from './nip54';
import { collectEntityATags, defaultResolver, type WikiEvent } from './resolver';

/** A page's photo gallery (`wikiConfig.gallery`) */
export interface WikiGalleryConfig {
  /** Heading; default "Photos" (the messages' `photos`) */
  label?: string;
  /**
   * Kinds whose photos count, e.g. `[20, 1, 1111]`; default every kind linking the page except
   * other wiki pages (a beer's label isn't a photo of its brewery)
   */
  kinds?: number[];
  /** Photos shown at first (default 12); "Show more" shows more */
  limit?: number;
  /**
   * An "Add photo" button: the composer of this manifest (its id, a published manifest's
   * `30078:` address, or the manifest), with `field` filled with a link to the page
   */
  add?: { manifest: string | NostrPostManifest; field: string };
}

/** How many linking posts a gallery reads */
export const GALLERY_POSTS_LIMIT = 500;

/** Relays may cap how many values one filter takes: ask in batches */
const BATCH = 50;

/** One photo, and the post it's from */
export interface GalleryPhoto {
  url: string;
  /** The file's sha256, if the post or its Blossom URL tells */
  sha256?: string;
  alt?: string;
  /** `1200x800` */
  dim?: string;
  /** The post */
  event: Pick<WikiEvent, 'id' | 'pubkey' | 'kind' | 'created_at' | 'tags'>;
}

const IMAGE_URL = /^https?:\/\/[^\s"'<>]+\.(jpe?g|png|gif|webp|avif)(\?[^\s"'<>]*)?$/i;
const URLS = /https?:\/\/[^\s"'<>]+/gi;

/** Whether a URL is an image file (by its extension) */
export const isImageFileUrl = (url: string): boolean => IMAGE_URL.test(url);

/** Image URLs among the strings of structured content (NIP-78 JSON), at any depth */
const jsonImages = (value: unknown): string[] => {
  if (typeof value === 'string') return isImageFileUrl(value) ? [value] : [];
  if (Array.isArray(value)) return value.flatMap(jsonImages);
  if (value && typeof value === 'object') return Object.values(value).flatMap(jsonImages);
  return [];
};

/** Image URLs in a post's content: links in text, or image URLs in JSON */
const contentImages = (content: string): string[] => {
  const text = content.trim();
  if (text.startsWith('{') || text.startsWith('[')) {
    try {
      return jsonImages(JSON.parse(text));
    } catch {
      // Not JSON: links in the text
    }
  }
  return (text.match(URLS) ?? []).filter(isImageFileUrl);
};

/** A photo from an `imeta` tag, if it's an image (by its type, else its extension) */
const imetaPhoto = (tag: string[]): Omit<GalleryPhoto, 'event'> | undefined => {
  const info = readImeta(tag);
  if (!info) return undefined;
  const isImage = info.type ? info.type.startsWith('image/') : isImageFileUrl(info.url);
  if (!isImage) return undefined;
  const { url, sha256, alt, dim } = info;
  return { url, ...(sha256 ? { sha256 } : {}), ...(alt ? { alt } : {}), ...(dim ? { dim } : {}) };
};

/** A photo from a tag: an image `imeta`, `image`, `thumb`, or an image `r` */
const tagPhoto = (tag: string[]): Omit<GalleryPhoto, 'event'> | undefined => {
  if (tag[0] === 'imeta') return imetaPhoto(tag);
  const url = tag[1];
  if (!url) return undefined;
  if (tag[0] === 'image' || tag[0] === 'thumb')
    return /^https?:\/\//.test(url) ? { url } : undefined;
  return tag[0] === 'r' && isImageFileUrl(url) ? { url } : undefined;
};

/** A post's photos, in order, each once (its tags' first, then the content's) */
export function eventPhotos(event: GalleryPhoto['event'] & { content: string }): GalleryPhoto[] {
  const { id, pubkey, kind, created_at, tags } = event;
  const source = { id, pubkey, kind, created_at, tags };
  const fromTags = tags.flatMap((tag) => tagPhoto(tag) ?? []);
  const fromContent: Omit<GalleryPhoto, 'event'>[] = contentImages(event.content).map((url) => ({
    url,
  }));
  const seen = new Set<string>();
  return [...fromTags, ...fromContent].flatMap((photo) => {
    if (seen.has(photo.url)) return [];
    seen.add(photo.url);
    const sha256 = photo.sha256 ?? blossomHash(photo.url);
    return [{ ...photo, ...(sha256 ? { sha256 } : {}), event: source }];
  });
}

/** The photos of the posts, newest post first; the same file (hash, else URL) once */
export function galleryPhotos(
  events: (GalleryPhoto['event'] & { content: string })[]
): GalleryPhoto[] {
  const seen = new Set<string>();
  return [...events]
    .sort((a, b) => b.created_at - a.created_at)
    .flatMap(eventPhotos)
    .filter((photo) => {
      const key = photo.sha256 ?? photo.url;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

/** Relay filter for posts linking these entity addresses; `kinds` undefined: any kind */
export function linkingFilter(
  addresses: string[],
  limit: number,
  kinds?: number[]
): Record<string, unknown> {
  return { ...(kinds ? { kinds } : {}), '#a': addresses, limit };
}

/**
 * Every post linking the entity at `dTag` (any version of its page), newest first, without the
 * page's own versions; `versions` are the page's versions. The query #215's "other posts"
 * section can share.
 */
export async function fetchLinkingPosts(
  dTag: string,
  {
    kinds,
    limit = GALLERY_POSTS_LIMIT,
    relays = DEFAULT_WIKI_RELAYS,
  }: { kinds?: number[]; limit?: number; relays?: string[] } = {}
): Promise<{ versions: WikiEvent[]; posts: WikiEvent[] }> {
  const versions = await fetchEntityVersions(dTag, relays);
  const addresses = collectEntityATags(versions);
  const batches = Array.from({ length: Math.ceil(addresses.length / BATCH) }, (_, i) =>
    addresses.slice(i * BATCH, (i + 1) * BATCH)
  );
  const found = await Promise.all(
    batches.map(
      (batch) =>
        fetchEvents(linkingFilter(batch, limit, kinds) as never, relays, {
          waitForAll: true,
        }) as unknown as Promise<WikiEvent[]>
    )
  );
  const own = new Set(versions.map((v) => v.id));
  const posts = [...new Map(found.flat().map((e) => [e.id, e])).values()]
    .filter((e) => !own.has(e.id))
    .sort((a, b) => b.created_at - a.created_at)
    .slice(0, limit);
  return { versions, posts };
}

/**
 * The entity's photos: its page's own (its newest version), then those of the posts linking it
 * (`config.kinds`, default every kind but other wiki pages)
 */
export async function fetchGalleryPhotos(
  dTag: string,
  config: WikiGalleryConfig = {},
  relays: string[] = DEFAULT_WIKI_RELAYS
): Promise<GalleryPhoto[]> {
  const { versions, posts } = await fetchLinkingPosts(dTag, { kinds: config.kinds, relays });
  const page = defaultResolver(versions);
  const linking = config.kinds ? posts : posts.filter((e) => e.kind !== WIKI_KIND);
  const pagePhotos = page ? eventPhotos(page) : [];
  const known = new Set(pagePhotos.map((p) => p.sha256 ?? p.url));
  return [...pagePhotos, ...galleryPhotos(linking).filter((p) => !known.has(p.sha256 ?? p.url))];
}

/**
 * A field value linking the entity's page, for the "Add photo" composer's `add.field`: both a
 * picked entity's shape (wiki-entity picker: `dTag`, `resolvedPubkey`) and a venue's
 * (`wikiEntity`), so either field type takes it
 */
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
