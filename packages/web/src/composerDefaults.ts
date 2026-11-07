/**
 * What every <nostr-post-composer> of the page offers from the outbox (@nostr-post/outbox),
 * also those packages open themselves (e.g. a section's "Add" dialog). All off by default: a
 * page that doesn't turn them on never queues anything.
 */

/** What composers offer from the outbox, unless their own attributes say otherwise */
export interface ComposerOutboxDefaults {
  /** "Save draft" */
  drafts?: boolean;
  /** "Publish at" */
  schedule?: boolean;
  /** "Upload later, on wifi" in media fields */
  uploadLater?: boolean;
}

// Module state: the page's choice, read when a composer is created
let defaults: ComposerOutboxDefaults = {};

/**
 * Turns outbox features on (or off) for every composer the page creates from now on, also
 * those packages open themselves (e.g. a section's "Add" dialog); a composer's own attributes
 * still decide for it. All off by default: a page without them never queues anything
 */
export function setComposerDefaults(next: ComposerOutboxDefaults): void {
  defaults = { ...defaults, ...next };
}

export const composerDefaults = (): ComposerOutboxDefaults => defaults;
