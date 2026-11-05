/**
 * @nostr-post/core - Media metadata tags (NIP-92 `imeta`), without dependencies
 *
 * `["imeta", "url https://…", "m image/jpeg", "x <sha256>", "dim 1200x800", "alt …"]`: what a
 * post says about each media file it links (NIP-92 for notes, NIP-68 pictures require them).
 */

/** What is known about a media file */
export interface MediaFileInfo {
  url: string;
  /** MIME type (`m`) */
  type?: string;
  /** sha256 of the file as served (`x`) */
  sha256?: string;
  /** Bytes */
  size?: number;
  /** `<width>x<height>` in pixels */
  dim?: string;
  /** A description for people who can't see it */
  alt?: string;
  blurhash?: string;
  /** A preview image, e.g. a video's thumbnail (NIP-71) */
  image?: string;
  /** Seconds, for videos and audio (NIP-71) */
  duration?: number;
}

const FIELDS: [keyof MediaFileInfo, string][] = [
  ['url', 'url'],
  ['type', 'm'],
  ['sha256', 'x'],
  ['size', 'size'],
  ['dim', 'dim'],
  ['blurhash', 'blurhash'],
  ['image', 'image'],
  ['duration', 'duration'],
  ['alt', 'alt'],
];

/** Properties stored as numbers */
const NUMERIC = new Set<keyof MediaFileInfo>(['size', 'duration']);

/** The `imeta` tag of a file: one `<key> <value>` entry per known property */
export const imetaTag = (info: MediaFileInfo): [string, ...string[]] => [
  'imeta',
  ...FIELDS.flatMap(([prop, key]) => {
    const value = info[prop];
    return value === undefined || value === '' ? [] : [`${key} ${value}`];
  }),
];

/** An `imeta` tag's entries by key (the first of each), `"m image/png"` → `m` → `image/png` */
const imetaEntries = (tag: readonly string[]): Map<string, string> => {
  const entries = new Map<string, string>();
  for (const entry of tag.slice(1)) {
    const space = entry.indexOf(' ');
    const key = entry.slice(0, space);
    if (space > 0 && !entries.has(key)) entries.set(key, entry.slice(space + 1).trim());
  }
  return entries;
};

/** A file from an `imeta` tag; undefined without a url */
export const readImeta = (tag: readonly string[]): MediaFileInfo | undefined => {
  if (tag[0] !== 'imeta') return undefined;
  const entries = imetaEntries(tag);
  const url = entries.get('url');
  if (!url) return undefined;
  const info: MediaFileInfo = { url };
  for (const [prop, key] of FIELDS) {
    const value = entries.get(key);
    if (prop === 'url' || value === undefined) continue;
    if (!NUMERIC.has(prop)) (info as unknown as Record<string, string>)[prop] = value;
    else if (Number.isFinite(Number(value)))
      (info as unknown as Record<string, number>)[prop] = Number(value);
  }
  return info;
};

/** The files of a post's `imeta` tags, in order */
export const imetaFiles = (tags: readonly (readonly string[])[]): MediaFileInfo[] =>
  tags.flatMap((tag) => readImeta(tag) ?? []);

/** `1200x800` */
export const dimOf = (width: number, height: number): string =>
  `${Math.round(width)}x${Math.round(height)}`;
