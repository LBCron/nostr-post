/**
 * @nostr-post/posts - What publishing says while it runs and when it fails, with English
 * defaults. Apps override any of it (e.g. translations); `<nostr-post-composer>`'s `messages`
 * include these.
 */

export interface PublishMessages {
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
  /** Publish hooks didn't finish in time */
  hooksTimeout: string;
  /** Publish hooks timed out while the signer still had an unanswered request */
  signerTimeout: string;
}

export const DEFAULT_PUBLISH_MESSAGES: PublishMessages = {
  stepUploads: 'Waiting for uploads to finish… Cancel one to publish without it.',
  uploadsFailed: (labels) =>
    `Not published: ${labels.join(', ')} failed. Publish again to post without it, or add it again.`,
  stepHooks: 'Publishing linked pages…',
  stepPublish: 'Signing and publishing the post…',
  stepAfterPublish: 'Finishing (e.g. saving to lists)…',
  hooksTimeout: 'Publishing linked pages took too long. Nothing was published; try again.',
  signerTimeout:
    "Your signer didn't answer the signing request. Check it for a pending approval or log in again, then try again.",
};
