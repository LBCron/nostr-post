import { css } from 'lit';

export const composerStyle = css`
  /* <np-completing-textarea>: suggestions while typing, e.g. @mentions */
  .completing {
    position: relative;
  }

  .completions {
    position: absolute;
    z-index: 20;
    left: 0;
    right: 0;
    top: calc(100% + 0.25rem);
    margin: 0;
    padding: 0.25rem;
    list-style: none;
    background: var(--np-color-surface-container-lowest);
    border: 1px solid var(--np-color-outline-variant);
    border-radius: var(--np-radius-sm);
    box-shadow: 0 4px 16px color-mix(in srgb, var(--np-color-shadow) 12%, transparent);
  }

  .completions li {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.375rem 0.5rem;
    border-radius: var(--np-radius-sm);
    cursor: pointer;
    color: var(--np-color-on-surface);
  }

  .completions li.active {
    background: var(--np-color-primary-container);
  }

  .completions img,
  .completions .no-image {
    width: 1.5rem;
    height: 1.5rem;
    border-radius: 50%;
    object-fit: cover;
    background: var(--np-color-surface-container-highest);
    flex: none;
  }

  .completions .detail {
    color: var(--np-color-on-surface-variant);
    font-size: var(--np-text-sm);
  }

  .composer-header {
    display: flex;
    flex-direction: column;
    gap: var(--np-space-1);
    margin-bottom: var(--np-space-4);
  }

  .np-message {
    margin-top: var(--np-space-2);
  }

  .composer-actions {
    margin-top: var(--np-space-4);
  }

  .send-at {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.5rem;
    margin-top: 1rem;
    font-size: var(--np-text-md);
  }

  .reply-target-panel {
    margin-bottom: var(--np-space-4);
  }

  .reply-target-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.5rem;
  }

  .reply-target-field {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    font-size: var(--np-text-sm);
    color: var(--np-color-on-surface-variant);
  }

  .reply-target-field input[readonly] {
    background: var(--np-color-surface-container);
    color: var(--np-color-on-surface-variant);
  }

  @media (max-width: 640px) {
    .reply-target-grid {
      grid-template-columns: 1fr;
    }
  }

  .publish-format-panel {
    margin-bottom: 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
  }

  .hidden-field-errors {
    margin-bottom: var(--np-space-4);
  }

  .hidden-field-errors-title {
    font-weight: 600;
    margin-bottom: 0.4rem;
  }

  .hidden-field-errors ul {
    margin: 0;
    padding-left: 1rem;
  }

  .hidden-field-errors li {
    margin: 0.15rem 0;
  }

  .field-readonly {
    opacity: 0.75;
    pointer-events: none;
  }

  .readonly-value {
    font-size: var(--np-text-md);
    color: var(--np-color-on-surface-variant);
  }

  .expandable-field {
    margin-top: 0.5rem;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .expand-chevron {
    font-size: var(--np-text-xs);
    opacity: 0.7;
  }

  .upload-status {
    font-size: var(--np-text-sm);
    color: var(--np-color-on-surface-variant);
    padding: 0.25rem 0;
    animation: pulse 1s infinite alternate;
  }

  @keyframes pulse {
    from { opacity: 1; }
    to { opacity: 0.5; }
  }

  /* Attached plugins' buttons under a text field, e.g. Add media */
  .field-toolbar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.375rem;
    margin-top: 0.375rem;
  }
`;
