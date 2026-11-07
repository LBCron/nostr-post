/**
 * @nostr-post/plugin-date - <np-date-input>
 *
 * Date input: a date, or a date and time with a time zone, depending on the field's
 * precision (on calendar events: the kind of the selected publish format, `.activeKinds`).
 * Accepts .value (DateValue), .field (PostField) and .activeKinds.
 * Dispatches 'np-value-changed' with { detail: { value: DateValue | undefined } }.
 */

import type { PostField } from '@nostr-post/plugins/types';
import { NpElement, npStyles } from '@nostr-post/ui/web';
import { css, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { datePrecision } from '../core';
import {
  type DateValue,
  defaultTimeZone,
  endsBeforeStart,
  isValidTimeZone,
  wallForPrecision,
} from '../dateValue';
import { renderDateProblems, renderTimeZoneInput } from './dateInputParts';
import { type DateMessages, DEFAULT_DATE_MESSAGES } from './dateMessages';

@customElement('np-date-input')
export class NpDateInput extends NpElement {
  static override styles = [
    ...npStyles,
    css`
    :host {
      display: block;
    }

    .row {
      display: flex;
      flex-wrap: wrap;
      align-items: end;
      gap: 0.5rem 0.75rem;
    }

    label {
      display: flex;
      flex-direction: column;
      gap: var(--np-space-1);
      font-size: var(--np-text-sm);
      font-weight: 500;
    }

    label .np-input {
      width: auto;
      font-weight: 400;
    }

    .tz {
      width: 12rem;
    }

    .error {
      margin: var(--np-space-1) 0 0;
    }

  `,
  ];

  @property({ type: Object }) value?: DateValue;
  @property({ type: Object }) field?: PostField;
  /** Kinds of the composer's selected publish format */
  @property({ type: Array }) activeKinds?: number[];
  @property({ type: Object }) messages: Partial<DateMessages> = {};
  /** The composer's error for the field: shown there, so the input doesn't repeat it */
  @property({ type: String }) error?: string;

  @state() private _endShown = false;

  private get _m(): DateMessages {
    return { ...DEFAULT_DATE_MESSAGES, ...this.messages };
  }

  private _emit(value: DateValue | undefined) {
    this.dispatchEvent(
      new CustomEvent('np-value-changed', { detail: { value }, bubbles: true, composed: true })
    );
  }

  private _update(changes: Partial<DateValue>, timed: boolean) {
    const next: DateValue = { ...(this.value ?? { start: '' }), ...changes };
    if (timed && !next.tzid) next.tzid = defaultTimeZone();
    if (!next.end) delete next.end;
    this._emit(next.start ? next : undefined);
  }

  private _removeEnd() {
    this._endShown = false;
    if (!this.value?.end) return;
    const { end: _end, ...rest } = this.value;
    this._emit(rest);
  }

  render() {
    const timed = this.field ? datePrecision(this.field, this.activeKinds) === 'time' : false;
    const precision = timed ? 'time' : 'day';
    const type = timed ? 'datetime-local' : 'date';
    const shown = (wall?: string) => (wall ? wallForPrecision(wall, precision) : '');
    const m = this._m;
    const endShown = this._endShown || Boolean(this.value?.end);
    const onDate = (key: 'start' | 'end') => (e: Event) =>
      this._update({ [key]: (e.target as HTMLInputElement).value }, timed);
    const endTooEarly = this.value ? endsBeforeStart(this.value, precision) : false;
    const tzid = this.value?.tzid;
    const badZone = timed && tzid !== undefined && !isValidTimeZone(tzid);

    return html`
      <div class="row">
        <label>
          ${m.start}
          <input
            class="np-input"
            part="input"
            type=${type}
            .value=${shown(this.value?.start)}
            @change=${onDate('start')}
          />
        </label>
        ${
          endShown
            ? html`
              <label>
                ${m.end}
                <input
                  class="np-input"
                  part="input"
                  type=${type}
                  min=${shown(this.value?.start)}
                  aria-invalid=${endTooEarly || this.error ? 'true' : 'false'}
                  .value=${shown(this.value?.end)}
                  @change=${onDate('end')}
                />
              </label>
              <button type="button" class="np-button np-text np-small" part="button" @click=${this._removeEnd}>${m.removeEnd}</button>
            `
            : html`<button type="button" class="np-button np-text np-small" part="button" @click=${() => {
                this._endShown = true;
              }}>${m.addEnd}</button>`
        }
        ${
          timed
            ? renderTimeZoneInput(tzid, badZone, m.timeZone, (zone) =>
                this._update({ tzid: zone }, timed)
              )
            : ''
        }
      </div>
      ${renderDateProblems({ endTooEarly, unknownZone: badZone ? tzid : undefined }, this.error, m)}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'np-date-input': NpDateInput;
  }
}
