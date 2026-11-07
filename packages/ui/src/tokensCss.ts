/**
 * @nostr-post/ui - CSS custom properties generated from the token data
 *
 * Everything sits in the cascade layer `np.tokens`, so a page's own (unlayered) rules always
 * win, wherever they are loaded:
 *
 * - `:root` holds the light values and every derived token;
 * - `.dark` (on any ancestor, as before) swaps the color values and re-derives the colors;
 * - `.np-theme` re-derives everything, for a part of the page with its own base values.
 */

import {
  accentRoles,
  baseColorRoles,
  type ColorMode,
  colorTokens,
  containerMix,
  elevationTokens,
  motionTokens,
  radiusScale,
  radiusSteps,
  shapeTokens,
  spaceScale,
  tokenName,
  tokenVar,
  typeScale,
  typeSteps,
  typeTokens,
} from './tokens';

/** Name of the cascade layer the tokens and primitives live in */
export const tokenLayer = 'np.tokens';

type Declarations = ReadonlyArray<readonly [string, string]>;

const block = (selector: string, declarations: Declarations): string =>
  `${selector} {\n${declarations.map(([name, value]) => `  ${name}: ${value};`).join('\n')}\n}`;

const colorDeclarations = (mode: ColorMode): Declarations => [
  ...baseColorRoles.map((role) => [tokenName('color', role), colorTokens[mode][role]] as const),
  ...(['1', '2', '3'] as const).map(
    (level) => [tokenName('elevation', level), elevationTokens[mode][level]] as const
  ),
  ['--np-mix-container', `${containerMix[mode].container}%`],
  ['--np-mix-on-container', `${containerMix[mode].onContainer}%`],
];

const inputDeclarations: Declarations = [
  ...Object.entries(typeTokens).map(([name, value]) => [`--np-${name}`, value] as const),
  ...Object.entries(shapeTokens).map(([name, value]) => [`--np-${name}`, value] as const),
  ...Object.entries(motionTokens).map(
    ([name, value]) => [tokenName('motion', name), value] as const
  ),
];

/** Colors computed from the base colors: containers and the focus ring */
const derivedColorDeclarations: Declarations = [
  ...accentRoles.flatMap((role) => [
    [
      tokenName('color', `${role}-container`),
      `color-mix(in srgb, ${tokenVar('color', role)} var(--np-mix-container), ${tokenVar('color', 'surface')})`,
    ] as const,
    [
      tokenName('color', `on-${role}-container`),
      `color-mix(in srgb, ${tokenVar('color', role)} var(--np-mix-on-container), ${tokenVar('color', 'on-surface')})`,
    ] as const,
  ]),
  [
    '--np-focus-ring',
    `0 0 0 3px color-mix(in srgb, ${tokenVar('color', 'primary')} 35%, transparent)`,
  ],
];

/** Sizes computed from the base size, radius and space */
const derivedSizeDeclarations: Declarations = [
  ...typeSteps.map(
    (step) => [`--np-text-${step}`, `calc(var(--np-font-size) * ${typeScale[step]})`] as const
  ),
  ...radiusSteps.map(
    (step) => [tokenName('radius', step), `calc(var(--np-radius) * ${radiusScale[step]})`] as const
  ),
  [tokenName('radius', 'full'), '9999px'],
  ...Object.entries(spaceScale).map(
    ([step, factor]) => [tokenName('space', step), `calc(var(--np-space) * ${factor})`] as const
  ),
];

/** The token stylesheet (without the layer wrapper) */
export const tokenRules = (): string =>
  [
    block(':root', [
      ...colorDeclarations('light'),
      ...inputDeclarations,
      ...derivedColorDeclarations,
      ...derivedSizeDeclarations,
    ]),
    block('.dark', [
      ['color-scheme', 'dark'],
      ...colorDeclarations('dark'),
      ...derivedColorDeclarations,
    ]),
    block('.np-theme', [...derivedColorDeclarations, ...derivedSizeDeclarations]),
  ].join('\n\n');

/** The token stylesheet in its cascade layer, ready for a `<style>` element or a `.css` file */
export const tokensCss = (): string => `@layer ${tokenLayer} {\n${tokenRules()}\n}\n`;
