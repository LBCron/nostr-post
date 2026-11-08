/** Styles of <np-media-view> */

import { css } from 'lit';

export const viewStyles = css`
    :host {
      display: block;
      line-height: 1.3;
    }
    .gallery {
      display: flex;
      flex-wrap: wrap;
      gap: 0.4rem;
    }
    .media-view {
      border-radius: var(--np-radius-sm);
      overflow: hidden;
      background: var(--np-color-surface-container-low);
      border: 1px solid var(--np-color-outline-variant);
      max-width: min(220px, 100%);
    }
    /* One photo (e.g. an event's image): shown large */
    .gallery.single .media-view {
      max-width: 100%;
    }
    .gallery.single img,
    .gallery.single video {
      max-height: min(28rem, 70vh);
    }
    .open {
      display: block;
      width: 100%;
      padding: 0;
      border: 0;
      background: none;
      cursor: zoom-in;
    }
    img {
      display: block;
      width: 100%;
      max-height: 180px;
      object-fit: contain;
      border-radius: var(--np-radius-sm);
    }
    video {
      display: block;
      width: 100%;
      max-height: 180px;
      border-radius: var(--np-radius-sm);
    }
    .media-link {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.75rem;
      color: var(--np-color-primary);
      text-decoration: none;
      font-size: var(--np-text-md);
      word-break: break-all;
      border: 1px solid var(--np-color-outline-variant);
      border-radius: var(--np-radius-sm);
    }
    .media-link:hover {
      text-decoration: underline;
    }
    .media-icon {
      font-size: var(--np-text-xl);
      flex-shrink: 0;
    }
    .empty {
      font-size: var(--np-text-md);
      color: var(--np-color-on-surface-variant);
    }
  `;
