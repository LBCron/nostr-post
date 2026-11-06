/**
 * Photos and videos from the clipboard: a paste (Ctrl+V / ⌘V) anywhere in <np-media-input>,
 * e.g. into its URL input
 */

import { acceptsType } from '../core';

/** The pasted files the field accepts */
export const pastedFiles = (e: ClipboardEvent, accept?: readonly string[]): File[] =>
  Array.from(e.clipboardData?.files ?? []).filter((file) => acceptsType(file.type, accept));
