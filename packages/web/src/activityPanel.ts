/**
 * <np-activity> - background work in a corner of the page: uploads with their progress,
 * events still being sent to relays after publishing. The page stays usable meanwhile.
 *
 * Shows the activities of `@nostr-post/plugins/activity`; relay sends (the signer's
 * RELAYS_PENDING_EVENT) become one activity. Importing this module adds an <np-activity> to
 * the page when the first activity starts, unless the app placed one (e.g. inside its
 * `dark` container). While an activity with `warnOnLeave` runs (relay sends), the browser asks
 * before the user leaves the page.
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
import { NpElement, npStyles } from '@nostr-post/ui/web';
import { html, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { type ActivityMessages, activityMessages } from './activityMessages';
import { activityStyles } from './activityStyles';

@customElement('np-activity')
export class NpActivity extends NpElement {
  static override styles = [...npStyles, activityStyles];

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
    const shown = this._activities.filter((activity) => !activity.hidden);
    if (shown.length === 0) return nothing;
    const m = activityMessages(this.messages);
    return html`
      <div role="status" aria-live="polite" aria-label=${m.region} style="display: contents">
        ${shown.map((activity) => renderActivity(activity, m))}
      </div>
    `;
  }
}

/** ✕: cancels a running activity that offers it, dismisses a finished one */
const renderActivityButton = (activity: Activity, m: ActivityMessages) => {
  const cancel = activity.state === 'running' ? activity.cancel : undefined;
  if (activity.state === 'running' && !cancel) return nothing;
  const label = cancel ? m.cancel : m.dismiss;
  return html`<button
    type="button"
    class="dismiss np-icon-button"
    part="button"
    title=${label}
    aria-label=${label}
    @click=${() => (cancel ? cancel() : dismissActivity(activity.id))}
  >×</button>`;
};

const renderActivity = (activity: Activity, m: ActivityMessages) => html`
  <div class="item ${activity.state}">
    <span class="label">${activity.state === 'done' ? '✓ ' : ''}${activity.label}</span>
    ${renderActivityButton(activity, m)}
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
    relayActivity ??= startActivity(m.sendingToRelays, { warnOnLeave: true });
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

/** Add an <np-activity> to the page when something shown runs and the app placed none */
const mountWhenNeeded = (activities: readonly Activity[]): void => {
  if (!activities.some((a) => !a.hidden) || document.querySelector('np-activity')) return;
  const panel = document.createElement('np-activity');
  // The app's dark theme: a `dark` class somewhere on the page
  if (document.querySelector('.dark')) panel.classList.add('dark');
  document.body.append(panel);
};

// The browser asks before leaving while work would be lost (events not yet on every relay)
const confirmLeave = (e: BeforeUnloadEvent): void => {
  e.preventDefault();
  e.returnValue = ''; // Older Safari and Chrome ask only when it's set
};
let warningOnLeave = false;

const updateLeaveWarning = (activities: readonly Activity[]): void => {
  const warn = activities.some((a) => a.warnOnLeave && a.state === 'running');
  if (warn === warningOnLeave) return;
  warningOnLeave = warn;
  if (warn) window.addEventListener('beforeunload', confirmLeave);
  else window.removeEventListener('beforeunload', confirmLeave);
};

if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  window.addEventListener(RELAYS_PENDING_EVENT, onRelaysPending);
  subscribeActivities(mountWhenNeeded);
  subscribeActivities(updateLeaveWarning);
}

declare global {
  interface HTMLElementTagNameMap {
    'np-activity': NpActivity;
  }
}
