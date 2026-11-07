/**
 * @nostr-post/plugin-hashtag - <np-hashtag-input>
 *
 * Chip-style hashtag editor with inline text input, remove buttons,
 * batch entry (comma/space separated), and optional suggestions.
 *
 * Accepts .value (string[]) and .field (PostField).
 * Dispatches 'np-value-changed' with { detail: { value: string[] } }.
 */

import type { PostField } from '@nostr-post/plugins/types';
import { NpElement, npStyles } from '@nostr-post/ui/web';
import { html, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { type HashtagPluginConfig, normalizeTag } from '../core';
import { hashtagInputStyles } from './inputStyles';

@customElement('np-hashtag-input')
export class NpHashtagInput extends NpElement {
  static override styles = [...npStyles, hashtagInputStyles];

  @property({ type: Object })
  value: string[] | string = [];

  @property({ type: Object })
  field: PostField | null = null;

  @state() private inputValue = '';

  // Accept defensive coercion because external prefill/runtime code may pass strings.
  private get tags(): string[] {
    if (Array.isArray(this.value)) {
      return this.value.filter((t): t is string => typeof t === 'string');
    }
    if (typeof this.value === 'string') {
      return this.value
        .split(/[\s,]+/)
        .map(normalizeTag)
        .filter((t: string) => t.length > 0);
    }
    return [];
  }

  private get config(): HashtagPluginConfig {
    return (this.field?.metadata as HashtagPluginConfig) || {};
  }

  private get maxTags(): number {
    return this.config.maxTags ?? 20;
  }

  private get suggestions(): string[] {
    return (this.config.suggestions ?? []).filter((s) => !this.tags.includes(s));
  }

  private emitValue(tags: string[]) {
    this.value = tags;
    this.dispatchEvent(
      new CustomEvent('np-value-changed', {
        detail: { value: tags },
        bubbles: true,
        composed: true,
      })
    );
  }

  private addTags(raw: string) {
    const currentTags = this.tags;
    const newTags = raw
      .split(/[,\s]+/)
      .map(normalizeTag)
      .filter((t) => t.length > 0 && !currentTags.includes(t));

    if (newTags.length === 0) return;
    if (currentTags.length + newTags.length > this.maxTags) return;

    this.emitValue([...currentTags, ...newTags]);
    this.inputValue = '';
  }

  private removeTag(tag: string) {
    this.emitValue(this.tags.filter((t) => t !== tag));
  }

  private handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      this.addTags(this.inputValue);
    }
    if (e.key === 'Backspace' && this.inputValue === '' && this.tags.length > 0) {
      this.emitValue(this.tags.slice(0, -1));
    }
  }

  private handleBlur() {
    if (this.inputValue.trim()) {
      this.addTags(this.inputValue);
    }
  }

  private focusInput() {
    this.shadowRoot?.querySelector<HTMLInputElement>('.inline-input')?.focus();
  }

  render() {
    const tags = this.tags;

    return html`
      <div class="container">
        <div class="chip-box" @click=${this.focusInput}>
          ${tags.map(
            (tag) => html`
              <span class="chip np-chip" part="chip">
                #${tag}
                <button
                  type="button"
                  class="remove" part="button"
                  @click=${() => this.removeTag(tag)}
                >
                  ×
                </button>
              </span>
            `
          )}
          ${
            tags.length < this.maxTags
              ? html`
                <input
                  class="inline-input"
                  type="text"
                  placeholder=${tags.length === 0 ? 'Add hashtags…' : ''}
                  .value=${this.inputValue}
                  @input=${(e: Event) => {
                    this.inputValue = (e.target as HTMLInputElement).value;
                  }}
                  @keydown=${this.handleKeydown}
                  @blur=${this.handleBlur}
                />
              `
              : nothing
          }
        </div>

        ${
          this.suggestions.length > 0
            ? html`
              <div class="suggestions">
                ${this.suggestions.map(
                  (s) => html`
                    <button
                      type="button"
                      class="np-chip" part="chip"
                      @click=${() => this.addTags(s)}
                    >
                      #${s}
                    </button>
                  `
                )}
              </div>
            `
            : nothing
        }

        <div class="np-hint" part="hint">
          Press Enter or comma to add. #hashtags in your post content are
          auto-included.
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'np-hashtag-input': NpHashtagInput;
  }
}
