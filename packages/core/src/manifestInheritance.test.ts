import { describe, expect, it } from 'vitest';
import { resolveManifest } from './manifestInheritance';
import type { NostrPostManifest } from './types';

describe('resolveManifest: sections', () => {
  it("keeps the parent's sections, replaces one by id, adds its own", () => {
    const venue = {
      id: 'venue',
      version: '1',
      fields: [],
      sections: [
        { id: 'media', label: 'Photos and videos', view: 'gallery', self: true },
        { id: 'reviews', label: 'Reviews', manifests: ['venue-review-v1'] },
      ],
    } as NostrPostManifest;
    const czech = {
      id: 'venue-cs',
      version: '1',
      fields: [],
      sections: [
        { id: 'reviews', label: 'Recenze', manifests: ['venue-review-v1'] },
        { id: 'beer', label: 'Pivo', manifests: ['beer-review-v1'] },
      ],
    } as NostrPostManifest;
    expect(resolveManifest(czech, venue).sections?.map((s) => [s.id, s.label])).toEqual([
      ['media', 'Photos and videos'],
      ['reviews', 'Recenze'],
      ['beer', 'Pivo'],
    ]);
  });
});
