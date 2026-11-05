/**
 * Where an upload goes, and what servers answer: Blossom servers (the user's own list first,
 * then the field's), then a NIP-96 endpoint (nostr.build by default) as the last resort.
 * Building requests and reading answers is here; sending them (with progress) is in `/web`.
 */

import {
  type BlobDescriptor,
  type EventTemplate,
  normalizeServer,
  readBlobDescriptor,
} from '@nostr-post/core/blossom';
import type { MediaFileInfo } from '@nostr-post/core/imeta';
import type { MediaPluginConfig, UploadFailureKind } from './core';

/** nostr.build's NIP-98 upload: free Nostr media hosting, the URL chosen by the server */
export const NOSTR_BUILD_UPLOAD = 'https://nostr.build/api/v2/upload/files';

/** A Blossom server (`PUT /upload`, the file's URL is its hash) or a NIP-96 / nostr.build endpoint */
export type UploadTarget = { type: 'blossom'; server: string } | { type: 'nip96'; url: string };

/**
 * The servers to try, in order: the user's Blossom servers (their kind 10063 list, unless the
 * field sets `userServers: false`), the field's `blossomServers`, then `uploadUrl` (default
 * nostr.build)
 */
export const uploadTargets = (
  config: MediaPluginConfig,
  userServers: readonly string[] = []
): UploadTarget[] => {
  const blossom = [
    ...new Set(
      [...(config.userServers === false ? [] : userServers), ...(config.blossomServers ?? [])]
        .map(normalizeServer)
        .filter((server) => /^https?:\/\//.test(server))
    ),
  ];
  return [
    ...blossom.map((server): UploadTarget => ({ type: 'blossom', server })),
    { type: 'nip96', url: config.uploadUrl ?? NOSTR_BUILD_UPLOAD },
  ];
};

/** The host a target uploads to, e.g. to tell the user where their files go */
export const targetHost = (target: UploadTarget): string => {
  const url = target.type === 'blossom' ? target.server : target.url;
  return /^https?:\/\/([^/?#]+)/i.exec(url)?.[1] ?? url;
};

/** A NIP-98 authorization of one request (kind 27235), for a signer to sign */
export const nip98AuthEvent = (
  url: string,
  method: string,
  now = Math.floor(Date.now() / 1000)
): EventTemplate => ({
  kind: 27235,
  created_at: now,
  tags: [
    ['u', url],
    ['method', method],
  ],
  content: '',
});

/** Where a Blossom upload is sent */
export const blossomUploadUrl = (server: string): string => `${normalizeServer(server)}/upload`;

/** An Error saying why an upload failed */
export type UploadFailure = Error & { kind: UploadFailureKind };

export const uploadFailure = (kind: UploadFailureKind, message: string): UploadFailure =>
  Object.assign(new Error(message), { kind });

/** Why an upload failed, if `error` is an upload failure */
export const uploadFailureKind = (error: unknown): UploadFailureKind | undefined =>
  error instanceof Error && 'kind' in error ? (error as UploadFailure).kind : undefined;

/** A finished request: its status, body and the server's reason (Blossom's `X-Reason`) */
export interface UploadAnswer {
  status: number;
  body: string;
  reason?: string;
}

/** The failure an HTTP status means, if it's not a success (`signedIn`: the request had auth) */
const statusFailure = (
  { status, reason }: UploadAnswer,
  signedIn: boolean
): UploadFailure | undefined => {
  const why = reason ? `: ${reason}` : '';
  if (status >= 500) return uploadFailure('server', `Upload failed (HTTP ${status})${why}`);
  if (!signedIn && (status === 401 || status === 403)) {
    return uploadFailure('sign-in', 'Sign in to upload');
  }
  if (status < 200 || status >= 300) {
    return uploadFailure('rejected', `Upload failed (HTTP ${status})${why}`);
  }
  return undefined;
};

const parse = (body: string): unknown => {
  try {
    return JSON.parse(body);
  } catch {
    return undefined;
  }
};

type Nip96Response = {
  url?: string;
  data?: Nip96Item | Nip96Item[];
  nip94_event?: { tags?: string[][] };
};
type Nip96Item = {
  url?: string;
  sha256?: string;
  mime?: string;
  size?: number;
  blurhash?: string;
  dimensions?: { width?: number; height?: number };
};

/** What a NIP-96 / nostr.build answer says about the file: its URL, and type, hash, size if given */
export const readNip96Response = (json: unknown): MediaFileInfo | undefined => {
  const resp = json as Nip96Response | undefined;
  const item = Array.isArray(resp?.data) ? resp?.data[0] : resp?.data;
  const nip94 = new Map(
    (resp?.nip94_event?.tags ?? []).map((t) => [t[0] ?? '', t[1] ?? ''] as [string, string])
  );
  const url = item?.url ?? resp?.url ?? nip94.get('url');
  if (!url) return undefined;
  const width = item?.dimensions?.width;
  const height = item?.dimensions?.height;
  const info: MediaFileInfo = { url };
  const type = item?.mime ?? nip94.get('m');
  const sha256 = item?.sha256 ?? nip94.get('x');
  const dim = width && height ? `${width}x${height}` : nip94.get('dim');
  if (type) info.type = type;
  if (sha256) info.sha256 = sha256.toLowerCase();
  if (typeof item?.size === 'number') info.size = item.size;
  if (dim) info.dim = dim;
  if (item?.blurhash ?? nip94.get('blurhash'))
    info.blurhash = item?.blurhash ?? nip94.get('blurhash');
  return info;
};

/** The file a NIP-96 / nostr.build request stored, or why there's none */
export const nip96Result = (
  answer: UploadAnswer,
  signedIn: boolean
): MediaFileInfo | UploadFailure =>
  statusFailure(answer, signedIn) ??
  readNip96Response(parse(answer.body)) ??
  uploadFailure('rejected', 'No URL in upload response');

/**
 * The file a Blossom server stored, or why there's none; a server that stored something else
 * than the file sent (another hash) is refused: the post would link another file
 */
export const blossomResult = (
  answer: UploadAnswer,
  sha256: string,
  signedIn: boolean
): BlobDescriptor | UploadFailure => {
  const failed = statusFailure(answer, signedIn);
  if (failed) return failed;
  const descriptor = readBlobDescriptor(parse(answer.body));
  if (!descriptor) return uploadFailure('rejected', 'Invalid upload response');
  if (descriptor.sha256 !== sha256.toLowerCase()) {
    return uploadFailure('rejected', 'The server changed the file');
  }
  return descriptor;
};

/** Whether the next server may succeed where this one failed: not when the user cancelled */
export const tryNextServer = (kind: UploadFailureKind | undefined): boolean => kind !== 'cancelled';
