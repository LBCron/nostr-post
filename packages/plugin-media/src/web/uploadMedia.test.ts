import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { sha256Hex } from '../hash';
import { mediaFileOf } from '../mediaFiles';
import { uploadMedia } from './uploadMedia';

vi.mock('@nostr-post/signer', () => ({
  fetchBlossomServers: async () => ['https://mine.example'],
}));

const hashOfX = '2d711642b726b04401627ca9fbac32f5c8530fb1903cc4db02258717921a4881';

type Answer = { status: number; body?: string; reason?: string };
let answers: Answer[] = [];
let sent: { method: string; url: string; headers: Record<string, string> }[] = [];

class FakeXhr {
  status = 0;
  responseText = '';
  reason: string | null = null;
  upload = new EventTarget();
  private events = new EventTarget();
  private request = { method: '', url: '', headers: {} as Record<string, string> };
  addEventListener(type: string, listener: () => void) {
    this.events.addEventListener(type, listener);
  }
  open(method: string, url: string) {
    this.request = { method, url, headers: {} };
  }
  setRequestHeader(name: string, value: string) {
    this.request.headers[name] = value;
  }
  getResponseHeader() {
    return this.reason;
  }
  abort() {
    this.events.dispatchEvent(new Event('abort'));
  }
  send() {
    sent.push(this.request);
    const answer = answers.shift() ?? { status: 500 };
    setTimeout(() => {
      this.status = answer.status;
      this.responseText = answer.body ?? '';
      this.reason = answer.reason ?? null;
      this.events.dispatchEvent(new Event('load'));
    }, 0);
  }
}

beforeEach(() => {
  answers = [];
  sent = [];
  vi.stubGlobal(
    'window',
    Object.assign(new EventTarget(), {
      nostr: {
        getPublicKey: async () => 'pk',
        signEvent: async (event: object) => ({ ...event, id: 'id', sig: 'sig' }),
      },
    })
  );
  vi.stubGlobal('navigator', { onLine: true });
  vi.stubGlobal('XMLHttpRequest', FakeXhr);
});

afterEach(() => vi.unstubAllGlobals());

const file = () => new File(['x'], 'a.png', { type: 'image/png' });

describe('uploadMedia', () => {
  it("uploads to the user's Blossom server, authorized for the file's hash", async () => {
    answers = [
      {
        status: 200,
        body: JSON.stringify({
          url: `https://mine.example/${hashOfX}.png`,
          sha256: hashOfX,
          size: 1,
          type: 'image/png',
        }),
      },
    ];
    const info = await uploadMedia(file());
    expect(info).toEqual({
      url: `https://mine.example/${hashOfX}.png`,
      type: 'image/png',
      sha256: hashOfX,
      size: 1,
    });
    expect(sent[0]).toMatchObject({ method: 'PUT', url: 'https://mine.example/upload' });
    const auth = JSON.parse(atob((sent[0]?.headers.Authorization ?? '').slice('Nostr '.length)));
    expect(auth).toMatchObject({ kind: 24242, pubkey: 'pk', sig: 'sig' });
    expect(auth.tags).toContainEqual(['x', hashOfX]);
    expect(mediaFileOf(info.url).sha256).toBe(hashOfX);
  });

  it('goes on to nostr.build when the Blossom server refuses', async () => {
    answers = [
      { status: 402, reason: 'Payment required' },
      { status: 200, body: JSON.stringify({ data: [{ url: 'https://i.nostr.build/a.png' }] }) },
    ];
    const hosts: string[] = [];
    const info = await uploadMedia(file(), { onServer: (host) => hosts.push(host) });
    expect(info.url).toBe('https://i.nostr.build/a.png');
    expect(hosts).toEqual(['nostr.build']);
    expect(sent.map((r) => r.method)).toEqual(['PUT', 'POST']);
  });

  it("doesn't use the user's servers when the field says so", async () => {
    answers = [
      { status: 200, body: JSON.stringify({ data: [{ url: 'https://i.nostr.build/b.png' }] }) },
    ];
    await uploadMedia(file(), { config: { userServers: false } });
    expect(sent.map((r) => r.url)).toEqual(['https://nostr.build/api/v2/upload/files']);
  });

  it("removes a JPEG's metadata, unless the field keeps it", async () => {
    // A JPEG with an EXIF block (a location) before its image data
    const exif = [0x45, 0x78, 0x69, 0x66, 0, 0, ...[...'GPS'].map((c) => c.charCodeAt(0))];
    const bytes = [
      0xff,
      0xd8,
      0xff,
      0xe1,
      0,
      exif.length + 2,
      ...exif,
      0xff,
      0xda,
      0,
      2,
      1,
      0xff,
      0xd9,
    ];
    const jpeg = () => new File([new Uint8Array(bytes)], 'p.jpg', { type: 'image/jpeg' });
    const hashSent = async (keepMetadata: boolean) => {
      sent = [];
      answers = [{ status: 402 }, { status: 402 }];
      await uploadMedia(jpeg(), { config: { keepMetadata, userServers: true } }).catch(() => {});
      return sent[0]?.headers['X-SHA-256'];
    };
    const original = await sha256Hex(new Uint8Array(bytes));
    expect(await hashSent(true)).toBe(original);
    expect(await hashSent(false)).not.toBe(original);
  });
});
