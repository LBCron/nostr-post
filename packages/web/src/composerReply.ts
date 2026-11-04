/** The composer's reply context panel (the logic is `@nostr-post/posts`' replies) */

import type { ReplyTarget } from '@nostr-post/posts';
import { html } from 'lit';

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
