/**
 * The outbox: gigs not published yet. Drafts ("Save draft"), timed gigs ("Publish at") and gigs
 * whose poster uploads later ("Upload later, on wifi"), kept in this browser. Edit opens a draft
 * in the Add a gig page.
 */

import '@nostr-post/outbox/web';
import { draftLink } from '../lib/routes';

export function Outbox() {
  return (
    <section className="step np-card np-outlined">
      <p className="np-hint">
        Gigs not published yet, kept in this browser: drafts, gigs to publish at a set time, and
        gigs whose poster uploads on wifi or when you choose.
      </p>
      <nostr-post-outbox
        onoutbox-edit={(e: CustomEvent) => {
          location.hash = draftLink((e.detail as { id: string }).id);
        }}
      />
    </section>
  );
}
