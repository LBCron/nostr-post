/**
 * @nostr-post/plugin-markdown - <np-markdown-view>
 *
 * Read-only rendered markdown display.
 * Converts markdown to HTML for display.
 *
 * Accepts .value (markdown string) and .field (PostField).
 */

import type { PostField } from '@nostr-post/plugins/types';
import { NpElement, npStyles } from '@nostr-post/ui/web';
import { css, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';

function renderMarkdown(md: string): string {
  if (!md) return '';
  let h = md;
  // Code blocks
  h = h.replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>');
  // Inline code
  h = h.replace(/`([^`]+)`/g, '<code>$1</code>');
  // Headings
  h = h.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  h = h.replace(/^## (.+)$/gm, '<h2>$1</h2>');
  h = h.replace(/^# (.+)$/gm, '<h1>$1</h1>');
  // Bold + Italic
  h = h.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
  // Bold
  h = h.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  // Italic
  h = h.replace(/\*(.+?)\*/g, '<em>$1</em>');
  // Strikethrough
  h = h.replace(/~~(.+?)~~/g, '<s>$1</s>');
  // Links
  h = h.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
  // Images
  h = h.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1">');
  // Unordered lists
  h = h.replace(/^[*-] (.+)$/gm, '<li>$1</li>');
  h = h.replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>');
  // Blockquote
  h = h.replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>');
  // Horizontal rule
  h = h.replace(/^---$/gm, '<hr>');
  // Line breaks
  h = h.replace(/\n/g, '<br>');
  // Clean up
  h = h.replace(/<\/li><br>/g, '</li>');
  h = h.replace(/<\/ul><br>/g, '</ul>');
  h = h.replace(/<\/blockquote><br>/g, '</blockquote>');
  h = h.replace(/<\/pre><br>/g, '</pre>');
  h = h.replace(/<\/h([1-3])><br>/g, '</h$1>');
  return h;
}

@customElement('np-markdown-view')
export class NpMarkdownView extends NpElement {
  static override styles = [
    ...npStyles,
    css`
    :host {
      display: block;
    }

    .markdown-view {
      line-height: 1.7;
      color: var(--np-color-on-surface);
      font-size: var(--np-text-md);
    }

    .markdown-view h1 {
      font-size: var(--np-text-2xl);
      margin: 1rem 0 0.5rem;
      font-weight: 700;
    }

    .markdown-view h2 {
      font-size: var(--np-text-xl);
      margin: 1rem 0 0.5rem;
      font-weight: 600;
    }

    .markdown-view h3 {
      font-size: var(--np-text-xl);
      margin: 0.75rem 0 0.5rem;
      font-weight: 600;
    }

    .markdown-view strong {
      font-weight: 700;
    }

    .markdown-view em {
      font-style: italic;
    }

    .markdown-view s {
      text-decoration: line-through;
    }

    .markdown-view code {
      background: var(--np-color-surface-container);
      padding: 2px 5px;
      border-radius: var(--np-radius-xs);
      font-family: var(--np-font-family-mono);
      font-size: 0.875em;
    }

    .markdown-view pre {
      background: var(--np-color-inverse-surface);
      color: var(--np-color-on-surface-variant);
      padding: 0.75rem 1rem;
      border-radius: var(--np-radius-sm);
      overflow-x: auto;
      font-family: var(--np-font-family-mono);
      font-size: var(--np-text-md);
      line-height: 1.5;
    }

    .markdown-view pre code {
      background: none;
      padding: 0;
      color: inherit;
    }

    .markdown-view blockquote {
      border-left: 3px solid var(--np-color-outline-variant);
      padding-left: 0.75rem;
      margin: 0.5rem 0;
      color: var(--np-color-on-surface-variant);
      font-style: italic;
    }

    .markdown-view a {
      color: var(--np-color-primary);
      text-decoration: underline;
    }

    .markdown-view a:hover {
      color: var(--np-color-primary);
    }

    .markdown-view img {
      max-width: 100%;
      border-radius: var(--np-radius-sm);
    }

    .markdown-view hr {
      border: none;
      border-top: 1px solid var(--np-color-outline-variant);
      margin: 1rem 0;
    }

    .markdown-view ul,
    .markdown-view ol {
      padding-left: 1.5rem;
      margin: 0.5rem 0;
    }

    .markdown-view li {
      margin: 0.25rem 0;
    }

    .empty {
      font-size: var(--np-text-md);
      color: var(--np-color-on-surface-variant);
      font-style: italic;
    }

  `,
  ];

  @property({ type: String })
  value = '';

  @property({ type: Object })
  field: PostField | null = null;

  render() {
    if (!this.value) {
      return html`<span class="empty">No content</span>`;
    }

    return html`
      <div class="markdown-view">${unsafeHTML(renderMarkdown(this.value))}</div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'np-markdown-view': NpMarkdownView;
  }
}
