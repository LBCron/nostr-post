/**
 * @nostr-post/outbox/web - The outbox in the browser: IndexedDB storage, the page's outbox and
 * its runner, and the queue element <nostr-post-outbox>
 */

export { indexedDbStorage, requestPersistentStorage } from './web/indexedDb';
export { NostrPostOutbox } from './web/outboxElement';
export { DEFAULT_OUTBOX_MESSAGES, type OutboxMessages } from './web/outboxMessages';
export {
  browserOutbox,
  connectionConditions,
  ensureOutboxRunner,
  type OutboxRunnerOptions,
  registerOutboxJobs,
  startOutboxRunner,
} from './web/runner';
