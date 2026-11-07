/**
 * @nostr-post/calendar - <nostr-calendar-section-agenda>
 *
 * The `agenda` view of a page's section (`sections` of a manifest, `<nostr-post-sections>`):
 * the section's calendar events in an agenda from today, each at its own place's time, e.g. an
 * artist's or a venue's upcoming gigs. Other items of the section are left out.
 */

import type { PostSection } from '@nostr-post/core/types';
import type { SignedEvent } from '@nostr-post/signer';
import { NpElement } from '@nostr-post/ui/web';
import { html, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { isCalendarEventAddress } from '../rsvp';
import './agenda';

const addressOf = (event: SignedEvent): string =>
  `${event.kind}:${event.pubkey}:${event.tags.find((t) => t[0] === 'd')?.[1] ?? ''}`;

@customElement('nostr-calendar-section-agenda')
export class NostrCalendarSectionAgenda extends NpElement {
  /** The section's events */
  @property({ attribute: false }) items: SignedEvent[] = [];
  @property({ attribute: false }) section?: PostSection;
  @property({ type: Array }) relays?: string[];

  /** A new array only when the items change: the agenda reloads on a new one */
  _addresses: string[] = [];

  override willUpdate(changed: Map<string, unknown>): void {
    if (changed.has('items')) {
      this._addresses = [...new Set(this.items.map(addressOf))].filter(isCalendarEventAddress);
    }
  }

  override render() {
    if (this._addresses.length === 0) return nothing;
    // Each event at its own place's time (a touring artist's gigs in their cities' times)
    return html`<nostr-calendar-agenda
      .addresses=${this._addresses}
      .relays=${this.relays}
      event-zones
    ></nostr-calendar-agenda>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'nostr-calendar-section-agenda': NostrCalendarSectionAgenda;
  }
}
