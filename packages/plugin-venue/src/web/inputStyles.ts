import { css } from 'lit';

/** Styles of <np-venue-input> */
export const venueInputStyles = css`
  :host {
    display: block;
  }

  .container {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  /* Venue search */
  .search-row {
    display: flex;
    gap: 0.5rem;
  }

  .search-input {
    flex: 1;
  }

  /* Results */
  .results {
    border: 1px solid var(--np-color-outline-variant);
    border-radius: var(--np-radius-sm);
    max-height: 200px;
    overflow-y: auto;
    background: var(--np-color-surface-container-lowest);
    box-shadow: 0 4px 6px -1px color-mix(in srgb, var(--np-color-shadow) 10%, transparent);
  }

  .result-item {
    padding: 0.5rem 0.75rem;
    cursor: pointer;
    font-size: var(--np-text-sm);
    border-bottom: 1px solid var(--np-color-outline-variant);
    line-height: 1.4;
  }

  .result-item:last-child {
    border-bottom: none;
  }

  .result-item:hover {
    background: var(--np-color-primary-container);
  }

  .result-type {
    font-size: var(--np-text-sm);
    color: var(--np-color-on-surface-variant);
  }

  /* Venue card */
  .venue-card {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    padding: 0.625rem 0.75rem;
    background: var(--np-color-surface-container-low);
    border: 1px solid var(--np-color-outline-variant);
    border-radius: var(--np-radius-md);
  }

  .venue-name {
    font-weight: 600;
    font-size: var(--np-text-md);
    color: var(--np-color-success);
  }

  .venue-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    font-size: var(--np-text-sm);
    color: var(--np-color-on-surface-variant);
  }

  .venue-meta a {
    color: var(--np-color-primary);
    text-decoration: none;
  }

  .venue-meta a:hover {
    text-decoration: underline;
  }

  .loading {
    font-size: var(--np-text-sm);
    color: var(--np-color-on-surface-variant);
    padding: 0.25rem 0;
  }

`;
