/**
 * @nostr-post/ui/web - Apply style overrides to a shadow root
 *
 * With constructable stylesheets the component's own sheets (adopted by Lit) are kept aside
 * and the root gets `own + added` or, for `replace`, only `added`. Without them (older
 * browsers, some test DOMs) the same is done with `<style>` elements.
 */

import type { ResolvedOverrides } from '../styleOverrides';

export interface RootStyles {
  readonly root: ShadowRoot;
  /** The component's own styles, captured the first time */
  readonly own: readonly CSSStyleSheet[] | readonly HTMLStyleElement[] | undefined;
  /** What we added last time (sheets or style elements) */
  readonly added: readonly (CSSStyleSheet | HTMLStyleElement)[];
}

const sheets = new Map<string, CSSStyleSheet>();

const canAdopt = (root: ShadowRoot): boolean =>
  'adoptedStyleSheets' in root &&
  typeof CSSStyleSheet !== 'undefined' &&
  'replaceSync' in CSSStyleSheet.prototype;

const sheetFor = (text: string): CSSStyleSheet => {
  const cached = sheets.get(text);
  if (cached) return cached;
  const sheet = new CSSStyleSheet();
  sheet.replaceSync(text);
  sheets.set(text, sheet);
  return sheet;
};

export const applyOverrides = (state: RootStyles, overrides: ResolvedOverrides): RootStyles => {
  const { root } = state;
  if (canAdopt(root)) {
    const own =
      (state.own as readonly CSSStyleSheet[] | undefined) ??
      root.adoptedStyleSheets.filter((s) => !state.added.includes(s));
    const added = overrides.css.map(sheetFor);
    if (!overrides.replace && added.length === 0 && state.added.length === 0) {
      return { root, own, added };
    }
    root.adoptedStyleSheets = [...(overrides.replace ? [] : own), ...added];
    return { root, own, added };
  }

  const own =
    (state.own as readonly HTMLStyleElement[] | undefined) ??
    [...root.querySelectorAll(':scope > style')].filter(
      (s): s is HTMLStyleElement => !state.added.includes(s as HTMLStyleElement)
    );
  for (const el of state.added) (el as HTMLStyleElement).remove();
  for (const el of own) el.disabled = overrides.replace;
  const added = overrides.css.map((text) => {
    const style = root.ownerDocument.createElement('style');
    style.dataset.npOverride = '';
    style.textContent = text;
    root.appendChild(style);
    return style;
  });
  return { root, own, added };
};
