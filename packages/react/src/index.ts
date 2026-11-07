/**
 * @nostr-post/react
 *
 * React hooks and components for Nostr posts
 *
 * This package provides React-friendly wrappers around the universal
 * web components from @nostr-post/web, ensuring consistent styling
 * and behavior across all frameworks.
 */

// Hooks
export {
  useNostrAuth,
  useNostrEvents,
  useNostrPublish,
  type NostrAuthState,
  type UseNostrAuthReturn,
  type UseNostrEventsOptions,
  type UseNostrEventsReturn,
  type UseNostrPublishOptions,
  type UseNostrPublishReturn,
} from './hooks';

// Components (React wrappers around web components)
export {
  NostrPostComposer,
  NostrPostOutbox,
  NostrPostView,
  NostrPostFeed,
  type NostrPostComposerProps,
  type NostrPostOutboxProps,
  type NostrPostViewProps,
  type NostrPostFeedProps,
  type NostrPostFeedRef,
} from './components';

// Re-export web component utilities for convenience
export {
  type SignedEvent,
  type Nip07Provider,
  colors,
  baseStyles,
  STANDARD_KIND1_POST_MANIFEST,
  runAfterPublish,
  runBeforePublish,
  runPublishHooks,
} from '@nostr-post/web';

// Publishing a submitted post yourself (the logic, from @nostr-post/posts)
export { type NostrPostSubmitDetail, withTags } from '@nostr-post/posts';

// Signer utilities (re-exported from @nostr-post/signer)
export {
  signEvent,
  signAndPublish,
  publishToRelay,
  publishToRelays,
  getPublicKey,
  fetchEvents,
  fetchEventsFromRelay,
  fetchProfile,
  fetchProfiles,
  fetchUserRelays,
  getCachedProfile,
  INDEXER_RELAYS,
  getPublishRelays,
  hasNostrSigner,
  DEFAULT_RELAYS,
  setDryRun,
  SIGNING_EVENT,
  type SigningDetail,
  isDryRun,
  getDryRunEntries,
  clearDryRunEntries,
  dryRunBundle,
  dryRunEvents,
  newerOnRelays,
  publishDryRunEntries,
  removeDryRunEntries,
  type DryRunPublishResult,
  DRY_RUN_CHANGE_EVENT,
  type DryRunEntry,
  type NostrProfile,
  type ProfileOptions,
  type DryRunChangeDetail,
} from './signer';

// Drafts in the outbox: what a composer needs to edit one (`onEdit` of NostrPostOutbox)
export { type OpenedDraft, openDraft } from '@nostr-post/web';
export type { OutboxItem } from '@nostr-post/outbox';
