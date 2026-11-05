/**
 * The upload requests of @nostr-post/plugin-media, in the browser: progress, cancelling, and
 * coping with a bad connection. A request with no progress for a while is aborted (mobile
 * browsers can leave a dropped request hanging for minutes) and tried again, after the
 * connection is back. Building the requests and reading the answers is the main entry's
 * (`uploadServers.ts`); signing goes through the browser's signer (`window.nostr`).
 */

import { nostrAuthorization } from '@nostr-post/core/blossom';
import { isRetryableUpload, UPLOAD_RETRY_DELAYS_MS, UPLOAD_STALL_MS } from '../core';
import {
  blossomResult,
  blossomUploadUrl,
  NOSTR_BUILD_UPLOAD,
  nip96Result,
  nip98AuthEvent,
  type UploadAnswer,
  type UploadFailure,
  uploadFailure,
  uploadFailureKind,
} from '../uploadServers';

export { NOSTR_BUILD_UPLOAD, type UploadFailure, uploadFailureKind };

type BrowserSigner = {
  getPublicKey(): Promise<string>;
  signEvent(e: unknown): Promise<unknown>;
};

const browserSigner = (): BrowserSigner | undefined =>
  (window as unknown as { nostr?: BrowserSigner }).nostr;

const hasSigner = (): boolean => Boolean(browserSigner());

const cancelled = () => uploadFailure('cancelled', 'Upload cancelled');

/** Resolves undefined when `promise` doesn't settle within `ms` (a signer that doesn't answer) */
const within = <T>(promise: Promise<T>, ms: number): Promise<T | undefined> =>
  Promise.race([
    promise.catch(() => undefined),
    new Promise<undefined>((resolve) => setTimeout(() => resolve(undefined), ms)),
  ]);

/** The signed-in user's pubkey via the browser's signer; undefined without one or in time */
export const signerPubkey = (ms = UPLOAD_STALL_MS): Promise<string | undefined> => {
  const signer = browserSigner();
  return signer ? within(signer.getPublicKey(), ms) : Promise.resolve(undefined);
};

/** `template` signed by the browser's signer; undefined without one, refused or not in time */
export const signWithBrowser = async (
  template: unknown,
  ms = UPLOAD_STALL_MS
): Promise<unknown | undefined> => {
  const signer = browserSigner();
  if (!signer) return undefined;
  const pubkey = await within(signer.getPublicKey(), ms);
  return pubkey ? within(signer.signEvent({ ...(template as object), pubkey }), ms) : undefined;
};

/**
 * Build a NIP-98 HTTP Auth token for the given request.
 * Returns null (and logs a warning) when window.nostr is unavailable or signing fails.
 */
export async function createNip98AuthToken(url: string, method: string): Promise<string | null> {
  if (!hasSigner()) return null;
  const signed = await signWithBrowser(nip98AuthEvent(url, method));
  if (!signed) {
    console.warn('NIP-98 auth failed');
    return null;
  }
  return nostrAuthorization(signed).slice('Nostr '.length);
}

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

interface Request {
  method: 'POST' | 'PUT';
  url: string;
  body: Blob | FormData;
  headers: Record<string, string>;
}

/**
 * Send one request with progress; resolves with the server's answer, whatever its status.
 * Throws an UploadFailure without one: no connection, cancelled, or no progress for `stallMs`.
 */
export function sendUpload(request: Request, options: UploadOptions = {}): Promise<UploadAnswer> {
  const { onProgress, signal, stallMs = UPLOAD_STALL_MS } = options;
  if (signal?.aborted) return Promise.reject(cancelled());
  return new Promise<UploadAnswer>((resolve, reject) => {
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
    const done = () => {
      clearTimeout(timer);
      signal?.removeEventListener('abort', onAbort);
    };
    signal?.addEventListener('abort', onAbort);
    xhr.upload.addEventListener('progress', (e) => {
      watch(stallMs);
      if (e.lengthComputable) onProgress?.(e.loaded / e.total);
    });
    // Sent: the server may take a while to store it
    xhr.upload.addEventListener('load', () => watch(stallMs * 2));
    xhr.addEventListener('load', () => {
      done();
      resolve({
        status: xhr.status,
        body: xhr.responseText,
        reason: xhr.getResponseHeader('X-Reason') ?? undefined,
      });
    });
    xhr.addEventListener('error', () => {
      done();
      reject(uploadFailure('network', 'Network error'));
    });
    xhr.addEventListener('abort', () => {
      done();
      reject(
        stalled
          ? uploadFailure('stalled', `No progress for ${Math.round(stallMs / 1000)} s`)
          : cancelled()
      );
    });
    xhr.open(request.method, request.url);
    for (const [name, value] of Object.entries(request.headers)) xhr.setRequestHeader(name, value);
    xhr.send(request.body);
    watch(stallMs);
  });
}

/**
 * Upload a single file to nostr.build (or another NIP-96 endpoint) once, with NIP-98 auth.
 * Returns the hosted URL; throws an UploadFailure, also when no progress arrives for `stallMs`.
 */
export async function uploadWithProgress(file: File, options: UploadOptions = {}): Promise<string> {
  return (await uploadNip96(file, options)).url;
}

/** uploadWithProgress, with what the server says about the file (type, hash, size, dimensions) */
export async function uploadNip96(file: File, options: UploadOptions = {}) {
  const { uploadUrl = NOSTR_BUILD_UPLOAD, signal, stallMs = UPLOAD_STALL_MS } = options;
  if (signal?.aborted) throw cancelled();
  // No signer at all: nothing to sign the upload's auth with (custom servers may not need it)
  if (!hasSigner() && uploadUrl === NOSTR_BUILD_UPLOAD) {
    throw uploadFailure('sign-in', 'Sign in to upload');
  }
  const token = await within(createNip98AuthToken(uploadUrl, 'POST'), stallMs);
  if (signal?.aborted) throw cancelled();
  const body = new FormData();
  body.append('file', file);
  const headers: Record<string, string> = token ? { Authorization: `Nostr ${token}` } : {};
  const answer = await sendUpload({ method: 'POST', url: uploadUrl, body, headers }, options);
  const result = nip96Result(answer, Boolean(token));
  if (result instanceof Error) throw result;
  return result;
}

/**
 * Upload a file to a Blossom server once (BUD-02 `PUT /upload`), authorized by `auth` (a
 * signed kind 24242 event for its hash, or undefined without a signer). Returns the server's
 * descriptor of the file; throws an UploadFailure, also when it stored another file.
 */
export async function uploadBlossom(
  file: Blob,
  server: string,
  sha256: string,
  auth: unknown | undefined,
  options: UploadOptions = {}
) {
  const headers: Record<string, string> = {
    'Content-Type': file.type || 'application/octet-stream',
    'X-SHA-256': sha256,
  };
  if (auth) headers.Authorization = nostrAuthorization(auth);
  const answer = await sendUpload(
    { method: 'PUT', url: blossomUploadUrl(server), body: file, headers },
    options
  );
  const result = blossomResult(answer, sha256, Boolean(auth));
  if (result instanceof Error) throw result;
  return result;
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
 * `attempt`, tried again after connection and server failures (stalled included): after
 * UPLOAD_RETRY_DELAYS_MS, or once the browser is back online
 */
export async function withRetries<T>(
  attempt: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const attempts = UPLOAD_RETRY_DELAYS_MS.length + 1;
  for (let n = 1; ; n++) {
    try {
      return await attempt();
    } catch (error) {
      const kind = uploadFailureKind(error);
      const delay = UPLOAD_RETRY_DELAYS_MS[n - 1];
      if (delay === undefined || !kind || !isRetryableUpload(kind) || options.signal?.aborted) {
        throw error;
      }
      options.onWait?.(navigator.onLine === false);
      await waitToRetry(delay, options.signal);
      options.onRetry?.(n + 1, attempts);
    }
  }
}

/**
 * uploadWithProgress, tried again after connection and server failures (stalled included).
 * Each try signs a new NIP-98 token, since servers accept only recent ones.
 */
export function uploadWithRetry(file: File, options: RetryOptions = {}): Promise<string> {
  return withRetries(() => uploadWithProgress(file, options), options);
}

/** Upload a single file to nostr.build (or a custom endpoint); returns the hosted URL */
export function uploadToNostrBuild(file: File, uploadUrl = NOSTR_BUILD_UPLOAD): Promise<string> {
  return uploadWithProgress(file, { uploadUrl });
}
