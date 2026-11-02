import { commentTags, kindOfAddress, NOTE_KIND } from '@nostr-post/core/comments';
import type { EventBundle, NostrTag } from '@nostr-post/core/types';
import { html } from 'lit';

export interface ReplyTarget {
  replyToEventId?: string;
  replyToPubkey?: string;
  rootEventId?: string;
  rootPubkey?: string;
  /**
   * The root's address when it's addressable (`kind:pubkey:d`): the reply is then a NIP-22
   * comment (kind 1111) that stays with the root across its versions
   */
  rootAddress?: string;
}

/**
 * The reply's kind and tags: a kind-1 reply (NIP-10) to a note, a NIP-22 comment (kind 1111)
 * to an addressable root. Undefined without an event to reply to
 */
export const buildReply = (target: ReplyTarget): { kind: number; tags: NostrTag[] } | undefined => {
  if (!target.replyToEventId) return undefined;
  const rootEventId = target.rootEventId ?? target.replyToEventId;
  return commentTags({
    rootEventId,
    rootKind: (target.rootAddress && kindOfAddress(target.rootAddress)) || NOTE_KIND,
    rootPubkey:
      target.rootPubkey ??
      (target.replyToEventId === rootEventId ? target.replyToPubkey : undefined),
    rootAddress: target.rootAddress,
    parentEventId: target.replyToEventId,
    parentPubkey: target.replyToPubkey,
  });
};

export const buildReplyTags = (target: ReplyTarget): NostrTag[] => buildReply(target)?.tags ?? [];

/** Makes the bundle's first event the reply: its tags, and kind 1111 for a NIP-22 comment */
export const applyReplyTargetToBundle = (bundle: EventBundle, target: ReplyTarget): EventBundle => {
  const reply = buildReply(target);
  const [primaryEvent, ...restEvents] = bundle.events;
  if (!reply || !primaryEvent) return bundle;
  // Only a note becomes a comment; other kinds (a manifest's own) keep theirs
  const kind = primaryEvent.kind === NOTE_KIND ? reply.kind : primaryEvent.kind;
  return {
    ...bundle,
    events: [{ ...primaryEvent, kind, tags: [...primaryEvent.tags, ...reply.tags] }, ...restEvents],
  };
};

export const hasReplyTarget = (target: ReplyTarget): boolean => {
  return !!(
    target.replyToEventId ||
    target.replyToPubkey ||
    target.rootEventId ||
    target.rootPubkey
  );
};

export const updateReplyTargetValue = (value: string): string | undefined => {
  return value.trim() === '' ? undefined : value.trim();
};

export const renderReplyTargetPanel = ({
  target,
  readonly,
  onUpdate,
}: {
  target: ReplyTarget;
  readonly: boolean;
  onUpdate: (field: keyof ReplyTarget, value: string) => void;
}) => {
  const label = readonly ? 'Reply Context' : 'Reply Context (editable)';

  return html`
    <div class="reply-target-panel">
      <div class="reply-target-title">${label}</div>
      <div class="reply-target-grid">
        <label class="reply-target-field">
          <span>Reply to event id</span>
          <input
            type="text"
            .value=${target.replyToEventId ?? ''}
            ?readonly=${readonly}
            @input=${(e: Event) => onUpdate('replyToEventId', (e.target as HTMLInputElement).value)}
            placeholder="Parent event id"
          />
        </label>
        <label class="reply-target-field">
          <span>Reply to pubkey</span>
          <input
            type="text"
            .value=${target.replyToPubkey ?? ''}
            ?readonly=${readonly}
            @input=${(e: Event) => onUpdate('replyToPubkey', (e.target as HTMLInputElement).value)}
            placeholder="Parent author pubkey"
          />
        </label>
        <label class="reply-target-field">
          <span>Root event id</span>
          <input
            type="text"
            .value=${target.rootEventId ?? ''}
            ?readonly=${readonly}
            @input=${(e: Event) => onUpdate('rootEventId', (e.target as HTMLInputElement).value)}
            placeholder="Thread root event id"
          />
        </label>
        <label class="reply-target-field">
          <span>Root pubkey</span>
          <input
            type="text"
            .value=${target.rootPubkey ?? ''}
            ?readonly=${readonly}
            @input=${(e: Event) => onUpdate('rootPubkey', (e.target as HTMLInputElement).value)}
            placeholder="Thread root pubkey"
          />
        </label>
      </div>
    </div>
  `;
};
