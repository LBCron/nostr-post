/**
 * The photos and videos of any post, wherever its kind keeps them, e.g. for a gallery of a
 * calendar event and its comments, or of everything linking a venue's page:
 * - `imeta` tags (NIP-92; NIP-68 pictures, kind 20; NIP-71 videos, kinds 21 and 22);
 * - `image` / `thumb` tags (articles, calendar events);
 * - `r` tags of image or video files;
 * - image and video links in the text, and image or video URLs in JSON content (NIP-78).
 * The same file in several posts counts once (by its hash, else its URL). No DOM dependencies.
 */

import { blossomHash } from '@nostr-post/core/blossom';
import { readImeta } from '@nostr-post/core/imeta';

/** NIP-68 picture */
export const PICTURE_KIND = 20;
/** NIP-71 video, and short (portrait) video */
export const VIDEO_KIND = 21;
export const SHORT_VIDEO_KIND = 22;

/** The part of a post a media item comes from */
export type MediaSource = {
  id: string;
  pubkey: string;
  kind: number;
  created_at: number;
  tags: string[][];
  content: string;
};

/** A photo or video, and the post it's from */
export interface MediaItem {
  url: string;
  media: 'image' | 'video';
  /** MIME type, if the post tells */
  type?: string;
  /** sha256 of the file, if the post or its Blossom URL tells */
  sha256?: string;
  alt?: string;
  /** `1200x800` */
  dim?: string;
  /** A video's thumbnail */
  image?: string;
  /** A video's length in seconds */
  duration?: number;
  /** The post */
  event: Omit<MediaSource, 'content'>;
}

const IMAGE_FILE = /^https?:\/\/[^\s"'<>]+\.(jpe?g|png|gif|webp|avif)(\?[^\s"'<>]*)?$/i;
const VIDEO_FILE = /^https?:\/\/[^\s"'<>]+\.(mp4|webm|mov|m4v)(\?[^\s"'<>]*)?$/i;
const URLS = /https?:\/\/[^\s"'<>]+/gi;

/** Whether a URL is an image file, by its extension */
export const isImageFileUrl = (url: string): boolean => IMAGE_FILE.test(url);
/** Whether a URL is a video file, by its extension */
export const isVideoFileUrl = (url: string): boolean => VIDEO_FILE.test(url);

type Found = Omit<MediaItem, 'event'>;

const byExtension = (url: string): Found | undefined => {
  if (isImageFileUrl(url)) return { url, media: 'image' };
  if (isVideoFileUrl(url)) return { url, media: 'video' };
  return undefined;
};

/** Media URLs among the strings of structured content (JSON), at any depth */
const jsonMedia = (value: unknown): Found[] => {
  if (typeof value === 'string') return byExtension(value) ? [byExtension(value) as Found] : [];
  if (Array.isArray(value)) return value.flatMap(jsonMedia);
  if (value && typeof value === 'object') return Object.values(value).flatMap(jsonMedia);
  return [];
};

/** Media in a post's content: links in the text, or URLs in JSON */
const contentMedia = (content: string): Found[] => {
  const text = content.trim();
  if (text.startsWith('{') || text.startsWith('[')) {
    try {
      return jsonMedia(JSON.parse(text));
    } catch {
      // Not JSON: links in the text
    }
  }
  return (text.match(URLS) ?? []).flatMap((url) => byExtension(url) ?? []);
};

/** What an `imeta` tag describes, if it's an image or a video (by its type, else its extension) */
const imetaMedia = (tag: string[]): Found | undefined => {
  const info = readImeta(tag);
  if (!info) return undefined;
  const media = info.type
    ? info.type.startsWith('image/')
      ? 'image'
      : info.type.startsWith('video/')
        ? 'video'
        : undefined
    : byExtension(info.url)?.media;
  if (!media) return undefined;
  const { blurhash: _b, size: _s, ...rest } = info;
  return { ...rest, media };
};

/** Media from a tag: `imeta`, `image` / `thumb`, or an `r` of an image or video file */
const tagMedia = (tag: string[]): Found | undefined => {
  if (tag[0] === 'imeta') return imetaMedia(tag);
  const url = tag[1];
  if (!url) return undefined;
  if (tag[0] === 'image' || tag[0] === 'thumb') {
    return /^https?:\/\//.test(url) ? { url, media: 'image' } : undefined;
  }
  return tag[0] === 'r' ? byExtension(url) : undefined;
};

/** A post's photos and videos, in order, each once (its tags' first, then its content's) */
export function eventMedia(event: MediaSource): MediaItem[] {
  const { content, ...source } = event;
  const seen = new Set<string>();
  return [...event.tags.flatMap((tag) => tagMedia(tag) ?? []), ...contentMedia(content)].flatMap(
    (item) => {
      if (seen.has(item.url)) return [];
      seen.add(item.url);
      const sha256 = item.sha256 ?? blossomHash(item.url);
      return [{ ...item, ...(sha256 ? { sha256 } : {}), event: source }];
    }
  );
}

/** The photos and videos of the posts, newest post first; the same file (hash, else URL) once */
export function mediaOfEvents(events: readonly MediaSource[]): MediaItem[] {
  const seen = new Set<string>();
  return [...events]
    .sort((a, b) => b.created_at - a.created_at)
    .flatMap(eventMedia)
    .filter((item) => {
      const key = item.sha256 ?? item.url;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}
