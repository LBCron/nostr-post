/** Styles of <nostr-wiki-gallery>, light and dark (`.dark` on an ancestor) */

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
    font-size: 0.95rem;
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
    background: #f3f4f6;
    border-radius: 0.375rem;
    overflow: hidden;
    cursor: pointer;
    aspect-ratio: 1;
  }
  .thumb img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }
  .status,
  .byline {
    color: #6b7280;
    font-size: 0.8125rem;
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
    margin-top: 0.5rem;
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
  .large {
    margin: 0;
  }
  .large img {
    display: block;
    max-width: 100%;
    max-height: 75vh;
    margin: 0 auto;
    border-radius: 0.375rem;
  }
  figcaption {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.5rem 1rem;
    margin-top: 0.5rem;
    font-size: 0.875rem;
  }
  .alt {
    flex-basis: 100%;
  }
  a {
    color: #4f46e5;
  }
  :host-context(.dark) {
    color: #f3f4f6;
  }
  :host-context(.dark) a {
    color: #a5b4fc;
  }
  .close {
    margin-left: auto;
  }
  :host-context(.dark) .thumb {
    background: #374151;
  }
  :host-context(.dark) .status,
  :host-context(.dark) .byline {
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
