import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  DONE_VISIBLE_MS,
  dismissActivity,
  getActivities,
  startActivity,
  subscribeActivities,
} from './activity';

afterEach(() => {
  for (const a of getActivities()) dismissActivity(a.id);
  vi.useRealTimers();
});

describe('activities', () => {
  it('lists a started activity and tells listeners about changes', () => {
    const seen: number[] = [];
    const stop = subscribeActivities((list) => seen.push(list.length));
    const upload = startActivity('Uploading a.jpg');
    upload.update({ progress: 0.5 });
    expect(getActivities()).toEqual([
      {
        id: upload.id,
        label: 'Uploading a.jpg',
        detail: undefined,
        state: 'running',
        progress: 0.5,
      },
    ]);
    stop();
    upload.update({ progress: 0.9 });
    expect(seen).toEqual([1, 1]);
  });

  it('removes a finished activity after a while, keeps a failed one', () => {
    vi.useFakeTimers();
    const ok = startActivity('Uploading a.jpg');
    const bad = startActivity('Uploading b.jpg');
    ok.done('Photo added');
    bad.fail('HTTP 500');
    expect(getActivities().map((a) => [a.label, a.state, a.detail])).toEqual([
      ['Photo added', 'done', undefined],
      ['Uploading b.jpg', 'failed', 'HTTP 500'],
    ]);
    vi.advanceTimersByTime(DONE_VISIBLE_MS);
    expect(getActivities().map((a) => a.id)).toEqual([bad.id]);
  });
});
