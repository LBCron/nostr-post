/**
 * User-facing text of <nostr-dry-run-publish> (publishing a test-mode post for real), with
 * English defaults. Apps override any of it through its `messages` property, e.g. translations.
 */
export interface DryRunPublishMessages {
  /** Heading: how many events go to the relays */
  heading: (count: number) => string;
  /** Explains that the events are already signed and go as they are */
  explanation: string;
  /** What an event is, by kind; unknown kinds get `kind` */
  kinds: Record<number, string>;
  kind: (kind: number) => string;
  /** Marks the post itself in the list */
  thisPost: string;
  /** Relays already have a newer version: not sent */
  newer: string;
  checking: string;
  publish: (count: number) => string;
  publishing: string;
  published: string;
  failed: (reason: string) => string;
  /** The post isn't in the test-mode log (anymore) */
  notLogged: string;
  close: string;
}

export const DEFAULT_DRY_RUN_PUBLISH_MESSAGES: DryRunPublishMessages = {
  heading: (count) => (count === 1 ? 'Publish 1 event' : `Publish ${count} events`),
  explanation:
    'This post was published in test mode: it is signed and only logged. These events go to the relays they were meant for, with the pages it created or linked.',
  kinds: {
    0: 'profile',
    1: 'note',
    20: 'photo',
    21: 'video',
    22: 'short video',
    1111: 'comment',
    30023: 'article',
    30078: 'app data',
    30818: 'wiki page',
    31922: 'event',
    31923: 'event',
    31925: 'RSVP',
  },
  kind: (kind) => `kind ${kind}`,
  thisPost: 'this post',
  newer: 'relays already have a newer version: not sent',
  checking: 'Checking the relays…',
  publish: (count) => (count === 1 ? 'Publish 1 event' : `Publish ${count} events`),
  publishing: 'Publishing…',
  published: 'published',
  failed: (reason) => `not published: ${reason}`,
  notLogged: 'This post is not in the test-mode log.',
  close: 'Close',
};
