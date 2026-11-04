/**
 * @nostr-post/posts - A post's raw data
 *
 * What a post's "⋯" menu copies and its raw-data panel shows: the author's npub, the kind and
 * d tag, every tag, a NIP-19 pointer (naddr for addressable events, else nevent) with the relays
 * the event was found on, the event as JSON and its signature. Framework-free.
 */

import { encodeNaddr, encodeNevent, encodeNpub } from '@nostr-post/core/nip19';
import { relaysSeenOn, type SignedEvent } from '@nostr-post/signer';
import { isAddressableKind } from './publish';

export interface RawEventData {
  id: string;
  pubkey: string;
  /** The author as npub */
  npub: string;
  kind: number;
  /** The d tag, for addressable and parameterized events */
  dTag?: string;
  /** `<kind>:<pubkey>:<d-tag>` of an addressable event */
  address?: string;
  /** naddr (addressable) or nevent (others), with relay hints */
  pointer: string;
  /** Where the event was found in this session */
  relays: string[];
  tags: string[][];
  createdAt: number;
  sig: string;
  /** The whole event, as relays have it, pretty-printed */
  json: string;
}

/** A post's raw data; `relays` default to where this session fetched it */
export const rawEventData = (
  event: SignedEvent,
  relays: string[] = relaysSeenOn(event.id)
): RawEventData => {
  const dTag = event.tags.find((tag) => tag[0] === 'd')?.[1];
  const address =
    isAddressableKind(event.kind) && dTag !== undefined
      ? `${event.kind}:${event.pubkey}:${dTag}`
      : undefined;
  const pointer =
    (address ? encodeNaddr(address, relays) : undefined) ??
    encodeNevent(event.id, { relays, author: event.pubkey, kind: event.kind }) ??
    event.id;
  const { id, pubkey, created_at, kind, tags, content, sig } = event;
  return {
    id,
    pubkey,
    npub: encodeNpub(pubkey) ?? pubkey,
    kind,
    ...(dTag === undefined ? {} : { dTag }),
    ...(address ? { address } : {}),
    pointer,
    relays,
    tags,
    createdAt: created_at,
    sig,
    json: JSON.stringify({ id, pubkey, created_at, kind, tags, content, sig }, null, 2),
  };
};
