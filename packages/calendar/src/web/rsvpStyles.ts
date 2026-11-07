import { css } from 'lit';

export const rsvpStyles = css`
  :host {
    display: inline-block;
    position: relative;
  }

  .who-button {
    border-style: dashed;
  }

  /* Opens leftwards: <np-rsvp> sits at the right of a view's header */
  .who {
    position: absolute;
    z-index: 10;
    right: 0;
    top: calc(100% + 0.25rem);
    min-width: 14rem;
    max-height: 20rem;
    overflow-y: auto;
    padding: 0.5rem;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    background: var(--np-color-surface-container);
    border-radius: var(--np-radius-xs);
    box-shadow: var(--np-elevation-2);
  }

  .who-title {
    font-size: var(--np-text-sm);
    font-weight: 600;
    color: var(--np-color-on-surface-variant);
    margin-bottom: 0.25rem;
  }

  .rsvp {
    display: inline-flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.375rem;
  }

  .count {
    margin-left: 0.125rem;
    opacity: 0.8;
  }

  .error {
    margin: var(--np-space-1) 0 0;
  }
`;
