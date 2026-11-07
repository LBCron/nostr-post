/** Template parts of <nostr-post-menu>: the menu's items and the raw-data panel */

import type { RawEventData } from '@nostr-post/posts';
import { html, nothing, type TemplateResult } from 'lit';
import type { PostMenuMessages } from './postMenuMessages';

/** What can be copied, and its text */
export type CopyTarget = 'npub' | 'pointer' | 'json';

export const copyText = (raw: RawEventData, target: CopyTarget): string =>
  target === 'npub' ? raw.npub : target === 'pointer' ? raw.pointer : raw.json;

/** `naddr` or `nevent` */
export const pointerPrefix = (raw: RawEventData): string => raw.pointer.split('1')[0] ?? '';

export interface MenuItemsOptions {
  raw: RawEventData;
  messages: PostMenuMessages;
  /** The copy that just ran, and how it went */
  copied?: { target: CopyTarget; ok: boolean };
  onCopy: (target: CopyTarget) => void;
  onRaw: () => void;
  /** Set when the post is in the test-mode log: publishes it for real */
  onPublish?: () => void;
}

export const renderMenuItems = ({
  raw,
  messages: m,
  copied,
  onCopy,
  onRaw,
  onPublish,
}: MenuItemsOptions): TemplateResult => {
  const item = (target: CopyTarget, label: string) => html`<button
    type="button"
    class="np-menu-item"
    role="menuitem"
    @click=${() => onCopy(target)}
  >
    ${label}${
      copied?.target === target
        ? html`<span class="copied np-hint">${copied.ok ? m.copied : m.copyFailed}</span>`
        : nothing
    }
  </button>`;
  return html`<div class="menu np-menu" part="menu" role="menu">
    ${item('npub', m.copyNpub)} ${item('pointer', m.copyPointer(pointerPrefix(raw)))}
    ${item('json', m.copyJson)}
    <button type="button" class="np-menu-item" role="menuitem" @click=${onRaw}>${m.rawData}</button>
    ${
      onPublish
        ? html`<button type="button" class="np-menu-item" role="menuitem" @click=${onPublish}>
            ${m.publishForReal}
          </button>`
        : nothing
    }
  </div>`;
};

const row = (label: string, value: TemplateResult | string) =>
  html`<dt>${label}</dt><dd>${value}</dd>`;

/** The raw-data panel: who, what, where it was found, every tag, the JSON and the signature */
export const renderRawPanel = (
  raw: RawEventData,
  m: PostMenuMessages,
  onCopy: (target: CopyTarget) => void
): TemplateResult => html`
  <dl class="raw">
    ${row(m.author, html`<code>${raw.npub}</code>`)}
    ${row(m.kind, String(raw.kind))}
    ${raw.dTag === undefined ? nothing : row(m.dTag, html`<code>${raw.dTag}</code>`)}
    ${row(
      m.pointer,
      html`<code class="pointer">${raw.pointer}</code>
        <button type="button" class="copy np-button np-text np-small" part="button" @click=${() => onCopy('pointer')}>
          ${m.copyPointer(pointerPrefix(raw))}
        </button>`
    )}
    ${row(
      m.relays,
      raw.relays.length > 0
        ? html`<ul>${raw.relays.map((relay) => html`<li><code>${relay}</code></li>`)}</ul>`
        : m.noRelays
    )}
  </dl>
  <h4>${m.tags}</h4>
  <table class="tags">
    ${raw.tags.map(
      (tag) => html`<tr>${tag.map((part) => html`<td><code>${part}</code></td>`)}</tr>`
    )}
  </table>
  <h4>
    ${m.json}
    <button type="button" class="copy np-button np-text np-small" part="button" @click=${() => onCopy('json')}>${m.copyJson}</button>
  </h4>
  <pre>${raw.json}</pre>
  <h4>${m.signature}</h4>
  <code class="sig">${raw.sig}</code>
`;
