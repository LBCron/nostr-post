/** Styles of <nostr-post-outbox> (colors from the --np-* tokens, light and dark) */

import { css } from 'lit';

export const outboxStyles = css`
  :host {
    display: block;
    font-size: var(--np-text-md);
    color: var(--np-color-on-surface);
  }
  .head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
  }

  ul {
    list-style: none;
    margin: 0;
    padding: 0;
  }
  li {
    align-items: flex-start;
    padding-inline: 0;
  }
  .thumb {
    width: 3rem;
    height: 3rem;
    flex: none;
    object-fit: cover;
    border-radius: var(--np-radius-xs);
    background: var(--np-color-surface-container);
  }
  .body {
    flex: 1;
    min-width: 0;
  }
  .title {
    font-weight: 500;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .meta {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--np-space-1) var(--np-space-2);
    color: var(--np-color-on-surface-variant);
    font-size: var(--np-text-sm);
  }
  .late {
    color: var(--np-color-error);
  }
  .actions {
    margin-top: var(--np-space-2);
  }
`;
