/**
 * @nostr-post/ui/web - Apply a color scheme to the page
 */

import { type ColorScheme, isDarkScheme } from '../colorScheme';

/**
 * Put the `dark` class on `target` (default `document.documentElement`) for a scheme, and for
 * `'system'` keep following the system setting. Returns a function that stops following.
 */
export const followColorScheme = (
  scheme: ColorScheme,
  target: Element | undefined = globalThis.document?.documentElement
): (() => void) => {
  if (!target) return () => {};
  const query = globalThis.matchMedia?.('(prefers-color-scheme: dark)');
  const apply = () => {
    target.classList.toggle('dark', isDarkScheme(scheme, query?.matches ?? false));
  };
  apply();
  if (scheme !== 'system' || !query) return () => {};
  query.addEventListener('change', apply);
  return () => query.removeEventListener('change', apply);
};
