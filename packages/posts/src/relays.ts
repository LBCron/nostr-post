/**
 * @nostr-post/posts - Relays for the signed-in user's posts
 */

import { DEFAULT_RELAYS, getPublicKey, getPublishRelays } from '@nostr-post/signer';

/**
 * Relays to publish the signed-in user's events to: the signer's write relays, the user's
 * NIP-65 relay list and defaults (`getPublishRelays`); the defaults when no one is signed in
 */
export async function getUserRelays(): Promise<string[]> {
  try {
    return await getPublishRelays(await getPublicKey());
  } catch {
    return DEFAULT_RELAYS;
  }
}

/** Default relays */
export function getDefaultRelays(): string[] {
  return ['wss://relay.damus.io', 'wss://nos.lol', 'wss://relay.primal.net'];
}
