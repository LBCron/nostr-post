/**
 * @nostr-post/web - <nostr-post-menu>
 *
 * A post's "⋯" menu: copy the author's npub, the post's naddr or nevent (with the relays it was
 * found on) and its JSON, or open the raw-data panel (`rawEventData`, `@nostr-post/posts`).
 * <nostr-post-view> shows it in every post's header; `hide-menu` there turns it off.
 */

import type { DisplayableEvent } from '@nostr-post/core/types';
import { type RawEventData, rawEventData } from '@nostr-post/posts';
import type { SignedEvent } from '@nostr-post/signer';
import { css, html, LitElement, nothing, unsafeCSS } from 'lit';
import { customElement, property, query, state } from 'lit/decorators.js';
import { DEFAULT_POST_MENU_MESSAGES, type PostMenuMessages } from './postMenuMessages';
import { type CopyTarget, copyText, renderMenuItems, renderRawPanel } from './postMenuPanel';
import { colors } from './theme';

const light = colors.light;
const dark = colors.dark;
const u = unsafeCSS;

@customElement('nostr-post-menu')
export class NostrPostMenu extends LitElement {
  static override styles = css`
    :host {
      position: relative;
      display: inline-block;
      font-size: 13px;
    }
    .toggle {
      border: none;
      background: none;
      cursor: pointer;
      padding: 0 0.375rem;
      font-size: 16px;
      line-height: 1;
      color: ${u(light.textSecondary)};
    }
    .menu {
      position: absolute;
      right: 0;
      top: 100%;
      z-index: 10;
      display: flex;
      flex-direction: column;
      min-width: 12rem;
      padding: 0.25rem 0;
      background: ${u(light.bg)};
      border: 1px solid ${u(light.border)};
      border-radius: 6px;
      box-shadow: 0 4px 12px rgb(0 0 0 / 12%);
    }
    .menu button {
      display: flex;
      justify-content: space-between;
      gap: 0.5rem;
      border: none;
      background: none;
      padding: 0.375rem 0.75rem;
      text-align: left;
      cursor: pointer;
      color: ${u(light.text)};
      font: inherit;
    }
    .menu button:hover {
      background: ${u(light.inputBg)};
    }
    .copied {
      color: ${u(light.textSecondary)};
    }
    dialog {
      width: min(48rem, 92vw);
      max-height: 85vh;
      overflow: auto;
      color: ${u(light.text)};
      background: ${u(light.bg)};
      border: 1px solid ${u(light.border)};
      border-radius: 8px;
    }
    .dialog-head {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .raw {
      display: grid;
      grid-template-columns: max-content 1fr;
      gap: 0.25rem 0.75rem;
    }
    dt {
      color: ${u(light.textSecondary)};
    }
    dd {
      margin: 0;
      overflow-wrap: anywhere;
    }
    ul {
      margin: 0;
      padding-left: 1rem;
    }
    h4 {
      display: flex;
      gap: 0.75rem;
      align-items: center;
      margin: 1rem 0 0.25rem;
    }
    .tags td {
      padding: 0.125rem 0.5rem 0.125rem 0;
      vertical-align: top;
      overflow-wrap: anywhere;
    }
    pre,
    .sig {
      display: block;
      padding: 0.5rem;
      overflow: auto;
      white-space: pre-wrap;
      overflow-wrap: anywhere;
      background: ${u(light.inputBg)};
      border-radius: 4px;
    }
    .copy,
    .close {
      font: inherit;
      font-size: 12px;
      cursor: pointer;
      color: ${u(light.text)};
      background: ${u(light.inputBg)};
      border: 1px solid ${u(light.border)};
      border-radius: 4px;
      padding: 0.125rem 0.5rem;
      margin-left: 0.5rem;
    }
    :host-context(.dark) .toggle,
    :host-context(.dark) .copied,
    :host-context(.dark) dt {
      color: ${u(dark.textSecondary)};
    }
    :host-context(.dark) .menu,
    :host-context(.dark) dialog {
      color: ${u(dark.text)};
      background: ${u(dark.bg)};
      border-color: ${u(dark.border)};
    }
    :host-context(.dark) .menu button {
      color: ${u(dark.text)};
    }
    :host-context(.dark) .menu button:hover,
    :host-context(.dark) pre,
    :host-context(.dark) .sig {
      background: ${u(dark.inputBg)};
    }
    :host-context(.dark) .copy,
    :host-context(.dark) .close {
      color: ${u(dark.text)};
      background: ${u(dark.inputBg)};
      border-color: ${u(dark.border)};
    }
  `;

  @property({ attribute: false }) event?: SignedEvent;
  /** Where the event was found; default: the relays this session fetched it from */
  @property({ type: Array, attribute: false }) relays?: string[];
  /** Overrides of DEFAULT_POST_MENU_MESSAGES (e.g. translations) */
  @property({ type: Object, attribute: false }) messages: Partial<PostMenuMessages> = {};

  @state() _open = false;
  @state() _copied?: { target: CopyTarget; ok: boolean };
  @query('dialog') _dialog?: HTMLDialogElement;

  /** Closes the menu on a click outside it */
  _onDocumentClick = (event: MouseEvent) => {
    if (!event.composedPath().includes(this)) this._open = false;
  };

  override connectedCallback(): void {
    super.connectedCallback();
    document.addEventListener('click', this._onDocumentClick);
  }

  override disconnectedCallback(): void {
    document.removeEventListener('click', this._onDocumentClick);
    super.disconnectedCallback();
  }

  get _messages(): PostMenuMessages {
    return { ...DEFAULT_POST_MENU_MESSAGES, ...this.messages };
  }

  _raw(event: SignedEvent): RawEventData {
    return rawEventData(event, this.relays);
  }

  async _copy(target: CopyTarget): Promise<void> {
    if (!this.event) return;
    const ok = await navigator.clipboard
      ?.writeText(copyText(this._raw(this.event), target))
      .then(() => true)
      .catch(() => false);
    this._copied = { target, ok: ok ?? false };
    setTimeout(() => {
      if (this._copied?.target === target) this._copied = undefined;
    }, 1500);
  }

  _showRaw(): void {
    this._open = false;
    this._dialog?.showModal();
  }

  override render() {
    if (!this.event) return nothing;
    const m = this._messages;
    const raw = this._raw(this.event);
    return html`
      <button
        type="button"
        class="toggle"
        aria-label=${m.menu}
        title=${m.menu}
        aria-haspopup="menu"
        aria-expanded=${this._open ? 'true' : 'false'}
        @click=${() => {
          this._open = !this._open;
        }}
      >
        ⋯
      </button>
      ${
        this._open
          ? renderMenuItems({
              raw,
              messages: m,
              copied: this._copied,
              onCopy: (target) => void this._copy(target),
              onRaw: () => this._showRaw(),
            })
          : nothing
      }
      <dialog>
        <div class="dialog-head">
          <strong>${m.rawData}</strong>
          <button type="button" class="close" @click=${() => this._dialog?.close()}>
            ${m.close}
          </button>
        </div>
        ${renderRawPanel(raw, m, (target) => void this._copy(target))}
      </dialog>
    `;
  }
}

/** A post's menu, for a signed event (a preview has no id or signature yet) */
export const renderPostMenu = (
  event: DisplayableEvent,
  messages: Partial<PostMenuMessages> = {}
) =>
  typeof event.id === 'string' && typeof event.sig === 'string'
    ? html`<nostr-post-menu .event=${event as SignedEvent} .messages=${messages}></nostr-post-menu>`
    : nothing;

declare global {
  interface HTMLElementTagNameMap {
    'nostr-post-menu': NostrPostMenu;
  }
}
