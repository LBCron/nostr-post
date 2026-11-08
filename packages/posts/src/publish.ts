/**
 * @nostr-post/posts - Publishing a post made with a manifest: validation (also by the fields'
 * plugins), building its events, publish hooks (e.g. a venue's wiki page), signing and sending
 * the bundle, and the plugins' after-publish steps
 */

import { coordinateEvents } from '@nostr-post/core/coordinator';
import { prepareFormData } from '@nostr-post/core/enrichment';
import { fieldLabel, validateManifest } from '@nostr-post/core/manifest';
import { getActiveKinds, getFieldTargets } from '@nostr-post/core/manifestMappings';
import type {
  EventBundle,
  FormData as NostrFormData,
  NostrPostManifest,
} from '@nostr-post/core/types';
import { publishBlockers, waitForPublishBlockers } from '@nostr-post/plugins/activity';
import { runAfterPublish, runPublishHooks } from '@nostr-post/plugins/publish';
import { pluginRegistry } from '@nostr-post/plugins/registry';
import { requestSignIn } from '@nostr-post/plugins/signIn';
import {
  getPublicKey,
  isSignerTimeout,
  type SignedEvent,
  signAndPublish,
} from '@nostr-post/signer';
import { parseExtraTags } from './formData';
import type { PublishMessages } from './publishMessages';
import { getUserRelays } from './relays';
import { applyReplyTargetToBundle } from './replies';

// ---------------------------------------------------------------------------
// Addressable-event helpers
// ---------------------------------------------------------------------------

export const isAddressableKind = (kind: number): boolean => kind >= 30000 && kind < 40000;

export const buildGeneratedDTag = (manifestId: string): string => {
  const uuid =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  return `nostr-post:${manifestId}:${uuid}`;
};

export const resolveAddressableDTag = (
  manifest: NostrPostManifest,
  selectedFormatId: string,
  existingDTag: string | undefined
): string | undefined => {
  const activeKinds = getActiveKinds(manifest, {
    selectedFormatId: selectedFormatId || undefined,
  });
  return activeKinds.some(isAddressableKind)
    ? (existingDTag ?? buildGeneratedDTag(manifest.id))
    : undefined;
};

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

export interface ManifestValidationError {
  type: 'manifest';
  message: string;
}

export interface FieldValidationErrors {
  type: 'fields';
  errors: Record<string, string>;
}

export type ValidationResult = ManifestValidationError | FieldValidationErrors | null;

/**
 * Plugins' own checks (their `validate` hook) of the fields that have a value, e.g. a date's
 * end not before its start. Each field is checked as written for the selected format: its
 * `mapTo` narrowed to the active kinds. Returns errors by field id.
 */
export const validateWithPlugins = (
  manifest: NostrPostManifest,
  formData: Record<string, unknown>,
  selectedFormatId?: string
): Record<string, string> => {
  const activeKinds = getActiveKinds(manifest, { selectedFormatId: selectedFormatId || undefined });
  const errors: Record<string, string> = {};
  for (const field of manifest.fields) {
    const value = formData[field.id];
    const validate = pluginRegistry.get(field.uiPlugin)?.validate;
    if (value === undefined || !validate) continue;
    const activeTargets = getFieldTargets(field).filter((t) => activeKinds.includes(t.kind));
    const result = validate(
      value,
      activeTargets.length > 0 ? { ...field, mapTo: activeTargets } : field
    );
    if (!result.success) errors[field.id] = result.error.message;
  }
  return errors;
};

export const validateAndCoordinate = (
  manifest: NostrPostManifest,
  formData: NostrFormData,
  opts: {
    pubkey: string;
    selectedFormatId: string;
    manifestRef?: string;
    dTag?: string;
    extraTags?: string;
    replyToEventId?: string;
    replyToPubkey?: string;
    rootEventId?: string;
    rootPubkey?: string;
    rootAddress?: string;
  }
):
  | { bundle: EventBundle; addressableDTag: string | undefined }
  | { validationError: ValidationResult } => {
  const manifestValidation = validateManifest(manifest);
  if (!manifestValidation.success) {
    const message = manifestValidation.error.map((e) => `${e.field}: ${e.message}`).join(', ');
    return { validationError: { type: 'manifest', message: `Invalid manifest: ${message}` } };
  }

  const enrichedData = prepareFormData(manifest, formData, (pluginId) =>
    pluginRegistry.get(pluginId)
  );

  const pluginErrors = validateWithPlugins(manifest, enrichedData, opts.selectedFormatId);
  if (Object.keys(pluginErrors).length > 0) {
    return { validationError: { type: 'fields', errors: pluginErrors } };
  }

  const addressableDTag = resolveAddressableDTag(manifest, opts.selectedFormatId, opts.dTag);

  const result = coordinateEvents(manifest, enrichedData as NostrFormData, {
    pubkey: opts.pubkey,
    createdAt: Math.floor(Date.now() / 1000),
    selectedFormatId: opts.selectedFormatId || undefined,
    manifestRef: opts.manifestRef,
    dTag: addressableDTag,
    tagSerializer: (value, field) => {
      const plugin = field.uiPlugin ? pluginRegistry.get(field.uiPlugin) : undefined;
      return plugin?.serializeValue?.(value, field);
    },
    extraTagsFn: (value, field) => {
      const plugin = field.uiPlugin ? pluginRegistry.get(field.uiPlugin) : undefined;
      return plugin?.extraTags?.(value, field);
    },
  });

  if (!result.success) {
    const errors: Record<string, string> = {};
    for (const err of result.error) {
      errors[err.field] = err.message;
    }
    return { validationError: { type: 'fields', errors } };
  }

  let bundle = applyReplyTargetToBundle(result.data, {
    replyToEventId: opts.replyToEventId,
    replyToPubkey: opts.replyToPubkey,
    rootEventId: opts.rootEventId,
    rootPubkey: opts.rootPubkey,
    rootAddress: opts.rootAddress,
  });

  const parsedExtraTags = parseExtraTags(opts.extraTags);
  if (parsedExtraTags.length > 0) {
    bundle = {
      ...bundle,
      events: bundle.events.map((event) => ({
        ...event,
        tags: [...event.tags, ...parsedExtraTags],
      })),
    };
  }

  return { bundle, addressableDTag };
};

/** Detail of the composer's `nostr-post-submit` event (when it doesn't publish itself) */
export interface NostrPostSubmitDetail {
  bundle: EventBundle;
  dTag?: string;
  formData: Record<string, unknown>;
  manifest: NostrPostManifest;
}

/** Add tags to every event of a bundle */
/** Tags added to every event of the bundle, skipping ones an event already has */
export const withTags = (bundle: EventBundle, tags: [string, ...string[]][]): EventBundle => {
  if (tags.length === 0) return bundle;
  const key = (t: string[]) => t.join('\u0000');
  return {
    ...bundle,
    events: bundle.events.map((event) => {
      const existing = new Set(event.tags.map(key));
      return { ...event, tags: [...event.tags, ...tags.filter((t) => !existing.has(key(t)))] };
    }),
  };
};

// ---------------------------------------------------------------------------
// Sign-and-publish bundle
// ---------------------------------------------------------------------------

/**
 * Who publishes: the composer's `pubkey`, else (auto-publish) the signer's. Undefined when no one
 * is signed in; the app is then asked to sign the user in (`requestSignIn`). Throws when the
 * signer didn't answer in time (`isSignerTimeout`), with what to do
 */
export const signedInPubkey = async (
  pubkey: string | undefined,
  autoPublish: boolean
): Promise<string | undefined> => {
  const signer =
    !pubkey && autoPublish
      ? await getPublicKey().catch((error: unknown) => {
          if (isSignerTimeout(error)) throw error;
          return undefined;
        })
      : undefined;
  const result = pubkey ?? signer;
  if (!result) requestSignIn('publish');
  return result;
};

type BundleEvent = EventBundle['events'][number];

/** A bundle's events in signing order: a note (kind 1) first, so the others can link to it */
export const bundleSigningOrder = (events: readonly BundleEvent[]): BundleEvent[] =>
  [...events].sort((a, b) => Number(b.kind === 1) - Number(a.kind === 1));

/**
 * An event of a bundle (e.g. the kind-30078 copy of a note) linked to the bundle's first event:
 * `["e", <id>]` without a NIP-10 marker, and never on a note, so no client shows it as a reply.
 * `<nostr-post-view>` finds an event's copies by it (`#e`)
 */
export const linkToPrimary = (event: BundleEvent, primaryEventId: string): BundleEvent =>
  event.kind === 1 ? event : { ...event, tags: [...event.tags, ['e', primaryEventId]] };

export const signAndPublishBundle = async (
  bundle: EventBundle,
  relays: string[] | undefined
): Promise<SignedEvent[]> => {
  const resolvedRelays = relays ?? (await getUserRelays());
  const signedEvents: SignedEvent[] = [];
  let primaryEventId: string | undefined;

  for (const event of bundleSigningOrder(bundle.events)) {
    const unsignedEvent = primaryEventId ? linkToPrimary(event, primaryEventId) : event;
    const { signedEvent, publishResults } = await signAndPublish(unsignedEvent, resolvedRelays);
    signedEvents.push(signedEvent);
    primaryEventId ??= signedEvent.id;

    if (publishResults.success === 0) {
      throw new Error(
        `Failed to publish to any relay: ${publishResults.results.map((r) => r.error).join(', ')}`
      );
    }
  }

  return signedEvents;
};

/**
 * Wait for running uploads that add to the form (activities with `blocksPublish`, e.g. a photo
 * whose link goes into the text), so the post has them. Throws when one of them failed; a
 * failed upload no longer blocks, so publishing again posts without it.
 */
export const waitForUploads = async (
  messages: PublishMessages,
  onStep: (step: string) => void
): Promise<void> => {
  if (publishBlockers().length === 0) return;
  onStep(messages.stepUploads);
  const failed = await waitForPublishBlockers();
  if (failed.length > 0) throw new Error(messages.uploadsFailed(failed.map((a) => a.label)));
};

/** Rejects with `message` when `promise` hasn't settled after `ms` */
export const withTimeout = <T>(promise: Promise<T>, ms: number, message: string): Promise<T> =>
  new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      }
    );
  });

/** Publish hooks (e.g. a venue's wiki page) taking longer than this fail the submit */
export const PUBLISH_HOOKS_TIMEOUT_MS = 90_000;

export interface PublishWithHooksInput {
  manifest: NostrPostManifest;
  formData: Record<string, unknown>;
  pubkey: string;
  relays: string[] | undefined;
  /** Builds the post from form data (the composer's validateAndCoordinate) */
  coordinate: (formData: Record<string, unknown>) => ReturnType<typeof validateAndCoordinate>;
  messages: PublishMessages;
  /** Called with the step that starts (messages.stepHooks, messages.stepPublish) */
  onStep: (step: string) => void;
  /** Whether the signer still has an unanswered request */
  isSigning: () => boolean;
}

/** What publishWithHooks published, and the after-publish steps that failed */
export interface PublishWithHooksResult {
  events: SignedEvent[];
  afterPublishErrors: Error[];
}

/**
 * Let plugins publish related events first (e.g. a venue's wiki page, within
 * PUBLISH_HOOKS_TIMEOUT_MS), then build the post again with what they linked (e.g. a
 * role's mention line) and publish it, then run the plugins' after-publish steps
 * (e.g. saving the venue to lists). A hooks-only format (`kinds: []`) publishes no post.
 */
export const publishWithHooks = async (
  input: PublishWithHooksInput
): Promise<PublishWithHooksResult> => {
  const m = input.messages;
  input.onStep(m.stepHooks);
  const hooks = await withTimeout(
    runPublishHooks(input.manifest, input.formData, input.pubkey),
    PUBLISH_HOOKS_TIMEOUT_MS,
    m.hooksTimeout
  ).catch((error: unknown) => {
    // Timed out while the signer still had a request: say that's what it waited for
    if (input.isSigning() && error instanceof Error && error.message === m.hooksTimeout) {
      throw new Error(m.signerTimeout);
    }
    throw error;
  });
  const outcome = input.coordinate(hooks.formData);
  if ('validationError' in outcome) throw new Error('The post is invalid after publish hooks');
  input.onStep(m.stepPublish);
  const events = await signAndPublishBundle(withTags(outcome.bundle, hooks.tags), input.relays);
  input.onStep(m.stepAfterPublish);
  const afterPublishErrors = await runAfterPublish(input.manifest, hooks.formData, {
    pubkey: input.pubkey,
    events,
  });
  return { events, afterPublishErrors };
};

/** Labels of the fields with a validation error, in manifest order */
export const invalidFieldLabels = (
  manifest: NostrPostManifest,
  errors: Record<string, string>
): string[] => manifest.fields.filter((field) => errors[field.id]).map(fieldLabel);
