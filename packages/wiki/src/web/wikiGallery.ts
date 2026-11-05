/**
 * <nostr-wiki-gallery>: the photos of everything linked to a wiki entity (`wikiConfig.gallery`),
 * e.g. a venue's photo posts, reviews, events and comments, and its page's own. A grid, newest
 * first; a photo opens large with its description, author, date and a link to its post. With
 * `config.add`, an "Add photo" button opens that manifest's composer with the page filled in:
 * `<nostr-post-composer>` of `@nostr-post/web`, which the app loads (the CDN bundle has it; the
 * wiki package can't depend on it: web depends on the wiki through the venue plugin).
 */

import type { NostrPostManifest } from '@nostr-post/core/types';
import { fetchProfiles } from '@nostr-post/signer';
import { html, LitElement, nothing } from 'lit';
import { customElement, property, query, state } from 'lit/decorators.js';
import {
  fetchGalleryPhotos,
  type GalleryPhoto,
  pageLinkValue,
  type WikiGalleryConfig,
} from '../gallery';
import { DEFAULT_WIKI_RELAYS } from '../nip54';
import { resolveEntityManifest } from '../registry';
import type { WikiEvent } from '../resolver';
import { DEFAULT_WIKI_GALLERY_MESSAGES, type WikiGalleryMessages } from './galleryMessages';
import { renderGrid, renderLightbox } from './galleryParts';
import { galleryStyles } from './galleryStyles';

@customElement('nostr-wiki-gallery')
export class NostrWikiGallery extends LitElement {
  static override styles = galleryStyles;

  /** The entity's d-tag */
  @property({ type: String, attribute: 'entity-id' }) entityId?: string;
  @property({ attribute: false }) config: WikiGalleryConfig = {};
  /** The page shown (its newest version): what "Add photo" links the new post to */
  @property({ attribute: false }) page?: WikiEvent;
  @property({ type: Array }) relays: string[] = DEFAULT_WIKI_RELAYS;
  @property({ attribute: false }) messages?: Partial<WikiGalleryMessages>;

  /** undefined while loading */
  @state() _photos?: GalleryPhoto[];
  @state() _shown = 0;
  @state() _open?: GalleryPhoto;
  @state() _names: ReadonlyMap<string, string> = new Map();
  @state() _composer?: NostrPostManifest | null;
  @query('dialog.lightbox') _lightbox?: HTMLDialogElement;
  @query('dialog.composer') _composerDialog?: HTMLDialogElement;
  _loads = 0;

  get _m(): WikiGalleryMessages {
    return { ...DEFAULT_WIKI_GALLERY_MESSAGES, ...this.messages };
  }

  override updated(changed: Map<string, unknown>): void {
    if (changed.has('entityId') || changed.has('relays') || changed.has('config')) {
      void this._load();
    }
  }

  async _load(): Promise<void> {
    const load = ++this._loads;
    const dTag = this.entityId;
    this._photos = undefined;
    this._shown = this.config.limit ?? 12;
    if (!dTag) return;
    const photos = await fetchGalleryPhotos(dTag, this.config, this.relays).catch(() => []);
    if (load !== this._loads) return;
    this._photos = photos;
    const profiles = await fetchProfiles(photos.map((p) => p.event.pubkey)).catch(() => new Map());
    if (load !== this._loads) return;
    this._names = new Map(
      [...profiles].flatMap(([pubkey, p]) => {
        const name = p?.display_name || p?.name;
        return name ? [[pubkey, name] as [string, string]] : [];
      })
    );
  }

  _openPhoto(photo: GalleryPhoto): void {
    this._open = photo;
    void this.updateComplete.then(() => this._lightbox?.showModal());
  }

  _closePhoto(): void {
    this._lightbox?.close();
    this._open = undefined;
  }

  async _openComposer(): Promise<void> {
    const add = this.config.add;
    if (!add) return;
    this._composer = (await resolveEntityManifest(add.manifest, this.relays)) ?? null;
    await this.updateComplete;
    this._composerDialog?.showModal();
  }

  _published(): void {
    this._composerDialog?.close();
    this._composer = undefined;
    void this._load();
  }

  _renderComposer() {
    const add = this.config.add;
    if (this._composer === undefined || !add) return nothing;
    if (this._composer === null || !customElements.get('nostr-post-composer')) {
      return html`<p class="status">${this._m.noComposer}</p>`;
    }
    const prefill = this.page ? { [add.field]: pageLinkValue(this.page) } : {};
    return html`<nostr-post-composer
      auto-publish
      .manifest=${this._composer}
      .prefill=${prefill}
      @nostr-post-published=${() => this._published()}
    ></nostr-post-composer>`;
  }

  override render() {
    const m = this._m;
    const photos = this._photos;
    return html`
      <div class="head">
        <h3>${this.config.label ?? m.photos}</h3>
        ${
          this.config.add
            ? html`<button type="button" class="add" @click=${() => void this._openComposer()}>
                ${m.addPhoto}
              </button>`
            : nothing
        }
      </div>
      ${photos === undefined ? html`<div class="status">${m.loading}</div>` : nothing}
      ${photos?.length === 0 ? html`<div class="status">${m.empty}</div>` : nothing}
      ${photos?.length ? renderGrid(photos.slice(0, this._shown), this._names, m, (p) => this._openPhoto(p)) : nothing}
      ${
        photos && photos.length > this._shown
          ? html`<button type="button" class="more" @click=${() => {
              this._shown *= 2;
            }}>${m.showMore}</button>`
          : nothing
      }
      <dialog class="lightbox" @close=${() => {
        this._open = undefined;
      }}>
        ${renderLightbox(this._open, this._names, m, () => this._closePhoto())}
      </dialog>
      <dialog class="composer" @close=${() => {
        this._composer = undefined;
      }}>
        <div class="head">
          <h3>${m.addPhoto}</h3>
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
    'nostr-wiki-gallery': NostrWikiGallery;
  }
}
