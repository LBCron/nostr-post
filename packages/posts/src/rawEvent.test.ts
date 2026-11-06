import { decodeNaddr } from '@nostr-post/core/nip19';
import type { SignedEvent } from '@nostr-post/signer';
import { describe, expect, it } from 'vitest';
import { rawEventData } from './rawEvent';

const pubkey = '6a19c89b2694b307aae6dc40256264071a47bdad89d8ddae6d1ab7139a94015d';
const gig: SignedEvent = {
  id: 'a'.repeat(64),
  pubkey,
  created_at: 1795197600,
  kind: 31923,
  tags: [
    ['d', 'gig'],
    ['start_tzid', 'Europe/Berlin'],
    ['t', 'punk'],
  ],
  content: 'Doors 19:00',
  sig: 'b'.repeat(128),
};

describe('rawEventData', () => {
  it('names an addressable event by naddr, with the relays it was found on', () => {
    const raw = rawEventData(gig, ['wss://r.x.com']);
    expect(raw).toMatchObject({
      npub: expect.stringMatching(/^npub1/),
      kind: 31923,
      dTag: 'gig',
      address: `31923:${pubkey}:gig`,
      relays: ['wss://r.x.com'],
      tags: gig.tags,
      sig: gig.sig,
    });
    expect(raw.pointer).toMatch(/^naddr1/);
    expect(decodeNaddr(raw.pointer)).toBe(`31923:${pubkey}:gig`);
    expect(JSON.parse(raw.json)).toEqual(gig);
  });

  it('names other events by nevent', () => {
    const note = { ...gig, kind: 1, tags: [['t', 'punk'] as [string, string]] };
    const raw = rawEventData(note, []);
    expect(raw.pointer).toMatch(/^nevent1/);
    expect(raw.dTag).toBeUndefined();
    expect(raw.address).toBeUndefined();
  });
});
