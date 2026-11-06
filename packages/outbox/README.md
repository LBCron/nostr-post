# @nostr-post/outbox

Posts that aren't published at once, in one queue ([#268](https://github.com/saintego/nostr-post/issues/268)):

- **Drafts:** a post the user is still working on, unsigned and editable.
- **Timed posts:** signed now, sent at a set time.
- **Upload later:** photos uploaded on wifi or on request, and the post published after.

It depends only on `@nostr-post/signer`. The main entry has no browser dependencies: it works
against a storage interface. Status: the main entry ([#280](https://github.com/saintego/nostr-post/issues/280));
the browser storage and the queue element, upload later, drafts and timed posts follow in
[#281](https://github.com/saintego/nostr-post/issues/281) to [#284](https://github.com/saintego/nostr-post/issues/284).

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
