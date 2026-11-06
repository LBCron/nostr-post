import { css } from 'lit';

export const outboxStyles = css`
  :host {
    display: block;
    font-size: 14px;
    color: #1f2937;
  }
  .head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
  }
  h3 {
    margin: 0;
    font-size: 1rem;
  }
  ul {
    list-style: none;
    margin: 0;
    padding: 0;
  }
  li {
    display: flex;
    gap: 0.75rem;
    align-items: flex-start;
    padding: 0.5rem 0;
    border-top: 1px solid #e5e7eb;
  }
  .thumb {
    width: 3rem;
    height: 3rem;
    flex: none;
    object-fit: cover;
    border-radius: 4px;
    background: #f3f4f6;
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
  .meta,
  .empty,
  .warning {
    color: #6b7280;
    font-size: 0.8125rem;
  }
  .state-failed,
  .error,
  .late {
    color: #dc2626;
  }
  .actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.375rem;
    margin-top: 0.25rem;
  }
  button {
    font: inherit;
    font-size: 0.8125rem;
    cursor: pointer;
    padding: 0.125rem 0.5rem;
    color: #1f2937;
    background: #fff;
    border: 1px solid #d1d5db;
    border-radius: 4px;
  }
  button.primary {
    color: #fff;
    background: #6366f1;
    border-color: #6366f1;
  }
  :host-context(.dark) {
    color: #f3f4f6;
  }
  :host-context(.dark) li {
    border-color: #374151;
  }
  :host-context(.dark) .thumb {
    background: #374151;
  }
  :host-context(.dark) .meta,
  :host-context(.dark) .empty,
  :host-context(.dark) .warning {
    color: #9ca3af;
  }
  :host-context(.dark) .state-failed,
  :host-context(.dark) .error,
  :host-context(.dark) .late {
    color: #fca5a5;
  }
  :host-context(.dark) button {
    color: #f3f4f6;
    background: #374151;
    border-color: #4b5563;
  }
  :host-context(.dark) button.primary {
    background: #4f46e5;
    border-color: #4f46e5;
  }
`;
