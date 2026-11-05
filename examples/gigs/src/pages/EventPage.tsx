import { GIG_MANIFEST } from '../lib/manifests';

/** One gig by its address (the link has its naddr: shareable), with its comments and photos */
export function EventPage({ address }: { address: string }) {
  return (
    <>
      <p>
        <a href="#/">← All gigs</a>
      </p>
      <nostr-calendar-event manifest={GIG_MANIFEST} address={address} thread editable gallery />
      <p className="share">
        Share: <input readOnly value={location.href} onFocus={(e) => e.target.select()} />
      </p>
    </>
  );
}
