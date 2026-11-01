import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  getRelaysPending,
  publishToRelays,
  RELAYS_PENDING_EVENT,
  type RelaysPendingDetail,
  type SignedEvent,
} from './index';

const event: SignedEvent = {
  id: 'a',
  pubkey: 'pk',
  sig: 'sig',
  kind: 1,
  created_at: 100,
  content: '',
  tags: [],
};

/** Relays answering OK after the delay in `delays` (ms); a missing relay never answers */
const delays: Record<string, number> = {};
class FakeWebSocket {
  onopen?: () => void;
  onmessage?: (msg: { data: string }) => void;
  onerror?: () => void;
  onclose?: () => void;
  constructor(readonly url: string) {
    setTimeout(() => this.onopen?.(), 0);
  }
  send(data: string) {
    const [, sent] = JSON.parse(data) as [string, SignedEvent];
    const delay = delays[this.url];
    if (delay === undefined) return;
    setTimeout(() => this.onmessage?.({ data: JSON.stringify(['OK', sent.id, true, '']) }), delay);
  }
  close() {}
}

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('publishToRelays', () => {
  it('returns at the first accepting relay, the others finish in the background', async () => {
    vi.useFakeTimers();
    vi.stubGlobal('WebSocket', FakeWebSocket);
    const window = new EventTarget();
    vi.stubGlobal('window', window);
    const pending: number[] = [];
    window.addEventListener(RELAYS_PENDING_EVENT, (e) =>
      pending.push((e as CustomEvent<RelaysPendingDetail>).detail.pending)
    );
    delays['wss://fast'] = 10;
    delays['wss://slow'] = 3000;

    const publishing = publishToRelays(event, ['wss://fast', 'wss://slow', 'wss://dead']);
    await vi.advanceTimersByTimeAsync(20);
    const results = await publishing;
    expect(results.success).toBe(1);
    expect(results.results).toEqual([{ relay: 'wss://fast', ok: true }]);

    // The dead relay times out after 10 s
    await vi.advanceTimersByTimeAsync(10_000);
    const all = await results.all;
    expect(all?.success).toBe(2);
    expect(all?.failed).toBe(1);
    expect(pending).toEqual([3, 2, 1, 0]);
    expect(getRelaysPending()).toEqual({ pending: 0, sent: 2, failed: 1 });
  });
});
