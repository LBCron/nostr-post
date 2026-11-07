import { css } from 'lit';

/** Styles shared by <np-list-save> and <np-list-view> */
export const listStyles = css`
  :host {
    display: inline-block;
    position: relative;
    font-size: var(--np-text-md);
    color: var(--np-color-on-surface);
  }

  .save-btn[aria-pressed='true'] {
    background: var(--np-color-secondary-container);
    border-color: transparent;
    color: var(--np-color-on-secondary-container);
  }

  .panel {
    position: absolute;
    z-index: 10;
    top: calc(100% + 0.25rem);
    left: 0;
    min-width: 16rem;
    padding: var(--np-space-3);
    border: 0;
    gap: var(--np-space-2);
  }

  /* Shown as a popover (top layer): placed by <np-list-save> next to its button */
  .panel[popover] {
    position: fixed;
    inset: auto;
    margin: 0;
    color: inherit;
    max-height: calc(100vh - 1rem);
    overflow: auto;
  }
  /* In a view's header the button sits at the right edge: open the panel leftwards */
  :host(.view-action) .panel {
    left: auto;
    right: 0;
  }

  .list-option {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.25rem;
    cursor: pointer;
  }

  .count {
    margin-left: auto;
  }

  .new-list .np-input {
    flex: 1;
    min-width: 0;
    min-height: 2.25em;
  }

  .actions {
    display: flex;
    justify-content: flex-end;
  }

  /* <np-list-view>, <np-list-input> */
  :host(np-list-view),
  :host(np-list-input) {
    display: block;
  }

  .list {
    margin-bottom: 1rem;
  }

  .list-header {
    display: flex;
    align-items: baseline;
    gap: 0.5rem;
  }

  .list-header h3 {
    margin: 0 0 0.375rem;
    font-size: var(--np-text-lg);
    font-weight: 500;
  }

  .list-description {
    margin: 0 0 0.375rem;
    color: var(--np-color-on-surface-variant);
  }

  ul {
    list-style: none;
    margin: 0;
    padding: 0;
  }

  li {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.25rem 0;
    border-bottom: 1px solid var(--np-color-outline-variant);
  }

  .item-title {
    flex: 1;
    padding: 0;
    border: 0;
    background: none;
    color: var(--np-color-primary);
    font: inherit;
    text-align: left;
    cursor: pointer;
  }
`;
