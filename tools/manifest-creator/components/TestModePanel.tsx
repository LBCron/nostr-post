'use client';

import {
  clearDryRunEntries,
  DRY_RUN_CHANGE_EVENT,
  type DryRunEntry,
  dryRunEvents,
  isDryRun,
  setDryRun,
} from '@nostr-post/signer';
import { type DetailedHTMLProps, type HTMLAttributes, useEffect, useState } from 'react';

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'nostr-dry-run-publish': DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement> & {
        'event-id'?: string;
      };
    }
  }
}

/** Remembers the toggle for the browser tab, so a reload doesn't silently publish for real */
const STORAGE_KEY = 'nostr-post-manifest-creator-test-mode';

const styles = {
  toggle: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.5rem',
    fontSize: 'var(--np-text-md)',
    fontWeight: 500,
    color: 'var(--np-color-on-surface)',
    cursor: 'pointer',
  },
  banner: {
    marginTop: '1rem',
    padding: '0.75rem 1rem',
    borderRadius: 'var(--np-radius-sm)',
    background: 'var(--np-color-warning-container)',
    border: '1px solid color-mix(in srgb, var(--np-color-warning) 40%, transparent)',
    color: 'var(--np-color-warning)',
    fontSize: 'var(--np-text-md)',
  },
  bannerRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '1rem',
    flexWrap: 'wrap',
  },
  buttons: { display: 'flex', gap: '0.5rem' },
  entry: { marginTop: '0.75rem' },
  entryLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    fontWeight: 600,
    marginBottom: '0.25rem',
  },
  publish: {
    margin: '0.5rem 0',
    padding: '0.75rem',
    background: 'var(--np-color-surface-container-lowest)',
    border: '1px solid color-mix(in srgb, var(--np-color-warning) 40%, transparent)',
    borderRadius: 'var(--np-radius-sm)',
  },
  code: {
    margin: 0,
    padding: '0.75rem',
    background: 'var(--np-color-inverse-surface)',
    color: 'var(--np-color-on-surface-variant)',
    borderRadius: 'var(--np-radius-sm)',
    fontSize: 'var(--np-text-sm)',
    overflowX: 'auto',
    maxHeight: '20rem',
  },
} as const;

const readStoredToggle = (): boolean => {
  try {
    return sessionStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
};

const storeToggle = (on: boolean) => {
  try {
    sessionStorage.setItem(STORAGE_KEY, on ? '1' : '0');
  } catch {
    // Ignore storage errors
  }
};

/** Toggle for test mode (signer dry-run) and the log of events that weren't published */
export const TestModeToggle = () => {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    setDryRun(readStoredToggle());
    setEnabled(isDryRun());
    const onChange = (e: WindowEventMap['nostr-post:dry-run']) => setEnabled(e.detail.enabled);
    window.addEventListener(DRY_RUN_CHANGE_EVENT, onChange);
    return () => window.removeEventListener(DRY_RUN_CHANGE_EVENT, onChange);
  }, []);

  const toggle = (on: boolean) => {
    storeToggle(on);
    setDryRun(on);
  };

  return (
    <label style={styles.toggle}>
      <input type="checkbox" checked={enabled} onChange={(e) => toggle(e.target.checked)} />🧪 Test
      mode (don't publish)
    </label>
  );
};

/** One logged event, its JSON, and "Publish for real" (`<nostr-dry-run-publish>`) */
const LoggedEvent = ({ entry }: { entry: DryRunEntry }) => {
  const [publishing, setPublishing] = useState(false);
  const open = () => {
    // The element comes with the web components, loaded on the client only
    void import('@nostr-post/web').then(() => setPublishing(true));
  };
  return (
    <div style={styles.entry}>
      <div style={styles.entryLabel}>
        {entryLabel(entry)}
        {!publishing && (
          <button type="button" className="np-button np-filled" onClick={open}>
            Publish for real…
          </button>
        )}
      </div>
      {publishing && (
        <div style={styles.publish}>
          <nostr-dry-run-publish event-id={entry.event.id} />
        </div>
      )}
      <pre style={styles.code}>{JSON.stringify(entry.event, null, 2)}</pre>
    </div>
  );
};

const entryLabel = (entry: DryRunEntry) =>
  `kind ${entry.event.kind} · ${entry.event.id.slice(0, 8)}… → ${entry.relays.join(', ') || 'no relays'}`;

/** Banner shown in test mode, with the events that would have been published */
export const TestModeLog = () => {
  const [enabled, setEnabled] = useState(false);
  const [entries, setEntries] = useState<DryRunEntry[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setEnabled(isDryRun());
    setEntries(dryRunEvents());
    const onChange = (e: WindowEventMap['nostr-post:dry-run']) => {
      setEnabled(e.detail.enabled);
      setEntries(dryRunEvents(e.detail.entries));
    };
    window.addEventListener(DRY_RUN_CHANGE_EVENT, onChange);
    return () => window.removeEventListener(DRY_RUN_CHANGE_EVENT, onChange);
  }, []);

  if (!enabled) return null;

  const copyAll = () =>
    void navigator.clipboard?.writeText(
      JSON.stringify(
        entries.map((entry) => entry.event),
        null,
        2
      )
    );

  return (
    <div style={styles.banner}>
      <div style={styles.bannerRow}>
        <span>
          <strong>Test mode:</strong> events are signed but not sent to relays. Feeds and pickers
          include them, and they can still be published for real. {entries.length} test event(s).
        </span>
        <div style={styles.buttons}>
          <button
            type="button"
            className="np-button np-filled"
            onClick={() => setOpen(!open)}
            disabled={entries.length === 0}
          >
            {open ? 'Hide events' : 'Show events'}
          </button>
          <button
            type="button"
            className="np-button np-filled"
            onClick={copyAll}
            disabled={entries.length === 0}
          >
            Copy JSON
          </button>
          <button
            type="button"
            className="np-button np-filled"
            onClick={clearDryRunEntries}
            disabled={entries.length === 0}
          >
            Clear
          </button>
        </div>
      </div>
      {open && entries.map((entry) => <LoggedEvent key={entry.event.id} entry={entry} />)}
    </div>
  );
};
