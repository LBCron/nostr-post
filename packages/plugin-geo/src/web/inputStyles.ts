/** Styles of <np-geo-input> */

import { css } from 'lit';

export const geoInputStyles = css`
    :host {
      display: block;
    }

    .container {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    /* Search row */
    .search-row {
      display: flex;
      gap: 0.5rem;
    }

    .search-input {
      flex: 1;
    }

    /* Search results dropdown */
    .search-results {
      position: relative;
    }

    .results-list {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      z-index: 1000;
      background: var(--np-color-surface-container-lowest);
      border: 1px solid var(--np-color-outline-variant);
      border-radius: var(--np-radius-sm);
      box-shadow: 0 4px 12px color-mix(in srgb, var(--np-color-shadow) 10%, transparent);
      max-height: 200px;
      overflow-y: auto;
      list-style: none;
      margin: 0;
      padding: 0;
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

    /* Map */
    .map-wrapper {
      border-radius: var(--np-radius-sm);
      border: 1px solid var(--np-color-outline-variant);
      overflow: hidden;
      height: 300px;
      position: relative;
    }

    .map-wrapper .map-inner {
      height: 100%;
      width: 100%;
    }

    /* Actions row */
    .actions-row {
      display: flex;
      gap: 0.5rem;
    }

    /* Coordinate inputs */
    .coords-row {
      display: flex;
      gap: 1rem;
    }

    .coord-field {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .coord-input {
      font-family: var(--np-font-family-mono);
    }

    .geohash-display {
      font-family: var(--np-font-family-mono);
      font-size: var(--np-text-md);
      color: var(--np-color-on-surface);
      background: var(--np-color-surface-container);
      padding: 0.375rem 0.75rem;
      border-radius: var(--np-radius-sm);
      text-align: center;
      letter-spacing: 0.05em;
    }

`;
