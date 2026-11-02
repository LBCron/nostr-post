import { describe, expect, it } from 'vitest';
import { panelPosition } from './panelPosition';

const box = (left: number, top: number, width: number, height: number) => ({
  left,
  top,
  width,
  height,
  right: left + width,
  bottom: top + height,
});
const viewport = { width: 400, height: 800 };
const panel = { width: 256, height: 300 };

describe('panelPosition', () => {
  it('opens below the button, right edges aligned', () => {
    expect(panelPosition(box(300, 100, 80, 32), panel, viewport)).toEqual({ top: 136, left: 124 });
  });

  it('opens above when there is no room below', () => {
    expect(panelPosition(box(300, 700, 80, 32), panel, viewport)).toEqual({ top: 396, left: 124 });
  });

  it('stays inside the window', () => {
    expect(panelPosition(box(10, 100, 80, 32), panel, viewport).left).toBe(8);
    expect(panelPosition(box(380, 100, 80, 32), panel, viewport).left).toBe(136);
  });

  it("aligns the panel's left edge with the button's at the start", () => {
    expect(panelPosition(box(20, 100, 32, 32), panel, viewport, 'start').left).toBe(20);
    expect(panelPosition(box(300, 100, 32, 32), panel, viewport, 'start').left).toBe(136);
  });
});
