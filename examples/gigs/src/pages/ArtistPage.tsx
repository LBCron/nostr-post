import { ARTIST_PAGE_MANIFEST } from '../lib/manifests';
import { artistEditLink } from '../lib/routes';

/**
 * A musician's wiki page: their links as players, and their upcoming gigs (the manifest's
 * "Gigs" section: gigs linking the page or its profile links, with "Add")
 */
export function ArtistPage({ dTag }: { dTag: string }) {
  return (
    <>
      <p>
        <a href="#/">← All gigs</a> · <a href={artistEditLink(dTag)}>Edit</a> ·{' '}
        <a href="#/artist-new">Add an artist</a>
      </p>
      <nostr-wiki-view manifest={ARTIST_PAGE_MANIFEST} entityId={dTag} />
    </>
  );
}
