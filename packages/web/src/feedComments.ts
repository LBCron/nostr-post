import { isUpdateComment } from '@nostr-post/core/eventUpdates';
import type { NostrPostManifest } from '@nostr-post/core/types';
import { loadProfilesForEvents, mergeUniqueEvents, type ReplyTarget } from '@nostr-post/posts';
import type { NostrProfile } from '@nostr-post/signer';
import { npExportParts } from '@nostr-post/ui';
import { html, type TemplateResult } from 'lit';
import type { PostMenuMessages } from './postMenuMessages';
import type { SignedEvent } from './signer';

export const extractPublishedEvents = (eventDetail: unknown): SignedEvent[] => {
  if (Array.isArray(eventDetail)) return eventDetail as SignedEvent[];

  if (
    eventDetail &&
    typeof eventDetail === 'object' &&
    'events' in eventDetail &&
    Array.isArray((eventDetail as { events: unknown }).events)
  ) {
    return (eventDetail as { events: SignedEvent[] }).events;
  }

  return [];
};

export const isReplyComposerOpen = (
  activeReplyTarget: ReplyTarget | undefined,
  rootId: string
): boolean => {
  return (
    activeReplyTarget?.replyToEventId !== undefined && activeReplyTarget.rootEventId === rootId
  );
};

export const renderReplies = (
  root: SignedEvent,
  replies: SignedEvent[],
  commentManifest: NostrPostManifest | undefined,
  excludeFields: string[] | undefined,
  renderEventActions: (event: SignedEvent, rootEvent?: SignedEvent) => TemplateResult,
  menu: { hideMenu?: boolean; menuMessages?: Partial<PostMenuMessages> } = {}
): TemplateResult | '' => {
  const visibleReplies = replies.filter((r) => !isUpdateComment(r.content));
  if (visibleReplies.length === 0) return '';

  return html`
    <div class="reply-list">
      <div class="reply-header np-label">Comments</div>
      ${visibleReplies.map(
        (reply) => html`
          <div>
            <nostr-post-view
              exportparts=${npExportParts}
              .event=${reply}
              .manifest=${commentManifest}
              .excludeFields=${excludeFields}
              ?hide-menu=${menu.hideMenu}
              .menuMessages=${menu.menuMessages}
            ></nostr-post-view>
            ${renderEventActions(reply, root)}
          </div>
        `
      )}
    </div>
  `;
};

export const handleCommentPublished = async ({
  detail,
  interactionEvents,
  profileMap,
  relays,
}: {
  detail: unknown;
  interactionEvents: SignedEvent[];
  profileMap: Record<string, NostrProfile>;
  relays?: string[];
}): Promise<{
  publishedEvents: SignedEvent[];
  interactionEvents: SignedEvent[];
  profileMap: Record<string, NostrProfile>;
}> => {
  const publishedEvents = extractPublishedEvents(detail);
  if (publishedEvents.length === 0) {
    return { publishedEvents, interactionEvents, profileMap };
  }

  return {
    publishedEvents,
    interactionEvents: mergeUniqueEvents(interactionEvents, publishedEvents),
    profileMap: await loadProfilesForEvents(publishedEvents, profileMap, relays),
  };
};
