import type { NostrTag } from '@nostr-post/core/types';
import type { SignedEntry, SignedEvent } from '@nostr-post/signer';
import { describe, expect, it, vi } from 'vitest';
import {
  capturedEntries,
  draftItem,
  isLate,
  nextStep,
  type OutboxUpload,
  signedItem,
  withState,
} from './item';
import { createOutbox } from './outbox';
import { memoryStorage } from './storage';

const event = (id: string, tags: NostrTag[] = [], content = ''): SignedEvent => ({
  id,
  pubkey: 'pk',
  sig: 'sig',
  kind: 1,
  created_at: 100,
  content,
  tags,
});
const entry = (id: string, tags: NostrTag[] = []): SignedEntry => ({
  event: event(id, tags),
  relays: ['wss://r1'],
});
const photo: OutboxUpload = {
  fileKey: 'f1',
  sha256: 'abc',
  url: 'https://blossom.example/abc.jpg',
  server: 'https://blossom.example',
  type: 'image/jpeg',
  size: 3,
  auth: event('auth'),
};

describe('items', () => {
  it('are named by their post and merge captured publishes', () => {
    const events = capturedEntries([
      entry('page'),
      { ...entry('post', [['title', 'Soul Slam']]), relays: ['wss://r1'] },
      { ...entry('post', [['title', 'Soul Slam']]), relays: ['wss://r2'] },
    ]);
    expect(events.map((e) => e.event.id)).toEqual(['post', 'page']);
    expect(events[0]?.relays).toEqual(['wss://r1', 'wss://r2']);
    expect(signedItem({ pubkey: 'pk', events }).title).toBe('Soul Slam');
  });

  it('take the next step by their state, uploads, time and connection', () => {
    const item = signedItem({ pubkey: 'pk', events: [entry('post')], now: 100 });
    expect(nextStep(item)).toBe('publish');
    const withUpload = { ...item, uploads: [photo], wifiOnly: true };
    expect(nextStep(withUpload, { wifi: false })).toBe('wait');
    expect(nextStep(withUpload, { wifi: undefined })).toBe('wait');
    expect(nextStep(withUpload, { wifi: true })).toBe('upload');
    expect(nextStep(withUpload, { force: true })).toBe('upload');
    const timed = { ...item, sendAt: 500 };
    expect(nextStep(timed, { now: 400 })).toBe('wait');
    expect(nextStep(timed, { now: 400, force: true })).toBe('publish');
    expect(nextStep(timed, { now: 500 })).toBe('publish');
    expect(isLate(timed, 1000)).toBe(true);
    const failed = withState(item, 'failed', { error: 'offline' });
    expect([failed.error, failed.attempts]).toEqual(['offline', 1]);
    expect(nextStep(failed)).toBe('none');
    expect(nextStep(failed, { force: true })).toBe('publish');
    expect(withState(failed, 'waiting').error).toBeUndefined();
    expect(nextStep(draftItem({ pubkey: 'pk', draft: { manifest: {}, formData: {} } }))).toBe(
      'none'
    );
  });
});

describe('createOutbox', () => {
  it('uploads the files, then publishes, and removes the published item', async () => {
    const storage = memoryStorage();
    const steps: string[] = [];
    const outbox = createOutbox(storage, {
      upload: async (u, file) => {
        steps.push(`upload ${u.sha256} ${await file.text()}`);
      },
      publish: async (entries) => {
        steps.push(`publish ${entries.map((e) => e.event.id).join()}`);
        return entries.map((e) => ({ id: e.event.id, ok: true }));
      },
    });
    const changes: string[] = [];
    outbox.subscribe((c) => changes.push(`${c.type} ${c.item.state}`));
    const item = signedItem({ pubkey: 'pk', events: [entry('post')], uploads: [photo] });
    await outbox.add(item, { f1: new Blob(['jpg']) });
    expect(await outbox.list('other')).toEqual([]);
    const done = await outbox.run(item.id);
    expect(done?.state).toBe('published');
    expect(steps).toEqual(['upload abc jpg', 'publish post']);
    expect(await outbox.list()).toEqual([]);
    expect(await storage.file('f1')).toBeUndefined();
    expect(changes).toEqual([
      'added waiting',
      'updated uploading',
      'updated uploading',
      'updated publishing',
      'removed published',
    ]);
  });

  it('keeps a failed item with the reason, and only the unsent events for a retry', async () => {
    const publish = vi.fn(async (entries: SignedEntry[]) =>
      entries.map((e) =>
        e.event.id === 'page'
          ? { id: 'page', ok: true }
          : { id: e.event.id, ok: false, error: 'blocked' }
      )
    );
    const outbox = createOutbox(memoryStorage(), { publish });
    const item = signedItem({ pubkey: 'pk', events: [entry('post'), entry('page')] });
    await outbox.add(item);
    const failed = await outbox.run(item.id);
    expect(failed).toMatchObject({ state: 'failed', error: 'blocked', attempts: 1 });
    expect(failed?.events.map((e) => e.event.id)).toEqual(['post']);
    // Not again on its own; a retry sends what's left
    expect((await outbox.runAll('pk')).length).toBe(0);
    await outbox.run(item.id, { force: true });
    expect(publish).toHaveBeenLastCalledWith([expect.objectContaining({ event: event('post') })]);
  });

  it('fails an upload without its file or job, and waits for wifi', async () => {
    const outbox = createOutbox(memoryStorage());
    const item = signedItem({ pubkey: 'pk', events: [entry('post')], uploads: [photo] });
    await outbox.add(item);
    expect((await outbox.run(item.id))?.error).toBe('No upload job');
    const onWifi = signedItem({
      pubkey: 'pk',
      events: [entry('p2')],
      uploads: [photo],
      wifiOnly: true,
    });
    await outbox.add(onWifi);
    expect((await outbox.runAll('pk', { wifi: false })).length).toBe(0);
  });
});

describe('captureEvents', () => {
  it('collects what a publish would send, not sending it', async () => {
    const { captureEvents } = await import('./capture');
    const { publishToRelays, publishToRelay } = await import('@nostr-post/signer');
    const { result, events } = await captureEvents(async () => {
      await publishToRelay(event('page'), 'wss://r1');
      await publishToRelays(event('post'), ['wss://r1', 'wss://r2']);
      return 'done';
    });
    expect(result).toBe('done');
    expect(events.map((e) => [e.event.id, e.relays])).toEqual([
      ['post', ['wss://r1', 'wss://r2']],
      ['page', ['wss://r1']],
    ]);
  });
});

describe('itemActions', () => {
  it('offers what fits the item', async () => {
    const { itemActions, pendingBytes } = await import('./item');
    const item = signedItem({ pubkey: 'pk', events: [entry('post')], now: 100 });
    expect(itemActions(item, 100)).toEqual(['remove']);
    expect(itemActions({ ...item, uploads: [photo] }, 100)).toEqual(['upload-now', 'remove']);
    expect(pendingBytes({ ...item, uploads: [photo, { ...photo, uploaded: true }] })).toBe(3);
    expect(itemActions({ ...item, sendAt: 500 }, 100)).toEqual(['send-now', 'remove']);
    expect(itemActions(withState(item, 'failed'), 100)).toEqual(['retry', 'remove']);
    expect(itemActions(withState(item, 'uploading'), 100)).toEqual([]);
    expect(itemActions(draftItem({ pubkey: 'pk', draft: { manifest: {}, formData: {} } }))).toEqual(
      ['edit', 'remove']
    );
  });
});

describe('connectionConditions', () => {
  it('reads wifi from the Network Information API where there is one', async () => {
    const { connectionConditions } = await import('./web/runner');
    expect(connectionConditions()).toEqual({});
    const stub = (connection: object) => vi.stubGlobal('navigator', { connection });
    stub({ type: 'wifi' });
    expect(connectionConditions()).toEqual({ wifi: true });
    stub({ type: 'cellular' });
    expect(connectionConditions()).toEqual({ wifi: false });
    stub({ type: 'wifi', saveData: true });
    expect(connectionConditions()).toEqual({ wifi: false });
    stub({});
    expect(connectionConditions()).toEqual({});
    vi.unstubAllGlobals();
  });
});

describe('deferred uploads', () => {
  it('are found by the URLs a value uses, and forgotten once queued', async () => {
    const { deferUpload, deferredUploadsIn, forgetDeferredUploads } = await import('./deferred');
    deferUpload(photo, new Blob(['jpg']));
    expect(deferredUploadsIn({ media: ['https://other.example/x.jpg'] })).toEqual([]);
    expect(deferredUploadsIn({ media: [photo.url] }).map((d) => d.upload.sha256)).toEqual(['abc']);
    forgetDeferredUploads([photo.url]);
    expect(deferredUploadsIn({ media: [photo.url] })).toEqual([]);
  });
});

describe('removing an item', () => {
  it('keeps the files another item uses', async () => {
    const storage = memoryStorage();
    const outbox = createOutbox(storage);
    const draft = {
      ...draftItem({ pubkey: 'pk', draft: { manifest: {}, formData: {} } }),
      uploads: [photo],
    };
    const queued = signedItem({ pubkey: 'pk', events: [entry('post')], uploads: [photo] });
    await outbox.add(draft, { f1: new Blob(['jpg']) });
    await outbox.add(queued, { f1: new Blob(['jpg']) });
    await outbox.remove(draft.id);
    expect(await storage.file('f1')).toBeDefined();
    await outbox.remove(queued.id);
    expect(await storage.file('f1')).toBeUndefined();
  });
});

describe('sign-later items', () => {
  it('upload first, then sign the form with the uploaded URLs, then publish', async () => {
    const { withUploadedUrls } = await import('./item');
    const pending: OutboxUpload = {
      ...photo,
      auth: undefined,
      url: 'pending:abc.jpg',
      server: '',
    };
    const signedForms: unknown[] = [];
    const steps: string[] = [];
    const outbox = createOutbox(memoryStorage(), {
      upload: async () => {
        steps.push('upload');
        return 'https://nostr.build/i/abc.jpg';
      },
      sign: async (item) => {
        steps.push('sign');
        signedForms.push(withUploadedUrls(item.draft?.formData, item.uploads));
        return [entry('post')];
      },
      publish: async (entries) => {
        steps.push('publish');
        return entries.map((e) => ({ id: e.event.id, ok: true }));
      },
    });
    const item = {
      ...draftItem({
        pubkey: 'pk',
        draft: { manifest: {}, formData: { photos: ['pending:abc.jpg'], text: 'Hi' } },
      }),
      state: 'waiting' as const,
      uploads: [pending],
      signLater: true,
      wifiOnly: true,
    };
    await outbox.add(item, { f1: new Blob(['jpg']) });
    expect(nextStep(item, { wifi: false })).toBe('wait');
    const done = await outbox.run(item.id, { force: true });
    expect(done?.state).toBe('published');
    expect(steps).toEqual(['upload', 'sign', 'publish']);
    expect(signedForms).toEqual([{ photos: ['https://nostr.build/i/abc.jpg'], text: 'Hi' }]);
  });

  it('fail with the reason when signing fails, keeping the uploaded files', async () => {
    const outbox = createOutbox(memoryStorage(), {
      upload: async () => 'https://nostr.build/i/abc.jpg',
      sign: async () => {
        throw new Error('Sign in to publish');
      },
    });
    const item = {
      ...draftItem({ pubkey: 'pk', draft: { manifest: {}, formData: {} } }),
      state: 'waiting' as const,
      uploads: [{ ...photo, auth: undefined, url: 'pending:abc.jpg', server: '' }],
      signLater: true,
    };
    await outbox.add(item, { f1: new Blob(['jpg']) });
    const failed = await outbox.run(item.id);
    expect(failed).toMatchObject({ state: 'failed', error: 'Sign in to publish' });
    expect(failed?.uploads[0]).toMatchObject({
      uploaded: true,
      uploadedUrl: 'https://nostr.build/i/abc.jpg',
    });
    // A retry doesn't upload again
    expect(nextStep(failed as never, { force: true })).toBe('publish');
  });
});
