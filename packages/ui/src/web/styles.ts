/**
 * @nostr-post/ui/web - Lit styles of the shared visual language
 *
 * Components put `npStyles` first in their `static styles`, then their own styles:
 * `static override styles = [...npStyles, myStyles]`.
 */

import { type CSSResult, css, unsafeCSS } from 'lit';
import { primitivesCss } from '../primitivesCss';
import { tokensCss } from '../tokensCss';

/** Host defaults: font, text color and box sizing from the tokens */
export const npBase: CSSResult = css`
  :host {
    color: var(--np-color-on-surface);
    font-family: var(--np-font-family);
    font-size: var(--np-text-md);
    line-height: var(--np-line-height);
  }

  *,
  *::before,
  *::after {
    box-sizing: border-box;
  }

  [hidden] {
    display: none !important;
  }
`;

/** The shared primitives (`np-button`, `np-input`, `np-card`, …) for shadow DOM */
export const npPrimitives: CSSResult = unsafeCSS(primitivesCss());

/** Base and primitives, in the order components use them */
export const npStyles: readonly CSSResult[] = [npBase, npPrimitives];

const installed = new WeakSet<Document>();

/**
 * Put the token stylesheet into a document once (in its own cascade layer, so the page's
 * rules win). Components call it when they connect; apps may call it early to avoid a flash.
 */
export const installTokens = (doc: Document | undefined = globalThis.document): void => {
  if (!doc || installed.has(doc)) return;
  installed.add(doc);
  const text = tokensCss();
  const view = doc.defaultView;
  if (view && 'adoptedStyleSheets' in doc && 'replaceSync' in view.CSSStyleSheet.prototype) {
    const sheet = new view.CSSStyleSheet();
    sheet.replaceSync(text);
    doc.adoptedStyleSheets = [sheet, ...doc.adoptedStyleSheets];
    return;
  }
  const style = doc.createElement('style');
  style.dataset.npTokens = '';
  style.textContent = text;
  doc.head.prepend(style);
};
