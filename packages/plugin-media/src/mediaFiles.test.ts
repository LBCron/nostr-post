import { describe, expect, it } from 'vitest';
import { mediaPlugin } from './core';
import { mediaFileOf, rememberMediaFile } from './mediaFiles';

const hash = 'b1674191a88ec5cdd733e4240a81803105dc412d6c6708d53ab94fc248f4f553';
const blossom = `https://b.example/${hash}.jpg`;

const pictureField = {
  id: 'photos',
  type: 'string' as const,
  uiPlugin: 'media',
  mapTo: { kind: 20, target: 'tag' as const, tagName: 'imeta' },
};
const noteField = {
  ...pictureField,
  mapTo: { kind: 1, target: 'tag' as const, tagName: 'r' },
};

describe('media files', () => {
  it('knows a Blossom URL’s hash and an extension’s type without an upload', () => {
    expect(mediaFileOf(blossom)).toEqual({ url: blossom, sha256: hash, type: 'image/jpeg' });
    expect(mediaFileOf('https://x.example/a.webp?w=2').type).toBe('image/webp');
  });

  it('writes an imeta tag per file for fields mapped to imeta (NIP-68), with what the upload told', () => {
    rememberMediaFile({ url: blossom, dim: '1200x800', size: 5000 });
    expect(mediaPlugin.serializeValue?.(blossom, pictureField)).toBe('');
    expect(mediaPlugin.extraTags?.([blossom, 'data:image/png;base64,x'], pictureField)).toEqual([
      ['imeta', `url ${blossom}`, 'm image/jpeg', `x ${hash}`, 'size 5000', 'dim 1200x800'],
    ]);
  });

  it('writes imeta next to r tags only with `imeta: true`', () => {
    expect(mediaPlugin.serializeValue?.(blossom, noteField)).toBe(blossom);
    expect(mediaPlugin.extraTags?.([blossom], noteField)).toEqual([]);
    const withImeta = { ...noteField, metadata: { imeta: true } };
    expect(mediaPlugin.extraTags?.([blossom], withImeta)).toHaveLength(1);
  });

  it('reads the files of imeta tags back, and leaves other tags to the default', () => {
    const tags = [['imeta', 'url https://c.example/p.png', 'm image/png', 'dim 2x2']];
    expect(mediaPlugin.resolveFromTags?.(tags, pictureField)).toEqual(['https://c.example/p.png']);
    expect(mediaFileOf('https://c.example/p.png').dim).toBe('2x2');
    expect(mediaPlugin.resolveFromTags?.([['r', blossom]], noteField)).toBeUndefined();
  });
});
