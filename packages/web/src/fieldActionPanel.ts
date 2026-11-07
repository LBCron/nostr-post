/**
 * <np-field-action-panel> - a field action that has a choice (FieldAction `setting`, e.g. the
 * media plugin's photo quality): its icon button opens a panel in the page's top layer with a
 * button running the action, a drop zone (`onDropFiles`) and the choice, each option with what it
 * means. The text field's toolbar keeps only icons. Escape or a click outside closes it.
 */

import { panelPosition } from '@nostr-post/plugins/panelPosition';
import type { FieldActionSetting } from '@nostr-post/plugins/types';
import { NpElement, npStyles } from '@nostr-post/ui/web';
import { html, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { fieldActionStyles } from './fieldActionStyles';

/** A field action bound to its field (composerField's toolbar) */
export interface PanelFieldAction {
  icon: string;
  label: string;
  runLabel?: string;
  setting: FieldActionSetting;
  run: () => void | Promise<void>;
  dropLabel?: string;
  dropFiles?: (files: File[]) => void | Promise<void>;
}

@customElement('np-field-action-panel')
export class NpFieldActionPanel extends NpElement {
  static override styles = [...npStyles, fieldActionStyles];

  @property({ attribute: false }) action?: PanelFieldAction;

  /** The option picked here; until then the setting's value */
  @state() _value = '';
  @state() _open = false;
  @state() _over = false;

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this._listen(false);
  }

  _panel(): HTMLElement | null {
    return this.renderRoot.querySelector<HTMLElement>('.panel');
  }

  _listen(on: boolean): void {
    const method = on ? 'addEventListener' : 'removeEventListener';
    window[method]('scroll', this._place, true);
    window[method]('resize', this._place);
  }

  /** Next to the button, below it or above when there's more room */
  _place = (): void => {
    const panel = this._panel();
    const button = this.renderRoot.querySelector<HTMLElement>('.field-action');
    if (!panel || !button) return;
    const { top, left } = panelPosition(
      button.getBoundingClientRect(),
      panel.getBoundingClientRect(),
      { width: window.innerWidth, height: window.innerHeight },
      'start'
    );
    panel.style.top = `${top}px`;
    panel.style.left = `${left}px`;
  };

  _onToggle(e: ToggleEvent): void {
    this._open = e.newState === 'open';
    this._listen(this._open);
    if (this._open) this._place();
  }

  _close(): void {
    const panel = this._panel();
    if (panel?.matches(':popover-open')) panel.hidePopover();
  }

  _run(): void {
    this._close();
    void this.action?.run();
  }

  _drop(e: DragEvent): void {
    e.preventDefault();
    this._over = false;
    const files = Array.from(e.dataTransfer?.files ?? []);
    if (!files.length) return;
    this._close();
    void this.action?.dropFiles?.(files);
  }

  _pick(value: string): void {
    this._value = value;
    this.action?.setting.onChange(value);
  }

  override render() {
    const action = this.action;
    if (!action) return nothing;
    const { setting } = action;
    const selected = this._value || setting.value;
    return html`
      <button
        type="button"
        class="field-action np-icon-button"
        part="button"
        title=${action.label}
        aria-label=${action.label}
        aria-haspopup="dialog"
        aria-expanded=${this._open ? 'true' : 'false'}
        popovertarget="panel"
      >${action.icon}</button>
      <div
        id="panel"
        class="panel"
        part="menu"
        popover="auto"
        role="dialog"
        aria-label=${action.label}
        @toggle=${this._onToggle}
      >
        <div
          class="drop ${this._over ? 'over' : ''}"
          @dragover=${(e: DragEvent) => {
            if (!action.dropFiles) return;
            e.preventDefault();
            this._over = true;
          }}
          @dragleave=${() => {
            this._over = false;
          }}
          @drop=${this._drop}
        >
          <button type="button" class="np-button np-filled np-small" part="button primary" @click=${this._run}>
            ${action.runLabel ?? action.label}
          </button>
          ${action.dropFiles && action.dropLabel ? html`<span>${action.dropLabel}</span>` : nothing}
        </div>
        <fieldset>
          <legend>${setting.label}</legend>
          ${setting.options.map(
            (option) => html`
              <label class="option">
                <input
                  type="radio"
                  name="setting"
                  .value=${option.value}
                  .checked=${option.value === selected}
                  @change=${() => this._pick(option.value)}
                />
                <span>${option.label}</span>
                ${
                  option.description
                    ? html`<span class="description">${option.description}</span>`
                    : nothing
                }
              </label>
            `
          )}
        </fieldset>
        ${setting.hint ? html`<p class="hint np-hint">${setting.hint}</p>` : nothing}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'np-field-action-panel': NpFieldActionPanel;
  }
}
