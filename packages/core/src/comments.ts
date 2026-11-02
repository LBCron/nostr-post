/**
 * @nostr-post/core - Comments: kind-1 replies to notes (NIP-10), NIP-22 comments on anything else
 *
 * A note (kind 1) gets kind-1 replies with NIP-10 `e` tags (`root`, `reply`). Any other event, e.g.
 * a calendar event, a wiki page or a kind-30078 post, gets NIP-22 comments (kind 1111): uppercase
 * `A` (addressable) or `E`, `K`, `P` for the root, lowercase `a`/`e`, `k`, `p` for the parent. On an
 * addressable root the `A` tag keeps comments with it across its versions (each has a new id).
 */

export const NOTE_KIND = 1;
/** NIP-22 comment */
export const COMMENT_KIND = 1111;

type Tag = [string, ...string[]];

/** What a comment replies to */
export interface CommentTarget {
  /** The thread's root: the event commented on */
  rootEventId: string;
  rootKind: number;
  rootPubkey?: string;
  /** The root's address when it's addressable (`kind:pubkey:d`) */
  rootAddress?: string;
  /** The event replied to, when it's not the root (another comment) */
  parentEventId?: string;
  parentPubkey?: string;
  /** The parent's kind; default: the thread's comment kind (`commentKindFor(rootKind)`) */
  parentKind?: number;
}

export const isAddressableKind = (kind: number): boolean => kind >= 30000 && kind < 40000;

/** The kind of a comment on an event of `rootKind`: 1 for a note, 1111 (NIP-22) for anything else */
export const commentKindFor = (rootKind: number): number =>
  rootKind === NOTE_KIND ? NOTE_KIND : COMMENT_KIND;

/** Whether events of this kind can be comments (kind-1 replies or NIP-22 comments) */
export const isCommentKind = (kind: number): boolean => kind === NOTE_KIND || kind === COMMENT_KIND;

/** The kind in an address (`kind:pubkey:d`), if it has one */
export const kindOfAddress = (address: string): number | undefined => {
  const kind = Number(address.split(':')[0]);
  return Number.isInteger(kind) && kind > 0 ? kind : undefined;
};

const uniqueValues = (values: Array<string | undefined>): string[] => [
  ...new Set(values.filter((v): v is string => !!v)),
];

/** NIP-10 tags of a kind-1 reply to a note */
const noteReplyTags = (target: CommentTarget): Tag[] => {
  const tags: Tag[] = [['e', target.rootEventId, '', 'root']];
  const parentId = target.parentEventId;
  if (parentId && parentId !== target.rootEventId) tags.push(['e', parentId, '', 'reply']);
  for (const pubkey of uniqueValues([target.parentPubkey, target.rootPubkey])) {
    tags.push(['p', pubkey]);
  }
  return tags;
};

/** NIP-22 tags of a comment (kind 1111) */
const nip22Tags = (target: CommentTarget): Tag[] => {
  const { rootEventId, rootKind, rootPubkey, rootAddress } = target;
  const tags: Tag[] = [
    rootAddress ? ['A', rootAddress] : ['E', rootEventId, '', rootPubkey ?? ''],
    ['K', String(rootKind)],
  ];
  if (rootPubkey) tags.push(['P', rootPubkey]);
  const parentId = target.parentEventId;
  if (parentId && parentId !== rootEventId) {
    tags.push(['e', parentId, '', target.parentPubkey ?? '']);
    tags.push(['k', String(target.parentKind ?? COMMENT_KIND)]);
    if (target.parentPubkey) tags.push(['p', target.parentPubkey]);
    return tags;
  }
  // A top-level comment: the root is also the parent (its address and this version's id)
  if (rootAddress) tags.push(['a', rootAddress]);
  tags.push(['e', rootEventId, '', rootPubkey ?? '']);
  tags.push(['k', String(rootKind)]);
  if (rootPubkey) tags.push(['p', rootPubkey]);
  return tags;
};

/** A comment's kind and tags: a kind-1 reply on a note, a NIP-22 comment on anything else */
export const commentTags = (target: CommentTarget): { kind: number; tags: Tag[] } => {
  const kind = commentKindFor(target.rootKind);
  return { kind, tags: kind === NOTE_KIND ? noteReplyTags(target) : nip22Tags(target) };
};

/** The root a comment belongs to: its id and, for an addressable root, its address */
export interface CommentRoot {
  id?: string;
  address?: string;
}

const tagValue = (tags: readonly string[][], name: string, marker?: string): string | undefined =>
  tags.find((t) => t[0] === name && (marker === undefined || t[3] === marker))?.[1];

/**
 * The root of a comment: NIP-22 `E`/`A` of a kind-1111 comment, the NIP-10 `e` root (else the
 * first `e`) of a kind-1 reply. Undefined for other events and for comments on something else
 * (NIP-22 `I` scopes)
 */
export const commentRootOf = (event: {
  kind: number;
  tags: readonly string[][];
}): CommentRoot | undefined => {
  const root = rootTags(event);
  return root && (root.id || root.address) ? root : undefined;
};

const rootTags = (event: { kind: number; tags: readonly string[][] }): CommentRoot | undefined => {
  if (event.kind === COMMENT_KIND) {
    return { id: tagValue(event.tags, 'E'), address: tagValue(event.tags, 'A') };
  }
  if (event.kind === NOTE_KIND) {
    return { id: tagValue(event.tags, 'e', 'root') ?? tagValue(event.tags, 'e') };
  }
  return undefined;
};
