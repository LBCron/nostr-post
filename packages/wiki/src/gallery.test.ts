import { describe, expect, it } from 'vitest';
import { pageLinkValue } from './gallery';

describe('pageLinkValue', () => {
  it('links the page in both a picked entity’s and a venue’s shape', () => {
    const page = {
      pubkey: 'pk',
      tags: [
        ['d', 'speaker-box-bangkok-venue'],
        ['title', 'Speaker Box'],
      ],
    };
    expect(pageLinkValue(page)).toEqual({
      dTag: 'speaker-box-bangkok-venue',
      resolvedPubkey: 'pk',
      externalIds: [],
      title: 'Speaker Box',
      name: 'Speaker Box',
      wikiEntity: { pubkey: 'pk', dTag: 'speaker-box-bangkok-venue' },
    });
  });
});
