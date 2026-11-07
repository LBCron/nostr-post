/**
 * @nostr-post/web - Shared theme
 *
 * The visual language comes from @nostr-post/ui (tokens and primitives); these are the
 * rules @nostr-post/web's components share on top of it.
 */

import { npStyles } from '@nostr-post/ui/web';
import { type CSSResultGroup, css } from 'lit';

const webBase = css`
  :host {
    display: block;
  }

  /* Messages: the same look as np-message */
  .error,
  .success {
    margin: var(--np-space-2) 0;
    padding: var(--np-space-3) var(--np-space-4);
    border: 1px solid;
    border-radius: var(--np-radius-sm);
    font-size: var(--np-text-md);
  }

  .error {
    background: var(--np-color-error-container);
    border-color: color-mix(in srgb, var(--np-color-error) 35%, transparent);
    color: var(--np-color-on-error-container);
  }

  .success {
    background: var(--np-color-success-container);
    border-color: color-mix(in srgb, var(--np-color-success) 35%, transparent);
    color: var(--np-color-on-success-container);
  }

  .loading {
    padding: var(--np-space-8) var(--np-space-4);
    color: var(--np-color-on-surface-variant);
    text-align: center;
  }

  /* Form fields: the same look as np-field / np-input */
  .field {
    display: flex;
    flex-direction: column;
    gap: var(--np-space-1);
    margin-bottom: var(--np-space-4);
  }

  .field label {
    color: var(--np-color-on-surface);
    font-size: var(--np-text-sm);
    font-weight: 500;
  }

  .field input,
  .field textarea,
  .field select {
    width: 100%;
    min-height: 2.75em;
    padding: var(--np-space-2) var(--np-space-3);
    border: 1px solid var(--np-color-outline);
    border-radius: var(--np-radius-xs);
    background: var(--np-color-surface-container-lowest);
    color: var(--np-color-on-surface);
    font: inherit;
    font-size: var(--np-text-md);
    transition:
      border-color var(--np-motion-duration) var(--np-motion-easing),
      box-shadow var(--np-motion-duration) var(--np-motion-easing);
  }

  .field input:focus,
  .field textarea:focus,
  .field select:focus {
    outline: none;
    border-color: var(--np-color-primary);
    box-shadow: inset 0 0 0 1px var(--np-color-primary);
  }

  .field textarea {
    min-height: 6em;
    resize: vertical;
  }

  .field-error {
    color: var(--np-color-error);
    font-size: var(--np-text-sm);
  }

  /* Buttons without a primitive class: the look of np-button (outlined), .primary filled */
  button:not([class*='np-']) {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: var(--np-space-2);
    min-height: 2.5em;
    padding: 0 var(--np-space-4);
    border: 1px solid var(--np-color-outline-variant);
    border-radius: var(--np-radius-full);
    background: transparent;
    color: var(--np-color-primary);
    font: inherit;
    font-size: var(--np-text-md);
    font-weight: 500;
    cursor: pointer;
    transition:
      background-color var(--np-motion-duration) var(--np-motion-easing),
      box-shadow var(--np-motion-duration) var(--np-motion-easing);
  }

  button:not([class*='np-']):hover:not(:disabled) {
    background: color-mix(in srgb, currentColor 8%, transparent);
  }

  button:not([class*='np-']):focus-visible {
    outline: none;
    box-shadow: var(--np-focus-ring);
  }

  button:not([class*='np-']):disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }

  button:not([class*='np-']).primary {
    background: var(--np-color-primary);
    border-color: var(--np-color-primary);
    color: var(--np-color-on-primary);
  }

  button:not([class*='np-']).primary:hover:not(:disabled) {
    background: color-mix(in srgb, var(--np-color-on-primary) 10%, var(--np-color-primary));
    box-shadow: var(--np-elevation-1);
  }

  .required::after {
    content: ' *';
    color: var(--np-color-error);
  }
`;

/** Shared styles of @nostr-post/web's components: the ui primitives, then the web rules */
export const baseStyles: CSSResultGroup = [...npStyles, webBase];
