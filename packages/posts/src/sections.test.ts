import type { SignedEvent } from '@nostr-post/signer';
import { describe, expect, it } from 'vitest';
import {
  matchesSection,
  newestItems,
  postSnippet,
  sectionFilters,
  sectionStats,
  sectionTarget,
} from './sections';

const pk = 'a'.repeat(64);
let n = 0;
const event = (over: Partial<SignedEvent>): SignedEvent => ({
  id: (++n).toString(16).padStart(64, '0'),
  pubkey: pk,
  sig: 's',
  kind: 1,
  created_at: 1,
  content: '',
  tags: [],
  ...over,
});
const page = event({
  kind: 30818,
  tags: [
    ['d', 'x-brewery'],
    ['i', 'https://x.example'],
  ],
});
const target = sectionTarget([page]);

describe('sectionTarget', () => {
  it("is the page's address and its i links", () => {
    expect(target).toEqual({
      addresses: [`30818:${pk}:x-brewery`],
      ids: [],
      links: ['https://x.example'],
    });
  });
});

describe('sectionFilters', () => {
  it('asks for posts referencing the page, with the kinds, manifests and tags', () => {
    const filters = sectionFilters(
      { label: 'Reviews', kinds: [1], manifests: ['beer-review-v1'], tags: { t: ['ipa'] } },
      target,
      20
    );
    expect(filters).toEqual([
      { kinds: [1], limit: 20, '#a': target.addresses, '#l': ['beer-review-v1'], '#t': ['ipa'] },
      { kinds: [1], limit: 20, '#A': target.addresses, '#l': ['beer-review-v1'], '#t': ['ipa'] },
    ]);
  });

  it("also asks by the page's i links when `links`", () => {
    const filters = sectionFilters({ label: 'Gigs', kinds: [31923], links: true }, target, 10);
    expect(filters.at(-1)).toEqual({ kinds: [31923], '#i': ['https://x.example'], limit: 10 });
  });
});

describe('matchesSection', () => {
  it('keeps posts of the kinds and manifests (by label or a tag), not the page itself', () => {
    const section = { label: 'Reviews', kinds: [1], manifests: ['beer-review-v1'] };
    const labelled = event({ tags: [['l', 'beer-review-v1', 'nostr-post']] });
    const linked = event({ tags: [['a', `30078:${pk}:nostr-post:beer-review-v1`]] });
    const other = event({ tags: [['l', 'coffee-review-v1', 'nostr-post']] });
    expect([labelled, linked, other].map((e) => matchesSection(e, section, target))).toEqual([
      true,
      true,
      false,
    ]);
    expect(matchesSection(page, { label: 'All', kinds: [30818] }, target)).toBe(false);
  });

  it('by default: any kind but reactions, deletions and other wiki pages', () => {
    const all = { label: 'All' };
    expect(matchesSection(event({ kind: 1111 }), all, target)).toBe(true);
    expect(matchesSection(event({ kind: 7 }), all, target)).toBe(false);
    expect(matchesSection(event({ kind: 30818, tags: [['d', 'y']] }), all, target)).toBe(false);
  });

  it('wiki pages of one type by d-tag suffix', () => {
    const section = { label: 'Beers', kinds: [30818], dTagSuffix: '-beer' };
    expect(matchesSection(event({ kind: 30818, tags: [['d', 'ipa-beer']] }), section, target)).toBe(
      true
    );
    expect(matchesSection(event({ kind: 30818, tags: [['d', 'x-cider']] }), section, target)).toBe(
      false
    );
  });
});

describe('newestItems', () => {
  it('keeps the newest version of each address, and of each wiki page across authors', () => {
    const old = event({ kind: 30818, created_at: 1, tags: [['d', 'ipa-beer']] });
    const newer = event({
      kind: 30818,
      created_at: 5,
      pubkey: 'b'.repeat(64),
      tags: [['d', 'ipa-beer']],
    });
    const note = event({ created_at: 3 });
    expect(newestItems([old, newer, note])).toEqual([newer, note]);
  });
});

describe('postSnippet / sectionStats', () => {
  it('snippets: kind 1 without role lines, JSON its first text, else the title', () => {
    expect(postSnippet(event({ content: 'Great beer.\nTasted at: nostr:naddr1qqqqqq' }))).toBe(
      'Great beer.'
    );
    expect(postSnippet(event({ kind: 30078, content: '{"rating":5,"review":"Hoppy"}' }))).toBe(
      'Hoppy'
    );
    expect(postSnippet(event({ kind: 31923, tags: [['title', 'Gig']] }))).toBe('Gig');
  });

  it('stats: count and the average of a numeric tag; an empty value is no rating', () => {
    const posts = [
      event({ tags: [['rating', '5']] }),
      event({ tags: [['rating', '4']] }),
      event({ tags: [['rating', '']] }),
    ];
    expect(sectionStats(posts, 'rating')).toEqual({ count: 3, rated: 2, average: 4.5 });
    expect(sectionStats([], 'rating')).toEqual({ count: 0, rated: 0, average: undefined });
  });
});
