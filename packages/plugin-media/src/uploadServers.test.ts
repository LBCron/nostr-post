import { describe, expect, it } from 'vitest';
import {
  blossomResult,
  NOSTR_BUILD_UPLOAD,
  nip96Result,
  readNip96Response,
  targetHost,
  uploadFailureKind,
  uploadTargets,
} from './uploadServers';

const hash = 'b1674191a88ec5cdd733e4240a81803105dc412d6c6708d53ab94fc248f4f553';

describe('uploadTargets', () => {
  it("tries the user's servers, then the field's, then nostr.build", () => {
    expect(
      uploadTargets({ blossomServers: ['https://app.example/', 'https://mine.example'] }, [
        'https://mine.example',
      ])
    ).toEqual([
      { type: 'blossom', server: 'https://mine.example' },
      { type: 'blossom', server: 'https://app.example' },
      { type: 'nip96', url: NOSTR_BUILD_UPLOAD },
    ]);
  });

  it("leaves out the user's servers when the field says so, and keeps its own endpoint", () => {
    expect(
      uploadTargets({ userServers: false, uploadUrl: 'https://up.example/api' }, [
        'https://mine.example',
      ])
    ).toEqual([{ type: 'nip96', url: 'https://up.example/api' }]);
    expect(targetHost({ type: 'blossom', server: 'https://mine.example' })).toBe('mine.example');
  });
});

describe('upload answers', () => {
  it("reads nostr.build's answer: URL, type, hash, size, dimensions", () => {
    expect(
      readNip96Response({
        status: 'success',
        data: [
          {
            url: 'https://i.nostr.build/a.jpg',
            sha256: 'AB',
            mime: 'image/jpeg',
            size: 10,
            dimensions: { width: 4, height: 3 },
          },
        ],
      })
    ).toEqual({
      url: 'https://i.nostr.build/a.jpg',
      type: 'image/jpeg',
      sha256: 'ab',
      size: 10,
      dim: '4x3',
    });
  });

  it("reads a NIP-96 server's nip94_event", () => {
    expect(
      readNip96Response({
        nip94_event: {
          tags: [
            ['url', 'https://x.example/b.png'],
            ['m', 'image/png'],
            ['dim', '2x2'],
          ],
        },
      })
    ).toEqual({ url: 'https://x.example/b.png', type: 'image/png', dim: '2x2' });
  });

  it('says why a request failed', () => {
    const kind = (result: unknown) => uploadFailureKind(result);
    expect(kind(nip96Result({ status: 503, body: '' }, true))).toBe('server');
    expect(kind(nip96Result({ status: 401, body: '' }, false))).toBe('sign-in');
    expect(kind(nip96Result({ status: 401, body: '' }, true))).toBe('rejected');
    expect(kind(nip96Result({ status: 200, body: 'nope' }, true))).toBe('rejected');
    const paid = blossomResult({ status: 402, body: '', reason: 'Payment required' }, hash, true);
    expect(paid).toMatchObject({
      kind: 'rejected',
      message: 'Upload failed (HTTP 402): Payment required',
    });
  });

  it("accepts a Blossom server's descriptor only for the file sent", () => {
    const body = (sha256: string) =>
      JSON.stringify({ url: `https://b.example/${sha256}.jpg`, sha256, size: 3 });
    expect(blossomResult({ status: 200, body: body(hash) }, hash, true)).toEqual({
      url: `https://b.example/${hash}.jpg`,
      sha256: hash,
      size: 3,
    });
    expect(blossomResult({ status: 200, body: body('0'.repeat(64)) }, hash, true)).toMatchObject({
      kind: 'rejected',
      message: 'The server changed the file',
    });
  });
});
