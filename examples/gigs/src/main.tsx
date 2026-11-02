/**
 * Gigs: concerts and parties on Nostr (NIP-52), a thin React app on nostr-post's packages.
 * The packages' web entries define the custom elements it uses; the field plugins they don't
 * import are loaded on demand (`@nostr-post/web`'s plugin autoload).
 */

import '@nostr-post/web';
import '@nostr-post/calendar/web';
import '@nostr-post/wiki/web';
import '@nostr-post/plugin-wiki-entity/web';
import '@nostr-post/plugin-embed/web';
import { onSignInNeeded } from '@nostr-post/plugins/signIn';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';

// The components turn dark with a `dark` class on an ancestor; follow the system setting
const darkQuery = matchMedia('(prefers-color-scheme: dark)');
const syncDark = () => document.body.classList.toggle('dark', darkQuery.matches);
syncDark();
darkQuery.addEventListener('change', syncDark);

// Sign-in: start the bridge here instead of relying on its script tag (init() is safe to call
// again). It installs window.nostr and its sign-in widget in the bottom-right corner
window.NostrBridge?.init({ layout: 'floating' }).catch((err: unknown) => {
  console.error('nostr-bridge: sign-in could not start', err);
});
// An upload or a publish without a signed-in user opens the sign-in
onSignInNeeded(() => {
  window.NostrBridge?.login().catch((err: unknown) => console.error('nostr-bridge: sign-in', err));
});

const root = document.getElementById('root');
if (root) {
  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>
  );
}
