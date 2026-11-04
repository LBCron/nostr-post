/**
 * The applied update comments under an event (<nostr-post-view>). The logic is
 * `@nostr-post/posts`' updates and `@nostr-post/core/eventUpdates`.
 */

import type { DisplayableEvent } from '@nostr-post/core/types';
import { appliedUpdates } from '@nostr-post/posts';
import type { TemplateResult } from 'lit';
import { html, nothing } from 'lit';

/**
 * Render the collapsible update-comments section shown beneath an event.
 * Returns nothing when there are no update comments of the event's editors to show.
 */
export const renderUpdateComments = (
  interactionEvents: DisplayableEvent[] | undefined,
  editors: ReadonlySet<string>
): TemplateResult | typeof nothing => {
  const updates = appliedUpdates(interactionEvents, editors);
  if (updates.length === 0) return nothing;

  return html`
    <details class="view-updates">
      <summary class="view-updates-summary">
        ${updates.length} applied update${updates.length > 1 ? 's' : ''}
      </summary>
      <ul class="view-updates-list">
        ${updates.map((u) => html`<li><strong>${u.fieldId}</strong>: ${u.rawValue}</li>`)}
      </ul>
    </details>
  `;
};
