# Gigs (example)

Concerts and parties on Nostr: a thin static app on nostr-post's packages (React, Vite and
TypeScript; the packages' custom elements used in JSX), built for publishing as an nsite. NIP-52 calendar events, musician pages (NIP-54 wiki) with their music as
players, RSVP, `.ics` import and export.

- **Browse** (`#/`): gigs by city (a geohash prefix, `#g`), genre (`#t`) and date, as a list of days,
  a week or a month (`<nostr-calendar-agenda>`). Cities: any city OpenStreetMap finds while
  typing (`searchNominatim`, as the venue field's city level), and the ones picked before. The filter is in the
  page's link (`#/?city=…&g=…&genre=…&view=…&from=…`); "Share" sends it with the shown gigs as text
  (`agendaText`), "Image" as a picture (`agendaImage`), through the device's share sheet or as a
  copy or download.
- **Gig** (`#/event/<naddr>`): one event, shareable, with its comments and reactions, and the photos
  and videos of the gig and its comments. All of it is the packages'
  `<nostr-calendar-event thread editable gallery>`, the app only passes the gig manifest:
  editing (who posted it republishes it, anyone else's changes are update comments, see
  [USAGE_GUIDE.md](../../USAGE_GUIDE.md) and [NOSTR_CONVENTIONS.md](../../NOSTR_CONVENTIONS.md#update-comments)),
  comments (NIP-22) and reactions. The venue shows with its wiki page, and each performer with a
  page as a row that opens it. Performers' pages are `a` tags and a `Performers: nostr:naddr1…`
  line each after the description, so other clients show them as links too. The performers field
  (`@nostr-post/plugin-wiki-entity`) removes a performer's profile links with them; performers
  without a page are named in the description.
- **Venues** are wiki pages of the venue page type published on Nostr (`VENUE_ENTITY_MANIFEST` in
  `manifests.ts`, `venue-entity-v1`, shared with worldtrip.guide): publishing a gig creates the
  venue's page from OpenStreetMap when it has none, and links it.
- **New performers' pages** are published with the gig, like the venue's: a performer read from a
  post, or filled in with "+ Create" / "Create page" (the dialog's "Add" doesn't publish), gets a
  checkbox next to the publish button; each page is one more event to sign.
- **My gigs** (`#/mine`, signed in): the gigs you added (`<nostr-calendar-agenda authors>`) and the
  ones you're going to, from your RSVPs (`fetchRsvpsBy`, `answersByAddress`, the agenda's
  `addresses`): Going and maybe, Going only, or Maybe only.
- **Musician** (`#/artist/<d-tag>`, `#/artist-new[/<name>]`, `#/artist-edit/<d-tag>[?add=<JSON>]`):
  a musician's wiki page, its links as players (type
  `(musician)`); links play (`@nostr-post/plugin-embed`), and its gigs are listed: those that link
  the page (`a` tag) or one of its profiles (`i` tag), so gigs added before the page show too.
- **Add a gig** (`#/add`): paste a post's text and its poster → AI reads it (Claude or Google Gemini
  with your own API key, called from the browser; Gemini with high thinking; Gemini's key from Google AI Studio has a free
  tier, on which Google may use what you send to improve its products; a busy Gemini is tried
  again, then its lighter model; or a prompt you copy to any AI) → a preview of the event, a
  hint when it seems to be on Nostr already → the composer, prefilled, to correct and publish.
  Or "fill in the form yourself": the empty composer, without AI.
  Nothing the AI returns is published without you. The AI's JSON follows the gig manifest
  (`formJsonSchema`). Only links the post's text has are kept (`keepKnownLinks`) (with a poster, others are kept but
  marked "read from the poster"); the performers' links show as players. Optionally the AI also
  suggests performers' links from any site, offered as players or links to confirm ("It's them"):
  Spotify, SoundCloud and YouTube video links are checked with their site (`checkLink`,
  `namesMatch`) and come ticked when it knows them by the performer's name, dropped when it
  doesn't; the others (YouTube channels, Bandcamp, Instagram, Metal Archives, websites, …) can't be checked
  from a browser and are left for the user to open and tick. Performers each get the gig's
  genres too. Performers are matched to their pages by profile link, then name, and each match is
  for the user to check in the page's preview ("It's them" / "Not them"); those without a
  page get one when the gig is published, with their links (a checkbox each next to the publish
  button: ticked with links, unticked for a name alone); unticked, they stay as text (in the
  description) and their profile links still tag the gig. A page that
  lacks links the post has gets "add them to the page": its edit form with the links added
  (the wiki composer's `additions`).
- **Import** (`#/import`): an `.ics` file (e.g. Facebook's export of your events) → review each
  event in the composer. Its d-tag comes from the event's UID, so importing again updates.
- **Test mode** (on by default): events are signed and shown but never sent to relays (the
  signer's dry run).

The code is in `src/`:

- `lib/`: the logic, without React. The app's own data (the musician and gig manifests, genres)
  in `manifests.ts`; the AI prompt and reading its answer in `ai.ts`; the Claude and Gemini calls
  (their official SDKs, loaded only when asked) in `aiProviders.ts`; the performers' links in `links.ts` (the checks are `@nostr-post/plugin-embed`'s
  `keepKnownLinks` and `checkSuggestedLinks`); the browse filter and cities in `filter.ts`; sharing in
  `share.ts`; the draft's preview and duplicates in `draft.ts`; hash routes in `routes.ts`.
- `pages/`: a component per page, and the add flow's parts (`SuggestedLinks`, `DraftReview`).
- `elements.d.ts`: the custom elements' JSX types, from the packages' own element types.

Everything else comes from the packages. Run it with `pnpm --filter gigs dev`, or as in PR
previews with `pnpm preview:pages` and open `/examples/gigs/`. Planned work is in
[#60](https://github.com/saintego/nostr-post/issues/60) ("Gig platform example") and its sub-issues.
