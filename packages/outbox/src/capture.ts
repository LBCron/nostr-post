/**
 * @nostr-post/outbox - Capturing a publish
 *
 * Runs an app's usual publish (e.g. the composer's, with its publish hooks), but every event it
 * would send goes into a list instead of to the relays (signer's `setPublishCapture`). Pages the
 * venue hub creates and plugins' events are captured signed too, so the item needs no signer
 * later. Test mode doesn't apply while capturing: the item is sent later, in test mode then
 * only logged.
 */

import { type SignedEntry, setPublishCapture } from '@nostr-post/signer';
import { capturedEntries } from './item';

/**
 * Runs `publish` with its publishes captured: its result, and the events it would have sent
 * (each once, the last published first: the post, then what its hooks published)
 */
export async function captureEvents<T>(
  publish: () => Promise<T>
): Promise<{ result: T; events: SignedEntry[] }> {
  const captured: SignedEntry[] = [];
  setPublishCapture((event, relays) => captured.push({ event, relays: [...relays] }));
  try {
    const result = await publish();
    return { result, events: capturedEntries(captured) };
  } finally {
    setPublishCapture();
  }
}
