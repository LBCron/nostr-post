/**
 * @nostr-post/plugin-stars - <np-stars-input>
 *
 * Interactive star rating input as a Lit web component.
 * Accepts .value (number) and .field (PostField).
 * Dispatches 'np-value-changed' with { detail: { value: number } }.
 */

import type { PostField } from '@nostr-post/plugins/types';
import { NpElement, npStyles } from '@nostr-post/ui/web';
import { css, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import type { StarsPluginConfig } from '../core';

@customElement('np-stars-input')
export class NpStarsInput extends NpElement {
  static override styles = [
    ...npStyles,
    css`
    :host {
      display: block;
    }

    .stars-row {
      display: flex;
      align-items: center;
      gap: 0.125rem;
      flex-wrap: wrap;
    }

    .star {
      font-size: var(--np-text-2xl);
      background: transparent;
      border: none;
      cursor: pointer;
      padding: 0.125rem;
      transition:
        transform 0.1s,
        color 0.15s;
      line-height: 1;
      position: relative;
      width: 1.75rem;
      height: 1.75rem;
    }

    .star:hover {
      transform: scale(1.2);
    }

    .star-glyph {
      position: absolute;
      inset: 0;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      pointer-events: none;
      user-select: none;
    }

    .star-bg {
      color: var(--np-color-outline-variant);
    }

    .star-fill {
      color: var(--np-color-rating);
      overflow: hidden;
      white-space: nowrap;
    }

    .value-label {
      margin-left: 0.5rem;
      font-size: var(--np-text-md);
      color: var(--np-color-on-surface-variant);
    }

    .value-input {
      margin-left: 0.5rem;
      width: 5rem;
      min-height: 2.25em;
      padding: var(--np-space-1) var(--np-space-2);
    }
  `,
  ];

  @property({ type: Number })
  value = 0;

  @property({ type: Object })
  field: PostField | null = null;

  private get config(): StarsPluginConfig {
    return (this.field?.metadata as StarsPluginConfig) || {};
  }

  private get max(): number {
    return this.config.max ?? 5;
  }

  private get min(): number {
    return this.config.min ?? 1;
  }

  private get step(): number {
    const step = this.config.step ?? 1;
    return step > 0 ? step : 1;
  }

  private clampAndSnap(raw: number): number {
    const clamped = Math.min(this.max, Math.max(this.min, raw));
    const snapped = this.min + Math.round((clamped - this.min) / this.step) * this.step;
    return Number(snapped.toFixed(10));
  }

  private emitValue(next: number) {
    this.value = next;
    this.dispatchEvent(
      new CustomEvent('np-value-changed', {
        detail: { value: next },
        bubbles: true,
        composed: true,
      })
    );
  }

  private selectStar(event: MouseEvent, starIndex: number) {
    if (this.step >= 1) {
      this.emitValue(this.clampAndSnap(starIndex));
      return;
    }

    const target = event.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    const x = Math.min(rect.width, Math.max(0, event.clientX - rect.left));
    const ratio = rect.width > 0 ? x / rect.width : 1;
    const raw = starIndex - 1 + ratio;
    this.emitValue(this.clampAndSnap(raw));
  }

  private onManualInput(event: Event) {
    const input = event.target as HTMLInputElement;
    const raw = Number.parseFloat(input.value);
    if (Number.isNaN(raw)) return;
    this.emitValue(this.clampAndSnap(raw));
  }

  private fillPercent(starIndex: number): number {
    const fill = this.value - (starIndex - 1);
    return Math.max(0, Math.min(1, fill)) * 100;
  }

  render() {
    const stars = [];
    for (let i = 1; i <= this.max; i++) {
      const fill = this.fillPercent(i);
      stars.push(html`
        <button
          type="button"
          class="star"
          @click=${(e: MouseEvent) => this.selectStar(e, i)}
          title="${i} star${i > 1 ? 's' : ''}"
        >
          <span class="star-glyph star-bg">★</span>
          <span class="star-glyph star-fill" style="width: ${fill}%">★</span>
        </button>
      `);
    }

    return html`
      <div class="stars-row">
        ${stars}
        <input
          class="value-input np-input"
          part="input"
          type="number"
          min="${this.min}"
          max="${this.max}"
          step="${this.step}"
          .value=${String(this.value || '')}
          @input=${this.onManualInput}
          aria-label="Rating value"
        />
        ${
          this.config.showNumber
            ? html`<span class="value-label">${this.value}/${this.max}</span>`
            : ''
        }
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'np-stars-input': NpStarsInput;
  }
}
