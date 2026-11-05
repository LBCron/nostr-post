/**
 * A file's sha256 as lowercase hex (Web Crypto: browsers and Node 18+), e.g. its Blossom name
 */
export async function sha256Hex(data: Blob | ArrayBuffer | Uint8Array): Promise<string> {
  const buffer =
    data instanceof Blob
      ? await data.arrayBuffer()
      : data instanceof Uint8Array
        ? data.slice().buffer
        : data;
  const digest = await globalThis.crypto.subtle.digest('SHA-256', buffer);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
