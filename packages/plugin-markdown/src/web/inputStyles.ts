/**
 * @nostr-post/plugin-markdown - Styles of <np-markdown-input> (colors from the --np-* tokens)
 */

import { css } from 'lit';

export const markdownInputStyles = css`
    :host {
      display: block;
    }

    .container:focus-within {
      border-color: var(--np-color-primary);
      box-shadow: inset 0 0 0 1px var(--np-color-primary);
    }

    .container {
      border: 1px solid var(--np-color-outline);
      border-radius: var(--np-radius-xs);
      overflow: hidden;
      background: var(--np-color-surface-container-lowest);
    }

    /* Toolbar */
    .toolbar {
      display: flex;
      align-items: center;
      gap: 0.125rem;
      padding: 0.375rem 0.5rem;
      background: var(--np-color-surface-container-low);
      border-bottom: 1px solid var(--np-color-outline-variant);
      flex-wrap: wrap;
    }

    .toolbar-btn {
      width: 2.25em;
      height: 2.25em;
      border-radius: var(--np-radius-xs);
      font-weight: 600;
      color: var(--np-color-on-surface);
    }

    .toolbar-sep {
      width: 1px;
      height: 20px;
      background: var(--np-color-outline-variant);
      margin: 0 0.25rem;
    }

    .toolbar-spacer {
      flex: 1;
    }

    /* WYSIWYG editor */
    .editor {
      min-height: 200px;
      padding: 0.75rem 1rem;
      outline: none;
      font-size: var(--np-text-md);
      line-height: 1.7;
      color: var(--np-color-on-surface);
      overflow-y: auto;
    }

    .editor:focus {
      box-shadow: inset 0 0 0 2px color-mix(in srgb, var(--np-color-primary) 15%, transparent);
    }

    .editor h1 {
      font-size: var(--np-text-2xl);
      margin: 0.75rem 0 0.5rem;
    }
    .editor h2 {
      font-size: var(--np-text-xl);
      margin: 0.75rem 0 0.5rem;
    }
    .editor h3 {
      font-size: var(--np-text-xl);
      margin: 0.75rem 0 0.5rem;
    }
    .editor strong {
      font-weight: 700;
    }
    .editor em {
      font-style: italic;
    }
    .editor code {
      background: var(--np-color-surface-container);
      padding: 2px 4px;
      border-radius: var(--np-radius-xs);
      font-family: var(--np-font-family-mono);
      font-size: 0.875em;
    }
    .editor pre {
      background: var(--np-color-inverse-surface);
      color: var(--np-color-on-surface-variant);
      padding: 0.75rem;
      border-radius: var(--np-radius-sm);
      overflow-x: auto;
      font-family: var(--np-font-family-mono);
      font-size: var(--np-text-md);
    }
    .editor blockquote {
      border-left: 3px solid var(--np-color-outline-variant);
      padding-left: 0.75rem;
      margin: 0.5rem 0;
      color: var(--np-color-on-surface-variant);
    }
    .editor a {
      color: var(--np-color-primary);
      text-decoration: underline;
    }
    .editor img {
      max-width: 100%;
      border-radius: var(--np-radius-xs);
    }
    .editor hr {
      border: none;
      border-top: 1px solid var(--np-color-outline-variant);
      margin: 0.75rem 0;
    }
    .editor ul,
    .editor ol {
      padding-left: 1.5rem;
      margin: 0.25rem 0;
    }

    /* Raw textarea */
    .raw-editor {
      width: 100%;
      min-height: 200px;
      padding: 0.75rem 1rem;
      border: none;
      outline: none;
      font-family: var(--np-font-family-mono);
      font-size: var(--np-text-md);
      line-height: 1.6;
      color: var(--np-color-on-surface);
      resize: vertical;
      box-sizing: border-box;
    }

    .raw-editor:focus {
      box-shadow: inset 0 0 0 2px color-mix(in srgb, var(--np-color-primary) 15%, transparent);
    }

    /* Footer */
    .footer {
      display: flex;
      justify-content: space-between;
      padding: 0.375rem 0.75rem;
      background: var(--np-color-surface-container-low);
      border-top: 1px solid var(--np-color-outline-variant);
      font-size: var(--np-text-sm);
      color: var(--np-color-on-surface-variant);
    }

`;
