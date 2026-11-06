/**
 * @nostr-post/signer - Sending events that are already signed, and capturing publishes
 *
 * `publishSignedEvents` sends signed events to their relays, linked events before the posts
 * that link them: publishing a test-mode post for real (#276), or the outbox's items (#268).
 * `setPublishCapture` hands every publish to a function instead of the relays, e.g. so the
 * outbox can keep a post with everything its publishing signed (pages the venue hub created,
 * plugins' publish hooks) and send it later.
 */

import { publishToRelays, type SignedEvent } from './index';

/** A signed event and the relays it's meant for */
export interface SignedEntry {
  event: SignedEvent;
  relays: string[];
}

/** How sending one signed event went */
export interface SignedPublishResult {
  id: string;
  /** Some relay accepted it */
  ok: boolean;
  /** Why no relay did */
  error?: string;
}

export interface PublishSignedOptions {
  /** For events without relays */
  fallbackRelays?: string[];
  /** Send also in test mode (dry run) */
  ignoreDryRun?: boolean;
}

/**
 * Sends signed events to their relays, one after the other in reverse order (a bundle lists
 * the post first, so the events it links go first); results in the entries' order
 */
export async function publishSignedEvents(
  entries: SignedEntry[],
  options: PublishSignedOptions = {}
): Promise<SignedPublishResult[]> {
  const results: SignedPublishResult[] = [];
  for (const { event, relays } of [...entries].reverse()) {
    const targets = relays.filter((r) => /^wss?:\/\//.test(r));
    const sent = await publishToRelays(event, targets.length ? targets : options.fallbackRelays, {
      ignoreDryRun: options.ignoreDryRun,
      ignoreCapture: true,
    }).catch((error: Error) => ({ success: 0, results: [{ error: error.message }] }));
    const ok = sent.success > 0;
    const error = ok
      ? undefined
      : (sent.results.find((r) => r.error)?.error ?? 'No relay accepted it');
    results.push({ id: event.id, ok, ...(error ? { error } : {}) });
  }
  return results.reverse();
}

/** Where captured publishes go */
export type PublishCapture = (event: SignedEvent, relays: string[]) => void;

let capture: PublishCapture | undefined;

/**
 * Hand every publish (publishToRelay, publishToRelays) to `handler` instead of the relays, also
 * in test mode, until it's called again without one. Each relay reports success.
 */
export function setPublishCapture(handler?: PublishCapture): void {
  capture = handler;
}

/** The capture now on, if any */
export function publishCapture(): PublishCapture | undefined {
  return capture;
}
