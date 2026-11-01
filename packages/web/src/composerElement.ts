/**
 * @nostr-post/web - <nostr-post-composer>'s tag in TypeScript's element map, as the other elements
 * have it (`document.querySelector('nostr-post-composer')`, JSX types), and the elements it brings
 * along. Its own module: composer.ts is near the file size limit.
 */

import type { NostrPostComposer } from './composer';
// Uploads and relay sends show in a corner while the page stays usable
import './activityPanel';

declare global {
  interface HTMLElementTagNameMap {
    'nostr-post-composer': NostrPostComposer;
  }
}
