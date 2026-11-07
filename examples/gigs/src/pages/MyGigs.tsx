/**
 * The signed-in user's gigs: the ones they added (their events), and the ones they're going to
 * (their RSVPs: Going, Maybe, or both). Agendas from today on, at the venues' times, like the
 * browse page.
 */

import { answersByAddress, fetchRsvpsBy, type RsvpStatus } from '@nostr-post/calendar';
import { useEffect, useMemo, useState } from 'react';
import { GIG_MANIFEST } from '../lib/manifests';
import { eventLink } from '../lib/routes';
import { store } from '../lib/store';

/** Which answers "I'm going" lists */
const GOING = {
  all: { label: 'Going and maybe', statuses: ['accepted', 'tentative'] },
  accepted: { label: 'Going', statuses: ['accepted'] },
  tentative: { label: 'Maybe', statuses: ['tentative'] },
} as const satisfies Record<string, { label: string; statuses: readonly RsvpStatus[] }>;

type GoingId = keyof typeof GOING;

const isGoingId = (id: string | null): id is GoingId => !!id && id in GOING;

/** The signed-in user's pubkey, following sign-in and sign-out (nostr-bridge) */
function usePubkey(): string | null {
  const [pubkey, setPubkey] = useState<string | null>(null);
  useEffect(() => window.NostrBridge?.onAuthChange((state) => setPubkey(state.pubkey)), []);
  return pubkey;
}

/** The user's newest answer to each event, once loaded */
function useAnswers(pubkey: string | null): Map<string, RsvpStatus> | undefined {
  const [answers, setAnswers] = useState<Map<string, RsvpStatus>>();
  useEffect(() => {
    setAnswers(undefined);
    if (!pubkey) return;
    let current = true;
    fetchRsvpsBy(pubkey)
      .then((events) => current && setAnswers(answersByAddress(events)))
      .catch(() => current && setAnswers(new Map()));
    return () => {
      current = false;
    };
  }, [pubkey]);
  return answers;
}

export function MyGigs() {
  const pubkey = usePubkey();
  const answers = useAnswers(pubkey);
  const [going, setGoing] = useState<GoingId>(() => {
    const saved = store.get('gigs:going');
    return isGoingId(saved) ? saved : 'all';
  });
  // A new array only when the answers or the choice change: the agenda reloads on a new one
  const addresses = useMemo(() => {
    const statuses: readonly RsvpStatus[] = GOING[going].statuses;
    return [...(answers ?? [])].filter(([, s]) => statuses.includes(s)).map(([a]) => a);
  }, [answers, going]);
  const authors = useMemo(() => (pubkey ? [pubkey] : []), [pubkey]);

  if (!pubkey) {
    return (
      <>
        <h2>My gigs</h2>
        <p className="np-hint">Sign in to see the gigs you added and the ones you're going to.</p>
        <button
          type="button"
          className="np-button np-filled"
          onClick={() => window.NostrBridge?.login().catch(console.error)}
        >
          Sign in
        </button>
      </>
    );
  }
  return (
    <>
      <h2>My gigs</h2>
      <h3>Added by me</h3>
      <nostr-calendar-agenda
        manifest={GIG_MANIFEST}
        authors={authors}
        eventHref={eventLink}
        eventZones
        editable
      />
      <h3>I'm going</h3>
      <label>
        Show{' '}
        <select
          className="np-input"
          value={going}
          onChange={(e) => {
            const id = e.target.value;
            if (!isGoingId(id)) return;
            setGoing(id);
            store.set('gigs:going', id);
          }}
        >
          {Object.entries(GOING).map(([id, { label }]) => (
            <option key={id} value={id}>
              {label}
            </option>
          ))}
        </select>
      </label>
      {answers === undefined && <p className="np-hint">Loading your answers…</p>}
      {answers && addresses.length === 0 && (
        <p className="np-hint">
          No gigs yet: answer Going or Maybe on a gig's page (in test mode, answers aren't sent to
          relays, so they don't show here).
        </p>
      )}
      {addresses.length > 0 && (
        <nostr-calendar-agenda
          manifest={GIG_MANIFEST}
          addresses={addresses}
          eventHref={eventLink}
          eventZones
        />
      )}
    </>
  );
}
