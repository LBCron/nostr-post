import type { NostrTag } from '@nostr-post/core/types';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clearDryRunEntries, getDryRunEntries, logDryRunEvent, setDryRun } from './dryRun';
import {
  addressOf,
  dryRunBundle,
  dryRunEvents,
  newerOnRelays,
  publishDryRunEntries,
} from './dryRunPublish';
import type { SignedEvent } from './index';

const event = (id: string, kind = 1, tags: NostrTag[] = [], created_at = 100): SignedEvent => ({
  id,
  pubkey: 'pk',
  sig: 'sig',
  kind,
  created_at,
  content: '',
  tags,
});

/** Relay stub: accepts every EVENT (rejects ids starting with "x"), answers REQs with `stored` */
const sent: SignedEvent[] = [];
let stored: SignedEvent[] = [];
class FakeWebSocket {
  onopen?: () => void;
  onmessage?: (msg: { data: string }) => void;
  onerror?: () => void;
  onclose?: () => void;
  constructor() {
    setTimeout(() => this.onopen?.(), 0);
  }
  send(data: string) {
    const [type, second] = JSON.parse(data) as [string, unknown];
    const answer = (msg: unknown[]) =>
      setTimeout(() => this.onmessage?.({ data: JSON.stringify(msg) }), 0);
    if (type === 'EVENT') {
      const ev = second as SignedEvent;
      sent.push(ev);
      answer(['OK', ev.id, !ev.id.startsWith('x'), ev.id.startsWith('x') ? 'blocked' : '']);
    } else if (type === 'REQ') {
      for (const ev of stored) answer(['EVENT', second, ev]);
      answer(['EOSE', second]);
    }
  }
  close() {}
}

const gig = event('gig', 31923, [
  ['d', 'gig'],
  ['a', '30818:pk:venue'],
  ['a', '30818:pk:artist'],
  ['a', '30818:other:not-logged'],
]);
const venueOld = event('venue-1', 30818, [['d', 'venue']], 90);
const venue = event('venue-2', 30818, [['d', 'venue']], 95);
const artist = event('artist', 30818, [
  ['d', 'artist'],
  ['a', '30818:pk:label'],
]);
const label = event('label', 30818, [['d', 'label']]);
const note = event('note', 1, [['e', 'gig']]);

beforeEach(() => {
  sent.length = 0;
  stored = [];
  vi.stubGlobal('WebSocket', FakeWebSocket);
  setDryRun(true);
  clearDryRunEntries();
  for (const ev of [label, artist, venueOld, venue, gig, note]) logDryRunEvent(ev, ['wss://r1']);
});

afterEach(() => {
  setDryRun(false);
  clearDryRunEntries();
  vi.unstubAllGlobals();
});

describe('addressOf', () => {
  it('names addressable and replaceable events', () => {
    expect(addressOf(gig)).toBe('31923:pk:gig');
    expect(addressOf(event('p', 0))).toBe('0:pk:');
    expect(addressOf(event('l', 10002))).toBe('10002:pk:');
    expect(addressOf(note)).toBeUndefined();
  });
});

describe('dryRunEvents', () => {
  it('merges the entries of an event logged per relay', () => {
    logDryRunEvent(note, ['wss://r2']);
    const merged = dryRunEvents().filter((e) => e.event.id === 'note');
    expect(merged).toEqual([{ event: note, relays: ['wss://r2', 'wss://r1'] }]);
  });
});

describe('dryRunBundle', () => {
  it('gives the post and the logged events it links, transitively, newest versions', () => {
    expect(dryRunBundle('gig').map((e) => e.event.id)).toEqual([
      'gig',
      'venue-2',
      'artist',
      'label',
    ]);
    // An `e` tag links too
    expect(dryRunBundle('note').map((e) => e.event.id)).toEqual([
      'note',
      'gig',
      'venue-2',
      'artist',
      'label',
    ]);
    expect(dryRunBundle('nope')).toEqual([]);
  });
});

describe('newerOnRelays', () => {
  it('finds the addressable events relays have in a newer version', async () => {
    stored = [
      event('artist-relay', 30818, [['d', 'artist']], 200),
      event('venue-1', 30818, [['d', 'venue']], 300),
    ];
    const newer = await newerOnRelays(dryRunBundle('gig'));
    // venue-1 at 300 is a logged event, not counted
    expect([...newer]).toEqual(['artist']);
  });
});

describe('publishDryRunEntries', () => {
  it('sends linked events first, also in dry-run mode, and removes them from the log', async () => {
    const results = await publishDryRunEntries(dryRunBundle('gig'));
    expect(sent.map((e) => e.id)).toEqual(['label', 'artist', 'venue-2', 'gig']);
    expect(results.map((r) => r.id)).toEqual(['gig', 'venue-2', 'artist', 'label']);
    expect(results.every((r) => r.ok)).toBe(true);
    expect(getDryRunEntries().map((e) => e.event.id)).toEqual(['note', 'venue-1']);
  });

  it('keeps the events no relay accepted in the log, with the reason', async () => {
    const rejected = event('x-rejected');
    logDryRunEvent(rejected, ['wss://r1']);
    const [result] = await publishDryRunEntries(dryRunBundle('x-rejected'));
    expect(result).toEqual({ id: 'x-rejected', ok: false, error: 'blocked' });
    expect(getDryRunEntries().some((e) => e.event.id === 'x-rejected')).toBe(true);
  });
});

describe('the log in the browser', () => {
  it('is kept in localStorage', () => {
    const store = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => store.set(k, v),
      removeItem: (k: string) => store.delete(k),
    });
    logDryRunEvent(note, ['wss://r9']);
    const kept = JSON.parse(store.get('nostr-post:dry-run-log') ?? '[]');
    expect(kept[0]).toEqual({ event: note, relays: ['wss://r9'] });
  });
});
