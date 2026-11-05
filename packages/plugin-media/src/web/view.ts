/**
 * @nostr-post/plugin-media - <np-media-view>
 *
 * Read-only media gallery. Renders images inline, videos with controls,
 * and falls back to a link for unrecognized URLs.
 *
 * Accepts .value (string | string[]), .field (PostField) and .author (the post's pubkey). An
 * image from a Blossom server that fails to load is tried on the author's other servers (their
 * kind 10063 list) and the field's `blossomServers`, by its hash.
 */

import type { PostField } from '@nostr-post/plugins/types';
import { css, html, LitElement } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { isImageUrl, isVideoUrl, type MediaPluginConfig, toArray } from '../core';
import { mediaFileOf } from '../mediaFiles';
import { otherServersOf } from './otherServers';

@customElement('np-media-view')
export class NpMediaView extends LitElement {
  static styles = css`
    :host {
      display: block;
      line-height: 1.3;
    }
    .gallery {
      display: flex;
      flex-wrap: wrap;
      gap: 0.4rem;
    }
    .media-view {
      border-radius: 8px;
      overflow: hidden;
      background: #f9fafb;
      border: 1px solid #e5e7eb;
      max-width: min(220px, 100%);
    }
    img {
      display: block;
      width: 100%;
      max-height: 180px;
      object-fit: contain;
      border-radius: 8px;
    }
    video {
      display: block;
      width: 100%;
      max-height: 180px;
      border-radius: 8px;
    }
    .media-link {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.75rem;
      color: #6366f1;
      text-decoration: none;
      font-size: 0.875rem;
      word-break: break-all;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
    }
    .media-link:hover {
      text-decoration: underline;
    }
    .media-icon {
      font-size: 1.25rem;
      flex-shrink: 0;
    }
    .empty {
      font-size: 0.875rem;
      color: #9ca3af;
    }
  `;

  @property({ type: Array })
  value: string | string[] = [];

  @property({ type: Object })
  field: PostField | null = null;

  /** The post's author: their Blossom servers are tried when an image fails */
  @property({ type: String })
  author?: string;

  /** The URL shown for an image that failed, by its original URL */
  @state() _shown = new Map<string, string>();
  /** Other servers' URLs still to try, by original URL */
  _alternatives = new Map<string, string[]>();

  async _tryElsewhere(url: string): Promise<void> {
    if (!this._alternatives.has(url)) {
      const servers = (this.field?.metadata as MediaPluginConfig | undefined)?.blossomServers;
      this._alternatives.set(url, await otherServersOf(url, this.author, servers));
    }
    const next = this._alternatives.get(url)?.shift();
    if (next) this._shown = new Map(this._shown).set(url, next);
  }

  render() {
    const urls = toArray(this.value);

    if (urls.length === 0) {
      return html`<span class="empty">No media</span>`;
    }

    return html`<div class="gallery">${urls.map((url) => this.renderItem(url))}</div>`;
  }

  private renderItem(url: string) {
    if (isVideoUrl(url)) {
      return html`
        <div class="media-view">
          <video src=${url} controls preload="metadata"></video>
        </div>
      `;
    }

    if (isImageUrl(url)) {
      return html`
        <div class="media-view">
          <img
            src=${this._shown.get(url) ?? url}
            alt=${mediaFileOf(url).alt ?? 'Media'}
            @error=${() => void this._tryElsewhere(url)}
          />
        </div>
      `;
    }

    return html`
      <a class="media-link" href=${url} target="_blank" rel="noopener">
        <span class="media-icon">🔗</span>
        ${url}
      </a>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'np-media-view': NpMediaView;
  }
}
