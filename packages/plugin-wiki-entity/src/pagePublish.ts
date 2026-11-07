/**
 * @nostr-post/plugin-wiki-entity - <np-wiki-entity-publish>: next to the publish button
 * (publishSummaryTagName), a checkbox per picked entity without a page: create its page when the
 * post is published (`createPage`, see `createEntityPage`). Ticked for entities with links; one
 * known only by its name is left for the user to tick. Pages found automatically and not checked
 * yet are listed too (`match`), to check in the picker's preview.
 */

import type { PostField } from '@nostr-post/plugins/types';
import { NpElement, npStyles } from '@nostr-post/ui/web';
import { css, html, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { pickedEntities, type WikiEntityData } from './core';
import { isUnconfirmed } from './entityMatch';
import { createsPage } from './entityPage';
import {
  DEFAULT_WIKI_ENTITY_PICKER_MESSAGES,
  type WikiEntityPickerMessages,
} from './pickerMessages';

@customElement('np-wiki-entity-publish')
export class NpWikiEntityPublish extends NpElement {
  static override styles = [
    ...npStyles,
    css`
    :host { display: block; margin: 0.75rem 0; font-size: var(--np-text-md); }
    .pages {
      gap: 0;
    }
    label { display: flex; align-items: center; gap: 0.4rem; font-weight: 500; }
    .hint { margin: 0.15rem 0 0.5rem 1.4rem; color: var(--np-color-on-surface-variant); }
    .check { margin-bottom: 0.4rem; color: var(--np-color-warning); }

  `,
  ];

  /** The picker's value: one entity, or a list (`metadata.multiple`) */
  @property({ attribute: false }) value: WikiEntityData | WikiEntityData[] | null = null;
  @property({ attribute: false }) field: PostField | null = null;
  /** Overrides for the user-facing text */
  @property({ attribute: false }) messages?: Partial<WikiEntityPickerMessages>;

  private _toggle(entity: WikiEntityData, createPage: boolean): void {
    const update = (e: WikiEntityData) => (e === entity ? { ...e, createPage } : e);
    const value = Array.isArray(this.value) ? this.value.map(update) : update(entity);
    this.dispatchEvent(
      new CustomEvent('np-value-changed', { detail: { value }, bubbles: true, composed: true })
    );
  }

  override render() {
    const m = { ...DEFAULT_WIKI_ENTITY_PICKER_MESSAGES, ...this.messages };
    const picked = pickedEntities(this.value);
    const withoutPage = picked.filter((e) => e.unlinked && e.displayName);
    const unconfirmed = picked.filter(isUnconfirmed);
    if (!withoutPage.length && !unconfirmed.length) return nothing;
    return html`<div class="pages np-card" part="card">
      ${unconfirmed.map(
        (entity) =>
          html`<div class="check">${m.checkFound(entity.displayName ?? entity.dTag)}</div>`
      )}
      ${withoutPage.map(
        (entity) => html`<label>
            <input
              type="checkbox"
              .checked=${createsPage(entity)}
              @change=${(e: Event) => this._toggle(entity, (e.target as HTMLInputElement).checked)}
            />
            ${m.createOnPublish(entity.displayName ?? '')}
          </label>
          ${entity.externalIds.length ? nothing : html`<div class="hint">${m.nameOnly}</div>`}`
      )}
    </div>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'np-wiki-entity-publish': NpWikiEntityPublish;
  }
}
