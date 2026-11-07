/**
 * @nostr-post/react - NostrPostOutbox component
 *
 * React wrapper around <nostr-post-outbox> (@nostr-post/outbox/web): the queue of posts that
 * aren't published yet (drafts, timed posts, photos to upload later). `onEdit` gets a draft the
 * user wants to edit: `openDraft(item)` (@nostr-post/web) gives the composer's props.
 */

import type { Outbox, OutboxItem } from '@nostr-post/outbox';
import type { OutboxMessages } from '@nostr-post/outbox/web';
import '@nostr-post/outbox/web'; // Register <nostr-post-outbox>
import { useEffect, useRef } from 'react';

interface NostrPostOutboxElement extends HTMLElement {
  outbox?: Outbox;
  pubkey?: string;
  messages?: Partial<OutboxMessages>;
}

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'nostr-post-outbox': React.DetailedHTMLProps<
        React.HTMLAttributes<NostrPostOutboxElement>,
        NostrPostOutboxElement
      >;
    }
  }
}

export interface NostrPostOutboxProps {
  /** The outbox; default the browser's (`browserOutbox`) */
  outbox?: Outbox;
  /** Whose items; default the signer's pubkey */
  pubkey?: string;
  /** Overrides of DEFAULT_OUTBOX_MESSAGES (e.g. translations) */
  messages?: Partial<OutboxMessages>;
  /** The user wants to edit a draft */
  onEdit?: (item: OutboxItem) => void;
  className?: string;
  /** Dark mode */
  dark?: boolean;
}

export function NostrPostOutbox({
  outbox,
  pubkey,
  messages,
  onEdit,
  className = '',
  dark,
}: NostrPostOutboxProps) {
  const elementRef = useRef<NostrPostOutboxElement>(null);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;
    if (outbox) element.outbox = outbox;
    element.pubkey = pubkey;
    if (messages) element.messages = messages;
  }, [outbox, pubkey, messages]);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;
    const handleEdit = (e: Event) => onEdit?.((e as CustomEvent<OutboxItem>).detail);
    element.addEventListener('outbox-edit', handleEdit);
    return () => element.removeEventListener('outbox-edit', handleEdit);
  }, [onEdit]);

  return (
    <div className={dark ? 'dark' : ''}>
      <nostr-post-outbox ref={elementRef as React.RefObject<HTMLElement>} className={className} />
    </div>
  );
}
