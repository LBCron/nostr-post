import { css } from 'lit';

export const feedStyle = css`

  .event-item {
    margin-bottom: 0.75rem;
  }

  .event-actions {
    margin: var(--np-space-3) 0 var(--np-space-2);
  }

  .reaction-summary,
  .reply-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .reaction-summary {
    margin: 0.5rem 0 0.75rem;
    flex-direction: row;
    flex-wrap: wrap;
  }

  .reaction-authors {
    margin-left: 0.15rem;
    font-size: var(--np-text-xs);
    opacity: 0.9;
    max-width: 280px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .reply-list {
    margin-top: 0.75rem;
    padding-top: 0.75rem;
    border-top: 1px solid var(--np-color-outline-variant);
  }

  .reply-header {
    font-size: var(--np-text-sm);
    font-weight: 600;
    color: var(--np-color-on-surface-variant);
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  .reply-composer {
    margin-top: 0.75rem;
  }

  .status {
    margin-bottom: var(--np-space-4);
  }

`;
