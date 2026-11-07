import { afterEach, describe, expect, it, vi } from 'vitest';
import { clearStyles, onStylesChange, registerStyles, stylesFor, unstyled } from './styleOverrides';

afterEach(() => clearStyles());

describe('style overrides', () => {
  it('adds CSS to a tag, global entries first', () => {
    registerStyles('my-card', '.a{}');
    registerStyles('*', '.all{}');
    expect(stylesFor('MY-CARD')).toEqual({ replace: false, css: ['.all{}', '.a{}'] });
    expect(stylesFor('other')).toEqual({ replace: false, css: ['.all{}'] });
  });

  it('replace drops what came before it', () => {
    registerStyles('*', '.all{}');
    registerStyles('my-card', '.a{}');
    registerStyles('my-card', '.mine{}', { mode: 'replace' });
    registerStyles('my-card', '.after{}');
    expect(stylesFor('my-card')).toEqual({ replace: true, css: ['.mine{}', '.after{}'] });
  });

  it('unstyled replaces with nothing', () => {
    unstyled('my-card');
    expect(stylesFor('my-card')).toEqual({ replace: true, css: [] });
  });

  it('returns a remover and notifies listeners', () => {
    const listener = vi.fn();
    const off = onStylesChange(listener);
    const remove = registerStyles('my-card', '.a{}');
    remove();
    expect(stylesFor('my-card')).toEqual({ replace: false, css: [] });
    expect(listener).toHaveBeenCalledTimes(2);
    off();
  });
});
