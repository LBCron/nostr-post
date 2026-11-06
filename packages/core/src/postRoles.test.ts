import { describe, expect, it } from 'vitest';
import { coordinateEvents } from './coordinator';
import { decodeNaddr, encodeNaddr } from './nip19';
import {
  isPostRoleField,
  isRefValue,
  parsePostRoles,
  plainTextContent,
  readPostRoles,
  roleLines,
} from './postRoles';
import type { NostrPostManifest, PostField } from './types';

const pk = 'a'.repeat(64);
const venue = `30818:${pk}:u-fleků-prague-venue`;
// From nostr-tools' nip19.naddrEncode (fields in another order)
const fromNostrTools =
  'naddr1qvzqqqrcvgpzp242424242424242424242424242424242424242424242424242qq2h2ttxd3jkh3d094c8yct8w4jj6an9de6k2ze4hq3';

const roleField = (id: string, label: string): PostField => ({
  id,
  type: 'ref',
  uiPlugin: 'wiki-entity-picker',
  mapTo: [
    { kind: 1, target: 'tag', tagName: 'a' },
    { kind: 1, target: 'content' },
  ],
  metadata: { label },
});
const tasted = roleField('tasting_at', 'Tasted at');
const bought = roleField('purchase_at', 'Purchased at');

describe('naddr', () => {
  it('encodes and decodes addresses, also from nostr-tools', () => {
    const naddr = encodeNaddr(venue) as string;
    expect(naddr).toMatch(/^naddr1/);
    expect(decodeNaddr(naddr)).toBe(venue);
    expect(decodeNaddr(fromNostrTools)).toBe(venue);
    expect(decodeNaddr(`${naddr.slice(0, -1)}q`)).toBeUndefined();
    expect(encodeNaddr('not-an-address')).toBeUndefined();
  });
});

describe('role fields in posts', () => {
  it('are ref fields mapped to an a tag and to plain-text content', () => {
    expect(isPostRoleField(tasted, 1)).toBe(true);
    expect(isPostRoleField(tasted, 30078)).toBe(false);
    expect(isPostRoleField({ ...tasted, mapTo: { kind: 1, target: 'tag', tagName: 'a' } }, 1)).toBe(
      false
    );
  });

  it('write the line of an entity whose page was created when publishing (#275)', () => {
    // Unlinked (empty d-tag and pubkey) until the publish hook linked its new page
    const created = {
      dTag: '',
      resolvedPubkey: '',
      unlinked: true,
      wikiEntity: { pubkey: pk, dTag: 'fordecision-musician' },
    };
    expect(roleLines(tasted, [created])[0]).toMatch(/^Tasted at: nostr:naddr1/);
    expect(roleLines(tasted, [{ dTag: '', resolvedPubkey: '', unlinked: true }])).toEqual([]);
  });

  it('write an entity without a page as its name and links, read back with the other links (#274)', () => {
    const performers: PostField = {
      ...roleField('performers', 'Performers'),
      mapTo: [
        { kind: 31922, target: 'tag', tagName: 'a' },
        { kind: 31922, target: 'content' },
      ],
      metadata: { label: 'Performers', multiple: true },
    };
    const notProven = {
      dTag: '',
      resolvedPubkey: '',
      unlinked: true,
      displayName: 'Not Proven',
      externalIds: ['https://notproven.bandcamp.com', 'https://instagram.com/notproven'],
    };
    const named = { ...notProven, displayName: 'Doom', externalIds: ['https://doom.example'] };
    const linked = { dTag: 'fordecision-musician', resolvedPubkey: pk };
    const text = 'Line-up: DOOM and friends';
    const lines = roleLines(performers, [linked, notProven, named]);
    expect(lines[1]).toBe(
      'Performers: Not Proven (https://notproven.bandcamp.com, https://instagram.com/notproven)'
    );
    // Also when the text names it: a guess could drop the name
    expect(lines[2]).toBe('Performers: Doom (https://doom.example)');
    expect(roleLines(performers, { ...notProven, externalIds: ['untappd:beer:1'] })).toEqual([
      'Performers: Not Proven',
    ]);

    const read = readPostRoles(
      {
        kind: 31922,
        content: `${text}\n\n${lines.join('\n')}`,
        tags: [
          ['a', `30818:${pk}:fordecision-musician`],
          ...notProven.externalIds.map((id) => ['i', id]),
          ['i', 'https://doom.example'],
          ['i', 'https://other.example'],
        ],
      },
      [performers]
    );
    expect(read.text).toBe(text);
    expect(read.values.performers).toMatchObject([
      { dTag: 'fordecision-musician', resolvedPubkey: pk },
      { displayName: 'Not Proven', externalIds: notProven.externalIds, unlinked: true },
      { displayName: 'Doom', externalIds: ['https://doom.example'], unlinked: true },
      { externalIds: ['https://other.example'], unlinked: true },
    ]);
  });

  it('take entities without a page as a reference value', () => {
    expect(isRefValue([{ dTag: '', resolvedPubkey: '', unlinked: true, displayName: 'X' }])).toBe(
      true
    );
    expect(isRefValue(`30818:${pk}:x`)).toBe(true);
    expect(isRefValue([])).toBe(false);
    expect(isRefValue(' ')).toBe(false);
    expect(isRefValue([null])).toBe(false);
  });

  it('read a name line only by its label, and keep other text with colons', () => {
    const { text, named } = parsePostRoles('Doors: 20:00\nNote: bring cash', [tasted]);
    expect(text).toBe('Doors: 20:00\nNote: bring cash');
    expect(named.size).toBe(0);
    expect(parsePostRoles('Hi\nTasted at: Home (CZ)', [tasted]).named.get('tasting_at')).toEqual([
      { name: 'Home (CZ)', links: [] },
    ]);
  });

  it('write a mention line and read it back by label, else by order', () => {
    const line = roleLines(tasted, {
      dTag: 'u-fleků-prague-venue',
      resolvedPubkey: pk,
    })[0] as string;
    expect(line).toMatch(/^Tasted at: nostr:naddr1/);
    const naddr = line.split('nostr:')[1];
    const content = `Great beer.\n\n${line}\nPurchased at: nostr:${encodeNaddr(`30818:${pk}:shop-venue`)}`;
    const { text, roles } = parsePostRoles(content, [tasted, bought]);
    expect(text).toBe('Great beer.');
    expect(roles.get('tasting_at')).toEqual([venue]);
    expect(roles.get('purchase_at')).toEqual([`30818:${pk}:shop-venue`]);
    // A label in another language falls back to field order
    const renamed = parsePostRoles(`Text\nOchutnáno v: nostr:${naddr}`, [tasted, bought]);
    expect(renamed.roles.get('tasting_at')).toEqual([venue]);
  });

  it('the coordinator puts role lines after the text, and addresses in NIP-78 content', () => {
    const manifest: NostrPostManifest = {
      id: 'beer-review',
      version: '1',
      fields: (
        [
          tasted,
          {
            id: 'review',
            type: 'string',
            uiPlugin: 'textarea',
            mapTo: [
              { kind: 1, target: 'content' },
              { kind: 30078, target: 'content', path: 'review' },
            ],
          },
          {
            ...tasted,
            mapTo: [
              ...[tasted.mapTo].flat(),
              { kind: 30078, target: 'content', path: 'tasting_at' },
            ],
          },
        ] as PostField[]
      ).slice(1),
      publishFormats: [{ id: 'note', label: 'Note', kinds: [1], default: true }],
    };
    const ref = { dTag: 'u-fleků-prague-venue', resolvedPubkey: pk, externalIds: [] };
    const note = coordinateEvents(manifest, { review: 'Great beer.', tasting_at: ref });
    expect(note.success).toBe(true);
    if (!note.success) return;
    const event = note.data.events[0];
    expect(event?.content).toMatch(/^Great beer\.\nTasted at: nostr:naddr1\S+$/);
    expect(event?.tags).toContainEqual(['a', venue]);

    const appData = coordinateEvents(
      manifest,
      { review: 'Great beer.', tasting_at: ref },
      { activeKinds: [30078] }
    );
    expect(appData.success).toBe(true);
    if (!appData.success) return;
    expect(JSON.parse(appData.data.events[0]?.content ?? '{}')).toEqual({
      review: 'Great beer.',
      tasting_at: venue,
    });
  });

  it('reads a post into text, role values and the a tags left for other fields', () => {
    const beer = `30818:${pk}:pliny-beer`;
    const content = `Great beer.\n${roleLines(tasted, venue)[0]}`;
    const read = readPostRoles(
      {
        kind: 1,
        content,
        tags: [
          ['a', beer],
          ['a', venue],
        ],
      },
      [tasted, bought]
    );
    expect(read.text).toBe('Great beer.');
    expect(read.values.tasting_at).toMatchObject({
      dTag: 'u-fleků-prague-venue',
      resolvedPubkey: pk,
      wikiEntity: { pubkey: pk, dTag: 'u-fleků-prague-venue' },
    });
    expect(read.tags).toEqual([['a', beer]]);
  });

  it('a link-only venue field writes its page as a mention line, also when not a ref field', () => {
    const venueField: PostField = {
      id: 'tasting_at',
      type: 'geo',
      uiPlugin: 'venue',
      mapTo: [
        { kind: 1, target: 'tag', tagName: 'a' },
        { kind: 1, target: 'content' },
      ],
      metadata: { label: 'Tasted at', linkOnly: true },
    };
    expect(isPostRoleField(venueField, 1)).toBe(true);
    const value = {
      geohash: 'u2fkb',
      lat: 50,
      lon: 14,
      wikiEntity: { pubkey: pk, dTag: 'u-fleků-prague-venue' },
    };
    expect(roleLines(venueField, value)[0]).toMatch(/^Tasted at: nostr:naddr1/);
    // Before the venue hub ran there's no page yet: no line
    expect(roleLines(venueField, { geohash: 'u2fkb', lat: 50, lon: 14 })).toEqual([]);
  });
});

describe('plainTextContent', () => {
  const textField = (id: string): PostField => ({
    id,
    type: 'string',
    uiPlugin: 'text',
    mapTo: { kind: 1, target: 'content' },
  });

  it('writes lists of values as text and skips null, role fields as mention lines', () => {
    const content = plainTextContent(
      [textField('review'), textField('tags'), textField('note'), tasted],
      {
        review: 'Great beer.',
        tags: ['hoppy', 'pale'],
        note: null,
        tasting_at: { dTag: 'u-fleků-prague-venue', resolvedPubkey: pk },
      }
    );
    const [review, tags, line, ...rest] = content.split('\n');
    expect([review, tags, rest]).toEqual(['Great beer.', 'hoppy, pale', []]);
    expect(line).toMatch(/^Tasted at: nostr:naddr1/);
    expect(plainTextContent([textField('tags')], { tags: [] })).toBe('');
  });
});
