/**
 * @nostr-post/react - NostrPostComposer component
 *
 * React wrapper around the <nostr-post-composer> web component
 */

import type { NostrPostManifest } from '@nostr-post/core/types';
import type { OutboxItem } from '@nostr-post/outbox';
import type { NostrPostSubmitDetail } from '@nostr-post/posts';
import type { SignedEvent } from '@nostr-post/web';
import '@nostr-post/web'; // Register web components
import { useEffect, useRef } from 'react';

// Extend HTMLElement for the web component
interface NostrPostComposerElement extends HTMLElement {
  manifest?: NostrPostManifest;
  manifestRef?: string;
  dTag?: string;
  autoPublish?: boolean;
  relays?: string[];
  excludeFields?: string[];
  readonlyFields?: string[];
  prefill?: Record<string, unknown>;
  replyToEventId?: string;
  replyToPubkey?: string;
  drafts?: boolean;
  draftId?: string;
  schedule?: boolean;
  uploadLater?: boolean;
  rootEventId?: string;
  rootPubkey?: string;
}

// Declare the custom element for TypeScript/JSX
declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'nostr-post-composer': React.DetailedHTMLProps<
        React.HTMLAttributes<NostrPostComposerElement>,
        NostrPostComposerElement
      > & {
        'auto-publish'?: boolean;
        drafts?: boolean;
        schedule?: boolean;
        'upload-later'?: boolean;
      };
    }
  }
}

export interface NostrPostComposerProps {
  /** Manifest defining the form fields (defaults to Kind 1 note) */
  manifest?: NostrPostManifest;
  /** Reference to the manifest on Nostr (a-tag value, e.g. '30078:<pubkey>:<d-tag>') */
  manifestRef?: string;
  /** Explicit d-tag for addressable events. Reuse it to update an existing editable post. */
  dTag?: string;
  /** Relay URLs to publish to */
  relays?: string[];
  /** Auto-publish events (uses NIP-07 window.nostr) */
  autoPublish?: boolean;
  /** Field IDs to completely exclude from the composer */
  excludeFields?: string[];
  /** Field IDs to show as read-only */
  readonlyFields?: string[];
  /** Pre-filled values keyed by field ID */
  prefill?: Record<string, unknown>;
  /** Parent event id for protocol-standard kind 1 replies/comments */
  replyToEventId?: string;
  /** Parent author pubkey for protocol-standard kind 1 replies/comments */
  replyToPubkey?: string;
  /** Optional root event id when replying inside an existing thread */
  rootEventId?: string;
  /** Optional root author pubkey when replying inside an existing thread */
  rootPubkey?: string;
  /** Offer "Save draft": the form goes to the outbox (`@nostr-post/outbox`), unsigned */
  drafts?: boolean;
  /** The draft being edited (`openDraft`): saving replaces it, publishing removes it */
  draftId?: string;
  /** Offer "Publish at": a timed post waits in the outbox */
  schedule?: boolean;
  /** Offer "Upload later, on wifi" in media fields: the post waits in the outbox */
  uploadLater?: boolean;
  /** Called after successful publish */
  onPublished?: (events: SignedEvent[], dTag?: string) => void;
  /** The post waits in the outbox (photos to upload later, or a time to publish at) */
  onQueued?: (item: OutboxItem) => void;
  /** "Save draft" saved it */
  onDraftSaved?: (item: OutboxItem) => void;
  /**
   * Called on submit (before signing), without autoPublish. `detail` has the
   * form data and manifest for runBeforePublish (plugin publish hooks).
   */
  onSubmit?: (bundle: unknown, dTag?: string, detail?: NostrPostSubmitDetail) => void;
  /** Called on error */
  onError?: (error: Error) => void;
  /** Custom class name */
  className?: string;
  /** Dark mode */
  dark?: boolean;
}

/**
 * Composer component for creating Nostr posts
 *
 * React wrapper around <nostr-post-composer> web component
 */
export function NostrPostComposer({
  manifest,
  manifestRef,
  dTag,
  relays,
  autoPublish = true,
  excludeFields,
  readonlyFields,
  prefill,
  replyToEventId,
  replyToPubkey,
  rootEventId,
  rootPubkey,
  drafts = false,
  draftId,
  schedule = false,
  uploadLater = false,
  onPublished,
  onQueued,
  onDraftSaved,
  onSubmit,
  onError,
  className = '',
  dark,
}: NostrPostComposerProps) {
  const elementRef = useRef<NostrPostComposerElement>(null);

  // Build wrapper class for dark mode
  const wrapperClassName = dark ? 'dark' : '';

  // Set properties on the web component
  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    if (manifest) {
      element.manifest = manifest;
    }
    element.manifestRef = manifestRef;
    element.dTag = dTag;
    if (relays) {
      element.relays = relays;
    }
    element.autoPublish = autoPublish;
    element.excludeFields = excludeFields;
    element.readonlyFields = readonlyFields;
    element.prefill = prefill;
    element.replyToEventId = replyToEventId;
    element.replyToPubkey = replyToPubkey;
    element.rootEventId = rootEventId;
    element.rootPubkey = rootPubkey;
    element.drafts = drafts;
    element.draftId = draftId;
    element.schedule = schedule;
    element.uploadLater = uploadLater;
  }, [
    uploadLater,
    drafts,
    draftId,
    schedule,
    manifest,
    manifestRef,
    dTag,
    relays,
    autoPublish,
    excludeFields,
    readonlyFields,
    prefill,
    replyToEventId,
    replyToPubkey,
    rootEventId,
    rootPubkey,
  ]);

  // Attach event listeners
  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const handlePublished = (e: Event) => {
      const customEvent = e as CustomEvent<
        SignedEvent[] | { events: SignedEvent[]; dTag?: string }
      >;
      const detail = customEvent.detail;
      if (Array.isArray(detail)) {
        onPublished?.(detail);
        return;
      }
      onPublished?.(detail.events, detail.dTag);
    };

    const handleSubmit = (e: Event) => {
      const { detail } = e as CustomEvent<NostrPostSubmitDetail>;
      onSubmit?.(detail.bundle, detail.dTag, detail);
    };

    const handleError = (e: Event) => {
      const customEvent = e as CustomEvent<{ message: string; error?: Error }>;
      const error = customEvent.detail.error || new Error(customEvent.detail.message);
      onError?.(error);
    };

    const handleQueued = (e: Event) => onQueued?.((e as CustomEvent<OutboxItem>).detail);
    const handleDraftSaved = (e: Event) => onDraftSaved?.((e as CustomEvent<OutboxItem>).detail);

    // Only listen to the full event names to avoid duplicates
    element.addEventListener('nostr-post-published', handlePublished);
    element.addEventListener('nostr-post-queued', handleQueued);
    element.addEventListener('nostr-post-draft-saved', handleDraftSaved);
    element.addEventListener('nostr-post-submit', handleSubmit);
    element.addEventListener('nostr-post-error', handleError);

    return () => {
      element.removeEventListener('nostr-post-published', handlePublished);
      element.removeEventListener('nostr-post-queued', handleQueued);
      element.removeEventListener('nostr-post-draft-saved', handleDraftSaved);
      element.removeEventListener('nostr-post-submit', handleSubmit);
      element.removeEventListener('nostr-post-error', handleError);
    };
  }, [onPublished, onQueued, onDraftSaved, onSubmit, onError]);

  return (
    <div className={wrapperClassName}>
      <nostr-post-composer ref={elementRef as React.RefObject<HTMLElement>} className={className} />
    </div>
  );
}
