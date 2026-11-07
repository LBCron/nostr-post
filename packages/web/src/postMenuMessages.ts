/**
 * User-facing text of <nostr-post-menu> (a post's "⋯" menu and raw-data panel), with English
 * defaults. Apps override any of it through the menu's `messages` property, or the view's and
 * feed's `menuMessages` (e.g. translations).
 */
export interface PostMenuMessages {
  /** The menu button's accessible name */
  menu: string;
  copyNpub: string;
  /** Copy the post's naddr or nevent; `prefix` is which */
  copyPointer: (prefix: string) => string;
  copyJson: string;
  rawData: string;
  /** Shown when the post is in the test-mode log: opens <nostr-dry-run-publish> */
  publishForReal: string;
  copied: string;
  /** The clipboard refused (e.g. an insecure page) */
  copyFailed: string;
  close: string;
  author: string;
  kind: string;
  dTag: string;
  pointer: string;
  relays: string;
  /** No relay is known (e.g. a post being previewed, or from a test-mode log) */
  noRelays: string;
  tags: string;
  json: string;
  signature: string;
}

export const DEFAULT_POST_MENU_MESSAGES: PostMenuMessages = {
  menu: 'More',
  copyNpub: "Copy author's npub",
  copyPointer: (prefix) => `Copy ${prefix}`,
  copyJson: 'Copy event JSON',
  rawData: 'Raw data',
  publishForReal: 'Publish for real…',
  copied: 'Copied',
  copyFailed: "Couldn't copy",
  close: 'Close',
  author: 'Author',
  kind: 'Kind',
  dTag: 'd tag',
  pointer: 'Link',
  relays: 'Found on',
  noRelays: 'Not fetched from a relay in this session',
  tags: 'Tags',
  json: 'JSON',
  signature: 'Signature',
};
