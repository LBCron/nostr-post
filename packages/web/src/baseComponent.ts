/**
 * @nostr-post/web - Base component utilities
 *
 * Shared functionality for all nostr-post Web Components
 */

import { NpElement } from '@nostr-post/ui/web';

// Re-export theme
export { baseStyles } from './theme';

/**
 * Base class for all nostr-post Web Components
 */
export class NostrPostElement extends NpElement {
  /**
   * Dispatch a custom event with detail
   */
  protected dispatchCustomEvent<T>(
    eventName: string,
    detail: T,
    options: Omit<CustomEventInit<T>, 'detail'> = {}
  ): CustomEvent<T> {
    const event = new CustomEvent<T>(eventName, {
      detail,
      bubbles: true,
      composed: true,
      ...options,
    });
    this.dispatchEvent(event);
    return event;
  }

  /**
   * Show error state
   */
  protected showError(message: string): void {
    this.dispatchCustomEvent('nostr-post-error', { message });
  }
}
