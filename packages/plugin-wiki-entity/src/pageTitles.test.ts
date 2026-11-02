import { describe, expect, it, vi } from 'vitest';

vi.mock('@nostr-post/signer', () => ({
  fetchEvents: vi.fn(async () => [
    {
      kind: 30818,
      created_at: 1,
      tags: [
        ['d', 'doom-(musician)'],
        ['title', 'Doom (old)'],
      ],
    },
    {
      kind: 30818,
      created_at: 2,
      tags: [
        ['d', 'doom-(musician)'],
        ['title', 'Doom (musician)'],
      ],
    },
  ]),
}));

const { linkedEntities, pageTitles } = await import('./pageTitles');
const { entityFromPageForm, withEntity } = await import('./pageDraft');

const page = (dTag: string) => ({ dTag, resolvedPubkey: 'pk', externalIds: [] });
const unlinked = { dTag: '', resolvedPubkey: '', externalIds: ['x'], unlinked: true as const };

describe('linkedEntities', () => {
  it('lists the entities with a page, once each', () => {
    expect(linkedEntities([page('a'), unlinked, page('a'), page('b')])).toEqual([
      page('a'),
      page('b'),
    ]);
    expect(linkedEntities(undefined)).toEqual([]);
  });
});

describe('pageTitles', () => {
  it("gives each page's newest title", async () => {
    const titles = await pageTitles([page('doom-(musician)')], []);
    expect(titles.get('doom-(musician)')).toBe('Doom (musician)');
  });
});

describe('entityFromPageForm', () => {
  const manifest = {
    id: 'm',
    version: '1',
    wikiConfig: { titleTemplate: '{title} (musician)' },
    fields: [],
  };

  it('is an unlinked entity named by its name field, to create with the post', () => {
    const entity = entityFromPageForm(
      manifest,
      {
        event: {
          tags: [
            ['title', 'Doom (musician)'],
            ['i', 'https://doom.bandcamp.com'],
          ],
        },
        formData: { title: 'Doom' },
      },
      { ...unlinked, displayName: 'Doom', externalIds: ['https://www.instagram.com/doom'] }
    );
    expect(entity).toEqual({
      dTag: '',
      resolvedPubkey: '',
      externalIds: ['https://doom.bandcamp.com', 'https://www.instagram.com/doom'],
      displayName: 'Doom',
      unlinked: true,
      prefill: { title: 'Doom' },
      createPage: true,
    });
  });

  it('takes the place of the entity it replaces, else is added', () => {
    const a = page('a');
    const b = page('b');
    expect(withEntity([a, unlinked], b, unlinked)).toEqual([a, b]);
    expect(withEntity([a], b)).toEqual([a, b]);
  });
});
