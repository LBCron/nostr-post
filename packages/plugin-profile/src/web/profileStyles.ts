import { css } from 'lit';

export const profileStyles = css`
  :host {
    display: block;
    font-size: var(--np-text-md);
  }

  .people {
    display: flex;
    flex-direction: column;
    gap: 0.375rem;
  }

  .person {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .avatar {
    width: 1.75rem;
    height: 1.75rem;
    background: var(--np-color-surface-container-highest);
  }

  .name {
    font-weight: 500;
    color: var(--np-color-on-surface);
  }

  .role {
    color: var(--np-color-on-surface-variant);
  }

  .role-input {
    width: 9rem;
    min-height: 2.25em;
  }

  .search {
    position: relative;
    margin-top: 0.375rem;
  }

  .results {
    position: absolute;
    z-index: 10;
    left: 0;
    right: 0;
    top: calc(100% + 0.25rem);
    max-height: 16rem;
    overflow-y: auto;

  }

  .result {
    width: 100%;
  }

  .nip05 {
    color: var(--np-color-on-surface-variant);
    font-size: var(--np-text-sm);
  }

  .note {
    padding: 0.375rem 0.5rem;
    color: var(--np-color-on-surface-variant);
  }
`;
