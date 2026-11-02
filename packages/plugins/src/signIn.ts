/**
 * @nostr-post/plugins/signIn - asking the app to sign the user in
 *
 * Components and plugins that need a signed-in user (an upload's NIP-98 auth, publishing) call
 * `requestSignIn` when there's none; the app decides how to sign in (e.g. opens its signer's
 * login) by listening with `onSignInNeeded`. Framework-free: a set of listeners.
 */

/** Why sign-in is needed, e.g. "upload" or "publish" */
export type SignInReason = 'upload' | 'publish';

type SignInListener = (reason: SignInReason) => void;

const listeners = new Set<SignInListener>();

/** Calls `listener` whenever something needs a signed-in user; returns an unsubscribe function */
export const onSignInNeeded = (listener: SignInListener): (() => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

/** Tells the app the user needs to sign in; whether any listener handles it */
export const requestSignIn = (reason: SignInReason): boolean => {
  for (const listener of listeners) listener(reason);
  return listeners.size > 0;
};
