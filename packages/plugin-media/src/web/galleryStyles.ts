/** Styles of <np-media-gallery> (colors from the --np-* tokens, light and dark) */

import { css } from 'lit';

export const galleryStyles = css`
  :host {
    display: block;
    margin-top: 1rem;
  }
  .head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
  }
  h3 {
    font-size: var(--np-text-lg);
    margin: 0 0 0.375rem;
  }
  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(6rem, 1fr));
    gap: 0.375rem;
  }
  .thumb {
    padding: 0;
    border: none;
    background: var(--np-color-surface-container);
    border-radius: var(--np-radius-sm);
    overflow: hidden;
    cursor: pointer;
    aspect-ratio: 1;
  }
  .thumb {
    position: relative;
  }
  .thumb img,
  .thumb video {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }
  .badge {
    position: absolute;
    right: 0.25rem;
    bottom: 0.25rem;
    padding: 0.125rem 0.375rem;
    font-size: var(--np-text-sm);
    color: var(--np-color-on-scrim);
    background: color-mix(in srgb, var(--np-color-scrim) 55%, transparent);
    border-radius: var(--np-radius-xs);
  }
  .status,
  .byline {
    color: var(--np-color-on-surface-variant);
    font-size: var(--np-text-sm);
  }
  button.more {
    margin-top: 0.5rem;
  }
  dialog {
    width: min(48rem, calc(100vw - 2 * var(--np-space-4)));
    padding: var(--np-space-3);
  }
  .large {
    margin: 0;
  }
  .large img,
  .large video {
    display: block;
    max-width: 100%;
    max-height: 75vh;
    margin: 0 auto;
    border-radius: var(--np-radius-sm);
  }
  figcaption {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.5rem 1rem;
    margin-top: 0.5rem;
    font-size: var(--np-text-md);
  }
  .alt {
    flex-basis: 100%;
  }
  a {
    color: var(--np-color-primary);
  }

  .close {
    margin-left: auto;
  }
`;
