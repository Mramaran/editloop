import seed from "../../cache/cache.json";
import { ResponseCache, cacheKey } from "./cache";

export type Provider = "gemini" | "openrouter";
export type Source = "recorded" | "live";

export class ModelUnavailableError extends Error {
  constructor() {
    super("No recorded response for this input, and live mode is off.");
    this.name = "ModelUnavailableError";
  }
}

/** The provider said to slow down. Carries how long to wait before trying again. */
export class RateLimitedError extends Error {
  constructor(readonly retryAfterMs: number) {
    super(`Rate limited (429). Retry in ${Math.ceil(retryAfterMs / 1000)}s.`);
    this.name = "RateLimitedError";
  }
}

type Env = Record<string, string | undefined>;

const DEFAULT_GEMINI_MODEL = "gemini-3.1-flash-lite";
const DEFAULT_OPENROUTER_MODEL = "meta-llama/llama-3.3-70b-instruct:free";

/** Gemini is used when its key is set, otherwise OpenRouter. No key means recorded replies only. */
export function activeProvider(env: Env = process.env): Provider | null {
  if (env.GEMINI_API_KEY) return "gemini";
  if (env.OPENROUTER_API_KEY) return "openrouter";
  return null;
}

/**
 * Live calls spend the owner's quota, so they stay off unless ALLOW_LIVE=1 is set on purpose.
 * A public deployment should leave it unset and serve recorded replies only.
 */
export function liveAllowed(env: Env = process.env): boolean {
  return env.ALLOW_LIVE === "1" && activeProvider(env) !== null;
}

type Fetch = typeof fetch;

async function callGemini(prompt: string, env: Env, fetchImpl: Fetch): Promise<string> {
  const model = env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL;
  const res = await fetchImpl(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-goog-api-key": env.GEMINI_API_KEY as string },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0, responseMimeType: "application/json" },
    }),
  });
  if (res.status === 429) {
    const body = await res.text().catch(() => "");
    // A daily quota will not clear in seconds, so waiting would only hold the request open.
    if (/PerDay/i.test(body)) throw new Error("Daily model quota reached");
    const wait = body.match(/retry in ([\d.]+)s/i);
    throw new RateLimitedError(wait ? Math.ceil(Number(wait[1]) * 1000) + 1000 : 20000);
  }
  if (!res.ok) throw new Error(`Gemini request failed (${res.status})`);
  const data = (await res.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Gemini returned no text");
  return text;
}

async function callOpenRouter(prompt: string, env: Env, fetchImpl: Fetch): Promise<string> {
  const model = env.OPENROUTER_MODEL || DEFAULT_OPENROUTER_MODEL;
  const res = await fetchImpl("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${env.OPENROUTER_API_KEY}` },
    body: JSON.stringify({ model, temperature: 0, messages: [{ role: "user", content: prompt }] }),
  });
  if (res.status === 429) throw new RateLimitedError(20000);
  if (!res.ok) throw new Error(`OpenRouter request failed (${res.status})`);
  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const text = data.choices?.[0]?.message?.content;
  if (!text) throw new Error("OpenRouter returned no text");
  return text;
}

const sharedCache = new ResponseCache(seed as Record<string, string>);

export interface CompleteOptions {
  env?: Env;
  fetchImpl?: Fetch;
  cache?: ResponseCache;
  /** How many times to wait and retry after a 429. Defaults to MODEL_MAX_RETRIES, or 1. */
  maxRetries?: number;
  sleep?: (ms: number) => Promise<void>;
  /** Called on a live reply before it is remembered. Throw to reject it, so a bad reply is never cached. */
  validate?: (text: string) => void;
}

const defaultSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/** Return the recorded reply if there is one, otherwise call the live provider and remember the reply. */
export async function complete(
  kind: "draft" | "rule",
  prompt: string,
  options: CompleteOptions = {},
): Promise<{ text: string; source: Source }> {
  const cache = options.cache ?? sharedCache;
  const env = options.env ?? process.env;
  const fetchImpl = options.fetchImpl ?? fetch;
  const key = cacheKey(kind, prompt);

  const recorded = cache.get(key);
  if (recorded !== undefined) return { text: recorded, source: "recorded" };

  const provider = liveAllowed(env) ? activeProvider(env) : null;
  if (!provider) throw new ModelUnavailableError();

  const sleep = options.sleep ?? defaultSleep;
  // Web requests retry once at most. The recorder raises this through MODEL_MAX_RETRIES.
  const maxRetries = options.maxRetries ?? (Number(env.MODEL_MAX_RETRIES) || 1);
  for (let attempt = 0; ; attempt++) {
    try {
      const text =
        provider === "gemini" ? await callGemini(prompt, env, fetchImpl) : await callOpenRouter(prompt, env, fetchImpl);
      options.validate?.(text);
      cache.set(key, text);
      return { text, source: "live" };
    } catch (err) {
      if (err instanceof RateLimitedError && attempt < maxRetries) {
        await sleep(err.retryAfterMs);
        continue;
      }
      throw err;
    }
  }
}

export function exportCache(cache: ResponseCache = sharedCache): Record<string, string> {
  return cache.toJSON();
}
