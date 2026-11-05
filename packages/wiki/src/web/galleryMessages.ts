/**
 * User-facing text of <nostr-wiki-gallery>, with English defaults. Apps override any of it
 * with its `messages` property (e.g. translations).
 */
export interface WikiGalleryMessages {
  /** Heading when the manifest gives none */
  photos: string;
  loading: string;
  empty: string;
  showMore: string;
  /** Opens the composer of a photo post with the page filled in */
  addPhoto: string;
  close: string;
  /** Link to the post a photo is from */
  openPost: string;
  /** Under a photo: who added it and when */
  byline: (author: string, date: string) => string;
  /** A photo's description when its post gives none */
  photoAlt: (author: string) => string;
  /** The composer's manifest couldn't be found, or the app didn't load `<nostr-post-composer>` */
  noComposer: string;
}

export const DEFAULT_WIKI_GALLERY_MESSAGES: WikiGalleryMessages = {
  photos: 'Photos',
  loading: 'Loading photos…',
  empty: 'No photos yet',
  showMore: 'Show more',
  addPhoto: 'Add photo',
  close: 'Close',
  openPost: 'Open post',
  byline: (author, date) => `${author} · ${date}`,
  photoAlt: (author) => `Photo by ${author}`,
  noComposer: "The photo form couldn't be loaded",
};
