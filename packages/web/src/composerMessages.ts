/**
 * User-facing text of <nostr-post-composer>'s submit area, with English defaults.
 * Apps override any of it through the composer's `messages` property (e.g. translations).
 */

import { DEFAULT_PUBLISH_MESSAGES, type PublishMessages } from '@nostr-post/posts';

export interface ComposerMessages extends PublishMessages {
  submit: string;
  submitting: string;
  loadingManifest: string;
  /** After publishing; the number of events published follows */
  published: (count: number) => string;
  /** After a submit the app publishes itself (no `auto-publish`) */
  created: string;
  /** A hooks-only format (`kinds: []`) finished: its plugins did their steps, no post */
  doneWithoutPost: string;
  /** The post waits in the outbox: its files upload later (on wifi or when the user asks) */
  queued: string;
  /** "Publish at" (`schedule`), and once a timed post is queued */
  sendAt: string;
  sendAtHint: string;
  scheduled: (date: Date) => string;
  /** "Save draft" (`drafts`), and once saved */
  saveDraft: string;
  draftSaved: string;
  /** The post is published but a plugin's after-publish step failed; its errors follow */
  afterPublishFailed: (errors: string[]) => string;
  /** While the signer works on a signature, e.g. waits for the user to approve it */
  stepSigning: string;
  /** Publishing without a signed-in user (the app is asked to sign them in) */
  signInToPublish: string;
  /** Shown at the button when fields failed validation; the field labels follow */
  invalidFields: string;
  unknownError: string;
}

export const DEFAULT_COMPOSER_MESSAGES: ComposerMessages = {
  ...DEFAULT_PUBLISH_MESSAGES,
  submit: 'Create Post',
  submitting: 'Creating...',
  loadingManifest: 'Loading Manifest...',
  published: (count) => `Published to ${count} event(s)!`,
  created: 'Post created successfully!',
  doneWithoutPost: 'Done!',
  sendAt: 'Publish at',
  sendAtHint: 'Empty: now. Signed now, sent at that time while the app is open, else when it opens',
  scheduled: (date) => `Saved to the outbox: published at ${date.toLocaleString()}`,
  saveDraft: 'Save draft',
  draftSaved: 'Draft saved in the outbox',
  queued:
    'Saved to the outbox: the photos upload on wifi or when you choose, then the post is published',
  afterPublishFailed: (errors) => `Published, but: ${errors.join('; ')}`,
  stepSigning: 'Waiting for your signer to approve…',
  signInToPublish: 'Sign in to publish: posts are signed with your Nostr key.',
  invalidFields: 'Please fix these fields:',
  unknownError: 'Unknown error occurred',
};
