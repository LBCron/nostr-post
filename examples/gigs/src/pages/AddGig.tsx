/**
 * Adding a gig: the post's text and poster, read by AI (Claude or Gemini with the user's key, or any AI
 * through a copied prompt), checked as a preview and corrected in the composer before publishing;
 * or the empty form, filled in by hand.
 */

import { findJsonObject } from '@nostr-post/core/formJson';
import { browserOutbox } from '@nostr-post/outbox/web';
import type { OpenedDraft } from '@nostr-post/posts';
import { openDraft } from '@nostr-post/web';
import { useEffect, useRef, useState } from 'react';
import { type GigDraft, gigPrompt, loadGigPlugins, readAnswer } from '../lib/ai';
import { AI_PROVIDERS, aiProvider } from '../lib/aiProviders';
import { type SuggestedLink, suggestedLinks } from '../lib/links';
import { store } from '../lib/store';
import { DraftReview } from './DraftReview';
import { SuggestedLinks } from './SuggestedLinks';

const messageOf = (error: unknown) => (error as Error | undefined)?.message ?? String(error);

/** The prompt to copy to any AI, with a copy button */
function PromptCopy({ prompt }: { prompt: string }) {
  const [copied, setCopied] = useState('');
  const textarea = useRef<HTMLTextAreaElement>(null);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied('Copied: paste it into any AI.');
    } catch {
      textarea.current?.select();
      setCopied("Couldn't copy: it's selected, copy it with Ctrl+C or ⌘C.");
    }
  };
  return (
    <details>
      <summary>No key? Use any AI</summary>
      <p className="np-hint">
        Copy this prompt to any AI (with the poster, if you have one), then paste its answer below.
      </p>
      {/* Clicking the prompt selects it all, for copying by hand where the clipboard is blocked */}
      <textarea
        className="np-input"
        ref={textarea}
        rows={6}
        readOnly
        value={prompt}
        onFocus={(e) => e.target.select()}
      />
      <div className="row">
        <button type="button" className="np-button" onClick={copy}>
          Copy prompt
        </button>
        <span className="np-hint" role="status">
          {copied}
        </span>
      </div>
    </details>
  );
}

/** What the page shows after step 2: links to confirm, or the draft (none: the empty form) */
type Next =
  | { step: 'links'; answer: string; suggestions: SuggestedLink[] }
  | { step: 'review'; draft?: GigDraft; id: number };

/** A draft from the outbox, opened for the composer */
const useSavedDraft = (draftId: string | undefined) => {
  const [saved, setSaved] = useState<OpenedDraft>();
  useEffect(() => {
    if (!draftId) return;
    void browserOutbox()
      .list()
      .then((items) => items.find((i) => i.id === draftId))
      .then((item) => (item ? openDraft(item) : undefined))
      .then(setSaved);
  }, [draftId]);
  return saved;
};

export function AddGig({ draftId }: { draftId?: string }) {
  const saved = useSavedDraft(draftId);
  const [text, setText] = useState('');
  const [poster, setPoster] = useState<File>();
  const [provider, setProvider] = useState(() => aiProvider(store.get('gigs:ai-provider')));
  const [apiKey, setApiKey] = useState(() => store.get(provider.storeKey) ?? '');
  const [rememberKey, setRememberKey] = useState(() => Boolean(store.get(provider.storeKey)));
  const [suggestLinks, setSuggestLinks] = useState(() => store.get('gigs:suggest-links') !== '0');
  const [answer, setAnswer] = useState('');
  const [status, setStatus] = useState('');
  // Reading an answer takes a while (link checks, OpenStreetMap, artist pages): one at a time
  const [busy, setBusy] = useState(false);
  const [next, setNext] = useState<Next>();
  // The prompt's schema comes from the form's plugins
  const [pluginsLoaded, setPluginsLoaded] = useState(false);
  useEffect(() => {
    void loadGigPlugins().then(() => setPluginsLoaded(true));
  }, []);

  const review = (draft?: GigDraft) => setNext({ step: 'review', draft, id: Date.now() });

  const whileBusy = async (work: () => Promise<void>) => {
    if (busy) return;
    setBusy(true);
    try {
      await work();
    } catch (error) {
      setStatus(`Couldn't read the answer: ${messageOf(error)}`);
    } finally {
      setBusy(false);
    }
  };

  const showDraft = (answerText: string, confirmed: string[]) =>
    whileBusy(async () => {
      setStatus('Reading the answer: finding the venue and the artists’ pages…');
      const draft = await readAnswer(answerText, { text, hasPoster: Boolean(poster), confirmed });
      setStatus('');
      review(draft);
    });

  // Links the post doesn't have, suggested by the AI, are offered to confirm before the preview
  const preview = async (answerText: string) => {
    setNext(undefined);
    const json = findJsonObject(answerText);
    if (!json.success) return setStatus(`Couldn't read the answer: ${json.error.message}`);
    let suggestions: SuggestedLink[] = [];
    await whileBusy(async () => {
      setStatus('Checking the links…');
      suggestions = await suggestedLinks(json.data, text, Boolean(poster));
      setStatus('');
    });
    if (!suggestions.length) return showDraft(answerText, []);
    setNext({ step: 'links', answer: answerText, suggestions });
  };

  const ask = async () => {
    const key = apiKey.trim();
    if (!key) return setStatus('Enter your API key, or use the prompt with any AI.');
    store.set(provider.storeKey, rememberKey ? key : null);
    setStatus(`Asking ${provider.name}…`);
    try {
      const reply = await provider.ask({
        apiKey: key,
        text,
        poster,
        suggestLinks,
        onStatus: setStatus,
      });
      setAnswer(reply);
      setStatus('Done: check the preview below.');
      await preview(reply);
    } catch (error) {
      setStatus(`${provider.name}: ${messageOf(error)}`);
    }
  };

  // Each AI has its own key; the choice is remembered
  const chooseProvider = (id: string) => {
    const chosen = aiProvider(id);
    store.set('gigs:ai-provider', chosen.id);
    setProvider(chosen);
    setApiKey(store.get(chosen.storeKey) ?? '');
    setRememberKey(Boolean(store.get(chosen.storeKey)));
  };

  return (
    <>
      <h2>Add a gig</h2>
      <p className="np-hint">
        Have AI read a post about it, or{' '}
        <button type="button" className="np-button np-text" onClick={() => review()}>
          fill in the form yourself
        </button>
      </p>
      <section className="step np-card np-outlined">
        <h3>1. The post</h3>
        <p className="np-hint">
          Copy the text of the post (Facebook, Instagram, a website) and save its poster.
        </p>
        <textarea
          className="np-input"
          rows={6}
          placeholder="Paste the post's text"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <label>
          Poster{' '}
          <input type="file" accept="image/*" onChange={(e) => setPoster(e.target.files?.[0])} />
        </label>
      </section>
      <section className="step np-card np-outlined">
        <h3>2. Read it with AI</h3>
        <div className="row">
          <label>
            AI{' '}
            <select
              className="np-input"
              value={provider.id}
              onChange={(e) => chooseProvider(e.target.value)}
            >
              {AI_PROVIDERS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            <a href={provider.keyUrl} target="_blank" rel="noreferrer">
              {provider.keyLabel}
            </a>{' '}
            <input
              className="np-input"
              type="password"
              autoComplete="off"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
            />
          </label>
          <label>
            <input
              type="checkbox"
              checked={rememberKey}
              onChange={(e) => setRememberKey(e.target.checked)}
            />{' '}
            Remember in this browser
          </label>
          <button type="button" className="np-button np-filled" onClick={ask}>
            Ask {provider.name}
          </button>
        </div>
        {provider.note && <p className="np-hint">{provider.note}</p>}
        <p className="np-hint">
          Using ChatGPT or another AI? Copy the prompt below into it and paste its answer back: the
          answer is checked the same way.
        </p>
        {pluginsLoaded && <PromptCopy prompt={gigPrompt(text, { suggestLinks })} />}
        <label>
          <input
            type="checkbox"
            checked={suggestLinks}
            onChange={(e) => {
              setSuggestLinks(e.target.checked);
              store.set('gigs:suggest-links', e.target.checked ? '1' : '0');
            }}
          />{' '}
          Let the AI suggest performers' links the post doesn't have (you confirm them)
        </label>
        <textarea
          className="np-input"
          rows={6}
          placeholder="The AI's answer (JSON)"
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
        />
        <button
          type="button"
          className="np-button np-filled"
          disabled={busy}
          onClick={() => preview(answer)}
        >
          {busy ? 'Reading…' : 'Preview'}
        </button>
        <p className="np-hint" role="status">
          {status}
        </p>
      </section>
      {next?.step === 'links' && (
        <SuggestedLinks
          suggestions={next.suggestions}
          busy={busy}
          status={status}
          onContinue={(confirmed) => showDraft(next.answer, confirmed)}
        />
      )}
      {next?.step === 'review' && <DraftReview key={next.id} draft={next.draft} />}
      {saved && !next && <DraftReview key={saved.draftId} saved={saved} />}
    </>
  );
}
