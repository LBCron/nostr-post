/**
 * @nostr-post/web - <nostr-dry-run-publish>
 *
 * Publishes a post from the test-mode log for real, with the logged events it links (e.g. the
 * venue and artist pages a gig created): lists them, says which relays already have in a newer
 * version (those aren't sent), then sends the others and removes them from the log (signer's
 * `dryRunBundle`, `newerOnRelays`, `publishDryRunEntries`). The post's "⋯" menu opens it for a
 * logged post; apps can show it anywhere with `event-id`. Fires `dry-run-published` with the
 * results (`DryRunPublishResult[]`).
 */

import { eventTitle } from '@nostr-post/posts';
import {
  type DryRunEntry,
  type DryRunPublishResult,
  dryRunBundle,
  newerOnRelays,
  publishDryRunEntries,
} from '@nostr-post/signer';
import { NpElement, npStyles } from '@nostr-post/ui/web';
import { html, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import {
  DEFAULT_DRY_RUN_PUBLISH_MESSAGES,
  type DryRunPublishMessages,
} from './dryRunPublishMessages';
import { dryRunPublishStyles } from './dryRunPublishStyles';

@customElement('nostr-dry-run-publish')
export class NostrDryRunPublish extends NpElement {
  static override styles = [...npStyles, dryRunPublishStyles];

  /** The logged post's id */
  @property({ attribute: 'event-id' }) eventId = '';
  /** Overrides of DEFAULT_DRY_RUN_PUBLISH_MESSAGES (e.g. translations) */
  @property({ type: Object, attribute: false }) messages: Partial<DryRunPublishMessages> = {};

  @state() _bundle: DryRunEntry[] = [];
  /** Ids relays have in a newer version; undefined while checking */
  @state() _newer?: Set<string>;
  @state() _publishing = false;
  @state() _results?: DryRunPublishResult[];

  get _m(): DryRunPublishMessages {
    return { ...DEFAULT_DRY_RUN_PUBLISH_MESSAGES, ...this.messages };
  }

  override willUpdate(changed: Map<string, unknown>): void {
    if (!changed.has('eventId')) return;
    const bundle = dryRunBundle(this.eventId);
    this._bundle = bundle;
    this._results = undefined;
    this._newer = undefined;
    void newerOnRelays(bundle).then((newer) => {
      if (this._bundle === bundle) this._newer = newer;
    });
  }

  get _toSend(): DryRunEntry[] {
    return this._bundle.filter((e) => !this._newer?.has(e.event.id));
  }

  async _publish(): Promise<void> {
    this._publishing = true;
    const results = await publishDryRunEntries(this._toSend);
    this._publishing = false;
    this._results = results;
    this.dispatchEvent(
      new CustomEvent('dry-run-published', { detail: results, bubbles: true, composed: true })
    );
  }

  _status(id: string) {
    const m = this._m;
    if (this._newer?.has(id)) return html`<span class="note">· ${m.newer}</span>`;
    const result = this._results?.find((r) => r.id === id);
    if (!result) return nothing;
    return result.ok
      ? html`<span class="ok">· ${m.published}</span>`
      : html`<span class="error">· ${m.failed(result.error ?? '')}</span>`;
  }

  override render() {
    const m = this._m;
    if (this._bundle.length === 0 && !this._results) return html`<p>${m.notLogged}</p>`;
    const toSend = this._toSend.length;
    return html`
      <h3>${m.heading(toSend)}</h3>
      <p>${m.explanation}</p>
      <ul>
        ${this._bundle.map(
          ({ event }, i) => html`<li>
            <span class="kind">${m.kinds[event.kind] ?? m.kind(event.kind)}:</span>
            ${eventTitle(event) || event.id.slice(0, 8)}
            ${i === 0 ? html`<span class="note">(${m.thisPost})</span>` : nothing}
            ${this._status(event.id)}
          </li>`
        )}
      </ul>
      ${
        this._results
          ? nothing
          : html`<button
              type="button"
              class="np-button np-filled"
              part="button primary"
              ?disabled=${this._publishing || !this._newer || toSend === 0}
              @click=${() => void this._publish()}
            >
              ${this._publishing ? m.publishing : this._newer ? m.publish(toSend) : m.checking}
            </button>`
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'nostr-dry-run-publish': NostrDryRunPublish;
  }
}
