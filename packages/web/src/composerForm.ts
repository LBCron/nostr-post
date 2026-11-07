/** The composer's hidden-field errors (the form logic is `@nostr-post/posts`' formData) */

import type { NostrPostManifest } from '@nostr-post/core/types';
import { hiddenFieldErrorEntries } from '@nostr-post/posts';
import { html } from 'lit';

export const renderHiddenFieldErrors = (
  manifest: NostrPostManifest,
  errors: Record<string, string>,
  excludeFields: string[] | undefined,
  prefill: Record<string, unknown> | undefined
) => {
  const hiddenErrors = hiddenFieldErrorEntries({ manifest, errors, excludeFields, prefill });
  if (hiddenErrors.length === 0) return '';

  return html`
    <div class="hidden-field-errors np-message np-error" part="error" role="alert" aria-live="polite">
      <div class="hidden-field-errors-title">Some hidden fields failed validation:</div>
      <ul>
        ${hiddenErrors.map(
          ([fieldId, message]) => html`<li><strong>${fieldId}</strong>: ${message}</li>`
        )}
      </ul>
    </div>
  `;
};
