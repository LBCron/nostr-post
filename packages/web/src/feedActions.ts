/** Template parts of <nostr-post-feed>: a post's reactions and its action buttons */

import type { ReactionSummaryWithAuthors } from '@nostr-post/posts';
import { html, type TemplateResult } from 'lit';

/** Reaction chips with counts and who reacted; nothing without reactions */
export const renderReactionSummary = (
  summary: ReactionSummaryWithAuthors[]
): TemplateResult | string =>
  summary.length > 0
    ? html`
      <div class="reaction-summary">
        ${summary.map(
          ({ reaction, count, authors }) => html`
            <span class="reaction-chip np-badge" part="badge" title=${authors.join(', ')}>
              ${reaction} ${count}
              ${
                authors.length > 0
                  ? html`<span class="reaction-authors"> ${authors.join(', ')}</span>`
                  : ''
              }
            </span>
          `
        )}
      </div>
    `
    : '';

export interface EventActionsOptions {
  commentsEnabled?: boolean;
  reactionsEnabled?: boolean;
  reactionOptions?: string[];
  /** The reaction being published, as `<event id>:<reaction>` */
  pendingKey?: string;
  eventId: string;
  onComment: () => void;
  onReact: (reaction: string) => void;
}

/** The Comment button and the reaction buttons below a post */
export const renderEventActions = ({
  commentsEnabled,
  reactionsEnabled,
  reactionOptions,
  pendingKey,
  eventId,
  onComment,
  onReact,
}: EventActionsOptions): TemplateResult => html`
  <div class="event-actions np-toolbar" part="actions">
    ${
      commentsEnabled
        ? html`
          <button class="np-button np-tonal np-small" part="button" type="button" @click=${onComment}>
            Comment
          </button>
        `
        : ''
    }
    ${
      reactionsEnabled
        ? reactionOptions?.map(
            (reaction) => html`
            <button
              class="np-chip"
              part="chip"
              type="button"
              ?disabled=${pendingKey === `${eventId}:${reaction}`}
              @click=${() => onReact(reaction)}
            >
              ${reaction}
            </button>
          `
          )
        : ''
    }
  </div>
`;
