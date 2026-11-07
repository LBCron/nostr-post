/**
 * @nostr-post/plugin-hashtag - <np-hashtag-view>
 *
 * Read-only hashtag pill display.
 * Accepts .value (string[]) and .field (PostField).
 */

import type { PostField } from '@nostr-post/plugins/types';
import { NpElement, npStyles } from '@nostr-post/ui/web';
import { css, html, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';

@customElement('np-hashtag-view')
export class NpHashtagView extends NpElement {
  static override styles = [
    ...npStyles,
    css`
    :host {
      display: block;
    }
    .tags {
      display: inline-flex;
      flex-wrap: wrap;
      gap: 0.375rem;
      align-items: center;
      max-width: 100%;
    }
    .tag {
      border-color: transparent;
      background: var(--np-color-tertiary-container);
      color: var(--np-color-on-tertiary-container);
    }
  `,
  ];

  @property({ type: Array })
  value: string[] = [];

  @property({ type: Object })
  field: PostField | null = null;

  render() {
    const tags = Array.isArray(this.value) ? this.value : [];
    if (tags.length === 0) return nothing;

    return html`<div class="tags">${tags.map((tag) => html`<span class="tag np-chip" part="chip">#${tag}</span>`)}</div>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'np-hashtag-view': NpHashtagView;
  }
}
