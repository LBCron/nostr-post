import { useState } from 'react';
import type { SuggestedLink } from '../lib/links';

/**
 * The links the AI gave that the post doesn't have, as players (or links) with "It's them" to
 * confirm each: those their site knows by the performer's name are ticked; those it knows by
 * another name show it; the ones no site could be asked about are left for the user to open.
 * "Tick all" confirms every one. `onContinue` gets the confirmed links
 */

/** Why a link is ticked or not */
const checkNote = (s: SuggestedLink) => {
  if (s.checked) return `(checked: ${s.names.join(' · ')})`;
  if (s.names.length) return `(its site calls it: ${s.names.join(' · ')})`;
  return "(couldn't be checked: open the link)";
};
export function SuggestedLinks({
  suggestions,
  busy = false,
  status = '',
  onContinue,
}: {
  suggestions: SuggestedLink[];
  /** Reading the answer after Continue: the button waits, `status` says what's going on */
  busy?: boolean;
  status?: string;
  onContinue: (confirmed: string[]) => void;
}) {
  const [ticked, setTicked] = useState(
    () => new Set(suggestions.filter((s) => s.checked).map((s) => s.link))
  );
  const toggle = (link: string, on: boolean) =>
    setTicked((current) => {
      const next = new Set(current);
      if (on) next.add(link);
      else next.delete(link);
      return next;
    });
  return (
    <section className="step np-card np-outlined">
      <h3>Links to confirm</h3>
      <p className="np-hint">
        Not in the post: check each one. Ticked ones exist under the performer's name, but may be
        someone else's with the same name: play them. The others couldn't be checked, or their site
        calls them otherwise: open them. Keep ticked only the right ones; unticked links are left
        out.
      </p>
      {suggestions.map((s) => (
        <div className="performer" key={`${s.name} ${s.link}`}>
          <strong>{s.name}</strong>
          <np-embed url={s.link} />
          <label>
            <input
              type="checkbox"
              checked={ticked.has(s.link)}
              onChange={(e) => toggle(s.link, e.target.checked)}
            />{' '}
            It's them {checkNote(s)}
          </label>
        </div>
      ))}
      <div className="row">
        <button
          type="button"
          className="np-button"
          onClick={() => setTicked(new Set(suggestions.map((s) => s.link)))}
        >
          Tick all
        </button>
        <button
          type="button"
          className="np-button np-filled"
          disabled={busy}
          onClick={() => onContinue([...ticked])}
        >
          {busy ? 'Reading…' : 'Continue'}
        </button>
        <span className="np-hint" role="status">
          {busy ? status : ''}
        </span>
      </div>
    </section>
  );
}
