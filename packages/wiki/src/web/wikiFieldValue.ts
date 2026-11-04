/**
 * @nostr-post/wiki - A field's value on a wiki page: shown as on posts, by its plugin's view
 * (e.g. links as players, a venue with its map), else as text
 */

import { fieldOptionLabel } from '@nostr-post/core/enumOptions';
import type { PostField } from '@nostr-post/core/types';
import { pluginRegistry } from '@nostr-post/plugins/registry';
import { html as staticHtml, unsafeStatic } from 'lit/static-html.js';
import { templateText } from '../identity';

/** A field value as text: lists joined, enum values as their option's label, references as names */
export const displayValue = (f: PostField, value: unknown): string => {
  const items = Array.isArray(value) ? value : [value];
  return items
    .map((v) =>
      f.type === 'enum' && typeof v === 'string' ? fieldOptionLabel(f, v) : templateText(v)
    )
    .join(', ');
};

/**
 * The value as its plugin shows it: the plugin's `renderView`, else its view element
 * (`viewTagName`, as `<nostr-post-view>` uses), else its `formatValue`, else as text
 */
export const renderFieldValue = (f: PostField, value: unknown): unknown => {
  const plugin = pluginRegistry.get(f.uiPlugin);
  if (plugin?.renderView) return plugin.renderView(value, f);
  if (plugin?.viewTagName) {
    const tag = unsafeStatic(plugin.viewTagName);
    return staticHtml`<${tag} .value=${value} .field=${f}></${tag}>`;
  }
  return plugin?.formatValue?.(value) || displayValue(f, value);
};
