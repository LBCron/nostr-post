/**
 * <np-field-action-panel> - a field action that has a choice (FieldAction `setting`, e.g. the
 * media plugin's photo quality): its icon button opens a panel in the page's top layer with a
 * button running the action, a drop zone (`onDropFiles`) and the choice, each option with what it
 * means. The text field's toolbar keeps only icons. Escape or a click outside closes it.
 */

import { panelPosition } from '@nostr-post/plugins/panelPosition';
import type { FieldActionSetting } from '@nostr-post/plugins/types';
import { css, html, LitElement, nothing, unsafeCSS } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { baseStyles, colors } from './theme';

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

const { light, dark } = colors;
const u = unsafeCSS;

@customElement('np-field-action-panel')
export class NpFieldActionPanel extends LitElement {
  static override styles = [
    baseStyles,
    css`
      :host {
        display: inline-block;
      }
      .panel {
        position: fixed;
        inset: auto;
        margin: 0;
        width: min(20rem, calc(100vw - 1rem));
        max-height: calc(100vh - 1rem);
        overflow: auto;
        padding: 0.75rem;
        background: ${u(light.bg)};
        color: ${u(light.text)};
        border: 1px solid ${u(light.border)};
        border-radius: 8px;
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
        font-size: 0.875rem;
      }
      .drop {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.375rem;
        padding: 0.75rem;
        border: 2px dashed ${u(light.border)};
        border-radius: 8px;
        color: ${u(light.textSecondary)};
        font-size: 0.8125rem;
      }
      .drop.over {
        border-color: ${u(light.primary)};
      }
      fieldset {
        margin: 0.75rem 0 0;
        padding: 0;
        border: none;
      }
      legend {
        padding: 0;
        margin-bottom: 0.375rem;
        font-weight: 600;
      }
      .option {
        display: grid;
        grid-template-columns: auto 1fr;
        gap: 0 0.5rem;
        padding: 0.375rem 0.25rem;
        border-radius: 6px;
        cursor: pointer;
      }
      .option:hover {
        background: ${u(light.inputBg)};
      }
      .option input {
        grid-row: span 2;
        align-self: start;
        margin: 0.2rem 0 0;
      }
      .description,
      .hint {
        color: ${u(light.textSecondary)};
        font-size: 0.8125rem;
      }
      .hint {
        margin: 0.5rem 0 0;
      }
      :host-context(.dark) .panel {
        background: ${u(dark.bg)};
        color: ${u(dark.text)};
        border-color: ${u(dark.border)};
      }
      :host-context(.dark) .drop {
        border-color: ${u(dark.border)};
        color: ${u(dark.textSecondary)};
      }
      :host-context(.dark) .drop.over {
        border-color: ${u(dark.primary)};
      }
      :host-context(.dark) .option:hover {
        background: ${u(dark.inputBg)};
      }
      :host-context(.dark) .description,
      :host-context(.dark) .hint {
        color: ${u(dark.textSecondary)};
      }
    `,
  ];

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
        class="field-action"
        title=${action.label}
        aria-label=${action.label}
        aria-haspopup="dialog"
        aria-expanded=${this._open ? 'true' : 'false'}
        popovertarget="panel"
      >${action.icon}</button>
      <div
        id="panel"
        class="panel"
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
          <button type="button" class="primary" @click=${this._run}>
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
        ${setting.hint ? html`<p class="hint">${setting.hint}</p>` : nothing}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'np-field-action-panel': NpFieldActionPanel;
  }
}
