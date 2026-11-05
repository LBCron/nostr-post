/**
 * @nostr-post/web - <nostr-post-sections>
 *
 * A page's sections (`sections` of its manifest, `PostSection`): for each, the posts referencing
 * the page or event that match it (`fetchSection`, `@nostr-post/posts`), shown by its view
 * (`list` here; `gallery`, `agenda`… registered by other packages, `registerSectionView`), with
 * stats and an optional "Add" composer linking the page. Wiki pages and calendar events' pages
 * show their manifest's sections with it.
 */

import type { NostrPostManifest, PostSection } from '@nostr-post/core/types';
import { entityManifests } from '@nostr-post/plugins/entities';
import { fetchSection, type SectionTarget, sectionStats } from '@nostr-post/posts';
import {
  DEFAULT_RELAYS,
  fetchManifestByATag,
  fetchProfiles,
  type SignedEvent,
} from '@nostr-post/signer';
import { html, LitElement, nothing } from 'lit';
import { customElement, property, query, state } from 'lit/decorators.js';
import './composer';
import { DEFAULT_SECTIONS_MESSAGES, type SectionsMessages } from './sectionsMessages';
import { addPrefill, renderList, renderStats, renderView } from './sectionsParts';
import { sectionsStyles } from './sectionsStyles';

/** A manifest by reference: the manifest, a `30078:` address, or an id the wiki package knows */
const resolveManifest = async (
  ref: string | NostrPostManifest,
  relays: string[]
): Promise<NostrPostManifest | undefined> => {
  if (typeof ref === 'object') return ref;
  if (ref.startsWith('30078:')) {
    return (await fetchManifestByATag(ref, relays).catch(() => undefined))?.manifest;
  }
  return entityManifests()?.resolve(ref);
};

@customElement('nostr-post-sections')
export class NostrPostSections extends LitElement {
  static override styles = sectionsStyles;

  @property({ attribute: false }) sections: PostSection[] = [];
  /** What the sections reference: the page's or event's addresses (every version), ids, links */
  @property({ attribute: false }) target: SectionTarget = { addresses: [], ids: [], links: [] };
  /** The page's or event's own events, if loaded (for sections with `self`) */
  @property({ attribute: false }) self?: SignedEvent[];
  /** The value linking the page, for an "Add" composer's field (e.g. a wiki page's) */
  @property({ attribute: false }) linkValue?: unknown;
  /** A page's own rule for its items, e.g. the wiki's roles */
  @property({ attribute: false }) itemFilter?: (
    event: SignedEvent,
    section: PostSection
  ) => boolean;
  @property({ type: Array }) relays: string[] = DEFAULT_RELAYS;
  @property({ attribute: false }) messages?: Partial<SectionsMessages>;

  /** Items per section; undefined while loading */
  @state() _items: (SignedEvent[] | undefined)[] = [];
  @state() _shown: number[] = [];
  @state() _names: ReadonlyMap<string, string> = new Map();
  /** The section whose "Add" composer is open, and its manifest (null: not found) */
  @state() _adding?: { index: number; manifest: NostrPostManifest | null };
  @query('dialog') _dialog?: HTMLDialogElement;
  _loadedFor = '';

  get _m(): SectionsMessages {
    return { ...DEFAULT_SECTIONS_MESSAGES, ...this.messages };
  }

  override willUpdate(changed: Map<string, unknown>): void {
    if (!['sections', 'target', 'self', 'relays'].some((name) => changed.has(name))) return;
    const key = JSON.stringify([
      this.sections,
      this.target,
      this.self?.map((e) => e.id),
      this.relays,
    ]);
    if (key === this._loadedFor) return;
    this._loadedFor = key;
    this._items = [];
    this._shown = this.sections.map((s) => s.limit ?? 20);
    this.sections.forEach((_, i) => void this._load(i));
  }

  async _load(index: number): Promise<void> {
    const section = this.sections[index];
    const key = this._loadedFor;
    if (!section) return;
    const items = await fetchSection(section, this.target, {
      relays: this.relays,
      self: this.self,
      matches: this.itemFilter,
    }).catch(() => []);
    if (key !== this._loadedFor) return;
    const next = [...this._items];
    next[index] = items;
    this._items = next;
    void this._loadNames(items);
  }

  async _loadNames(items: SignedEvent[]): Promise<void> {
    const missing = items.map((e) => e.pubkey).filter((p) => !this._names.has(p));
    if (missing.length === 0) return;
    const profiles = await fetchProfiles(missing).catch(() => new Map());
    const names = new Map(this._names);
    for (const [pubkey, profile] of profiles) {
      const name = profile?.display_name || profile?.name;
      if (name) names.set(pubkey, name);
    }
    this._names = names;
  }

  async _openAdd(index: number): Promise<void> {
    const ref = this.sections[index]?.add?.manifest;
    if (!ref) return;
    const manifest = (await resolveManifest(ref, this.relays)) ?? null;
    this._adding = { index, manifest };
    await this.updateComplete;
    this._dialog?.showModal();
  }

  _published(index: number): void {
    this._dialog?.close();
    this._adding = undefined;
    void this._load(index);
  }

  _renderComposer() {
    const adding = this._adding;
    const section = adding ? this.sections[adding.index] : undefined;
    if (!adding || !section) return nothing;
    if (!adding.manifest) return html`<p class="status">${this._m.noComposer}</p>`;
    return html`<nostr-post-composer
      auto-publish
      .manifest=${adding.manifest}
      .prefill=${addPrefill(section, adding.manifest, this.linkValue)}
      @nostr-post-published=${() => this._published(adding.index)}
    ></nostr-post-composer>`;
  }

  _renderSection(section: PostSection, index: number) {
    const m = this._m;
    const items = this._items[index];
    const shown = this._shown[index] ?? 20;
    const stats = items && section.stats ? sectionStats(items, section.stats.tag) : undefined;
    const list = () => html`
      ${renderList((items ?? []).slice(0, shown), this._names, m)}
      ${
        items && items.length > shown
          ? html`<button type="button" class="more" @click=${() => {
              this._shown = this._shown.map((n, i) => (i === index ? n * 2 : n));
            }}>${m.showMore}</button>`
          : nothing
      }
    `;
    return html`<section>
      <div class="head">
        <h3>${section.label}</h3>
        ${
          section.add
            ? html`<button type="button" class="add" @click=${() => void this._openAdd(index)}>
                ${m.add(section.label)}
              </button>`
            : nothing
        }
      </div>
      ${items === undefined ? html`<div class="status">${m.loading}</div>` : nothing}
      ${items?.length === 0 ? html`<div class="status">${m.empty}</div>` : nothing}
      ${renderStats(section, stats, m)}
      ${items?.length ? renderView(section, items, this.relays, list) : nothing}
    </section>`;
  }

  override render() {
    const m = this._m;
    const adding = this._adding ? this.sections[this._adding.index] : undefined;
    return html`
      ${this.sections.map((section, i) => this._renderSection(section, i))}
      <dialog @close=${() => {
        this._adding = undefined;
      }}>
        <div class="head">
          <h3>${adding ? `${m.add(adding.label)}: ${adding.label}` : ''}</h3>
          <button type="button" class="close" @click=${() => this._dialog?.close()}>${m.close}</button>
        </div>
        ${this._renderComposer()}
      </dialog>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'nostr-post-sections': NostrPostSections;
  }
}
