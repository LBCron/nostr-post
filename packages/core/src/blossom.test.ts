import { describe, expect, it } from 'vitest';
import {
  BLOSSOM_AUTH_KIND,
  blobUrl,
  blossomFallbacks,
  blossomHash,
  blossomServersOf,
  blossomUploadAuth,
  nostrAuthorization,
  readBlobDescriptor,
  typeOfExtension,
} from './blossom';

const hash = 'b1674191a88ec5cdd733e4240a81803105dc412d6c6708d53ab94fc248f4f553';

describe('Blossom URLs', () => {
  it("reads the hash a URL names, and builds a server's URL for it", () => {
    expect(blossomHash(`https://cdn.example/${hash}.jpg`)).toBe(hash);
    expect(blossomHash(`https://cdn.example/${hash.toUpperCase()}`)).toBe(hash);
    expect(blossomHash('https://i.nostr.build/a.jpg')).toBeUndefined();
    expect(blossomHash('not a url')).toBeUndefined();
    expect(blobUrl('https://cdn.example/', hash, 'image/jpeg')).toBe(
      `https://cdn.example/${hash}.jpg`
    );
    expect(blobUrl('https://cdn.example', hash)).toBe(`https://cdn.example/${hash}`);
    expect(typeOfExtension('JPEG')).toBe('image/jpeg');
  });

  it('finds the same file on other servers', () => {
    expect(
      blossomFallbacks(`https://a.example/${hash}.png`, [
        'https://a.example',
        'https://b.example/',
        'https://b.example',
      ])
    ).toEqual([`https://b.example/${hash}.png`]);
    expect(blossomFallbacks('https://i.nostr.build/a.jpg', ['https://b.example'])).toEqual([]);
  });
});

describe('Blossom uploads', () => {
  it('authorizes one file by its hash until it expires', () => {
    expect(blossomUploadAuth({ sha256: hash, expiration: 2000, now: 1000 })).toEqual({
      kind: BLOSSOM_AUTH_KIND,
      created_at: 1000,
      tags: [
        ['t', 'upload'],
        ['x', hash],
        ['expiration', '2000'],
      ],
      content: 'Upload a file',
    });
  });

  it('encodes a signed event as an Authorization header (UTF-8, base64)', () => {
    expect(nostrAuthorization({ kind: 24242, content: 'é' })).toBe(
      'Nostr eyJraW5kIjoyNDI0MiwiY29udGVudCI6IsOpIn0='
    );
    expect(nostrAuthorization('a')).toBe('Nostr ImEi');
  });

  it("reads a server's blob descriptor", () => {
    expect(
      readBlobDescriptor({ url: 'https://x/y', sha256: hash.toUpperCase(), size: 5, type: '' })
    ).toEqual({ url: 'https://x/y', sha256: hash, size: 5 });
    expect(readBlobDescriptor({ url: 'https://x/y' })).toBeUndefined();
    expect(readBlobDescriptor(null)).toBeUndefined();
  });

  it("lists a user's servers from their kind 10063 event", () => {
    const list = {
      kind: 10063,
      tags: [
        ['server', 'https://a.example/'],
        ['server', 'wss://not-http'],
        ['server', 'https://a.example'],
        ['server', 'https://b.example'],
      ],
    };
    expect(blossomServersOf(list)).toEqual(['https://a.example', 'https://b.example']);
    expect(blossomServersOf({ ...list, kind: 1 })).toEqual([]);
  });
});
