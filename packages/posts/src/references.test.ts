import { describe, expect, it } from 'vitest';
import { isAddress, referenceFilters, targetFilters } from './references';

const pk = 'a'.repeat(64);
const address = `31923:${pk}:gig`;
const id = 'b'.repeat(64);

describe('references', () => {
  it('tells addresses from ids', () => {
    expect(isAddress(address)).toBe(true);
    expect(isAddress(id)).toBe(false);
  });

  it('asks for posts referencing addresses (a, A) and ids (e, E), of any kind or the kinds given', () => {
    expect(referenceFilters([address, id], { limit: 10 })).toEqual([
      { limit: 10, '#a': [address] },
      { limit: 10, '#A': [address] },
      { limit: 10, '#e': [id] },
      { limit: 10, '#E': [id] },
    ]);
    expect(referenceFilters([address], { kinds: [1111], limit: 5 })[0]).toEqual({
      kinds: [1111],
      limit: 5,
      '#a': [address],
    });
  });

  it('asks for the targets themselves', () => {
    expect(targetFilters([address, id])).toEqual([
      { kinds: [31923], authors: [pk], '#d': ['gig'] },
      { ids: [id] },
    ]);
  });
});
