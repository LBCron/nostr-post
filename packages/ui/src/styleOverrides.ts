/**
 * @nostr-post/ui - Style overrides registry
 *
 * The "go crazy" level of customization: an app adds CSS to a component, or replaces all of
 * its styles, by tag name. Framework-free bookkeeping; `/web` applies the entries to the
 * components' shadow roots (`NpElement`), also to components already on the page.
 */

export type OverrideMode = 'add' | 'replace';

export interface StyleOverride {
  readonly css: string;
  readonly mode: OverrideMode;
}

/** Tag name that applies to every component */
export const allComponents = '*';

type Listener = () => void;

let overrides: ReadonlyMap<string, readonly StyleOverride[]> = new Map();
const listeners = new Set<Listener>();

const notify = (): void => {
  for (const listener of listeners) listener();
};

const key = (tag: string): string => tag.toLowerCase();

/**
 * Add CSS to a component (`mode: 'add'`, the default; it comes after the component's own
 * styles) or replace all its styles (`mode: 'replace'`). `tag` is the element's tag name, or
 * `'*'` for every component. Returns a function that removes this entry again.
 */
export const registerStyles = (
  tag: string,
  css: string,
  options: { mode?: OverrideMode } = {}
): (() => void) => {
  const entry: StyleOverride = { css, mode: options.mode ?? 'add' };
  const k = key(tag);
  const next = new Map(overrides);
  next.set(k, [...(overrides.get(k) ?? []), entry]);
  overrides = next;
  notify();
  return () => {
    const current = overrides.get(k) ?? [];
    const rest = current.filter((e) => e !== entry);
    const after = new Map(overrides);
    if (rest.length) after.set(k, rest);
    else after.delete(k);
    overrides = after;
    notify();
  };
};

/** Render a component with no styles of its own: you style its HTML from scratch */
export const unstyled = (tag: string = allComponents): (() => void) =>
  registerStyles(tag, '', { mode: 'replace' });

/** Remove every override (of one tag, or all) */
export const clearStyles = (tag?: string): void => {
  if (tag === undefined) overrides = new Map();
  else {
    const next = new Map(overrides);
    next.delete(key(tag));
    overrides = next;
  }
  notify();
};

export interface ResolvedOverrides {
  /** Drop the component's own styles */
  readonly replace: boolean;
  /** CSS to add, in order (global entries first) */
  readonly css: readonly string[];
}

/** What applies to a tag: entries for `'*'`, then for the tag; a `replace` drops what came before */
export const stylesFor = (tag: string): ResolvedOverrides => {
  const entries = [...(overrides.get(allComponents) ?? []), ...(overrides.get(key(tag)) ?? [])];
  const lastReplace = entries.map((e) => e.mode).lastIndexOf('replace');
  return {
    replace: lastReplace >= 0,
    css: entries
      .slice(Math.max(lastReplace, 0))
      .map((e) => e.css)
      .filter((css) => css.trim() !== ''),
  };
};

/** Called after every change; returns an unsubscribe function */
export const onStylesChange = (listener: Listener): (() => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};
