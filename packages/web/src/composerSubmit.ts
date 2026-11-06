/**
 * <nostr-post-composer>'s submit area and plugins' publish summaries. The publishing itself is
 * `@nostr-post/posts` (validateAndCoordinate, publishWithHooks, …).
 */

import type { NostrPostManifest } from '@nostr-post/core/types';
import { publishSummaries } from '@nostr-post/plugins/publish';
import type { PublishWithHooksResult } from '@nostr-post/posts';
import { html, type TemplateResult } from 'lit';
import { html as staticHtml, unsafeStatic } from 'lit/static-html.js';
import type { ComposerMessages } from './composerMessages';

// ---------------------------------------------------------------------------
// Plugin beforePublish hooks
// ---------------------------------------------------------------------------

/**
 * Plugins' publish summaries (publishSummaryTagName), shown next to the publish
 * button: what their beforePublish hooks will publish, for the user to confirm.
 */
export const renderPublishSummaries = (
  manifest: NostrPostManifest,
  formData: Record<string, unknown>,
  onFieldChange: (fieldId: string, value: unknown) => void
): TemplateResult[] =>
  publishSummaries(manifest, formData).map(({ field, value, tagName }) => {
    const tag = unsafeStatic(tagName);
    return staticHtml`<${tag}
      .value=${value}
      .field=${field}
      @np-value-changed=${(e: CustomEvent) => onFieldChange(field.id, e.detail.value)}
    ></${tag}>`;
  });

/** What the composer says after publishing: success, and after-publish steps that failed */
export const publishedNotice = (
  published: PublishWithHooksResult,
  m: ComposerMessages
): { success: string; error?: string } => ({
  success: published.events.length ? m.published(published.events.length) : m.doneWithoutPost,
  error: published.afterPublishErrors.length
    ? m.afterPublishFailed(published.afterPublishErrors.map((e) => e.message))
    : undefined,
});

export interface SubmitAreaState {
  isSubmitting: boolean;
  isResolvingManifestRef: boolean;
  /** What's running while submitting, e.g. messages.stepHooks */
  step?: string;
  /** Why the last submit failed */
  error?: string;
  /** Labels of fields that failed validation */
  invalidFields: string[];
  messages: ComposerMessages;
  /** Set with the composer's `drafts`: saves the form as a draft */
  onSaveDraft?: () => void;
}

/** The submit button with the running step, the last error and invalid fields next to it */
export const renderSubmitArea = (state: SubmitAreaState) => {
  const m = state.messages;
  let label = m.submit;
  if (state.isSubmitting) label = m.submitting;
  else if (state.isResolvingManifestRef) label = m.loadingManifest;
  return html`
    <div class="composer-actions">
      <button
        type="submit"
        class="primary"
        ?disabled=${state.isSubmitting || state.isResolvingManifestRef}
      >
        ${label}
      </button>
      ${
        state.onSaveDraft
          ? html`<button
              type="button"
              class="secondary"
              ?disabled=${state.isSubmitting}
              @click=${state.onSaveDraft}
            >
              ${m.saveDraft}
            </button>`
          : ''
      }
      ${state.isSubmitting && state.step ? html`<span class="submit-step">${state.step}</span>` : ''}
    </div>
    ${
      state.invalidFields.length > 0
        ? html`<div class="submit-error" role="alert">
            ${m.invalidFields} ${state.invalidFields.join(', ')}
          </div>`
        : ''
    }
    ${state.error ? html`<div class="submit-error" role="alert">${state.error}</div>` : ''}
  `;
};
