import { describe, expect, it } from 'vitest';
import { primitivesCss } from './primitivesCss';
import { mixColors, resolveTokens } from './resolveTokens';
import { colorTokens } from './tokens';
import { tokensCss } from './tokensCss';
import { uiCss } from './uiCss';

describe('tokensCss', () => {
  const text = tokensCss();

  it('puts everything in the np.tokens layer', () => {
    expect(text.startsWith('@layer np.tokens {')).toBe(true);
  });

  it('declares light values on :root and dark values on .dark', () => {
    expect(text).toMatch(/:root \{[^}]*--np-color-primary: #4f46e5;/);
    expect(text).toMatch(/\.dark \{[^}]*--np-color-primary: #c3c0ff;/);
    expect(text).toMatch(/\.dark \{[^}]*color-scheme: dark;/);
  });

  it('derives containers, sizes and radii from the base tokens', () => {
    expect(text).toContain(
      '--np-color-primary-container: color-mix(in srgb, var(--np-color-primary) var(--np-mix-container), var(--np-color-surface));'
    );
    expect(text).toContain('--np-text-sm: calc(var(--np-font-size) * 0.857);');
    expect(text).toContain('--np-radius-md: calc(var(--np-radius) * 1.5);');
    expect(text).toContain('--np-space-4: calc(var(--np-space) * 4);');
  });

  it('re-derives in .np-theme, without resetting base values', () => {
    const theme = text.slice(text.indexOf('.np-theme {'));
    expect(theme).toContain('--np-text-md');
    expect(theme).not.toContain('--np-color-primary: #');
  });
});

describe('uiCss', () => {
  it('contains tokens and primitives, primitives in their own layer', () => {
    const text = uiCss();
    expect(text).toContain('@layer np.tokens');
    expect(text).toContain('@layer np.primitives');
    expect(text).toContain('.np-button.np-filled');
    expect(primitivesCss()).not.toMatch(/#[0-9a-f]{3,8}\b|rgba?\(/i);
  });
});

describe('resolveTokens', () => {
  it('resolves every color of a mode, containers included', () => {
    const dark = resolveTokens('dark');
    expect(dark.color.surface).toBe(colorTokens.dark.surface);
    expect(dark.color['primary-container']).toMatch(/^#[0-9a-f]{6}$/);
  });

  it('follows overrides like the CSS does', () => {
    const t = resolveTokens('light', { color: { primary: '#ff0000' }, fontSize: 16, radius: 10 });
    expect(t.color.primary).toBe('#ff0000');
    expect(t.color['primary-container']).toBe(mixColors('#ff0000', colorTokens.light.surface, 14));
    expect(t.text.md).toBe(16);
    expect(t.text.sm).toBe(14);
    expect(t.radius.md).toBe(15);
    expect(t.space['4']).toBe(16);
  });
});

describe('mixColors', () => {
  it('mixes in sRGB', () => {
    expect(mixColors('#ffffff', '#000000', 50)).toBe('#808080');
    expect(mixColors('#f00', '#00f', 100)).toBe('#ff0000');
  });
  it('returns the first color unchanged for non-hex values', () => {
    expect(mixColors('red', '#000', 50)).toBe('red');
  });
});

describe('color scheme', () => {
  it('follows the system only for "system"', async () => {
    const { isDarkScheme, parseColorScheme } = await import('./colorScheme');
    expect(isDarkScheme('system', true)).toBe(true);
    expect(isDarkScheme('light', true)).toBe(false);
    expect(isDarkScheme('dark', false)).toBe(true);
    expect(parseColorScheme('dark')).toBe('dark');
    expect(parseColorScheme('blue')).toBe('system');
  });
});

describe('overridesCss', () => {
  it('writes the overrides as a rule', async () => {
    const { overridesCss } = await import('./overridesCss');
    expect(overridesCss({ color: { primary: '#0b57d0' }, fontSize: 15, radius: 12 })).toBe(
      ':root {\n  --np-color-primary: #0b57d0;\n  --np-font-size: 15px;\n  --np-radius: 12px;\n}\n'
    );
    expect(overridesCss({}, '.dark')).toBe('');
  });
});
