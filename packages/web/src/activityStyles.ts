/**
 * @nostr-post/web - Styles of <np-activity>: progress of long tasks, bottom right
 */

import { css } from 'lit';

export const activityStyles = css`
  :host {
    position: fixed;
    right: 1rem;
    bottom: 1rem;
    z-index: 2147483000;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    width: min(22rem, calc(100vw - 2rem));
    pointer-events: none;
    font-family: inherit;
  }
  .item {
    pointer-events: auto;
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 0.25rem 0.5rem;
    padding: 0.625rem 0.75rem;
    background: var(--np-color-surface-container-high);
    color: var(--np-color-on-surface);
    border: 1px solid var(--np-color-outline-variant);
    border-radius: var(--np-radius-sm);
    box-shadow: var(--np-elevation-2);
    font-size: var(--np-text-md);
  }
  .item.done {
    border-color: color-mix(in srgb, var(--np-color-success) 40%, transparent);
  }
  .item.failed {
    border-color: color-mix(in srgb, var(--np-color-error) 40%, transparent);
  }
  .label {
    font-weight: 600;
    overflow-wrap: anywhere;
  }
  .detail {
    grid-column: 1 / -1;
    color: var(--np-color-on-surface-variant);
    font-size: var(--np-text-sm);
    overflow-wrap: anywhere;
  }
  .item.failed .detail {
    color: var(--np-color-error);
  }
  .bar {
    grid-column: 1 / -1;
    height: 4px;
    background: var(--np-color-secondary-container);
    border-radius: var(--np-radius-full);
    overflow: hidden;
  }
  .fill {
    height: 100%;
    background: var(--np-color-primary);
    transition: width 0.3s;
  }
  .bar.unknown .fill {
    width: 30%;
    animation: slide 1.2s ease-in-out infinite;
  }
  @keyframes slide {
    from {
      transform: translateX(-100%);
    }
    to {
      transform: translateX(340%);
    }
  }
`;
