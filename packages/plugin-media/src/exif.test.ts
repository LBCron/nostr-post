import { describe, expect, it } from 'vitest';
import { exifOrientation, stripJpegMetadata } from './exif';
import { sha256Hex } from './hash';

const ascii = (text: string) => [...text].map((c) => c.charCodeAt(0));
const segment = (marker: number, payload: number[]) => {
  const length = payload.length + 2;
  return [0xff, marker, length >> 8, length & 0xff, ...payload];
};

/** EXIF with the orientation and a GPS pointer, little-endian like most phones */
const exifPayload = (orientation: number) => [
  ...ascii('Exif'),
  0,
  0,
  ...[0x49, 0x49, 42, 0, 8, 0, 0, 0], // II, 42, IFD at 8
  2,
  0, // two entries
  ...[0x12, 0x01, 3, 0, 1, 0, 0, 0, orientation, 0, 0, 0], // Orientation
  ...[0x25, 0x88, 4, 0, 1, 0, 0, 0, 0x26, 0, 0, 0], // GPS IFD pointer
  0,
  0,
  0,
  0,
  ...ascii('GPS 50.08N 14.42E'),
];

const app0 = segment(0xe0, [...ascii('JFIF'), 0, 1, 2]);
const xmp = segment(0xe1, [...ascii('http://ns.adobe.com/xap/1.0/'), 0, ...ascii('<x/>')]);
const dqt = segment(0xdb, [0, 1, 2, 3]);
const scan = [0xff, 0xda, 0, 4, 1, 2, 0x11, 0x22, 0xff, 0xd9];
const jpeg = (orientation: number) =>
  new Uint8Array([
    0xff,
    0xd8,
    ...app0,
    ...segment(0xe1, exifPayload(orientation)),
    ...xmp,
    ...dqt,
    ...scan,
  ]);

describe('stripJpegMetadata', () => {
  it('drops EXIF (location included) and XMP, keeps the orientation and the image', () => {
    const { bytes, removed } = stripJpegMetadata(jpeg(6));
    expect(removed).toBe(true);
    const text = String.fromCharCode(...bytes);
    expect(text).not.toContain('GPS');
    expect(text).not.toContain('adobe');
    expect(text).toContain('JFIF');
    expect([...bytes.slice(-scan.length)]).toEqual(scan);
    // The new EXIF block holds the orientation only
    const at = text.indexOf('Exif');
    expect(exifOrientation(bytes.subarray(at, at + 32))).toBe(6);
  });

  it('leaves no EXIF for an upright photo, and other files as they are', () => {
    const { bytes } = stripJpegMetadata(jpeg(1));
    expect(String.fromCharCode(...bytes)).not.toContain('Exif');
    const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47]);
    expect(stripJpegMetadata(png)).toEqual({ bytes: png, removed: false });
    const plain = new Uint8Array([0xff, 0xd8, ...app0, ...scan]);
    expect(stripJpegMetadata(plain)).toEqual({ bytes: plain, removed: false });
  });
});

describe('sha256Hex', () => {
  it('hashes bytes and blobs', async () => {
    const abc = 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad';
    expect(await sha256Hex(new Uint8Array(ascii('abc')))).toBe(abc);
    expect(await sha256Hex(new Blob(['abc']))).toBe(abc);
  });
});
