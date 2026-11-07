'use client';

/** Light, dark or the system's: remembered in this browser, applied to the whole page */

import { type ColorScheme, colorSchemes, parseColorScheme } from '@nostr-post/ui';
import { followColorScheme } from '@nostr-post/ui/web';
import { useEffect, useState } from 'react';

const KEY = 'manifest-creator:color-scheme';
const LABELS: Record<ColorScheme, string> = { system: 'Auto', light: 'Light', dark: 'Dark' };

const stored = (): ColorScheme => {
  try {
    return parseColorScheme(localStorage.getItem(KEY));
  } catch {
    return 'system';
  }
};

export function ColorSchemeSwitch() {
  const [scheme, setScheme] = useState<ColorScheme>('system');
  useEffect(() => setScheme(stored()), []);
  useEffect(() => {
    try {
      localStorage.setItem(KEY, scheme);
    } catch {
      // Private mode: the choice lasts until reload
    }
    return followColorScheme(scheme);
  }, [scheme]);

  return (
    <fieldset className="np-segmented" aria-label="Theme">
      {colorSchemes.map((s) => (
        <button
          key={s}
          type="button"
          className="np-segment"
          aria-pressed={scheme === s}
          onClick={() => setScheme(s)}
        >
          {LABELS[s]}
        </button>
      ))}
    </fieldset>
  );
}
