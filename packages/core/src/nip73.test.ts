import { describe, expect, it } from 'vitest';
import { externalIdKind, withExternalIdKinds } from './nip73';

describe('externalIdKind', () => {
  it('names the kind of NIP-73 IDs and of our own namespaces by their prefix', () => {
    expect(externalIdKind('iso3166:CZ')).toBe('iso3166');
    expect(externalIdKind('isbn:9780765382030')).toBe('isbn');
    expect(externalIdKind('podcast:item:guid:d98d189b')).toBe('podcast:item:guid');
    expect(externalIdKind('osm:node:123')).toBe('osm:node');
    expect(externalIdKind('gcid:3138549126411111111')).toBe('gcid');
    expect(externalIdKind('wikidata:Q213')).toBe('wikidata');
  });

  it('calls URLs `web` and hashtags `#`; IDs without a prefix have no kind', () => {
    expect(externalIdKind('https://www.instagram.com/doomsday')).toBe('web');
    expect(externalIdKind('#punk')).toBe('#');
    expect(externalIdKind('justtext')).toBeUndefined();
  });
});

describe('withExternalIdKinds', () => {
  it('adds one `k` tag per kind of the `i` tags, keeping existing ones', () => {
    expect(
      withExternalIdKinds([
        ['d', 'x'],
        ['i', 'iso3166:CZ'],
        ['i', 'osm:node:1'],
        ['i', 'osm:node:2'],
        ['i', 'https://example.com'],
        ['k', 'web'],
      ])
    ).toEqual([
      ['d', 'x'],
      ['i', 'iso3166:CZ'],
      ['i', 'osm:node:1'],
      ['i', 'osm:node:2'],
      ['i', 'https://example.com'],
      ['k', 'web'],
      ['k', 'iso3166'],
      ['k', 'osm:node'],
    ]);
  });

  it('leaves tags without `i` tags as they are', () => {
    const tags = [['t', 'punk']];
    expect(withExternalIdKinds(tags)).toBe(tags);
  });
});

describe('events built from a manifest', () => {
  it('get the `k` tag of their `i` tags', async () => {
    const { coordinateEvents } = await import('./coordinator');
    const result = coordinateEvents(
      {
        id: 'book-review',
        version: '1',
        fields: [
          {
            id: 'text',
            type: 'string',
            uiPlugin: 'textarea',
            mapTo: { kind: 1, target: 'content' },
          },
          {
            id: 'isbn',
            type: 'string',
            uiPlugin: 'identifier',
            mapTo: { kind: 1, target: 'tag', tagName: 'i' },
          },
        ],
      },
      { text: 'Great book', isbn: 'isbn:9780765382030' }
    );
    expect(result.success && result.data.events[0]?.tags).toEqual(
      expect.arrayContaining([
        ['i', 'isbn:9780765382030'],
        ['k', 'isbn'],
      ])
    );
  });
});
