import { describe, expect, it } from 'vitest';
import { dimOf, imetaFiles, imetaTag, readImeta } from './imeta';

describe('imeta', () => {
  it('writes the known properties and reads them back', () => {
    const info = {
      url: 'https://cdn.example/a.jpg',
      type: 'image/jpeg',
      sha256: 'ab',
      size: 1234,
      dim: dimOf(1200, 800),
      alt: 'A bar at night',
    };
    const tag = imetaTag(info);
    expect(tag).toEqual([
      'imeta',
      'url https://cdn.example/a.jpg',
      'm image/jpeg',
      'x ab',
      'size 1234',
      'dim 1200x800',
      'alt A bar at night',
    ]);
    expect(readImeta(tag)).toEqual(info);
  });

  it('leaves out tags without a url, and other tags', () => {
    expect(readImeta(['imeta', 'm image/png'])).toBeUndefined();
    expect(
      imetaFiles([
        ['r', 'https://x'],
        ['imeta', 'url https://cdn.example/b.png', 'm image/png', 'size nope'],
      ])
    ).toEqual([{ url: 'https://cdn.example/b.png', type: 'image/png' }]);
  });
});
