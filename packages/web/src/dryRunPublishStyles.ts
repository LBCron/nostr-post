/**
 * @nostr-post/web - Styles of <nostr-dry-run-publish>
 */

import { css } from 'lit';

export const dryRunPublishStyles = css`
  :host {
    display: block;
    font-size: var(--np-text-md);
    color: var(--np-color-on-surface);
  }
  h3 {
    margin: 0 0 0.5rem;
    font-size: var(--np-text-lg);
  }
  p {
    margin: 0 0 0.75rem;
    color: var(--np-color-on-surface-variant);
  }
  ul {
    margin: 0 0 0.75rem;
    padding-left: 1.25rem;
  }
  li {
    margin: 0.25rem 0;
  }
  .kind,
  .note {
    color: var(--np-color-on-surface-variant);
  }
  .ok {
    color: var(--np-color-success);
  }
  .error {
    color: var(--np-color-error);
  }
`;
