/**
 * @nostr-post/plugin-media - <np-media-input>
 *
 * Multi-file media upload / URL input with drag & drop, gallery, and preview.
 * Uploads files to nostr.build (free Nostr media hosting), photos shrunk on the device to
 * the quality the user picks (remembered for next time).
 *
 * Accepts .value (string[]) and .field (PostField).
 * Dispatches 'np-value-changed' with { detail: { value: string[] } }.
 */

import { startActivity } from '@nostr-post/plugins/activity';
import type { PostField } from '@nostr-post/plugins/types';
import { html, LitElement, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import {
  isImageUrl,
  isMediaQuality,
  isVideoUrl,
  MEDIA_QUALITIES,
  type MediaPluginConfig,
  toArray,
} from '../core';
import { compressImage, rememberQuality } from './compress';
import { mediaInputStyles } from './inputStyles';
import { formatBytes, type MediaMessages, mediaMessages } from './mediaMessages';
import { DEFAULT_MAX_SIZE, NOSTR_BUILD_UPLOAD, uploadQuality, uploadWithProgress } from './upload';

@customElement('np-media-input')
export class NpMediaInput extends LitElement {
  static override styles = mediaInputStyles;

  @property({ type: Array })
  value: string[] = [];

  @property({ type: Object })
  field: PostField | null = null;

  @property({ type: Object })
  messages: Partial<MediaMessages> = {};

  @state() private _dragover = false;
  /** What's uploading now, e.g. "Uploading a.jpg (1/3)", with the sizes */
  @state() private _uploading = '';
  @state() private _uploadDetail = '';
  @state() private _uploadProgress = 0;
  @state() private _uploadError = '';
  @state() private _urlInput = '';
  /** The quality picked here, until then the remembered one */
  @state() private _quality = '';

  private get _m(): MediaMessages {
    return mediaMessages(this.messages);
  }

  private get _config(): MediaPluginConfig {
    return (this.field?.metadata as MediaPluginConfig) || {};
  }

  private get _accept(): string {
    return this._config.accept?.join(',') ?? 'image/*,video/*';
  }

  private get _maxSize(): number {
    return this._config.maxSize ?? DEFAULT_MAX_SIZE;
  }

  private get _maxMb(): number {
    return Math.round(this._maxSize / (1024 * 1024));
  }

  private get _maxFiles(): number {
    return this._config.maxFiles ?? 10;
  }

  private get _urls(): string[] {
    return toArray(this.value);
  }

  private _emitValue(urls: string[]) {
    this.value = urls;
    this.dispatchEvent(
      new CustomEvent('np-value-changed', {
        detail: { value: urls },
        bubbles: true,
        composed: true,
      })
    );
  }

  private _addUrl(url: string) {
    if (this._urls.length >= this._maxFiles) return;
    this._emitValue([...this._urls, url]);
  }

  private _removeUrl(index: number) {
    this._emitValue(this._urls.filter((_, i) => i !== index));
  }

  // --- Drag & Drop ---

  private _handleDragOver(e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    this._dragover = true;
  }

  private _handleDragLeave(e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    this._dragover = false;
  }

  private _handleDrop(e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    this._dragover = false;
    if (e.dataTransfer?.files) void this._uploadFiles(Array.from(e.dataTransfer.files));
  }

  private _openFilePicker() {
    (this.shadowRoot?.querySelector('.file-input') as HTMLInputElement)?.click();
  }

  private _handleFileSelected(e: Event) {
    const input = e.target as HTMLInputElement;
    if (input.files) {
      void this._uploadFiles(Array.from(input.files));
      input.value = '';
    }
  }

  // --- Upload ---

  private _pickQuality(value: string) {
    if (!isMediaQuality(value)) return;
    this._quality = value;
    rememberQuality(value);
  }

  /** One after another, so each gets the whole connection and the order is kept */
  private async _uploadFiles(files: File[]) {
    const batch = files.slice(0, this._maxFiles - this._urls.length);
    this._uploadError = '';
    for (const [index, file] of batch.entries()) {
      const count = batch.length > 1 ? ` (${index + 1}/${batch.length})` : '';
      await this._uploadFile(file, count);
    }
    this._uploading = '';
  }

  private async _uploadFile(file: File, count: string) {
    const m = this._m;
    this._uploading = `${m.preparing(file.name)}${count}`;
    this._uploadDetail = '';
    this._uploadProgress = 0;
    // Shown here, not in <np-activity>; the composer waits for it before publishing
    const activity = startActivity(m.uploading(file.name), { blocksPublish: true, hidden: true });
    try {
      const quality = isMediaQuality(this._quality) ? this._quality : uploadQuality(this._config);
      const upload = await compressImage(file, quality);
      if (upload.size > this._maxSize) throw new Error(m.tooLarge(this._maxMb));
      this._uploading = `${m.uploading(file.name)}${count}`;
      this._uploadDetail = m.sizes(formatBytes(file.size), formatBytes(upload.size));
      const url = await uploadWithProgress(upload, this._config.uploadUrl, (fraction) => {
        this._uploadProgress = Math.round(fraction * 100);
      });
      this._addUrl(url);
      activity.done();
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      this._uploadError = `${m.uploadFailed(file.name)}: ${reason}`;
      activity.fail(this._uploadError);
    }
  }

  // --- URL input ---

  private _handleUrlKeypress(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault();
      this._applyUrl();
    }
  }

  private _applyUrl() {
    const url = this._urlInput.trim();
    if (url) {
      this._addUrl(url);
      this._urlInput = '';
    }
  }

  override render() {
    const m = this._m;
    const showUpload = this._config.allowUpload !== false;
    const showUrl = this._config.allowUrl !== false;
    const canAddMore = this._urls.length < this._maxFiles;

    return html`
      <div class="container">
        ${this._urls.length > 0 ? this._renderGallery() : nothing}
        ${canAddMore && showUpload ? this._renderDropZone() : nothing}
        ${canAddMore && showUpload && this._config.qualityChoice !== false ? this._renderQuality() : nothing}
        ${
          canAddMore && showUpload && showUrl
            ? html`<div class="url-row"><span class="separator">${m.or}</span></div>`
            : nothing
        }
        ${
          canAddMore && showUrl
            ? html`
              <div class="url-row">
                <input
                  class="url-input"
                  type="url"
                  placeholder=${m.urlPlaceholder}
                  .value=${this._urlInput}
                  @input=${(e: Event) => {
                    this._urlInput = (e.target as HTMLInputElement).value;
                  }}
                  @keypress=${this._handleUrlKeypress}
                />
              </div>
            `
            : nothing
        }
        ${
          this._uploading
            ? html`
              <div class="progress-bar">
                <div class="progress-fill" style="width: ${this._uploadProgress}%"></div>
              </div>
              <div class="upload-status" role="status">
                ${this._uploading} ${this._uploadProgress}%
                ${this._uploadDetail ? html`· ${this._uploadDetail}` : nothing}
              </div>
            `
            : nothing
        }
        ${this._uploadError ? html`<div class="error">${this._uploadError}</div>` : nothing}

        <div class="hint">${m.fileCount(this._urls.length, this._maxFiles)}</div>
      </div>
    `;
  }

  private _renderQuality() {
    const m = this._m;
    const selected = isMediaQuality(this._quality) ? this._quality : uploadQuality(this._config);
    return html`
      <label class="quality">
        ${m.quality}
        <select
          ?disabled=${this._uploading !== ''}
          @change=${(e: Event) => this._pickQuality((e.target as HTMLSelectElement).value)}
        >
          ${MEDIA_QUALITIES.map(
            (q) =>
              html`<option value=${q} ?selected=${q === selected}>${m.qualityLevels[q]}</option>`
          )}
        </select>
      </label>
    `;
  }

  private _renderGallery() {
    const m = this._m;
    return html`
      <div class="gallery">
        ${this._urls.map(
          (url, i) => html`
            <div class="gallery-card">
              ${
                isImageUrl(url)
                  ? html`<img src=${url} alt="Media ${i + 1}" />`
                  : isVideoUrl(url)
                    ? html`
                      <video src=${url} muted></video>
                      <span class="badge">▶</span>
                    `
                    : html`<div class="placeholder">
                      ${url.length > 30 ? `${url.slice(0, 27)}…` : url}
                    </div>`
              }
              <button
                type="button"
                class="remove-btn"
                title=${m.remove}
                aria-label=${m.remove}
                @click=${() => this._removeUrl(i)}
              >
                ×
              </button>
            </div>
          `
        )}
      </div>
    `;
  }

  private _renderDropZone() {
    const m = this._m;
    const host = new URL(this._config.uploadUrl ?? NOSTR_BUILD_UPLOAD).host;
    return html`
      <div
        class="drop-zone ${this._dragover ? 'dragover' : ''} ${this._uploading ? 'uploading' : ''}"
        @dragover=${this._handleDragOver}
        @dragleave=${this._handleDragLeave}
        @drop=${this._handleDrop}
        @click=${this._openFilePicker}
      >
        <div class="drop-icon">📷</div>
        <p class="drop-text">${m.dropFiles}</p>
        <p class="drop-hint">${m.dropHint(host, this._maxMb)}</p>
        <input
          class="file-input"
          type="file"
          accept=${this._accept}
          multiple
          @change=${this._handleFileSelected}
        />
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'np-media-input': NpMediaInput;
  }
}
