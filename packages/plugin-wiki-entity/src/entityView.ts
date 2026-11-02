/**
 * @nostr-post/plugin-wiki-entity - <np-wiki-entity-view>: the picker's value in a post's view,
 * e.g. a gig's performers. A row per linked page, named by the page's title; opening a row loads
 * the page (`<nostr-wiki-view>`) in place, so a view with many posts loads no pages up front.
 * Entities without a page (names only) aren't listed: the post's text names them.
 */

import { fieldLabel } from '@nostr-post/core/manifest';
import type { PostField } from '@nostr-post/plugins/types';
import { DEFAULT_WIKI_RELAYS } from '@nostr-post/wiki';
import { css, html, LitElement, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { getEntityManifest, type WikiEntityData, type WikiEntityPickerConfig } from './core';
import { linkedEntities, pageTitles } from './pageTitles';

@customElement('np-wiki-entity-view')
export class NpWikiEntityView extends LitElement {
  static override styles = css`
    :host { display: block; margin: 0.5rem 0; font-size: 0.875rem; }
    .label { color: var(--nl-muted, #4b5563); margin-bottom: 0.25rem; }
    details { margin: 0.25rem 0; }
    summary { cursor: pointer; font-weight: 500; }
    :host-context(.dark) .label { color: var(--nl-muted, #9ca3af); }
  `;

  @property({ attribute: false }) value: unknown;
  @property({ attribute: false }) field?: PostField;

  /** Titles of the shown pages by d-tag */
  @state() private _titles = new Map<string, string>();

  private get _config(): WikiEntityPickerConfig {
    return (this.field?.metadata as WikiEntityPickerConfig | undefined) ?? {};
  }

  override updated(changed: Map<string, unknown>): void {
    if (!changed.has('value')) return;
    const value = this.value;
    void pageTitles(linkedEntities(value), this._config.relays ?? DEFAULT_WIKI_RELAYS).then(
      (titles) => {
        if (this.value === value) this._titles = titles;
      }
    );
  }

  /** Loads the page into its row when the row is first opened */
  private _open(e: Event, entity: WikiEntityData): void {
    const details = e.target as HTMLDetailsElement;
    if (!details.open || details.querySelector('nostr-wiki-view')) return;
    const view = document.createElement('nostr-wiki-view') as HTMLElement & {
      entityId?: string;
      manifest?: unknown;
      relays?: string[];
    };
    view.entityId = entity.dTag;
    view.manifest = getEntityManifest(this._config.entityManifest);
    if (this._config.relays) view.relays = this._config.relays;
    details.appendChild(view);
  }

  override render() {
    const entities = linkedEntities(this.value);
    if (!entities.length) return nothing;
    return html`
      ${this.field ? html`<div class="label">${fieldLabel(this.field)}</div>` : nothing}
      ${entities.map(
        (entity) => html`
          <details @toggle=${(e: Event) => this._open(e, entity)}>
            <summary>${this._titles.get(entity.dTag) ?? entity.displayName ?? entity.dTag}</summary>
          </details>
        `
      )}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'np-wiki-entity-view': NpWikiEntityView;
  }
}
