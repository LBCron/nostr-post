/**
 * Removing a JPEG's metadata without re-encoding it: EXIF (camera, date, GPS location), XMP
 * and Photoshop/IPTC blocks go; the orientation stays (a minimal EXIF block with only it), so
 * the photo isn't shown sideways. Photos shrunk on the device have none already; this is for
 * originals ("full" quality, or a photo shrinking wouldn't make smaller).
 */

const EXIF = [0x45, 0x78, 0x69, 0x66, 0, 0]; // "Exif\0\0"
const XMP = 'http://ns.adobe.com/xap/1.0/';

const startsWith = (bytes: Uint8Array, at: number, prefix: readonly number[]): boolean =>
  prefix.every((b, i) => bytes[at + i] === b);

const ascii = (text: string): number[] => [...text].map((c) => c.charCodeAt(0));

/** The orientation (1–8) in an EXIF block's first IFD; undefined without one */
export const exifOrientation = (exif: Uint8Array): number | undefined => {
  // After "Exif\0\0": a TIFF header, II (little-endian) or MM
  const tiff = 6;
  const little = exif[tiff] === 0x49;
  const u16 = (at: number) =>
    little
      ? (exif[at] ?? 0) | ((exif[at + 1] ?? 0) << 8)
      : ((exif[at] ?? 0) << 8) | (exif[at + 1] ?? 0);
  const u32 = (at: number) =>
    little ? u16(at) | (u16(at + 2) << 16) : (u16(at) << 16) | u16(at + 2);
  if (u16(tiff + 2) !== 42) return undefined;
  const ifd = tiff + u32(tiff + 4);
  const count = u16(ifd);
  for (let i = 0; i < count; i++) {
    const entry = ifd + 2 + i * 12;
    if (entry + 12 > exif.length) return undefined;
    if (u16(entry) === 0x0112) {
      const value = u16(entry + 8);
      return value >= 1 && value <= 8 ? value : undefined;
    }
  }
  return undefined;
};

/** An APP1 segment with an EXIF block holding only the orientation */
const orientationSegment = (orientation: number): number[] => {
  const payload = [
    ...EXIF,
    ...[0x4d, 0x4d, 0, 42, 0, 0, 0, 8], // big-endian TIFF, first IFD at 8
    0,
    1, // one entry
    ...[0x01, 0x12, 0, 3, 0, 0, 0, 1, 0, orientation, 0, 0], // Orientation, SHORT, 1
    0,
    0,
    0,
    0, // no next IFD
  ];
  const length = payload.length + 2;
  return [0xff, 0xe1, length >> 8, length & 0xff, ...payload];
};

/** Whether a segment carries metadata to drop: EXIF or XMP (APP1), Photoshop/IPTC (APP13) */
const isMetadata = (bytes: Uint8Array, marker: number, data: number): boolean =>
  marker === 0xed ||
  (marker === 0xe1 && (startsWith(bytes, data, EXIF) || startsWith(bytes, data, ascii(XMP))));

interface Segment {
  marker: number;
  start: number;
  end: number;
}

/** The segments before the image data, and where the image data starts; undefined if unreadable */
const segmentsOf = (bytes: Uint8Array): { segments: Segment[]; scan: number } | undefined => {
  const segments: Segment[] = [];
  let at = 2;
  // Up to the start of scan (0xda): the image data follows, to the end
  while (at + 4 <= bytes.length && bytes[at] === 0xff && bytes[at + 1] !== 0xda) {
    const length = ((bytes[at + 2] ?? 0) << 8) | (bytes[at + 3] ?? 0);
    const end = at + 2 + length;
    if (length < 2 || end > bytes.length) return undefined;
    segments.push({ marker: bytes[at + 1] ?? 0, start: at, end });
    at = end;
  }
  return { segments, scan: at };
};

/** What replaces a metadata segment: nothing, or the orientation alone (if not upright) */
const replacement = (bytes: Uint8Array, { marker, start, end }: Segment): number[] => {
  if (marker !== 0xe1 || !startsWith(bytes, start + 4, EXIF)) return [];
  const orientation = exifOrientation(bytes.subarray(start + 4, end));
  return orientation && orientation !== 1 ? orientationSegment(orientation) : [];
};

const concat = (parts: (Uint8Array | number[])[]): Uint8Array => {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
};

/**
 * The JPEG without its metadata (orientation kept); `removed`: whether there was any. Anything
 * that isn't a JPEG, or one it can't read, comes back unchanged.
 */
export function stripJpegMetadata(bytes: Uint8Array): { bytes: Uint8Array; removed: boolean } {
  const read = bytes[0] === 0xff && bytes[1] === 0xd8 ? segmentsOf(bytes) : undefined;
  const metadata = (s: Segment) => isMetadata(bytes, s.marker, s.start + 4);
  if (!read?.segments.some(metadata)) return { bytes, removed: false };
  const parts = read.segments.map((s) =>
    metadata(s) ? replacement(bytes, s) : bytes.subarray(s.start, s.end)
  );
  return {
    bytes: concat([bytes.subarray(0, 2), ...parts, bytes.subarray(read.scan)]),
    removed: true,
  };
}
