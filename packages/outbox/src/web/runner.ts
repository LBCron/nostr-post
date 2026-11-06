/**
 * @nostr-post/outbox/web - The browser's outbox and running it
 *
 * `browserOutbox()` is the page's one outbox, in IndexedDB, with the jobs packages register
 * (`registerOutboxJobs`, e.g. plugin-media's upload). `startOutboxRunner` sends what's due:
 * timed posts at their time, files on wifi where the browser can tell, when the app opens,
 * comes online or the connection changes.
 */

import { getPublicKey } from '@nostr-post/signer';
import type { RunConditions } from '../item';
import { createOutbox, type Outbox, type OutboxJobs } from '../outbox';
import { indexedDbStorage, requestPersistentStorage } from './indexedDb';

/** The Network Information API: Chrome on Android only; Safari and Firefox have none */
interface NetworkInformation extends EventTarget {
  type?: string;
  saveData?: boolean;
}

const networkInformation = (): NetworkInformation | undefined =>
  (globalThis.navigator as (Navigator & { connection?: NetworkInformation }) | undefined)
    ?.connection;

/**
 * What the browser says about the connection: `wifi` true on wifi or ethernet, false on
 * mobile data or with data saving on (`saveData`), undefined when it can't tell
 */
export function connectionConditions(): Pick<RunConditions, 'wifi'> {
  const connection = networkInformation();
  if (!connection) return {};
  if (connection.saveData) return { wifi: false };
  if (connection.type === 'wifi' || connection.type === 'ethernet') return { wifi: true };
  if (connection.type === undefined || connection.type === 'unknown') return {};
  return { wifi: false };
}

let jobs: OutboxJobs = {};

/** Adds jobs to the browser outbox, e.g. the upload (plugin-media) */
export function registerOutboxJobs(more: OutboxJobs): void {
  jobs = { ...jobs, ...more };
}

let outbox: Outbox | undefined;

/** The page's outbox, in IndexedDB; asks the browser to keep its data */
export function browserOutbox(): Outbox {
  if (!outbox) {
    outbox = createOutbox(indexedDbStorage(), () => jobs);
    void requestPersistentStorage();
  }
  return outbox;
}

export interface OutboxRunnerOptions {
  /** Whose items; default the signer's pubkey, read at each run */
  pubkey?: string;
  /** How often to look for due items (timed posts), ms; default 30 s */
  intervalMs?: number;
}

/**
 * Runs the outbox's due items now, every `intervalMs`, when the browser comes online and when
 * the connection changes; returns the function that stops it
 */
export function startOutboxRunner(
  box: Outbox = browserOutbox(),
  { pubkey, intervalMs = 30_000 }: OutboxRunnerOptions = {}
): () => void {
  let running = false;
  const tick = async () => {
    if (running || globalThis.navigator?.onLine === false) return;
    running = true;
    try {
      const owner = pubkey ?? (await getPublicKey().catch(() => undefined));
      if (owner) await box.runAll(owner, connectionConditions());
    } finally {
      running = false;
    }
  };
  const run = () => void tick();
  run();
  const timer = setInterval(run, intervalMs);
  globalThis.addEventListener?.('online', run);
  networkInformation()?.addEventListener('change', run);
  return () => {
    clearInterval(timer);
    globalThis.removeEventListener?.('online', run);
    networkInformation()?.removeEventListener('change', run);
  };
}

// Module state: the page's runner, started once
let pageRunnerStarted = false;

/**
 * Starts the browser outbox's runner once per page (the queue element and the composer call it);
 * apps call it at start so timed posts and waiting uploads go even before either is shown
 */
export function ensureOutboxRunner(): void {
  if (pageRunnerStarted) return;
  pageRunnerStarted = true;
  startOutboxRunner(browserOutbox());
}
