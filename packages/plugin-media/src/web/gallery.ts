/**
 * <np-media-gallery>: the photos and videos of posts and of what references them, e.g. a
 * calendar event and its comments, or everything linking a wiki page. `.targets` (addresses or
 * event ids) loads the targets and every post referencing them (`fetchReferences`,
 * `@nostr-post/posts`); `.events` gives posts directly (then the targets themselves aren't
 * loaded). A grid, newest first; a photo or video opens large with its description, author,
 * date and a link to its post. With `.addManifest`, an "Add" button opens that manifest's
 * `<nostr-post-composer>` with `.addPrefill` (the app loads `@nostr-post/web`).
 */

import type { NostrPostManifest } from '@nostr-post/core/types';
import { fetchReferences } from '@nostr-post/posts';
import { DEFAULT_RELAYS, fetchProfiles } from '@nostr-post/signer';
import { html, LitElement, nothing } from 'lit';
import { customElement, property, query, state } from 'lit/decorators.js';
import { type MediaItem, type MediaSource, mediaOfEvents } from '../eventMedia';
import { DEFAULT_MEDIA_GALLERY_MESSAGES, type MediaGalleryMessages } from './galleryMessages';
import { renderGrid, renderLarge } from './galleryParts';
import { galleryStyles } from './galleryStyles';

@customElement('np-media-gallery')
export class NpMediaGallery extends LitElement {
  static override styles = galleryStyles;

  /** Addresses (`kind:pubkey:d-tag`) or event ids: these and the posts referencing them */
  @property({ type: Array }) targets: string[] = [];
  /** Posts shown besides (first); with them, the targets themselves aren't loaded */
  @property({ attribute: false }) events?: MediaSource[];
  /** Only posts of these kinds reference the targets; default any kind */
  @property({ type: Array }) kinds?: number[];
  /** Posts of these kinds don't count, e.g. other wiki pages linking a page */
  @property({ type: Array, attribute: 'exclude-kinds' }) excludeKinds?: number[];
  /** Shown at first (default 12); "Show more" shows more */
  @property({ type: Number }) limit = 12;
  /** Heading; default the messages' `heading` */
  @property() label?: string;
  @property({ type: Array }) relays: string[] = DEFAULT_RELAYS;
  /** "Add": the composer of this manifest, filled with `addPrefill` */
  @property({ attribute: false }) addManifest?: NostrPostManifest;
  @property({ attribute: false }) addPrefill?: Record<string, unknown>;
  @property({ attribute: false }) messages?: Partial<MediaGalleryMessages>;

  /** undefined while loading */
  @state() _items?: MediaItem[];
  @state() _shown = 12;
  @state() _open?: MediaItem;
  @state() _adding = false;
  @state() _names: ReadonlyMap<string, string> = new Map();
  @query('dialog.large-view') _largeView?: HTMLDialogElement;
  @query('dialog.composer') _composerDialog?: HTMLDialogElement;
  _loads = 0;

  get _m(): MediaGalleryMessages {
    return { ...DEFAULT_MEDIA_GALLERY_MESSAGES, ...this.messages };
  }

  override updated(changed: Map<string, unknown>): void {
    const inputs = ['targets', 'events', 'kinds', 'excludeKinds', 'relays'];
    if (inputs.some((name) => changed.has(name))) void this._load();
  }

  async _load(): Promise<void> {
    const load = ++this._loads;
    this._items = undefined;
    this._shown = this.limit;
    const given = this.events ?? [];
    const { targets, posts } = await fetchReferences(this.targets, {
      kinds: this.kinds,
      relays: this.relays,
      loadTargets: this.events === undefined,
    }).catch(() => ({ targets: [], posts: [] }));
    if (load !== this._loads) return;
    const excluded = new Set(this.excludeKinds ?? []);
    const others = posts.filter((e) => !excluded.has(e.kind));
    // The targets' own media first (e.g. a page's photo, an event's poster), then the posts'
    const items = mediaOfEvents([...given, ...targets]);
    const seen = new Set(items.map((i) => i.sha256 ?? i.url));
    this._items = [...items, ...mediaOfEvents(others).filter((i) => !seen.has(i.sha256 ?? i.url))];
    const profiles = await fetchProfiles(this._items.map((i) => i.event.pubkey)).catch(
      () => new Map()
    );
    if (load !== this._loads) return;
    this._names = new Map(
      [...profiles].flatMap(([pubkey, p]) => {
        const name = p?.display_name || p?.name;
        return name ? [[pubkey, name] as [string, string]] : [];
      })
    );
  }

  _openItem(item: MediaItem): void {
    this._open = item;
    void this.updateComplete.then(() => this._largeView?.showModal());
  }

  _closeItem(): void {
    this._largeView?.close();
    this._open = undefined;
  }

  async _openComposer(): Promise<void> {
    this._adding = true;
    await this.updateComplete;
    this._composerDialog?.showModal();
  }

  _published(): void {
    this._composerDialog?.close();
    this._adding = false;
    void this._load();
  }

  _renderComposer() {
    if (!this._adding) return nothing;
    if (!this.addManifest || !customElements.get('nostr-post-composer')) {
      return html`<p class="status">${this._m.noComposer}</p>`;
    }
    return html`<nostr-post-composer
      auto-publish
      .manifest=${this.addManifest}
      .prefill=${this.addPrefill ?? {}}
      @nostr-post-published=${() => this._published()}
    ></nostr-post-composer>`;
  }

  override render() {
    const m = this._m;
    const items = this._items;
    return html`
      <div class="head">
        <h3>${this.label ?? m.heading}</h3>
        ${
          this.addManifest
            ? html`<button type="button" class="add" @click=${() => void this._openComposer()}>
                ${m.add}
              </button>`
            : nothing
        }
      </div>
      ${items === undefined ? html`<div class="status">${m.loading}</div>` : nothing}
      ${items?.length === 0 ? html`<div class="status">${m.empty}</div>` : nothing}
      ${items?.length ? renderGrid(items.slice(0, this._shown), this._names, m, (i) => this._openItem(i)) : nothing}
      ${
        items && items.length > this._shown
          ? html`<button type="button" class="more" @click=${() => {
              this._shown *= 2;
            }}>${m.showMore}</button>`
          : nothing
      }
      <dialog class="large-view" @close=${() => {
        this._open = undefined;
      }}>
        ${renderLarge(this._open, this._names, m, () => this._closeItem())}
      </dialog>
      <dialog class="composer" @close=${() => {
        this._adding = false;
      }}>
        <div class="head">
          <h3>${m.add}</h3>
          <button type="button" class="close" @click=${() => this._composerDialog?.close()}>
            ${m.close}
          </button>
        </div>
        ${this._renderComposer()}
      </dialog>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'np-media-gallery': NpMediaGallery;
  }
}
