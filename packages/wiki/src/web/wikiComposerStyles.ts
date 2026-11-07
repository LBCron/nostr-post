import { css } from 'lit';

/** Styles of <nostr-wiki-composer> */
export const composerStyles = css`
  :host {
    display: block;
  }

  form.nostr-wiki-composer {
    gap: 0;
    padding: 0;
    overflow: hidden;
  }

  /* ── Header ── */
  .wiki-composer-header {
    padding: 0.875rem 1.25rem;
    border-bottom: 1px solid var(--np-color-outline-variant);
    background: var(--np-color-surface-container-low);
  }
  .wiki-composer-header h3 {
    font-size: var(--np-text-lg);
    font-weight: 500;
    margin: 0 0 0.125rem 0;
  }
  .wiki-composer-header small {
    font-size: var(--np-text-sm);
    color: var(--np-color-on-surface-variant);
  }

  /* ── Fields ── */
  .wiki-fields {
    padding: 1rem 1.25rem;
    display: flex;
    flex-direction: column;
    gap: 0.875rem;
  }

  /* ── Plugin web components ── */
  .wiki-field > [id^="field-"] { width: 100%; }

  .wiki-error {
    margin: 0 1.25rem 0.75rem;
  }

  /* ── Actions ── */
  .wiki-composer-actions {
    padding: 0.875rem 1.25rem;
    border-top: 1px solid var(--np-color-outline-variant);
    background: var(--np-color-surface-container-low);
    display: flex;
    justify-content: flex-end;
    align-items: center;
    gap: 0.75rem;
  }

  .wiki-signing {
    order: -1;
  }

  /* ── State messages ── */
  :host > p {
    padding: 1.5rem;
    text-align: center;
    color: var(--np-color-on-surface-variant);
    margin: 0;
  }

  /* ── Identity preview ── */
  .wiki-identity-preview {
    margin-top: var(--np-space-2);
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
    font-size: var(--np-text-sm);
  }
  .preview-label { color: var(--np-color-on-surface-variant); margin-right: 0.3rem; }
  .preview-value { font-weight: 500; }
  .preview-dtag  { font-family: var(--np-font-family-mono); color: var(--np-color-primary); }

  .wiki-disambiguation {
    margin: 0 0 var(--np-space-4);
  }
  .wiki-disambiguation p {
    margin: 0 0 var(--np-space-2);
    padding: 0;
    text-align: start;
    color: inherit;
  }
  .wiki-disambiguation label {
    display: flex;
    flex-direction: column;
    gap: var(--np-space-1);
    font-weight: 500;
  }
  .wiki-suggestions {
    display: flex;
    flex-wrap: wrap;
    gap: var(--np-space-2);
    margin-bottom: var(--np-space-2);
  }
  .wiki-dtag-status {
    margin: 0 0 var(--np-space-3);
    padding: 0;
    text-align: start;
  }
`;
