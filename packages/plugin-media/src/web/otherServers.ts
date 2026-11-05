/** The same file on other Blossom servers, for an image that fails to load */

import { blossomFallbacks } from '@nostr-post/core/blossom';
import { fetchBlossomServers } from '@nostr-post/signer';

/**
 * Other servers' URLs for a Blossom URL (by its hash): the author's servers (their kind 10063
 * list), then `servers`; [] for other URLs
 */
export async function otherServersOf(
  url: string,
  author: string | undefined,
  servers: readonly string[] = []
): Promise<string[]> {
  const own = author ? await fetchBlossomServers(author).catch(() => []) : [];
  return blossomFallbacks(url, [...own, ...servers]);
}
