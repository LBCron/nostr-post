/**
 * User-facing text of <np-media-gallery>, with English defaults. Apps override any of it with
 * its `messages` property (e.g. translations).
 */
export interface MediaGalleryMessages {
  /** Heading when none is given */
  heading: string;
  loading: string;
  empty: string;
  showMore: string;
  close: string;
  /** Link to the post a photo or video is from */
  openPost: string;
  /** Under a photo: who added it and when */
  byline: (author: string, date: string) => string;
  /** A photo's description when its post gives none */
  photoAlt: (author: string) => string;
  /** On a video's tile */
  video: string;
}

export const DEFAULT_MEDIA_GALLERY_MESSAGES: MediaGalleryMessages = {
  heading: 'Photos and videos',
  loading: 'Loading photos…',
  empty: 'No photos yet',
  showMore: 'Show more',
  close: 'Close',
  openPost: 'Open post',
  byline: (author, date) => `${author} · ${date}`,
  photoAlt: (author) => `Photo by ${author}`,
  video: 'Video',
};
