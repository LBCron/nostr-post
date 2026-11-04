/**
 * @nostr-post/plugin-date - <np-date-view>
 *
 * Read-only date display in the viewer's locale. A timed value reads in its own zone (an
 * event's `start_tzid`, the venue's time), labelled with it, and in the viewer's zone below
 * when theirs is another; a timed value without a zone reads in the viewer's, labelled so
 * (`dateDisplay`). Accepts .value (DateValue), .field (PostField) and .messages.
 */

import type { PostField } from '@nostr-post/plugins/types';
import { css, html, LitElement, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { dateDisplay } from '../dateDisplay';
import { type DateValue, isDateValue } from '../dateValue';
import { type DateMessages, DEFAULT_DATE_MESSAGES } from './dateMessages';

@customElement('np-date-view')
export class NpDateView extends LitElement {
  static override styles = css`
    :host {
      display: block;
    }

    .date {
      padding: 0.25rem 0;
    }

    .tz,
    .viewer {
      font-size: 0.8125rem;
      color: #6b7280;
    }

    .tz {
      margin-left: 0.375rem;
    }

    :host-context(.dark) .tz,
    :host-context(.dark) .viewer {
      color: #9ca3af;
    }
  `;

  @property({ type: Object }) value?: DateValue;
  @property({ type: Object }) field?: PostField;
  /** Overrides of DEFAULT_DATE_MESSAGES (e.g. translations) */
  @property({ type: Object }) messages: Partial<DateMessages> = {};

  override render() {
    if (!isDateValue(this.value)) return html``;
    const m = { ...DEFAULT_DATE_MESSAGES, ...this.messages };
    const shown = dateDisplay(this.value);
    const label = shown.zone ?? (shown.inViewerZone ? m.inYourTime : undefined);
    return html`<div class="date">
      ${shown.text}${label ? html`<span class="tz">${label}</span>` : nothing}
      ${shown.viewerText ? html`<div class="viewer">${m.yourTime(shown.viewerText)}</div>` : nothing}
    </div>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'np-date-view': NpDateView;
  }
}
