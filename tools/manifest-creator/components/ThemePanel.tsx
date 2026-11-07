'use client';

/**
 * Theme: try @nostr-post/ui's customization live on the previews, and copy the CSS.
 * The three levels: tokens (a few variables), ::part() rules, and registerStyles overrides.
 * Below them, every shared primitive, as the visual reference.
 */

import { overridesCss, registerStyles, unstyled } from '@nostr-post/ui';
import { useEffect, useState } from 'react';

const DEFAULTS = { primary: '#4f46e5', fontSize: 14, radius: 8 };

const STYLE_ID = 'manifest-creator-theme';

/** Put the page CSS in a <style> of its own, replacing the previous one */
const applyPageCss = (css: string) => {
  const existing = document.getElementById(STYLE_ID);
  const style = existing ?? Object.assign(document.createElement('style'), { id: STYLE_ID });
  style.textContent = css;
  if (!existing) document.head.append(style);
};

const EXAMPLE_PARTS = `nostr-post-view::part(card) {
  border-left: 4px solid var(--np-color-primary);
}`;

const EXAMPLE_OVERRIDE = `.np-button {
  text-transform: uppercase;
  letter-spacing: 0.06em;
}`;

export function ThemePanel() {
  const [primary, setPrimary] = useState<string | undefined>();
  const [fontSize, setFontSize] = useState(DEFAULTS.fontSize);
  const [radius, setRadius] = useState(DEFAULTS.radius);
  const [parts, setParts] = useState('');
  const [override, setOverride] = useState('');
  const [bare, setBare] = useState(false);
  const [copied, setCopied] = useState(false);

  const tokens = overridesCss({
    color: primary ? { primary } : undefined,
    fontSize: fontSize === DEFAULTS.fontSize ? undefined : fontSize,
    radius: radius === DEFAULTS.radius ? undefined : radius,
  });
  const pageCss = [tokens, parts.trim()].filter(Boolean).join('\n');

  useEffect(() => applyPageCss(pageCss), [pageCss]);
  useEffect(() => (override.trim() ? registerStyles('*', override) : undefined), [override]);
  useEffect(() => (bare ? unstyled() : undefined), [bare]);

  const copy = () => {
    const all = [pageCss, override.trim() && `/* registerStyles('*', …) */\n${override}`]
      .filter(Boolean)
      .join('\n\n');
    navigator.clipboard
      ?.writeText(all)
      .then(() => setCopied(true))
      .catch(() => setCopied(false));
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <details className="np-card np-outlined theme-panel">
      <summary className="np-title">Theme and styling</summary>
      <p className="np-hint">
        How a page restyles the components: changes here apply to the previews on this page.
      </p>

      <section className="theme-level">
        <h3 className="np-label">1. Tokens</h3>
        <div className="np-toolbar">
          <label className="np-field theme-control">
            <span className="np-label">Primary color</span>
            <input
              type="color"
              value={primary ?? DEFAULTS.primary}
              onChange={(e) => setPrimary(e.target.value)}
            />
          </label>
          <label className="np-field theme-control">
            <span className="np-label">Font size: {fontSize}px</span>
            <input
              type="range"
              min={12}
              max={18}
              value={fontSize}
              onChange={(e) => setFontSize(Number(e.target.value))}
            />
          </label>
          <label className="np-field theme-control">
            <span className="np-label">Corner radius: {radius}px</span>
            <input
              type="range"
              min={0}
              max={20}
              value={radius}
              onChange={(e) => setRadius(Number(e.target.value))}
            />
          </label>
          <button
            type="button"
            className="np-button np-text np-small"
            onClick={() => {
              setPrimary(undefined);
              setFontSize(DEFAULTS.fontSize);
              setRadius(DEFAULTS.radius);
            }}
          >
            Reset
          </button>
        </div>
      </section>

      <section className="theme-level">
        <h3 className="np-label">2. Parts</h3>
        <textarea
          className="np-input theme-code"
          rows={3}
          placeholder={EXAMPLE_PARTS}
          value={parts}
          onChange={(e) => setParts(e.target.value)}
        />
        <button
          type="button"
          className="np-button np-text np-small"
          onClick={() => setParts(EXAMPLE_PARTS)}
        >
          Try the example
        </button>
      </section>

      <section className="theme-level">
        <h3 className="np-label">3. Full override (registerStyles)</h3>
        <textarea
          className="np-input theme-code"
          rows={3}
          placeholder={EXAMPLE_OVERRIDE}
          value={override}
          onChange={(e) => setOverride(e.target.value)}
        />
        <div className="np-toolbar">
          <button
            type="button"
            className="np-button np-text np-small"
            onClick={() => setOverride(EXAMPLE_OVERRIDE)}
          >
            Try the example
          </button>
          <label className="np-checkbox">
            <input type="checkbox" checked={bare} onChange={(e) => setBare(e.target.checked)} />
            Unstyled components
          </label>
        </div>
      </section>

      <section className="theme-level">
        <div className="np-toolbar">
          <h3 className="np-label">Your CSS</h3>
          <span className="np-spacer" />
          <button type="button" className="np-button np-small" onClick={copy}>
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
        <pre className="theme-code theme-output">{pageCss || '/* Change a setting above */'}</pre>
      </section>

      <section className="theme-level">
        <h3 className="np-label">Primitives</h3>
        <div className="np-toolbar">
          <button type="button" className="np-button np-filled">
            Filled
          </button>
          <button type="button" className="np-button np-tonal">
            Tonal
          </button>
          <button type="button" className="np-button">
            Outlined
          </button>
          <button type="button" className="np-button np-text">
            Text
          </button>
          <button type="button" className="np-button np-text np-danger">
            Delete
          </button>
        </div>
        <label className="np-field">
          <span className="np-label np-required">Text field</span>
          <input className="np-input" placeholder="Placeholder" />
          <span className="np-hint">A hint below the field</span>
        </label>
        <div className="np-toolbar">
          <span className="np-chip">Chip</span>
          <span className="np-chip np-selected">Selected</span>
          <span className="np-badge np-success">Success</span>
          <span className="np-badge np-warning">Warning</span>
          <span className="np-badge np-error">Error</span>
          <span className="np-badge np-info">Info</span>
        </div>
        <div className="np-message np-info">An info message</div>
        <div className="np-message np-error">An error message</div>
      </section>
    </details>
  );
}
