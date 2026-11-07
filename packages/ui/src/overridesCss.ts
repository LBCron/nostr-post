/**
 * @nostr-post/ui - Token overrides as page CSS
 *
 * The CSS a page adds to brand the components: `overridesCss({ color: { primary: '#0b57d0' },
 * fontSize: 15 })` → `:root { --np-color-primary: #0b57d0; --np-font-size: 15px; }`.
 */

import type { TokenOverrides } from './resolveTokens';
import { tokenName } from './tokens';

/** The declarations of the overrides (`--np-…: value`), in a stable order */
export const overrideDeclarations = (overrides: TokenOverrides): readonly string[] => [
  ...Object.entries(overrides.color ?? {})
    .filter(([, value]) => value)
    .map(([role, value]) => `${tokenName('color', role)}: ${value}`),
  ...(overrides.fontFamily ? [`--np-font-family: ${overrides.fontFamily}`] : []),
  ...(overrides.fontSize !== undefined ? [`--np-font-size: ${overrides.fontSize}px`] : []),
  ...(overrides.radius !== undefined ? [`--np-radius: ${overrides.radius}px`] : []),
  ...(overrides.space !== undefined ? [`--np-space: ${overrides.space}px`] : []),
];

/** A rule with the overrides, for `selector` (default `:root`); empty for no overrides */
export const overridesCss = (overrides: TokenOverrides, selector = ':root'): string => {
  const lines = overrideDeclarations(overrides);
  return lines.length ? `${selector} {\n${lines.map((l) => `  ${l};`).join('\n')}\n}\n` : '';
};
