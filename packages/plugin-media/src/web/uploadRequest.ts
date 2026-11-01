/**
 * The upload request of @nostr-post/plugin-media: NIP-98 auth, progress, cancelling, and
 * coping with a bad connection. An upload with no progress for a while is aborted (mobile
 * browsers can leave a dropped request hanging for minutes) and tried again, after the
 * connection is back.
 */

import {
  isRetryableUpload,
  UPLOAD_RETRY_DELAYS_MS,
  UPLOAD_STALL_MS,
  type UploadFailureKind,
} from '../core';

export const NOSTR_BUILD_UPLOAD = 'https://nostr.build/api/v2/upload/files';

/** An Error saying why an upload failed */
export type UploadFailure = Error & { kind: UploadFailureKind };

const failure = (kind: UploadFailureKind, message: string): UploadFailure =>
  Object.assign(new Error(message), { kind });

/** Why an upload failed, if `error` is an upload failure */
export const uploadFailureKind = (error: unknown): UploadFailureKind | undefined =>
  error instanceof Error && 'kind' in error ? (error as UploadFailure).kind : undefined;

const cancelled = () => failure('cancelled', 'Upload cancelled');

/**
 * Build a NIP-98 HTTP Auth token for the given request.
 * Returns null (and logs a warning) when window.nostr is unavailable or signing fails.
 */
export async function createNip98AuthToken(url: string, method: string): Promise<string | null> {
  const nostr = (
    window as unknown as {
      nostr?: {
        getPublicKey(): Promise<string>;
        signEvent(e: unknown): Promise<unknown>;
      };
    }
  ).nostr;
  if (!nostr) return null;

  try {
    const pubkey = await nostr.getPublicKey();
    const unsignedEvent = {
      kind: 27235,
      created_at: Math.floor(Date.now() / 1000),
      tags: [
        ['u', url],
        ['method', method],
      ],
      content: '',
      pubkey,
    };
    const signedEvent = await nostr.signEvent(unsignedEvent);
    return btoa(JSON.stringify(signedEvent));
  } catch (err) {
    console.warn('NIP-98 auth failed:', err);
    return null;
  }
}

/** The token, or null (upload without auth) when the signer doesn't answer within `ms` */
const tokenWithin = (url: string, ms: number): Promise<string | null> =>
  Promise.race([
    createNip98AuthToken(url, 'POST'),
    new Promise<null>((resolve) => setTimeout(() => resolve(null), ms)),
  ]);

/** The hosted URL in an upload response (nostr.build and NIP-96-like servers) */
const uploadedUrl = (json: unknown): string | undefined => {
  const resp = json as
    | { url?: string; data?: { url?: string } | Array<{ url?: string }> }
    | undefined;
  const data = resp?.data;
  return (
    (Array.isArray(data) ? data[0]?.url : undefined) ??
    resp?.url ??
    (Array.isArray(data) ? undefined : data?.url)
  );
};

export interface UploadOptions {
  /** Default nostr.build */
  uploadUrl?: string;
  /** The part sent (0–1), as it goes */
  onProgress?: (fraction: number) => void;
  /** Aborting it cancels the upload */
  signal?: AbortSignal;
  /** Abort when no progress arrives for this long (ms); default UPLOAD_STALL_MS */
  stallMs?: number;
}

/** The URL in a finished request's answer, or why there's none */
const answer = (xhr: XMLHttpRequest): string | UploadFailure => {
  if (xhr.status >= 500) return failure('server', `Upload failed (HTTP ${xhr.status})`);
  if (xhr.status < 200 || xhr.status >= 300) {
    return failure('rejected', `Upload failed (HTTP ${xhr.status})`);
  }
  try {
    return (
      uploadedUrl(JSON.parse(xhr.responseText)) ?? failure('rejected', 'No URL in upload response')
    );
  } catch {
    return failure('rejected', 'Invalid upload response');
  }
};

/**
 * Upload a single file to nostr.build (or a custom endpoint) once. Returns the hosted URL;
 * throws an UploadFailure, also when no progress arrives for `stallMs` (`stalled`).
 */
export async function uploadWithProgress(file: File, options: UploadOptions = {}): Promise<string> {
  const { uploadUrl = NOSTR_BUILD_UPLOAD, onProgress, signal, stallMs = UPLOAD_STALL_MS } = options;
  if (signal?.aborted) throw cancelled();
  const body = new FormData();
  body.append('file', file);
  const token = await tokenWithin(uploadUrl, stallMs);
  if (signal?.aborted) throw cancelled();
  return new Promise<string>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    let stalled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const watch = (ms: number) => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        stalled = true;
        xhr.abort();
      }, ms);
    };
    const onAbort = () => xhr.abort();
    const settle = (result: string | UploadFailure) => {
      clearTimeout(timer);
      signal?.removeEventListener('abort', onAbort);
      if (typeof result === 'string') resolve(result);
      else reject(result);
    };
    signal?.addEventListener('abort', onAbort);
    xhr.upload.addEventListener('progress', (e) => {
      watch(stallMs);
      if (e.lengthComputable) onProgress?.(e.loaded / e.total);
    });
    // Sent: the server may take a while to store it
    xhr.upload.addEventListener('load', () => watch(stallMs * 2));
    xhr.addEventListener('load', () => settle(answer(xhr)));
    xhr.addEventListener('error', () => settle(failure('network', 'Network error')));
    xhr.addEventListener('abort', () =>
      settle(
        stalled
          ? failure('stalled', `No progress for ${Math.round(stallMs / 1000)} s`)
          : cancelled()
      )
    );
    xhr.open('POST', uploadUrl);
    if (token) xhr.setRequestHeader('Authorization', `Nostr ${token}`);
    xhr.send(body);
    watch(stallMs);
  });
}

/** Resolves after `ms`, or once the browser is online again if it's offline then */
const waitToRetry = (ms: number, signal?: AbortSignal): Promise<void> =>
  new Promise<void>((resolve, reject) => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const stop = () => {
      clearTimeout(timer);
      window.removeEventListener('online', onOnline);
      signal?.removeEventListener('abort', onAbort);
    };
    const onOnline = () => {
      stop();
      resolve();
    };
    const onAbort = () => {
      stop();
      reject(cancelled());
    };
    timer = setTimeout(() => {
      if (navigator.onLine !== false) onOnline(); // Offline: wait for 'online'
    }, ms);
    window.addEventListener('online', onOnline);
    signal?.addEventListener('abort', onAbort);
  });

export interface RetryOptions extends UploadOptions {
  /** A try failed and the next waits: `offline` when the browser has no connection */
  onWait?: (offline: boolean) => void;
  /** The next try starts: `attempt` of `attempts` (2 of 3) */
  onRetry?: (attempt: number, attempts: number) => void;
}

/**
 * uploadWithProgress, tried again after connection and server failures (stalled included):
 * after UPLOAD_RETRY_DELAYS_MS, or once the browser is back online. Each try signs a new
 * NIP-98 token, since servers accept only recent ones.
 */
export async function uploadWithRetry(file: File, options: RetryOptions = {}): Promise<string> {
  const attempts = UPLOAD_RETRY_DELAYS_MS.length + 1;
  for (let attempt = 1; ; attempt++) {
    try {
      return await uploadWithProgress(file, options);
    } catch (error) {
      const kind = uploadFailureKind(error);
      const delay = UPLOAD_RETRY_DELAYS_MS[attempt - 1];
      if (delay === undefined || !kind || !isRetryableUpload(kind) || options.signal?.aborted) {
        throw error;
      }
      options.onWait?.(navigator.onLine === false);
      await waitToRetry(delay, options.signal);
      options.onRetry?.(attempt + 1, attempts);
    }
  }
}

/** Upload a single file to nostr.build (or a custom endpoint); returns the hosted URL */
export function uploadToNostrBuild(file: File, uploadUrl = NOSTR_BUILD_UPLOAD): Promise<string> {
  return uploadWithProgress(file, { uploadUrl });
}
