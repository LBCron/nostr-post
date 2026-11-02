import { STANDARD_KIND1_POST_MANIFEST } from '@nostr-post/core/types';
import { describe, expect, it } from 'vitest';
import { applyReplyTargetToBundle, buildReply, buildReplyTags } from './composerReply';
import { buildFeedFilters, interactionFilters } from './feedData';
import { buildReplyTarget, buildThreads } from './feedStandard';
import type { SignedEvent } from './signer';

const author = 'b'.repeat(64);

describe('buildFeedFilters', () => {
  it('asks for notes by default', () => {
    expect(buildFeedFilters({})).toMatchObject({ kinds: [1], limit: 20 });
  });
});

describe('comments on addressable events', () => {
  const sign = (e: Omit<SignedEvent, 'sig'>): SignedEvent => ({ ...e, sig: '' });
  const v1 = sign({
    id: '1'.repeat(64),
    kind: 31922,
    pubkey: author,
    created_at: 1,
    content: '',
    tags: [
      ['d', 'fest'],
      ['start', '2026-10-21'],
    ],
  });
  const v2 = sign({ ...v1, id: '2'.repeat(64), created_at: 2 });
  const address = `31922:${author}:fest`;

  it('comments on an addressable event are NIP-22 comments naming it by address', () => {
    const target = buildReplyTarget(v1);
    expect(target.rootAddress).toBe(address);
    const reply = buildReply(target);
    expect(reply?.kind).toBe(1111);
    expect(reply?.tags).toEqual([
      ['A', address],
      ['K', '31922'],
      ['P', author],
      ['a', address],
      ['e', v1.id, '', author],
      ['k', '31922'],
      ['p', author],
    ]);
  });

  it('a reply to a comment names the comment as parent', () => {
    const comment = sign({
      id: '3'.repeat(64),
      kind: 1111,
      pubkey: 'c'.repeat(64),
      created_at: 3,
      content: 'Nice',
      tags: buildReplyTags(buildReplyTarget(v1)),
    });
    const reply = buildReply(buildReplyTarget(comment, v1));
    expect(reply?.kind).toBe(1111);
    expect(reply?.tags).toEqual([
      ['A', address],
      ['K', '31922'],
      ['P', author],
      ['e', comment.id, '', comment.pubkey],
      ['k', '1111'],
      ['p', comment.pubkey],
    ]);
  });

  it('a bundle replying to an addressable event becomes a comment; to a note, a kind-1 reply', () => {
    const note = sign({ ...v1, id: '4'.repeat(64), kind: 1, tags: [] });
    const bundle = {
      events: [{ kind: 1, created_at: 5, content: 'Hi', tags: [], pubkey: '' }],
      manifest: STANDARD_KIND1_POST_MANIFEST,
    };
    expect(applyReplyTargetToBundle(bundle, buildReplyTarget(v1)).events[0]?.kind).toBe(1111);
    const toNote = applyReplyTargetToBundle(bundle, buildReplyTarget(note)).events[0];
    expect(toNote?.kind).toBe(1);
    expect(toNote?.tags).toEqual([
      ['e', note.id, '', 'root'],
      ['p', author],
    ]);
  });

  it('threads a comment on an earlier version under the current one', () => {
    const comment = sign({
      id: '3'.repeat(64),
      kind: 1111,
      pubkey: 'c'.repeat(64),
      created_at: 3,
      content: 'update:title:New',
      tags: buildReplyTags(buildReplyTarget(v1)),
    });
    const [thread] = buildThreads([v1, v2], [comment]);
    expect(thread?.root.id).toBe(v2.id);
    expect(thread?.replies.map((r) => r.id)).toEqual([comment.id]);
  });

  it('fetches comments by id and by address', () => {
    expect(interactionFilters([v2], { comments: true, reactions: true })).toEqual([
      { kinds: [1], '#e': [v2.id], limit: 50 },
      { kinds: [1111], '#A': [address], limit: 50 },
      { kinds: [7], '#e': [v2.id], limit: 50 },
    ]);
  });
});
