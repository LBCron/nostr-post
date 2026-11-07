import type { PostField } from '@nostr-post/plugins/types';
import { NpElement, npStyles } from '@nostr-post/ui/web';
import { css, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { normalizeExternalUrl, type ReferenceValue } from '../core';

const EMPTY: ReferenceValue = { urls: [], p: [], q: [], a: [] };

const decodeValue = (value: unknown): ReferenceValue => {
  if (typeof value === 'string' && value.startsWith('{')) {
    try {
      return { ...EMPTY, ...(JSON.parse(value) as Partial<ReferenceValue>) };
    } catch {
      return { ...EMPTY };
    }
  }
  return { ...EMPTY };
};

@customElement('np-reference-input')
export class NpReferenceInput extends NpElement {
  static override styles = [
    ...npStyles,
    css`
    :host {
      display: block;
    }

    .container {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .row {
      display: flex;
      gap: 0.5rem;
      align-items: center;
    }

    .row .np-input {
      flex: 1;
    }

    .list {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .item {
      flex-direction: row;
      align-items: center;
      padding: var(--np-space-1) var(--np-space-1) var(--np-space-1) var(--np-space-3);
    }

    .item a {
      flex: 1;
      color: var(--np-color-primary);
      text-decoration: none;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .item a:hover {
      text-decoration: underline;
    }

  `,
  ];

  @property({ type: String })
  value = '';

  @property({ type: Object })
  field: PostField | null = null;

  @state() private draftUrl = '';

  private get refValue(): ReferenceValue {
    return decodeValue(this.value);
  }

  private emitValue(next: ReferenceValue) {
    this.value = JSON.stringify(next);
    this.dispatchEvent(
      new CustomEvent('np-value-changed', {
        detail: { value: this.value },
        bubbles: true,
        composed: true,
      })
    );
  }

  private addUrl() {
    const raw = this.draftUrl.trim();
    if (!raw) return;
    const normalized = normalizeExternalUrl(raw);
    if (!/^https?:\/\//i.test(normalized)) return;

    const current = this.refValue;
    if (current.urls.includes(normalized)) {
      this.draftUrl = '';
      return;
    }

    this.emitValue({
      ...current,
      urls: [...current.urls, normalized],
    });
    this.draftUrl = '';
  }

  private removeUrl(url: string) {
    const current = this.refValue;
    this.emitValue({
      ...current,
      urls: current.urls.filter((candidate) => candidate !== url),
    });
  }

  render() {
    const refs = this.refValue;

    return html`
      <div class="container">
        <div class="row">
          <input
            class="np-input" part="input"
            type="url"
            .value=${this.draftUrl}
            placeholder="https://example.com"
            @input=${(e: Event) => {
              this.draftUrl = (e.target as HTMLInputElement).value;
            }}
            @keydown=${(e: KeyboardEvent) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                this.addUrl();
              }
            }}
          />
          <button type="button" class="np-button" part="button" @click=${this.addUrl} title="Add URL">
            Add URL
          </button>
        </div>
        <div class="np-hint" part="hint">Add external links manually. URLs found in the attached field are also extracted automatically.</div>
        <div class="list">
          ${refs.urls.map(
            (url) => html`
              <div class="item np-card np-outlined" part="card">
                <a href=${url} target="_blank" rel="noopener">${url}</a>
                <button
                  type="button"
                  class="np-icon-button np-danger" part="button"
                  title="Remove URL"
                  @click=${() => this.removeUrl(url)}
                >×</button>
              </div>
            `
          )}
        </div>
      </div>
    `;
  }
}
