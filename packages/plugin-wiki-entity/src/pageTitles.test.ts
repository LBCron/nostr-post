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

const { entityRows, linkedEntities, pageTitles } = await import('./pageTitles');
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

describe('entityRows', () => {
  it("lists pages, names with links, and the event's other links without the pages' (#274)", () => {
    const doomPage = {
      kind: 30818,
      pubkey: 'pk',
      created_at: 1,
      content: '',
      tags: [
        ['d', 'doom'],
        ['i', 'https://doom.example'],
      ],
    } as never;
    const value = [
      page('doom'),
      { ...unlinked, displayName: 'Not Proven', externalIds: ['https://np.example', 'isrc:x'] },
      { ...unlinked, externalIds: ['https://doom.example', 'https://named-in-text.example'] },
    ];
    expect(entityRows(value, [doomPage])).toEqual({
      linked: [expect.objectContaining({ dTag: 'doom' })],
      named: [{ name: 'Not Proven', links: ['https://np.example'] }],
      links: ['https://named-in-text.example'],
    });
    // Before the pages load, the event's links all show
    expect(entityRows(value).links).toEqual([
      'https://doom.example',
      'https://named-in-text.example',
    ]);
  });
});

describe('entityRows with pages created later', () => {
  const later = (dTag: string, link: string, created_at = 5) =>
    ({
      kind: 30818,
      pubkey: 'pk2',
      created_at,
      content: '',
      tags: [
        ['d', dTag],
        ['i', link],
      ],
    }) as never;
  const musician = { prefix: '', suffix: '-musician' };

  it('shows an entity without a page as the page of its type with one of its links', () => {
    const value = [
      { ...unlinked, displayName: 'Not Proven', externalIds: ['https://np.example'] },
      { ...unlinked, externalIds: ['https://doom.example', 'https://none.example'] },
    ];
    const pages = [
      later('not-proven-musician', 'https://np.example'),
      later('doom-musician', 'https://doom.example'),
      later('np-venue', 'https://np.example', 9),
    ];
    const rows = entityRows(value, pages, musician);
    expect(rows.linked).toEqual([
      {
        dTag: 'not-proven-musician',
        resolvedPubkey: 'pk2',
        externalIds: ['https://np.example'],
        displayName: 'Not Proven',
      },
      {
        dTag: 'doom-musician',
        resolvedPubkey: 'pk2',
        externalIds: ['https://doom.example'],
      },
    ]);
    expect(rows.named).toEqual([]);
    expect(rows.links).toEqual(['https://none.example']);
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
