/** Styles of <nostr-post-sections>, light and dark (`.dark` on an ancestor) */

import { css } from 'lit';

export const sectionsStyles = css`
  :host {
    display: block;
  }
  section {
    margin-top: 1rem;
  }
  .head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
  }
  h3 {
    font-size: 0.95rem;
    margin: 0 0 0.375rem;
  }
  .item {
    padding: 0.375rem 0;
    border-top: 1px solid #e5e7eb;
    font-size: 0.875rem;
  }
  summary {
    cursor: pointer;
  }
  /* The text next to the marker; the byline below it */
  summary > div:first-child {
    display: inline;
  }
  .item-view {
    display: block;
    margin-top: 0.375rem;
  }
  .byline,
  .status {
    color: #6b7280;
    font-size: 0.8125rem;
  }
  .byline {
    font-size: 0.75rem;
  }
  .stats {
    font-size: 0.875rem;
    margin-bottom: 0.375rem;
  }
  button.add,
  button.more,
  button.close {
    font: inherit;
    font-size: 0.8125rem;
    cursor: pointer;
    color: #1f2937;
    background: #f9fafb;
    border: 1px solid #d1d5db;
    border-radius: 0.375rem;
    padding: 0.25rem 0.625rem;
  }
  button.more {
    margin-top: 0.375rem;
  }
  dialog {
    width: min(48rem, 94vw);
    max-height: 92vh;
    overflow: auto;
    padding: 0.75rem;
    color: #1f2937;
    background: #ffffff;
    border: 1px solid #d1d5db;
    border-radius: 0.5rem;
  }
  :host-context(.dark) {
    color: #f3f4f6;
  }
  :host-context(.dark) .item {
    border-top-color: #4b5563;
  }
  :host-context(.dark) .byline,
  :host-context(.dark) .status {
    color: #9ca3af;
  }
  :host-context(.dark) button.add,
  :host-context(.dark) button.more,
  :host-context(.dark) button.close {
    color: #f3f4f6;
    background: #374151;
    border-color: #4b5563;
  }
  :host-context(.dark) dialog {
    color: #f3f4f6;
    background: #1f2937;
    border-color: #4b5563;
  }
`;
