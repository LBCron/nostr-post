// @vitest-environment happy-dom
import type { PostField } from '@nostr-post/core/types';
import { pluginRegistry } from '@nostr-post/plugins/registry';
import { render } from 'lit';
import { describe, expect, it } from 'vitest';
import { renderFieldValue } from './wikiFieldValue';

const field = (uiPlugin: string): PostField => ({
  id: 'media',
  type: 'string',
  uiPlugin,
  mapTo: { kind: 30818, target: 'tag', tagName: 'r' },
});

const shown = (value: unknown) => {
  const el = document.createElement('div');
  render(value, el);
  return el;
};

describe('renderFieldValue', () => {
  it("uses the plugin's view element, with the value and field, before its text", () => {
    pluginRegistry.register({
      id: 'test-view-plugin',
      type: 'string',
      viewTagName: 'test-field-view',
      formatValue: () => 'as text',
    });
    const el = shown(renderFieldValue(field('test-view-plugin'), ['https://example.com/a']));
    const view = el.querySelector('test-field-view') as
      | (HTMLElement & { value?: unknown; field?: PostField })
      | null;
    expect(view?.value).toEqual(['https://example.com/a']);
    expect(view?.field?.id).toBe('media');
    expect(el.textContent).not.toContain('as text');
  });

  it('shows a value as text without a plugin view', () => {
    expect(renderFieldValue(field('text'), ['a', 'b'])).toBe('a, b');
  });
});
