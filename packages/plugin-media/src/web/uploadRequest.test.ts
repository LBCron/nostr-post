import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { uploadFailureKind, uploadWithProgress, uploadWithRetry } from './uploadRequest';

/** What each request does, in order: answer with a status, fail, or never answer */
type Behaviour = { status: number; body?: string } | 'network-error' | 'hang';
let behaviours: Behaviour[] = [];
let requests = 0;

class FakeXhr {
  status = 0;
  responseText = '';
  upload = new EventTarget();
  private events = new EventTarget();
  addEventListener(type: string, listener: () => void) {
    this.events.addEventListener(type, listener);
  }
  open() {}
  setRequestHeader() {}
  getResponseHeader() {
    return null;
  }
  abort() {
    this.events.dispatchEvent(new Event('abort'));
  }
  send() {
    const behaviour = behaviours[requests++] ?? 'hang';
    if (behaviour === 'hang') return;
    setTimeout(() => {
      if (behaviour === 'network-error') {
        this.events.dispatchEvent(new Event('error'));
        return;
      }
      this.status = behaviour.status;
      this.responseText = behaviour.body ?? '';
      this.events.dispatchEvent(new Event('load'));
    }, 100);
  }
}

const ok = {
  status: 200,
  body: JSON.stringify({ data: [{ url: 'https://i.nostr.build/a.jpg' }] }),
};
const file = new File(['x'], 'a.jpg', { type: 'image/jpeg' });
let win: EventTarget;
let nav: { onLine: boolean };

beforeEach(() => {
  vi.useFakeTimers();
  behaviours = [];
  requests = 0;
  // A signer with no one signed in (as nostr-bridge before sign-in): uploads without auth
  win = Object.assign(new EventTarget(), {
    nostr: { getPublicKey: () => Promise.reject(new Error('not logged in')) },
  });
  nav = { onLine: true };
  vi.stubGlobal('window', win);
  vi.stubGlobal('navigator', nav);
  vi.stubGlobal('XMLHttpRequest', FakeXhr);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

/** The promise's error (or undefined), after running the timers */
const settle = async (promise: Promise<unknown>, ms: number) => {
  const caught = promise.then(
    () => undefined,
    (error: unknown) => error
  );
  await vi.advanceTimersByTimeAsync(ms);
  return caught;
};

describe('uploadWithProgress', () => {
  it('returns the hosted URL', async () => {
    behaviours = [ok];
    const upload = uploadWithProgress(file);
    await vi.advanceTimersByTimeAsync(200);
    await expect(upload).resolves.toBe('https://i.nostr.build/a.jpg');
  });

  it('gives up on an upload without progress: stalled', async () => {
    behaviours = ['hang'];
    const error = await settle(uploadWithProgress(file, { stallMs: 1000 }), 1100);
    expect(uploadFailureKind(error)).toBe('stalled');
  });

  it('is cancelled by its signal', async () => {
    behaviours = ['hang'];
    const controller = new AbortController();
    const upload = uploadWithProgress(file, { signal: controller.signal });
    await vi.advanceTimersByTimeAsync(10);
    controller.abort();
    expect(uploadFailureKind(await settle(upload, 10))).toBe('cancelled');
  });
});

describe('uploadWithRetry', () => {
  it('tries again after a network error and a stall', async () => {
    behaviours = ['network-error', 'hang', ok];
    const retries: string[] = [];
    const upload = uploadWithRetry(file, {
      stallMs: 1000,
      onWait: (offline) => retries.push(`wait${offline ? ' offline' : ''}`),
      onRetry: (attempt, attempts) => retries.push(`${attempt}/${attempts}`),
    });
    await vi.advanceTimersByTimeAsync(100 + 3000 + 1000 + 10_000 + 200);
    await expect(upload).resolves.toBe('https://i.nostr.build/a.jpg');
    expect(retries).toEqual(['wait', '2/3', 'wait', '3/3']);
  });

  it('waits for the connection to come back', async () => {
    behaviours = ['network-error', ok];
    nav.onLine = false;
    const upload = uploadWithRetry(file);
    await vi.advanceTimersByTimeAsync(60_000);
    expect(requests).toBe(1);
    nav.onLine = true;
    win.dispatchEvent(new Event('online'));
    await vi.advanceTimersByTimeAsync(200);
    await expect(upload).resolves.toBe('https://i.nostr.build/a.jpg');
  });

  it("doesn't try again after a refusal, or when cancelled while waiting", async () => {
    behaviours = [{ status: 413 }];
    expect(uploadFailureKind(await settle(uploadWithRetry(file), 200))).toBe('rejected');
    expect(requests).toBe(1);

    behaviours = ['network-error', ok];
    requests = 0;
    const controller = new AbortController();
    const upload = uploadWithRetry(file, { signal: controller.signal });
    await vi.advanceTimersByTimeAsync(200);
    controller.abort();
    expect(uploadFailureKind(await settle(upload, 5000))).toBe('cancelled');
    expect(requests).toBe(1);
  });

  it('gives up after the last try', async () => {
    behaviours = [{ status: 502 }, { status: 502 }, { status: 502 }];
    const error = await settle(uploadWithRetry(file), 20_000);
    expect(uploadFailureKind(error)).toBe('server');
    expect(requests).toBe(3);
  });
});

describe('signing in', () => {
  it('asks to sign in when there is no signer, before sending anything', async () => {
    vi.stubGlobal('window', new EventTarget());
    expect(uploadFailureKind(await settle(uploadWithRetry(file), 200))).toBe('sign-in');
    expect(requests).toBe(0);
  });

  it('asks to sign in when the server wants auth that no one could sign, without retrying', async () => {
    behaviours = [{ status: 401 }];
    expect(uploadFailureKind(await settle(uploadWithRetry(file), 200))).toBe('sign-in');
    expect(requests).toBe(1);
  });
});
