/**
 * Where a button's panel goes (<np-list-save>'s, the composer's field action panels): in the
 * page's top layer (a popover), so a card or a scrolling column around the button doesn't cut it
 * off. Pure: rectangles in, position out.
 */

export interface Box {
  top: number;
  left: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
}

/** Gap to the button and to the window's edges (px) */
const GAP = 4;
const EDGE = 8;

/**
 * The panel's top-left corner in the window: below the button, or above it when there's more
 * room there; its right edge at the button's (`align: 'end'`, the default) or its left edge
 * (`'start'`), kept inside the window.
 */
export function panelPosition(
  button: Box,
  panel: { width: number; height: number },
  viewport: { width: number; height: number },
  align: 'start' | 'end' = 'end'
): { top: number; left: number } {
  const below = button.bottom + GAP;
  const above = button.top - GAP - panel.height;
  const fitsBelow = below + panel.height <= viewport.height - EDGE;
  const top = fitsBelow || button.top < viewport.height - button.bottom ? below : above;
  const wanted = align === 'start' ? button.left : button.right - panel.width;
  const left = Math.min(wanted, viewport.width - EDGE - panel.width);
  return { top: Math.max(EDGE, top), left: Math.max(EDGE, left) };
}
