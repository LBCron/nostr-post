import { css } from 'lit';

/** <nostr-calendar-agenda>'s buttons, day headings and month grid */
export const agendaStyles = css`
  :host {
    display: block;
  }

  .agenda-nav {
    margin-bottom: var(--np-space-3);
  }


  .agenda-range {
    margin-left: 0.25rem;
    font-size: var(--np-text-md);
    color: var(--np-color-on-surface-variant);
  }

  .agenda-loading {
    font-size: var(--np-text-md);
    color: var(--np-color-on-surface-variant);
  }

  /* The previous window's days, while the next window loads */
  .agenda-days.stale {
    opacity: 0.5;
    transition: opacity 0.15s;
  }

  .month-grid {
    width: 100%;
    table-layout: fixed;
    border-collapse: collapse;
    margin-bottom: 1rem;
    font-size: var(--np-text-sm);
  }

  .month-grid th {
    padding: 0.25rem;
    font-weight: 600;
    color: var(--np-color-on-surface-variant);
  }

  .month-grid td {
    height: 4.5rem;
    vertical-align: top;
    border: 1px solid var(--np-color-outline-variant);
    padding: 0.125rem;
  }

  .month-grid td.outside {
    color: var(--np-color-on-surface-variant);
    background: var(--np-color-surface-container-low);
  }

  .month-grid .day-number {
    align-self: flex-start;
  }

  .month-grid td.today .day-number {
    color: var(--np-color-on-primary);
    background: var(--np-color-primary);
    border-radius: var(--np-radius-full);
    padding: 0 0.375rem;
  }

  .month-grid .day {
    display: flex;
    flex-direction: column;
    align-items: stretch;
    justify-content: flex-start;
    gap: 0.125rem;
    width: 100%;
    height: 100%;
    padding: 0;
    border: none;
    background: none;
    font: inherit;
    text-align: left;
    color: inherit;
    cursor: pointer;
  }

  .month-grid .day-event {
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
    background: var(--np-color-primary-container);
    color: var(--np-color-on-primary-container);
    border-radius: var(--np-radius-xs);
    padding: 0 0.25rem;
  }

  .month-grid .day-more {
    color: var(--np-color-on-surface-variant);
  }

  .agenda-row {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 0.25rem 0.75rem;
    padding: 0.375rem 0.25rem;
    border-bottom: 1px solid var(--np-color-outline-variant);
  }

  .agenda-row.open {
    background: var(--np-color-primary-container);
  }

  .agenda-time {
    flex: none;
    width: 4.5rem;
    font-variant-numeric: tabular-nums;
    color: var(--np-color-on-surface-variant);
    font-size: var(--np-text-md);
  }

  .agenda-main {
    flex: 1;
    min-width: 12rem;
    display: flex;
    flex-direction: column;
  }

  .agenda-title {
    font: inherit;
    font-weight: 600;
    color: var(--np-color-on-surface);
    text-align: left;
    background: none;
    border: none;
    padding: 0;
    cursor: pointer;
    text-decoration: none;
    /* Some titles are whole paragraphs: two lines here, all of it under Details */
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  a.agenda-title:hover,
  button.agenda-title:hover {
    text-decoration: underline;
  }

  .agenda-place,
  .agenda-topics {
    font-size: var(--np-text-sm);
    color: var(--np-color-on-surface-variant);
  }

  .agenda-topics {
    display: flex;
    gap: 0.375rem;
  }

  .agenda-more {
    font: inherit;
    font-size: var(--np-text-sm);
    background: none;
    border: none;
    color: var(--np-color-primary);
    cursor: pointer;
  }

  .agenda-open {
    padding: 0.5rem 0 1rem;
  }

  .agenda-date {
    font-size: var(--np-text-md);
    font-weight: 600;
    margin: 1.25rem 0 0.5rem;
    padding-bottom: 0.25rem;
    border-bottom: 1px solid var(--np-color-outline-variant);
    color: var(--np-color-on-surface);
  }

`;
