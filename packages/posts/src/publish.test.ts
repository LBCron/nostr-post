import { describe, expect, it } from 'vitest';
import { bundleSigningOrder, linkToPrimary } from './publish';

describe('a post published as several kinds', () => {
  const event = (kind: number) => ({ kind, created_at: 1, content: '', tags: [], pubkey: '' });

  it('signs the note first, so the link never lands on it', () => {
    expect(bundleSigningOrder([event(30078), event(1)]).map((e) => e.kind)).toEqual([1, 30078]);
    expect(bundleSigningOrder([event(30023), event(30078)]).map((e) => e.kind)).toEqual([
      30023, 30078,
    ]);
  });

  it('links other kinds to the first event without a reply marker', () => {
    expect(linkToPrimary(event(30078), 'f'.repeat(64)).tags).toEqual([['e', 'f'.repeat(64)]]);
    expect(linkToPrimary(event(1), 'f'.repeat(64)).tags).toEqual([]);
  });
});
