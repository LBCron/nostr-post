/**
 * @nostr-post/ui - Color scheme choice
 *
 * Apps offer light, dark, or the system setting; components turn dark with a `dark` class on
 * an ancestor. `isDarkScheme` decides; `/web`'s `followColorScheme` applies it to the page.
 */

export type ColorScheme = 'system' | 'light' | 'dark';

export const colorSchemes: readonly ColorScheme[] = ['system', 'light', 'dark'];

/** Whether a choice means dark, given the system setting */
export const isDarkScheme = (scheme: ColorScheme, systemPrefersDark: boolean): boolean =>
  scheme === 'dark' || (scheme === 'system' && systemPrefersDark);

/** A stored or typed value as a scheme; anything else is `'system'` */
export const parseColorScheme = (value: unknown): ColorScheme =>
  value === 'light' || value === 'dark' ? value : 'system';
