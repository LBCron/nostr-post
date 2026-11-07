/**
 * @nostr-post/ui - Design tokens as data
 *
 * The single source of the visual language: Material 3 color roles, a type scale,
 * shape, spacing, elevation and motion. CSS custom properties (`--np-*`) are generated
 * from this data (see `tokensCss`), and targets without CSS custom properties (canvas,
 * React Native, another UI library's theme) read the values with `resolveTokens`.
 */

export type ColorMode = 'light' | 'dark';

/** Base color roles: one value per mode */
export const baseColorRoles = [
  'primary',
  'on-primary',
  'secondary',
  'on-secondary',
  'tertiary',
  'on-tertiary',
  'error',
  'on-error',
  'success',
  'on-success',
  'warning',
  'on-warning',
  'info',
  'on-info',
  /** Rating stars */
  'rating',
  'surface',
  'on-surface',
  'on-surface-variant',
  'surface-container-lowest',
  'surface-container-low',
  'surface-container',
  'surface-container-high',
  'surface-container-highest',
  'outline',
  'outline-variant',
  'inverse-surface',
  'inverse-on-surface',
  'scrim',
  'on-scrim',
  'shadow',
] as const;

export type BaseColorRole = (typeof baseColorRoles)[number];

/** Accent roles that get a `-container` and `on-…-container` color derived from them */
export const accentRoles = [
  'primary',
  'secondary',
  'tertiary',
  'error',
  'success',
  'warning',
  'info',
] as const;

export type AccentRole = (typeof accentRoles)[number];

export type ContainerRole = `${AccentRole}-container` | `on-${AccentRole}-container`;

export type ColorRole = BaseColorRole | ContainerRole;

/**
 * Default palette: cool Material 3 neutrals with nostr-login's indigo as primary.
 * Pages override any of them through `--np-color-<role>` (`:root` for light, `.dark` for dark).
 */
export const colorTokens: Record<ColorMode, Record<BaseColorRole, string>> = {
  light: {
    primary: '#4f46e5',
    'on-primary': '#ffffff',
    secondary: '#5c5d72',
    'on-secondary': '#ffffff',
    tertiary: '#7c3aed',
    'on-tertiary': '#ffffff',
    error: '#ba1a1a',
    'on-error': '#ffffff',
    success: '#146c2e',
    'on-success': '#ffffff',
    warning: '#8a5100',
    'on-warning': '#ffffff',
    info: '#0b57d0',
    'on-info': '#ffffff',
    rating: '#e8a200',
    surface: '#fcfcff',
    'on-surface': '#1b1b21',
    'on-surface-variant': '#46464f',
    'surface-container-lowest': '#ffffff',
    'surface-container-low': '#f6f5fa',
    'surface-container': '#f0eff4',
    'surface-container-high': '#eae9ef',
    'surface-container-highest': '#e4e3e9',
    outline: '#777680',
    'outline-variant': '#c7c5d0',
    'inverse-surface': '#303036',
    'inverse-on-surface': '#f3f0f7',
    scrim: '#000000',
    'on-scrim': '#ffffff',
    shadow: '#000000',
  },
  dark: {
    primary: '#c3c0ff',
    'on-primary': '#1e1a6d',
    secondary: '#c4c4dd',
    'on-secondary': '#2d2f42',
    tertiary: '#d2bbff',
    'on-tertiary': '#3b1a75',
    error: '#ffb4ab',
    'on-error': '#690005',
    success: '#7fdc8f',
    'on-success': '#003913',
    warning: '#ffb95c',
    'on-warning': '#472a00',
    info: '#a8c7fa',
    'on-info': '#062e6f',
    rating: '#ffc94a',
    surface: '#131318',
    'on-surface': '#e4e1e9',
    'on-surface-variant': '#c7c5d0',
    'surface-container-lowest': '#0e0e13',
    'surface-container-low': '#1b1b21',
    'surface-container': '#1f1f25',
    'surface-container-high': '#2a292f',
    'surface-container-highest': '#35343a',
    outline: '#918f9a',
    'outline-variant': '#46464f',
    'inverse-surface': '#e4e1e9',
    'inverse-on-surface': '#303036',
    scrim: '#000000',
    'on-scrim': '#ffffff',
    shadow: '#000000',
  },
};

/**
 * How containers are derived from their accent color: `<role>-container` mixes the accent into
 * the surface, `on-<role>-container` mixes it into the text color. Percentages of the accent.
 */
export const containerMix: Record<ColorMode, { container: number; onContainer: number }> = {
  light: { container: 14, onContainer: 72 },
  dark: { container: 26, onContainer: 62 },
};

/** Elevation shadows per mode (Material 3 levels 1-3) */
export const elevationTokens: Record<ColorMode, Record<'1' | '2' | '3', string>> = {
  light: {
    '1': '0 1px 2px rgb(0 0 0 / 0.18), 0 1px 3px 1px rgb(0 0 0 / 0.08)',
    '2': '0 1px 2px rgb(0 0 0 / 0.18), 0 2px 6px 2px rgb(0 0 0 / 0.1)',
    '3': '0 4px 8px 3px rgb(0 0 0 / 0.1), 0 1px 3px rgb(0 0 0 / 0.18)',
  },
  dark: {
    '1': '0 1px 2px rgb(0 0 0 / 0.5), 0 1px 3px 1px rgb(0 0 0 / 0.3)',
    '2': '0 1px 2px rgb(0 0 0 / 0.5), 0 2px 6px 2px rgb(0 0 0 / 0.3)',
    '3': '0 4px 8px 3px rgb(0 0 0 / 0.3), 0 1px 3px rgb(0 0 0 / 0.5)',
  },
};

/** Inputs of the type scale: one base size, and ratios for each step */
export const typeTokens = {
  'font-family': 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  'font-family-mono': 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
  'font-size': '14px',
  'line-height': '1.5',
} as const;

export const typeSteps = ['xs', 'sm', 'md', 'lg', 'xl', '2xl'] as const;
export type TypeStep = (typeof typeSteps)[number];

/** Ratio of each step to `--np-font-size` (14px → 11, 12, 14, 16, 18, 24px) */
export const typeScale: Record<TypeStep, number> = {
  xs: 0.786,
  sm: 0.857,
  md: 1,
  lg: 1.143,
  xl: 1.286,
  '2xl': 1.714,
};

/** Inputs of shape and spacing: one base each, steps are multiples of it */
export const shapeTokens = { radius: '8px', space: '4px' } as const;

export const radiusSteps = ['xs', 'sm', 'md', 'lg'] as const;
export type RadiusStep = (typeof radiusSteps)[number];

/** Multiples of `--np-radius` (8px → 4, 8, 12, 16px); `--np-radius-full` is always round */
export const radiusScale: Record<RadiusStep, number> = { xs: 0.5, sm: 1, md: 1.5, lg: 2 };

/** Multiples of `--np-space` (4px → 4, 8, 12, 16, 20, 24, 32px) */
export const spaceScale = { '1': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '8': 8 } as const;
export type SpaceStep = keyof typeof spaceScale;

export const motionTokens = {
  duration: '150ms',
  easing: 'cubic-bezier(0.2, 0, 0, 1)',
} as const;

/** The CSS custom property of a token, e.g. `tokenName('color', 'primary')` → `--np-color-primary` */
export const tokenName = (group: string, name: string): string => `--np-${group}-${name}`;

/** `var(--np-…)` reference to a token */
export const tokenVar = (group: string, name: string): string => `var(${tokenName(group, name)})`;
