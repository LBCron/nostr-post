/**
 * Photos and videos from the clipboard: a paste (Ctrl+V / ⌘V) on <np-media-input>, or its Paste
 * button, which reads the clipboard where the browser allows it (`navigator.clipboard.read`)
 */

import { acceptsType, extensionFor } from '../core';

/** The pasted files the field accepts */
export const pastedFiles = (e: ClipboardEvent, accept?: readonly string[]): File[] =>
  Array.from(e.clipboardData?.files ?? []).filter((file) => acceptsType(file.type, accept));

/** Whether this browser can read files from the clipboard on a button press */
export const canReadClipboard = (): boolean =>
  typeof navigator !== 'undefined' && typeof navigator.clipboard?.read === 'function';

/**
 * The clipboard's photos and videos the field accepts; [] when it holds none. Throws when the
 * browser refuses (no permission, page not focused)
 */
export async function clipboardFiles(accept?: readonly string[]): Promise<File[]> {
  const items = await navigator.clipboard.read();
  const files: File[] = [];
  for (const [i, item] of items.entries()) {
    const type = item.types.find((t) => acceptsType(t, accept));
    if (!type) continue;
    const blob = await item.getType(type);
    files.push(new File([blob], `pasted-${i + 1}.${extensionFor(type)}`, { type }));
  }
  return files;
}
