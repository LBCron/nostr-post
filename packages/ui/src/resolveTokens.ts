/**
 * @nostr-post/ui - Token values for targets without CSS custom properties
 *
 * Canvas drawing, React Native, or another UI library's theme object can't read `--np-*`.
 * `resolveTokens` computes every token (derived ones included) to a plain value, with the
 * same overrides a page would set in CSS.
 */

import {
  accentRoles,
  type BaseColorRole,
  type ColorMode,
  type ColorRole,
  colorTokens,
  containerMix,
  elevationTokens,
  type RadiusStep,
  radiusScale,
  radiusSteps,
  type SpaceStep,
  shapeTokens,
  spaceScale,
  type TypeStep,
  typeScale,
  typeSteps,
  typeTokens,
} from './tokens';

export interface ResolvedTokens {
  mode: ColorMode;
  color: Record<ColorRole, string>;
  /** Font sizes in px */
  text: Record<TypeStep, number>;
  /** Corner radii in px */
  radius: Record<RadiusStep | 'full', number>;
  /** Spacing in px */
  space: Record<SpaceStep, number>;
  elevation: Record<'1' | '2' | '3', string>;
  fontFamily: string;
  fontFamilyMono: string;
}

export interface TokenOverrides {
  /** Base colors (`#rgb` or `#rrggbb`); containers follow them */
  color?: Partial<Record<BaseColorRole, string>>;
  /** Base font size in px (`--np-font-size`) */
  fontSize?: number;
  /** Base radius in px (`--np-radius`) */
  radius?: number;
  /** Base spacing unit in px (`--np-space`) */
  space?: number;
  fontFamily?: string;
}

type Rgb = readonly [number, number, number];

const parseHex = (hex: string): Rgb | undefined => {
  const h = hex.trim().replace(/^#/, '');
  const full =
    h.length === 3
      ? h
          .split('')
          .map((c) => c + c)
          .join('')
      : h;
  if (!/^[0-9a-f]{6}$/i.test(full)) return undefined;
  return [0, 2, 4].map((i) => Number.parseInt(full.slice(i, i + 2), 16)) as unknown as Rgb;
};

const toHex = (rgb: Rgb): string =>
  `#${rgb.map((c) => Math.round(c).toString(16).padStart(2, '0')).join('')}`;

/** `color-mix(in srgb, a p%, b)`; returns `a` unchanged if either color isn't a hex value */
export const mixColors = (a: string, b: string, percentOfA: number): string => {
  const ra = parseHex(a);
  const rb = parseHex(b);
  if (!ra || !rb) return a;
  const p = percentOfA / 100;
  return toHex([0, 1, 2].map((i) => (ra[i] ?? 0) * p + (rb[i] ?? 0) * (1 - p)) as unknown as Rgb);
};

const px = (value: string): number => Number.parseFloat(value);

/** Every token of a mode as a plain value */
export const resolveTokens = (
  mode: ColorMode = 'light',
  overrides: TokenOverrides = {}
): ResolvedTokens => {
  const base = { ...colorTokens[mode], ...overrides.color };
  const mix = containerMix[mode];
  const containers = Object.fromEntries(
    accentRoles.flatMap((role) => [
      [`${role}-container`, mixColors(base[role], base.surface, mix.container)],
      [`on-${role}-container`, mixColors(base[role], base['on-surface'], mix.onContainer)],
    ])
  ) as Record<Exclude<ColorRole, BaseColorRole>, string>;

  const fontSize = overrides.fontSize ?? px(typeTokens['font-size']);
  const radius = overrides.radius ?? px(shapeTokens.radius);
  const space = overrides.space ?? px(shapeTokens.space);

  return {
    mode,
    color: { ...base, ...containers },
    text: Object.fromEntries(
      typeSteps.map((step) => [step, Math.round(fontSize * typeScale[step])])
    ) as Record<TypeStep, number>,
    radius: {
      ...(Object.fromEntries(
        radiusSteps.map((step) => [step, radius * radiusScale[step]])
      ) as Record<RadiusStep, number>),
      full: 9999,
    },
    space: Object.fromEntries(
      Object.entries(spaceScale).map(([step, factor]) => [step, space * factor])
    ) as Record<SpaceStep, number>,
    elevation: elevationTokens[mode],
    fontFamily: overrides.fontFamily ?? typeTokens['font-family'],
    fontFamilyMono: typeTokens['font-family-mono'],
  };
};
