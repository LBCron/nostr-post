/**
 * User-facing text of <np-activity>, with English defaults. Apps override any of it with
 * its `messages` property (e.g. translations).
 */

export interface ActivityMessages {
  /** While events are still being sent to relays after publishing */
  sendingToRelays: string;
  relaysLeft: (pending: number) => string;
  /** Every relay answered */
  sentToRelays: (sent: number, total: number) => string;
  /** No relay accepted the events */
  relaysFailed: string;
  dismiss: string;
  /** Accessible name of the panel */
  region: string;
}

export const DEFAULT_ACTIVITY_MESSAGES: ActivityMessages = {
  sendingToRelays: 'Sending to relays…',
  relaysLeft: (pending) => `${pending} ${pending === 1 ? 'relay' : 'relays'} left`,
  sentToRelays: (sent, total) => `Sent to ${sent} of ${total} relays`,
  relaysFailed: 'No relay accepted it',
  dismiss: 'Dismiss',
  region: 'Background activity',
};

let appMessages: Partial<ActivityMessages> = {};

/** Override <np-activity>'s text for the whole app, also the relay sends it reports */
export function setActivityMessages(messages: Partial<ActivityMessages>): void {
  appMessages = messages;
}

/** The defaults with the app's overrides (setActivityMessages) and then `messages` */
export const activityMessages = (messages: Partial<ActivityMessages> = {}): ActivityMessages => ({
  ...DEFAULT_ACTIVITY_MESSAGES,
  ...appMessages,
  ...messages,
});
