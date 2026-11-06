# @nostr-post/outbox

Posts that aren't published at once, in one queue ([#268](https://github.com/saintego/nostr-post/issues/268)):

- **Drafts:** a post the user is still working on, unsigned and editable.
- **Timed posts:** signed now, sent at a set time.
- **Upload later:** photos uploaded on wifi or on request, and the post published after.

It depends only on `@nostr-post/signer`. The main entry has no browser dependencies: it works
against a storage interface; `/web` keeps it in the browser and shows the queue.

## Items

An `OutboxItem` holds signed events (`events`, the post first, then the events it links, e.g.
the pages it created), the files to upload first (`uploads`), or, for a draft, unsigned form
data (`draft`). Its `state`:

`draft` → `waiting` → `uploading` → `publishing` → `published` (it leaves the outbox), or `failed`
with the reason in `error` (`attempts` counts them).

- `signedItem({ pubkey, events, uploads?, title?, sendAt?, wifiOnly? })`, `draftItem({ pubkey, draft, title? })`
- `nextStep(item, { now?, wifi?, force? })`: `'upload'`, `'publish'`, `'wait'` (a timed post's
  time hasn't come, or its files wait for wifi) or `'none'` (a draft, running, failed). `force`
  is the user asking: upload now, retry, send now.
- `withState(item, state, { error? })`, `isLate(item)` (a timed post past its time),
  `waitingFor(item)` (seconds), `titleOf(event)`

Items belong to a pubkey: list and run them per signed-in user, so another signer in the same
browser doesn't see or send them.

## Capturing a publish

`captureEvents(publish)` runs the app's usual publish (e.g. the composer's, with its publish
hooks), but every event it would send is collected instead (signer's `setPublishCapture`). So
pages the venue hub creates and plugins' events are signed now too, and nothing needs the signer
later:

```ts
import { captureEvents, createOutbox, memoryStorage, signedItem } from '@nostr-post/outbox';

const outbox = createOutbox(memoryStorage());
const { events } = await captureEvents(() => publishMyPost());
await outbox.add(signedItem({ pubkey, events }));
// later
await outbox.runAll(pubkey);
```

## The outbox

`createOutbox(storage, jobs?)` returns:

- `list(pubkey?)`, `add(item, files?)` (files by `fileKey`), `update(item)`, `remove(id)` (with its files)
- `run(id, conditions?)`: uploads the item's files (`jobs.upload(upload, file)`, with the
  authorization signed at capture), then sends its events (`jobs.publish`, default the signer's
  `publishSignedEvents`; in test mode only logged). A published item is removed. A failed one
  keeps the reason and only the events not sent yet, for a retry (`force: true`).
- `runAll(pubkey, conditions?)`: every item with a step to take now
- `subscribe(listener)`: `{ type: 'added' | 'updated' | 'removed', item }` on every change

## Storage

`OutboxStorage`: `items(pubkey?)`, `putItem`, `removeItem`, `putFile(key, blob)`, `file(key)`,
`removeFile`. `memoryStorage()` keeps everything in memory (tests, servers).

## Actions

`itemActions(item)`: what the user can do with it: `'edit'` (a draft), `'upload-now'` (files
waiting for wifi), `'send-now'` (a timed post before its time), `'retry'` (failed), `'remove'`.
`pendingBytes(item)`: bytes still to upload.

## `/web`

- `indexedDbStorage(name?)`: items and their files in IndexedDB (photos are far too big for
  localStorage). `requestPersistentStorage()` asks the browser to keep the site's data.
- `browserOutbox()`: the page's one outbox, in IndexedDB, with the jobs packages register
  (`registerOutboxJobs({ upload })`, e.g. plugin-media's upload).
- `startOutboxRunner(outbox?, { pubkey?, intervalMs? })`: runs due items now, every 30 s (timed
  posts), when the browser comes online and when the connection changes; returns `stop()`.
- `connectionConditions()`: `{ wifi }` from the Network Information API: true on wifi or
  ethernet, false on mobile data or with data saving on, unknown elsewhere (Safari, Firefox,
  desktop Chrome). Items with `wifiOnly` then wait for "Upload now".
- `<nostr-post-outbox>`: the queue. Each item with its thumbnail, title, state, size to upload,
  how long it has waited, a timed post's time (and "late" when the app was closed then), the
  reason it failed, and its actions; "Send all now". Edit fires `outbox-edit` with the item.
  Properties: `outbox` (default `browserOutbox()`), `pubkey` (default the signer's), `messages`
  (`DEFAULT_OUTBOX_MESSAGES`). Dark theme with a `dark` class on an ancestor.

Browsers may clear a site's data: Safari after 7 days without use unless the app is installed on
the home screen. The queue warns when items have waited for days.
