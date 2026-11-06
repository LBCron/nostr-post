/**
 * @nostr-post/web - Signer re-exports
 *
 * Re-exports from @nostr-post/signer, and the user's relays from @nostr-post/posts
 */

// The signed-in user's relays (moved to @nostr-post/posts)
export { getDefaultRelays, getUserRelays } from '@nostr-post/posts';
// Re-export everything from shared signer
export {
  _manifestCache,
  clearDryRunEntries,
  clearManifestCache,
  DEFAULT_RELAYS,
  DRY_RUN_CHANGE_EVENT,
  type DryRunChangeDetail,
  type DryRunEntry,
  type DryRunPublishResult,
  dryRunBundle,
  dryRunEvents,
  type EventManifest,
  type FetchFilter,
  fetchEvents,
  fetchEventsFromRelay,
  // Manifest helpers
  fetchManifestByATag,
  fetchManifestForEvent,
  fetchManifestsByATags,
  fetchProfile,
  fetchProfiles,
  fetchUserRelays,
  getCachedManifest,
  getCachedProfile,
  getDryRunEntries,
  getPublicKey,
  getPublishRelays,
  hasNostrSigner,
  INDEXER_RELAYS,
  isDryRun,
  type ManifestSource,
  type Nip07Provider,
  type NostrProfile,
  newerOnRelays,
  type ProfileOptions,
  type PublishResults,
  publishDryRunEntries,
  publishToRelay,
  publishToRelays,
  removeDryRunEntries,
  SIGNING_EVENT,
  type SignedEvent,
  type SigningDetail,
  setDryRun,
  signAndPublish,
  signEvent,
} from '@nostr-post/signer';
