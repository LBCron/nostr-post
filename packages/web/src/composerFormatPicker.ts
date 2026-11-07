import {
  getDefaultPublishFormat,
  getSelectablePublishFormats,
} from '@nostr-post/core/manifestMappings';
import type { NostrPostManifest, PublishFormat } from '@nostr-post/core/types';
import { html } from 'lit';

export const renderPublishFormatPicker = (
  formats: PublishFormat[],
  selectedId: string,
  hide: boolean,
  onChange: (id: string) => void
) => {
  if (hide || formats.length <= 1) return '';

  const selectedFormat = formats.find((f) => f.id === selectedId);

  return html`
    <div class="publish-format-panel np-field">
      <label class="np-label" for="publish-format-select">Publish as</label>
      <select
        id="publish-format-select"
        class="np-input"
        part="input"
        .value=${selectedId}
        @change=${(e: Event) => onChange((e.target as HTMLSelectElement).value)}
      >
        ${formats.map(
          (format: PublishFormat) => html`<option value=${format.id}>${format.label}</option>`
        )}
      </select>
      ${
        selectedFormat?.description
          ? html`<p class="np-hint">${selectedFormat.description}</p>`
          : ''
      }
    </div>
  `;
};

/**
 * The publish format selected when the composer opens: `defaultFormatId` if the manifest has
 * it, else the manifest's default when it's selectable (or the picker is hidden), else the first
 * selectable format
 */
export const initialPublishFormatId = (
  manifest: NostrPostManifest,
  defaultFormatId: string | undefined,
  hideSelector: boolean | undefined
): string => {
  const allFormats = manifest.publishFormats ?? [];
  // If a defaultFormatId is supplied and exists in the manifest, use it
  if (defaultFormatId && allFormats.some((f) => f.id === defaultFormatId)) {
    return defaultFormatId;
  }

  const defaultFormat = getDefaultPublishFormat(manifest);
  if (hideSelector) {
    return defaultFormat?.id ?? '';
  }

  const selectableFormats = getSelectablePublishFormats(manifest);
  if (selectableFormats.length === 0) {
    return defaultFormat?.id ?? '';
  }

  if (defaultFormat && selectableFormats.some((format) => format.id === defaultFormat.id)) {
    return defaultFormat.id;
  }

  return selectableFormats[0]?.id ?? '';
};
