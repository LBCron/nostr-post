/**
 * The AIs the app calls directly with the user's own API key, from the browser (the key stays in
 * this browser). Each provider's official SDK is loaded only when someone asks it. They all get
 * `gigPrompt` and answer with the gig as JSON, valid against `gigSchema()` (each in its own
 * structured-output format); `readAnswer` reads the answer the same way as a pasted one.
 */

import { gigPrompt, gigSchema, loadGigPlugins } from './ai';

/** What every provider is asked */
export interface AskOptions {
  apiKey: string;
  text: string;
  poster?: File;
  suggestLinks?: boolean;
}

/** An AI the app can call */
export interface AiProvider {
  id: string;
  /** Its name in the UI ("Ask Claude") */
  name: string;
  /** What its key is called, and where to get one */
  keyLabel: string;
  keyUrl: string;
  /** Stored key's name in the store */
  storeKey: string;
  /** A note shown next to the key, e.g. about a free tier */
  note?: string;
  ask: (options: AskOptions) => Promise<string>;
}

/** A file as base64 without its data-URL prefix */
const base64Of = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1] ?? '');
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

type ImageType = 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';
const IMAGE_TYPES: string[] = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

/** The poster as base64 with its type; throws for a type the AIs don't read */
const posterImage = async (poster: File): Promise<{ type: ImageType; data: string }> => {
  if (!IMAGE_TYPES.includes(poster.type)) {
    throw new Error('The poster must be a JPEG, PNG, GIF or WebP image');
  }
  return { type: poster.type as ImageType, data: await base64Of(poster) };
};

/**
 * Asks Claude (`dangerouslyAllowBrowser`: the key is the user's and stays in their browser). On a
 * safety decline the API retries on Anthropic's recommended fallback model
 * (`fallbacks: "default"`); a refusal of the whole chain throws.
 */
export async function askClaude({
  apiKey,
  text,
  poster,
  suggestLinks = false,
  model = 'claude-opus-5-5',
}: AskOptions & { model?: string }): Promise<string> {
  const [{ default: Anthropic }] = await Promise.all([
    import('@anthropic-ai/sdk'),
    loadGigPlugins(),
  ]);
  const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true });
  const image = poster ? await posterImage(poster) : undefined;
  const response = await client.beta.messages.create({
    model,
    max_tokens: 16000,
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    // A short extraction: low effort is enough
    output_config: { effort: 'low', format: { type: 'json_schema', schema: gigSchema() } },
    messages: [
      {
        role: 'user',
        content: [
          ...(image
            ? [
                {
                  type: 'image' as const,
                  source: { type: 'base64' as const, media_type: image.type, data: image.data },
                },
              ]
            : []),
          { type: 'text', text: gigPrompt(text, { suggestLinks }) },
        ],
      },
    ],
  });
  if (response.stop_reason === 'refusal') {
    throw new Error(response.stop_details?.explanation ?? 'Claude declined this request');
  }
  return response.content.flatMap((block) => (block.type === 'text' ? [block.text] : [])).join('');
}

/**
 * Asks Google Gemini (its key from Google AI Studio). The answer follows `gigSchema()` through
 * `responseJsonSchema`. A blocked prompt or answer throws with Gemini's reason.
 */
export async function askGemini({
  apiKey,
  text,
  poster,
  suggestLinks = false,
  model = 'gemini-3.8-flash',
}: AskOptions & { model?: string }): Promise<string> {
  const [{ GoogleGenAI }] = await Promise.all([import('@google/genai'), loadGigPlugins()]);
  const client = new GoogleGenAI({ apiKey });
  const image = poster ? await posterImage(poster) : undefined;
  const response = await client.models.generateContent({
    model,
    contents: [
      {
        role: 'user',
        parts: [
          ...(image ? [{ inlineData: { mimeType: image.type, data: image.data } }] : []),
          { text: gigPrompt(text, { suggestLinks }) },
        ],
      },
    ],
    config: { responseMimeType: 'application/json', responseJsonSchema: gigSchema() },
  });
  const blocked = response.promptFeedback?.blockReason;
  if (blocked) throw new Error(`Gemini blocked this request (${blocked})`);
  const finish = response.candidates?.[0]?.finishReason;
  const answer = response.text ?? '';
  if (!answer) throw new Error(`Gemini gave no answer${finish ? ` (${finish})` : ''}`);
  return answer;
}

/** The AIs to choose from, the first is the default */
export const AI_PROVIDERS: AiProvider[] = [
  {
    id: 'claude',
    name: 'Claude',
    keyLabel: 'Your Anthropic API key',
    keyUrl: 'https://console.anthropic.com/settings/keys',
    storeKey: 'gigs:api-key',
    ask: askClaude,
  },
  {
    id: 'gemini',
    name: 'Gemini',
    keyLabel: 'Your Gemini API key',
    keyUrl: 'https://aistudio.google.com/apikey',
    storeKey: 'gigs:gemini-key',
    note: "Google AI Studio's free tier works here; on it Google may use what you send to improve its products.",
    ask: askGemini,
  },
];

/** The provider with `id`, or the default */
export const aiProvider = (id: string | null | undefined): AiProvider =>
  AI_PROVIDERS.find((p) => p.id === id) ?? (AI_PROVIDERS[0] as AiProvider);
