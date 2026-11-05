import { describe, expect, it } from 'vitest';
import { eventMedia, mediaOfEvents } from './eventMedia';

const hash = 'b1674191a88ec5cdd733e4240a81803105dc412d6c6708d53ab94fc248f4f553';
const post = (over: Partial<Parameters<typeof eventMedia>[0]>) => ({
  id: Math.random().toString(16),
  pubkey: 'pk',
  kind: 1,
  created_at: 1,
  content: '',
  tags: [] as string[][],
  ...over,
});

describe('eventMedia', () => {
  it('reads a NIP-68 picture and a NIP-71 video from their imeta tags', () => {
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
      ],
    });
    expect(eventMedia(picture)).toMatchObject([
      {
        url: `https://b.example/${hash}.jpg`,
        media: 'image',
        sha256: hash,
        alt: 'The bar',
        dim: '4x3',
      },
    ]);
    const video = post({
      kind: 21,
      tags: [
        [
          'imeta',
          'url https://v.example/gig',
          'm video/mp4',
          'image https://v.example/gig.jpg',
          'duration 30',
        ],
      ],
    });
    expect(eventMedia(video)).toMatchObject([
      {
        url: 'https://v.example/gig',
        media: 'video',
        image: 'https://v.example/gig.jpg',
        duration: 30,
      },
    ]);
  });

  it("reads each kind's place: image tags, r tags of files, links in the text, JSON content", () => {
    expect(
      eventMedia(
        post({
          kind: 31923,
          tags: [
            ['image', 'https://x.example/poster'],
            ['r', 'https://x.example/page'],
            ['r', 'https://x.example/a.png'],
          ],
          content:
            'Look https://x.example/a.png and https://x.example/c.webp?w=2 https://x.example/v.mp4',
        })
      ).map((m) => [m.url, m.media])
    ).toEqual([
      ['https://x.example/poster', 'image'],
      ['https://x.example/a.png', 'image'],
      ['https://x.example/c.webp?w=2', 'image'],
      ['https://x.example/v.mp4', 'video'],
    ]);
    const review = post({
      kind: 30078,
      content: JSON.stringify({ review: 'Nice', media: { photos: ['https://x.example/r.jpg'] } }),
    });
    expect(eventMedia(review).map((m) => m.url)).toEqual(['https://x.example/r.jpg']);
    expect(eventMedia(post({ content: `https://b.example/${hash}.png` }))[0]?.sha256).toBe(hash);
  });
});

describe('mediaOfEvents', () => {
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
    expect(mediaOfEvents([older, newer, other]).map((m) => [m.url, m.event.created_at])).toEqual([
      ['https://c.example/z.jpg', 3],
      [`https://b.example/${hash}.jpg`, 2],
    ]);
  });
});
