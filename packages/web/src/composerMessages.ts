/**
 * User-facing text of <nostr-post-composer>'s submit area, with English defaults.
 * Apps override any of it through the composer's `messages` property (e.g. translations).
 */

export interface ComposerMessages {
  submit: string;
  submitting: string;
  loadingManifest: string;
  /** Publishing waits for uploads that add to the form (e.g. a photo's link in the text) */
  stepUploads: string;
  /** An upload failed while publishing waited for it; their labels follow */
  uploadsFailed: (labels: string[]) => string;
  /** While plugins publish related events first (e.g. a venue's wiki page) */
  stepHooks: string;
  /** While the post itself is signed and published */
  stepPublish: string;
  /** After the post is out, while plugins finish (e.g. save its venue to lists) */
  stepAfterPublish: string;
  /** After publishing; the number of events published follows */
  published: (count: number) => string;
  /** After a submit the app publishes itself (no `auto-publish`) */
  created: string;
  /** A hooks-only format (`kinds: []`) finished: its plugins did their steps, no post */
  doneWithoutPost: string;
  /** The post is published but a plugin's after-publish step failed; its errors follow */
  afterPublishFailed: (errors: string[]) => string;
  /** While the signer works on a signature, e.g. waits for the user to approve it */
  stepSigning: string;
  /** Shown at the button when fields failed validation; the field labels follow */
  invalidFields: string;
  /** Publish hooks didn't finish in time */
  hooksTimeout: string;
  /** Publish hooks timed out while the signer still had an unanswered request */
  signerTimeout: string;
  unknownError: string;
}

export const DEFAULT_COMPOSER_MESSAGES: ComposerMessages = {
  submit: 'Create Post',
  submitting: 'Creating...',
  loadingManifest: 'Loading Manifest...',
  stepUploads: 'Waiting for uploads to finish…',
  uploadsFailed: (labels) =>
    `Not published: ${labels.join(', ')} failed. Publish again to post without it, or add it again.`,
  stepHooks: 'Publishing linked pages…',
  stepPublish: 'Signing and publishing the post…',
  stepAfterPublish: 'Finishing (e.g. saving to lists)…',
  published: (count) => `Published to ${count} event(s)!`,
  created: 'Post created successfully!',
  doneWithoutPost: 'Done!',
  afterPublishFailed: (errors) => `Published, but: ${errors.join('; ')}`,
  stepSigning: 'Waiting for your signer to approve…',
  invalidFields: 'Please fix these fields:',
  hooksTimeout: 'Publishing linked pages took too long. Nothing was published; try again.',
  signerTimeout:
    "Your signer didn't answer the signing request. Check it for a pending approval or log in again, then try again.",
  unknownError: 'Unknown error occurred',
};
