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
  /** Progress to show, e.g. a busy model's fallback */
  onStatus?: (text: string) => void;
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

/** Gemini models, tried in turn while one is overloaded: the newest, then a lighter one */
const GEMINI_MODELS = ['gemini-3.8-flash', 'gemini-3.5-flash-lite'];

/** HTTP statuses of a busy or briefly failing Gemini, worth another try or model */
const BUSY = [429, 500, 503, 504];

const statusOf = (error: unknown): number | undefined =>
  typeof (error as { status?: unknown })?.status === 'number'
    ? (error as { status: number }).status
    : undefined;

/** Gemini's error as a sentence: its JSON body's message, or what a busy status means */
const geminiError = (error: unknown): Error => {
  const status = statusOf(error);
  if (status === 503 || status === 500 || status === 504) {
    return new Error(
      'Gemini is overloaded right now. Try again in a minute, or use Claude or the copied prompt.'
    );
  }
  if (status === 429) {
    return new Error(
      "Your key's Gemini limit is reached for now (the free tier allows a few requests a minute and a day). Try again later."
    );
  }
  const text = (error as Error | undefined)?.message ?? String(error);
  try {
    const message = JSON.parse(text.slice(text.indexOf('{')))?.error?.message;
    return new Error(typeof message === 'string' ? message : text);
  } catch {
    return new Error(text);
  }
};

/** The answer's text; throws with Gemini's reason when it blocked the prompt or gave none */
const geminiAnswer = (response: {
  text?: string;
  promptFeedback?: { blockReason?: string };
  candidates?: Array<{ finishReason?: string }>;
}): string => {
  const blocked = response.promptFeedback?.blockReason;
  if (blocked) throw new Error(`Gemini blocked this request (${blocked})`);
  const finish = response.candidates?.[0]?.finishReason;
  if (!response.text) throw new Error(`Gemini gave no answer${finish ? ` (${finish})` : ''}`);
  return response.text;
};

/**
 * Asks Google Gemini (its key from Google AI Studio). The answer follows `gigSchema()` through
 * `responseJsonSchema`, with high thinking. A busy model (503, 429) is retried twice by the SDK, then the next of
 * `GEMINI_MODELS` is asked. A blocked prompt or answer throws with Gemini's reason.
 */
export async function askGemini({
  apiKey,
  text,
  poster,
  suggestLinks = false,
  onStatus,
  models = GEMINI_MODELS,
}: AskOptions & { models?: string[] }): Promise<string> {
  const [{ GoogleGenAI, ThinkingLevel }] = await Promise.all([
    import('@google/genai'),
    loadGigPlugins(),
  ]);
  const client = new GoogleGenAI({
    apiKey,
    httpOptions: {
      retryOptions: { attempts: 3, initialDelay: 2, maxDelay: 8, httpStatusCodes: BUSY },
    },
  });
  const image = poster ? await posterImage(poster) : undefined;
  const contents = [
    {
      role: 'user',
      parts: [
        ...(image ? [{ inlineData: { mimeType: image.type, data: image.data } }] : []),
        { text: gigPrompt(text, { suggestLinks }) },
      ],
    },
  ];
  const config = {
    responseMimeType: 'application/json',
    responseJsonSchema: gigSchema(),
    // The default thinking reads posts much worse (#262): as the chat app's "high"
    thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH },
  };
  let failure: unknown;
  for (const [i, model] of models.entries()) {
    if (i > 0) onStatus?.(`Gemini is busy, asking ${model}…`);
    try {
      return geminiAnswer(await client.models.generateContent({ model, contents, config }));
    } catch (error) {
      failure = error;
      if (!BUSY.includes(statusOf(error) ?? 0)) break;
    }
  }
  throw geminiError(failure);
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
