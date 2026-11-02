/**
 * The performers' links in what an AI read from a post. The checks come from
 * `@nostr-post/plugin-embed` (`keepKnownLinks`, `checkSuggestedLinks`): only links the post's
 * text has are kept; performers' other links are offered to confirm.
 */

import { checkSuggestedLinks, type SuggestedLink } from '@nostr-post/plugin-embed';

export type { SuggestedLink };

/** The AI's performers, as far as they're objects */
export const performersOf = (json: unknown): Record<string, unknown>[] => {
  const performers = (json as { performers?: unknown } | null)?.performers;
  return Array.isArray(performers)
    ? performers.filter((p): p is Record<string, unknown> => Boolean(p) && typeof p === 'object')
    : [];
};

/** The links the AI gave performers that the post doesn't have, checked (`checkSuggestedLinks`) */
export const suggestedLinks = (
  json: unknown,
  text: string,
  hasPoster = false
): Promise<SuggestedLink[]> =>
  checkSuggestedLinks(
    performersOf(json).flatMap((p) =>
      (Array.isArray(p.media) ? p.media : []).map((link) => ({
        name: String(p.title ?? ''),
        link: String(link),
      }))
    ),
    text,
    { hasImage: hasPoster }
  );
