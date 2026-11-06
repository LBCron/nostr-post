import { describe, expect, it } from 'vitest';
import { draftTitle } from './composerDrafts';

describe('draftTitle', () => {
  it("is the form's first text", () => {
    expect(draftTitle({ rating: 4, review: '  Great\nbeer ', note: 'x' })).toBe('Great beer');
    expect(draftTitle({ rating: 4 })).toBe('');
    expect(draftTitle({ text: 'a'.repeat(80) }, 10)).toBe(`${'a'.repeat(9)}…`);
  });
});
