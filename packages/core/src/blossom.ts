/**
 * @nostr-post/core - Blossom (media servers addressed by hash), without dependencies
 *
 * A Blossom server stores a file under its sha256: `<server>/<sha256>.<ext>` (BUD-01), so its URL
 * is known before the upload and the same file can be found on any other server by its hash.
 * Uploads are authorized by a signed kind 24242 event scoped to the file's hash (BUD-02); a
 * user's servers are listed in their kind 10063 event (BUD-03).
 */

/** Blossom authorization event (BUD-01/02) */
export const BLOSSOM_AUTH_KIND = 24242;

/** A user's Blossom servers, in order of preference (BUD-03) */
export const BLOSSOM_SERVER_LIST_KIND = 10063;

/** An http(s) URL's origin and path, without query or fragment (core has no URL type) */
const URL_PARTS = /^(https?:\/\/[^/?#]+)([^?#]*)/i;

const HASH_IN_PATH = /\/([0-9a-f]{64})(\.[a-z0-9]+)?$/i;

const hashPart = (url: string) => HASH_IN_PATH.exec(URL_PARTS.exec(url)?.[2] ?? '');

/** The sha256 a Blossom URL names (its last path segment), lowercase; undefined for others */
export const blossomHash = (url: string): string | undefined => hashPart(url)?.[1]?.toLowerCase();

/** A server URL without trailing slashes, e.g. `https://blossom.example` */
export const normalizeServer = (server: string): string => server.trim().replace(/\/+$/, '');

const EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'image/avif': 'avif',
  'image/heic': 'heic',
  'image/svg+xml': 'svg',
  'video/mp4': 'mp4',
  'video/webm': 'webm',
  'video/quicktime': 'mov',
  'audio/mpeg': 'mp3',
  'audio/ogg': 'ogg',
};

/** The usual file extension of a MIME type, without the dot; undefined when unknown */
export const extensionOf = (type: string | undefined): string | undefined =>
  type ? EXTENSIONS[type.toLowerCase()] : undefined;

/** The MIME type a file extension stands for, e.g. `jpg` → `image/jpeg` */
export const typeOfExtension = (extension: string): string | undefined => {
  const ext = extension.toLowerCase().replace(/^\./, '');
  if (ext === 'jpeg') return 'image/jpeg';
  return Object.entries(EXTENSIONS).find(([, e]) => e === ext)?.[0];
};

/** The URL of a file on a Blossom server: `<server>/<sha256>.<ext>` (no extension if unknown) */
export const blobUrl = (server: string, sha256: string, type?: string): string => {
  const ext = extensionOf(type);
  return `${normalizeServer(server)}/${sha256.toLowerCase()}${ext ? `.${ext}` : ''}`;
};

/**
 * The same file on other servers: for a Blossom URL, its hash (and extension) on each of
 * `servers` other than its own; [] for other URLs
 */
export const blossomFallbacks = (url: string, servers: readonly string[]): string[] => {
  const match = hashPart(url);
  const hash = match?.[1]?.toLowerCase();
  if (!hash) return [];
  const ext = match?.[2] ?? '';
  const own = URL_PARTS.exec(url)?.[1]?.toLowerCase() ?? '';
  const urls = servers
    .map(normalizeServer)
    .filter((server) => server && URL_PARTS.exec(server)?.[1]?.toLowerCase() !== own)
    .map((server) => `${server}/${hash}${ext}`);
  return [...new Set(urls)];
};

/** An unsigned event for a signer to sign */
export interface EventTemplate {
  kind: number;
  created_at: number;
  tags: string[][];
  content: string;
}

/**
 * The authorization of an upload (BUD-02): a kind 24242 event scoped to the file's hash,
 * valid until `expiration` (unix seconds). One signature serves retries and other servers.
 */
export const blossomUploadAuth = ({
  sha256,
  expiration,
  now = Math.floor(Date.now() / 1000),
  content = 'Upload a file',
}: {
  sha256: string;
  expiration: number;
  now?: number;
  content?: string;
}): EventTemplate => ({
  kind: BLOSSOM_AUTH_KIND,
  created_at: now,
  tags: [
    ['t', 'upload'],
    ['x', sha256.toLowerCase()],
    ['expiration', String(expiration)],
  ],
  content,
});

const BASE64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

/** UTF-8 bytes (core has no DOM or Node types for TextEncoder) */
const utf8 = (text: string): number[] =>
  [...text].flatMap((char) => {
    const c = char.codePointAt(0) as number;
    if (c < 0x80) return [c];
    if (c < 0x800) return [0xc0 | (c >> 6), 0x80 | (c & 63)];
    if (c < 0x10000) return [0xe0 | (c >> 12), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63)];
    return [0xf0 | (c >> 18), 0x80 | ((c >> 12) & 63), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63)];
  });

const base64 = (bytes: number[]): string => {
  let out = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const [a = 0, b = 0, c = 0] = [bytes[i], bytes[i + 1], bytes[i + 2]];
    const n = (a << 16) | (b << 8) | c;
    out += BASE64[(n >> 18) & 63];
    out += BASE64[(n >> 12) & 63];
    out += i + 1 < bytes.length ? BASE64[(n >> 6) & 63] : '=';
    out += i + 2 < bytes.length ? BASE64[n & 63] : '=';
  }
  return out;
};

/** The `Authorization` header of a signed event: `Nostr <base64 JSON>` (Blossom and NIP-98) */
export const nostrAuthorization = (signedEvent: unknown): string =>
  `Nostr ${base64(utf8(JSON.stringify(signedEvent)))}`;

/** What a Blossom server says about a stored file (its blob descriptor) */
export interface BlobDescriptor {
  url: string;
  sha256: string;
  size?: number;
  type?: string;
}

/** A blob descriptor from a server's JSON answer; undefined if it isn't one */
export const readBlobDescriptor = (json: unknown): BlobDescriptor | undefined => {
  const d = json as Partial<Record<keyof BlobDescriptor, unknown>> | null | undefined;
  if (typeof d?.url !== 'string' || typeof d.sha256 !== 'string') return undefined;
  return {
    url: d.url,
    sha256: d.sha256.toLowerCase(),
    ...(typeof d.size === 'number' ? { size: d.size } : {}),
    ...(typeof d.type === 'string' && d.type ? { type: d.type } : {}),
  };
};

/** The servers of a kind 10063 list, in its order */
export const blossomServersOf = (event: { kind: number; tags: string[][] }): string[] =>
  event.kind === BLOSSOM_SERVER_LIST_KIND
    ? [
        ...new Set(
          event.tags
            .filter((t) => t[0] === 'server' && /^https?:\/\//.test(t[1] ?? ''))
            .map((t) => normalizeServer(t[1] as string))
        ),
      ]
    : [];
