import { css } from 'lit';

/** Styles of <np-venue-wiki-publish> */
export const wikiPublishStyles = css`
  :host { display: block; margin: 0.75rem 0; font-size: var(--np-text-md); }
  .wiki-publish {
    gap: var(--np-space-2);
  }
  label.sync { display: flex; align-items: center; gap: 0.4rem; font-weight: 500; }
  .plan { margin: 0.35rem 0; color: var(--np-color-on-surface-variant); }
  .slug { display: flex; flex-wrap: wrap; align-items: center; gap: 0.4rem; margin: 0.35rem 0; }
  .slug-input { display: inline-flex; align-items: center; gap: 0.15rem; }
  .slug-input input {
    min-width: 12rem;
    min-height: 2.25em;
    font-family: var(--np-font-family-mono);
  }
  .slug code { font-size: 0.85em; color: var(--np-color-on-surface-variant); }
  .slug.free .slug-status { color: var(--np-color-success); }
  .slug.taken .slug-status { color: var(--np-color-error); font-weight: 500; }
  .slug.unknown .slug-status, .slug.checking .slug-status { color: var(--np-color-warning); }
  .qualifier { display: flex; flex-wrap: wrap; align-items: center; gap: 0.4rem; margin-bottom: 0.35rem; }
  .extra-link { display: flex; flex-wrap: wrap; align-items: center; gap: 0.4rem; margin: 0.35rem 0; }
  .extra-link input {
    flex: 1;
    min-width: 12rem;
    min-height: 2.25em;
  }
  .link-note { margin-bottom: 0.35rem; color: var(--np-color-warning); }
  .attribution { font-size: var(--np-text-xs); color: var(--np-color-on-surface-variant); }
  .attribution a { color: inherit; }
`;
