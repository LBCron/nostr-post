import { describe, expect, it } from 'vitest';
import { newestBlossomServers } from './blossomServers';
import type { SignedEvent } from './index';

const list = (created_at: number, servers: string[]): SignedEvent => ({
  id: String(created_at),
  pubkey: 'p',
  sig: 's',
  kind: 10063,
  created_at,
  content: '',
  tags: servers.map((s) => ['server', s]),
});

describe('newestBlossomServers', () => {
  it("takes the user's newest list, in its order", () => {
    expect(
      newestBlossomServers([
        list(1, ['https://old.example']),
        list(2, ['https://b.example/', 'https://a.example']),
      ])
    ).toEqual(['https://b.example', 'https://a.example']);
    expect(newestBlossomServers([])).toEqual([]);
  });
});
