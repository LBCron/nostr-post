/**
 * @nostr-post/web - Styles of <np-field-action-panel>: a field action with a choice
 */

import { css } from 'lit';

export const fieldActionStyles = css`
    :host {
      display: inline-block;
    }
    .panel {
      position: fixed;
      inset: auto;
      margin: 0;
      width: min(20rem, calc(100vw - 1rem));
      max-height: calc(100vh - 1rem);
      overflow: auto;
      padding: 0.75rem;
      background: var(--np-color-surface-container-lowest);
      color: var(--np-color-on-surface);
      border: 1px solid var(--np-color-outline-variant);
      border-radius: var(--np-radius-sm);
      box-shadow: 0 8px 24px color-mix(in srgb, var(--np-color-shadow) 15%, transparent);
      font-size: var(--np-text-md);
    }
    .drop {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.375rem;
      padding: 0.75rem;
      border: 2px dashed var(--np-color-outline-variant);
      border-radius: var(--np-radius-sm);
      color: var(--np-color-on-surface-variant);
      font-size: var(--np-text-sm);
    }
    .drop.over {
      border-color: var(--np-color-primary);
    }
    fieldset {
      margin: 0.75rem 0 0;
      padding: 0;
      border: none;
    }
    legend {
      padding: 0;
      margin-bottom: 0.375rem;
      font-weight: 600;
    }
    .option {
      display: grid;
      grid-template-columns: auto 1fr;
      gap: 0 0.5rem;
      padding: 0.375rem 0.25rem;
      border-radius: var(--np-radius-sm);
      cursor: pointer;
    }
    .option:hover {
      background: var(--np-color-surface-container-low);
    }
    .option input {
      grid-row: span 2;
      align-self: start;
      margin: 0.2rem 0 0;
    }
    .description,
    .hint {
      color: var(--np-color-on-surface-variant);
      font-size: var(--np-text-sm);
    }
    .hint {
      margin: 0.5rem 0 0;
    }
`;
