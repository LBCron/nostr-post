/**
 * <np-activity> - background work in a corner of the page: uploads with their progress,
 * events still being sent to relays after publishing. The page stays usable meanwhile.
 *
 * Shows the activities of `@nostr-post/plugins/activity`; relay sends (the signer's
 * RELAYS_PENDING_EVENT) become one activity. Importing this module adds an <np-activity> to
 * the page when the first activity starts, unless the app placed one (e.g. inside its
 * `dark` container).
 */

import {
  type Activity,
  type ActivityHandle,
  dismissActivity,
  getActivities,
  startActivity,
  subscribeActivities,
} from '@nostr-post/plugins/activity';
import { RELAYS_PENDING_EVENT, type RelaysPendingDetail } from '@nostr-post/signer';
import { css, html, LitElement, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { type ActivityMessages, activityMessages } from './activityMessages';

@customElement('np-activity')
export class NpActivity extends LitElement {
  static override styles = css`
    :host {
      position: fixed;
      right: 1rem;
      bottom: 1rem;
      z-index: 2147483000;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      width: min(22rem, calc(100vw - 2rem));
      pointer-events: none;
      font-family: inherit;
    }
    .item {
      pointer-events: auto;
      display: grid;
      grid-template-columns: 1fr auto;
      gap: 0.25rem 0.5rem;
      padding: 0.625rem 0.75rem;
      background: #fff;
      color: #111827;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
      font-size: 0.875rem;
    }
    .item.done {
      border-color: #a7f3d0;
    }
    .item.failed {
      border-color: #fecaca;
    }
    .label {
      font-weight: 600;
      overflow-wrap: anywhere;
    }
    .detail {
      grid-column: 1 / -1;
      color: #6b7280;
      font-size: 0.8125rem;
      overflow-wrap: anywhere;
    }
    .item.failed .detail {
      color: #b91c1c;
    }
    .bar {
      grid-column: 1 / -1;
      height: 4px;
      background: #e5e7eb;
      border-radius: 2px;
      overflow: hidden;
    }
    .fill {
      height: 100%;
      background: #6366f1;
      transition: width 0.3s;
    }
    .bar.unknown .fill {
      width: 30%;
      animation: slide 1.2s ease-in-out infinite;
    }
    @keyframes slide {
      from {
        transform: translateX(-100%);
      }
      to {
        transform: translateX(340%);
      }
    }
    .dismiss {
      border: none;
      background: none;
      color: inherit;
      cursor: pointer;
      font-size: 1rem;
      line-height: 1;
      padding: 0 0.25rem;
    }

    :host-context(.dark) .item {
      background: #1f2937;
      color: #f3f4f6;
      border-color: #4b5563;
    }
    :host-context(.dark) .item.done {
      border-color: #059669;
    }
    :host-context(.dark) .item.failed {
      border-color: #dc2626;
    }
    :host-context(.dark) .detail {
      color: #9ca3af;
    }
    :host-context(.dark) .item.failed .detail {
      color: #fca5a5;
    }
    :host-context(.dark) .bar {
      background: #4b5563;
    }
    :host-context(.dark) .fill {
      background: #4f46e5;
    }
  `;

  @property({ type: Object }) messages: Partial<ActivityMessages> = {};

  @state() _activities: readonly Activity[] = getActivities();

  _unsubscribe?: () => void;

  override connectedCallback(): void {
    super.connectedCallback();
    this._activities = getActivities();
    this._unsubscribe = subscribeActivities((activities) => {
      this._activities = activities;
    });
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this._unsubscribe?.();
  }

  override render() {
    if (this._activities.length === 0) return nothing;
    const m = activityMessages(this.messages);
    return html`
      <div role="status" aria-live="polite" aria-label=${m.region} style="display: contents">
        ${this._activities.map((activity) => renderActivity(activity, m))}
      </div>
    `;
  }
}

const renderActivity = (activity: Activity, m: ActivityMessages) => html`
  <div class="item ${activity.state}">
    <span class="label">${activity.state === 'done' ? '✓ ' : ''}${activity.label}</span>
    ${
      activity.state === 'running'
        ? nothing
        : html`<button
            type="button"
            class="dismiss"
            title=${m.dismiss}
            aria-label=${m.dismiss}
            @click=${() => dismissActivity(activity.id)}
          >×</button>`
    }
    ${activity.detail ? html`<span class="detail">${activity.detail}</span>` : nothing}
    ${
      activity.state === 'running'
        ? html`<div class="bar ${activity.progress === undefined ? 'unknown' : ''}">
            <div
              class="fill"
              style=${activity.progress === undefined ? '' : `width: ${Math.round(activity.progress * 100)}%`}
            ></div>
          </div>`
        : nothing
    }
  </div>
`;

// Relay sends after publishing: one activity while any run
let relayActivity: ActivityHandle | undefined;

const onRelaysPending = (e: CustomEvent<RelaysPendingDetail>): void => {
  const { pending, sent, failed } = e.detail;
  const m = activityMessages();
  if (pending > 0) {
    relayActivity ??= startActivity(m.sendingToRelays);
    relayActivity.update({
      detail: m.relaysLeft(pending),
      progress: (sent + failed) / (sent + failed + pending),
    });
    return;
  }
  if (!relayActivity) return;
  if (sent === 0) relayActivity.fail(m.relaysFailed);
  else relayActivity.done(m.sentToRelays(sent, sent + failed));
  relayActivity = undefined;
};

/** Add an <np-activity> to the page when something runs and the app placed none */
const mountWhenNeeded = (activities: readonly Activity[]): void => {
  if (activities.length === 0 || document.querySelector('np-activity')) return;
  const panel = document.createElement('np-activity');
  // The app's dark theme: a `dark` class somewhere on the page
  if (document.querySelector('.dark')) panel.classList.add('dark');
  document.body.append(panel);
};

if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  window.addEventListener(RELAYS_PENDING_EVENT, onRelaysPending);
  subscribeActivities(mountWhenNeeded);
}

declare global {
  interface HTMLElementTagNameMap {
    'np-activity': NpActivity;
  }
}
