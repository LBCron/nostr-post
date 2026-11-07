/**
 * Styles of <np-hashtag-input> (colors from the --np-* tokens, light and dark)
 */

import { css } from 'lit';

export const hashtagInputStyles = css`
  :host {
    display: block;
  }
  .container {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  /* Looks like np-input, with chips inside */
  .chip-box {
    display: flex;
    flex-wrap: wrap;
    gap: var(--np-space-2);
    align-items: center;
    min-height: 2.75em;
    padding: var(--np-space-1) var(--np-space-2);
    border: 1px solid var(--np-color-outline);
    border-radius: var(--np-radius-xs);
    background: var(--np-color-surface-container-lowest);
    cursor: text;
  }
  .chip-box:focus-within {
    border-color: var(--np-color-primary);
    box-shadow: inset 0 0 0 1px var(--np-color-primary);
  }

  .chip {
    border-color: transparent;
    background: var(--np-color-tertiary-container);
    color: var(--np-color-on-tertiary-container);
  }
  .chip .remove {
    background: none;
    border: none;
    cursor: pointer;
    color: inherit;
    padding: 0 2px;
    font-size: var(--np-text-lg);
    line-height: 1;
  }

  .inline-input {
    flex: 1;
    min-width: 100px;
    padding: 0.2rem;
    border: none;
    outline: none;
    background: transparent;
    color: inherit;
    font: inherit;
  }

  .suggestions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.25rem;
  }

`;
