import { describe, expect, it } from 'vitest';
import { eventPhotos, galleryPhotos, linkingFilter } from './gallery';

const hash = 'b1674191a88ec5cdd733e4240a81803105dc412d6c6708d53ab94fc248f4f553';
const post = (over: Partial<Parameters<typeof eventPhotos>[0]>) => ({
  id: Math.random().toString(16),
  pubkey: 'pk',
  kind: 1,
  created_at: 1,
  content: '',
  tags: [] as string[][],
  ...over,
});

describe('eventPhotos', () => {
  it('reads a NIP-68 picture: imeta with type, hash, alt and size', () => {
    const picture = post({
      kind: 20,
      tags: [
        [
          'imeta',
          `url https://b.example/${hash}.jpg`,
          'm image/jpeg',
          `x ${hash}`,
          'alt The bar',
          'dim 4x3',
        ],
        ['imeta', 'url https://b.example/v.mp4', 'm video/mp4'],
      ],
    });
    expect(eventPhotos(picture)).toMatchObject([
      { url: `https://b.example/${hash}.jpg`, sha256: hash, alt: 'The bar', dim: '4x3' },
    ]);
  });

  it("reads each kind's place: image tags, image r tags, links in the text, JSON content", () => {
    expect(
      eventPhotos(
        post({
          kind: 31923,
          tags: [
            ['image', 'https://x.example/poster'],
            ['r', 'https://x.example/page'],
            ['r', 'https://x.example/a.png'],
          ],
          content: 'Look https://x.example/a.png and https://x.example/c.webp?w=2',
        })
      ).map((p) => p.url)
    ).toEqual([
      'https://x.example/poster',
      'https://x.example/a.png',
      'https://x.example/c.webp?w=2',
    ]);
    const review = post({
      kind: 30078,
      content: JSON.stringify({ review: 'Nice', media: { photos: ['https://x.example/r.jpg'] } }),
    });
    expect(eventPhotos(review).map((p) => p.url)).toEqual(['https://x.example/r.jpg']);
    // A Blossom URL names its hash
    expect(eventPhotos(post({ content: `https://b.example/${hash}.png` }))[0]?.sha256).toBe(hash);
  });
});

describe('galleryPhotos', () => {
  it('lists newest posts first, the same file once (by hash, else URL)', () => {
    const older = post({ created_at: 1, content: `https://a.example/${hash}.jpg` });
    const newer = post({
      created_at: 2,
      tags: [['imeta', `url https://b.example/${hash}.jpg`, `x ${hash}`, 'm image/jpeg']],
    });
    const other = post({
      created_at: 3,
      content: 'https://c.example/z.jpg https://c.example/z.jpg',
    });
    expect(galleryPhotos([older, newer, other]).map((p) => [p.url, p.event.created_at])).toEqual([
      ['https://c.example/z.jpg', 3],
      [`https://b.example/${hash}.jpg`, 2],
    ]);
  });
});

describe('linkingFilter', () => {
  it('asks for posts of any kind linking the page, or the kinds given', () => {
    expect(linkingFilter(['30818:pk:x'], 500)).toEqual({ '#a': ['30818:pk:x'], limit: 500 });
    expect(linkingFilter(['30818:pk:x'], 5, [20])).toEqual({
      kinds: [20],
      '#a': ['30818:pk:x'],
      limit: 5,
    });
  });
});
