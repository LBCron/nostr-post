import { describe, expect, it } from 'vitest';
import { commentKindFor, commentRootOf, commentTags, kindOfAddress } from './comments';

const root = 'r'.repeat(64);
const author = 'a'.repeat(64);

describe('commentTags', () => {
  it('replies to a note with a kind-1 NIP-10 reply', () => {
    expect(commentTags({ rootEventId: root, rootKind: 1, rootPubkey: author })).toEqual({
      kind: 1,
      tags: [
        ['e', root, '', 'root'],
        ['p', author],
      ],
    });
  });

  it('comments on a non-addressable event other than a note by its id (NIP-22 `E`)', () => {
    const { kind, tags } = commentTags({ rootEventId: root, rootKind: 1063, rootPubkey: author });
    expect(kind).toBe(1111);
    expect(tags.slice(0, 3)).toEqual([
      ['E', root, '', author],
      ['K', '1063'],
      ['P', author],
    ]);
  });
});

describe('commentRootOf', () => {
  it('reads NIP-22 comments and kind-1 replies', () => {
    expect(commentRootOf({ kind: 1111, tags: [['A', '30023:x:y']] })).toEqual({
      id: undefined,
      address: '30023:x:y',
    });
    expect(commentRootOf({ kind: 1, tags: [['e', root]] })).toEqual({
      id: root,
      address: undefined,
    });
  });

  it('is undefined for events that are no comments', () => {
    expect(commentRootOf({ kind: 1, tags: [] })).toBeUndefined();
    expect(commentRootOf({ kind: 30078, tags: [['e', root]] })).toBeUndefined();
    expect(commentRootOf({ kind: 1111, tags: [['I', 'https://example.com']] })).toBeUndefined();
  });
});

describe('helpers', () => {
  it('picks the comment kind and reads an address kind', () => {
    expect(commentKindFor(1)).toBe(1);
    expect(commentKindFor(31922)).toBe(1111);
    expect(kindOfAddress('31922:x:y')).toBe(31922);
    expect(kindOfAddress('nope')).toBeUndefined();
  });
});
