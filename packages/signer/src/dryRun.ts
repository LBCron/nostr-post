import type { SignedEvent } from './index';

/**
 * Dry-run (test) mode: events are still signed, but publishing keeps them in
 * a log instead of sending them to relays. Reads (fetchEvents,
 * fetchEventsFromRelay) also return logged events matching the filter, so
 * what was "published" shows up in feeds, pickers and lookups.
 *
 * The log is kept in the browser (localStorage, the newest MAX_LOGGED entries), so a
 * reload doesn't lose test posts: they can still be published for real
 * (`publishDryRunEntries`).
 */

/** An event that would have been published, and the relays it was meant for */
export interface DryRunEntry {
  event: SignedEvent;
  relays: string[];
}

/** Window event fired when dry-run mode is toggled or an event is logged or cleared */
export const DRY_RUN_CHANGE_EVENT = 'nostr-post:dry-run';

export interface DryRunChangeDetail {
  enabled: boolean;
  entries: DryRunEntry[];
}

declare global {
  interface WindowEventMap {
    'nostr-post:dry-run': CustomEvent<DryRunChangeDetail>;
  }
}

/** Where the log is kept in the browser */
export const DRY_RUN_STORAGE_KEY = 'nostr-post:dry-run-log';
/** Entries kept in the browser, the newest */
const MAX_LOGGED = 300;

const storage = (): Storage | undefined => {
  try {
    return typeof localStorage === 'undefined' ? undefined : localStorage;
  } catch {
    return undefined;
  }
};

const isEntry = (e: unknown): e is DryRunEntry => {
  const entry = e as DryRunEntry | null;
  return (
    typeof entry?.event?.id === 'string' &&
    typeof entry.event.sig === 'string' &&
    Array.isArray(entry.relays)
  );
};

/** The log kept in the browser; [] without one */
const loadEntries = (): DryRunEntry[] => {
  try {
    const stored = JSON.parse(storage()?.getItem(DRY_RUN_STORAGE_KEY) ?? '[]') as unknown;
    return Array.isArray(stored) ? stored.filter(isEntry) : [];
  } catch {
    return [];
  }
};

const saveEntries = (list: DryRunEntry[]): void => {
  try {
    const store = storage();
    if (!store) return;
    if (list.length === 0) store.removeItem(DRY_RUN_STORAGE_KEY);
    else store.setItem(DRY_RUN_STORAGE_KEY, JSON.stringify(list.slice(0, MAX_LOGGED)));
  } catch {
    // Full or blocked storage: the log stays in memory
  }
};

let enabled = false;
let entries: DryRunEntry[] | undefined;

/** The log, loaded from the browser on first use */
const logged = (): DryRunEntry[] => {
  entries ??= loadEntries();
  return entries;
};

const setEntries = (next: DryRunEntry[]): void => {
  entries = next;
  saveEntries(next);
  notify();
};

const notify = (): void => {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent<DryRunChangeDetail>(DRY_RUN_CHANGE_EVENT, {
      detail: { enabled, entries: getDryRunEntries() },
    })
  );
};

/** Turn dry-run mode on or off. The log is kept until clearDryRunEntries(). */
export function setDryRun(on: boolean): void {
  if (enabled === on) return;
  enabled = on;
  notify();
}

export function isDryRun(): boolean {
  return enabled;
}

/** Logged events, newest first */
export function getDryRunEntries(): DryRunEntry[] {
  return [...logged()];
}

export function clearDryRunEntries(): void {
  setEntries([]);
}

/** Remove events from the log, e.g. once published for real */
export function removeDryRunEntries(ids: string[]): void {
  const removed = new Set(ids);
  setEntries(logged().filter((e) => !removed.has(e.event.id)));
}

/** Log an event instead of publishing it (called by publishToRelay(s) in dry-run mode) */
export function logDryRunEvent(event: SignedEvent, relays: string[]): void {
  setEntries([{ event, relays: [...relays] }, ...logged()]);
}

/** Logged events to merge into reads; none while dry-run mode is off */
export function dryRunEventsForReads(): SignedEvent[] {
  return enabled ? logged().map((e) => e.event) : [];
}
