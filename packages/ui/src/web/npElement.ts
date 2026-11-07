/**
 * @nostr-post/ui/web - Base class of nostr-post custom elements
 *
 * Installs the tokens and applies the style overrides registry (`registerStyles`) to the
 * element's shadow root, also when overrides change after the element is on the page.
 */

import { LitElement } from 'lit';
import { onStylesChange, stylesFor } from '../styleOverrides';
import { applyOverrides, type RootStyles } from './applyOverrides';
import { installTokens } from './styles';

const connected = new Set<NpElement>();
let subscribed = false;

const refreshAll = (): void => {
  for (const element of connected) element._applyStyleOverrides();
};

export class NpElement extends LitElement {
  private _rootStyles: RootStyles | undefined;

  protected override createRenderRoot(): HTMLElement | DocumentFragment {
    const root = super.createRenderRoot();
    if (root instanceof ShadowRoot) {
      this._rootStyles = { root, own: undefined, added: [] };
      this._applyStyleOverrides();
    }
    return root;
  }

  override connectedCallback(): void {
    installTokens(this.ownerDocument);
    super.connectedCallback();
    connected.add(this);
    if (!subscribed) {
      onStylesChange(refreshAll);
      subscribed = true;
    }
    this._applyStyleOverrides();
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    connected.delete(this);
  }

  /** @internal Re-apply `registerStyles` entries for this element's tag */
  _applyStyleOverrides(): void {
    if (this._rootStyles) {
      this._rootStyles = applyOverrides(this._rootStyles, stylesFor(this.localName));
    }
  }
}
