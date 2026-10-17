import { describe, expect, it, vi } from "vitest";
import { ModelUnavailableError, activeProvider, complete, liveAllowed } from "./model";
import { ResponseCache, cacheKey } from "./cache";

const LIVE = { GEMINI_API_KEY: "k", ALLOW_LIVE: "1" };

const okGemini = () =>
  Promise.resolve(
    new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: '{"rule":"x"}' }] } }] }), { status: 200 }),
  );

describe("activeProvider", () => {
  it("prefers Gemini, then OpenRouter, then none", () => {
    expect(activeProvider({ GEMINI_API_KEY: "a", OPENROUTER_API_KEY: "b" })).toBe("gemini");
    expect(activeProvider({ OPENROUTER_API_KEY: "b" })).toBe("openrouter");
    expect(activeProvider({})).toBeNull();
  });
});

describe("liveAllowed", () => {
  it("needs both a key and ALLOW_LIVE=1", () => {
    expect(liveAllowed({ GEMINI_API_KEY: "k" })).toBe(false);
    expect(liveAllowed({ ALLOW_LIVE: "1" })).toBe(false);
    expect(liveAllowed({ GEMINI_API_KEY: "k", ALLOW_LIVE: "1" })).toBe(true);
  });
});

describe("complete", () => {
  it("does not call the network when a key is set but live mode is off", async () => {
    const fetchImpl = vi.fn();
    await expect(
      complete("rule", "off", {
        cache: new ResponseCache(),
        env: { GEMINI_API_KEY: "k" },
        fetchImpl: fetchImpl as unknown as typeof fetch,
      }),
    ).rejects.toBeInstanceOf(ModelUnavailableError);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("does not cache a reply that fails validation", async () => {
    const cache = new ResponseCache();
    const fetchImpl = vi.fn(okGemini) as unknown as typeof fetch;
    await expect(
      complete("rule", "bad", {
        cache,
        env: LIVE,
        fetchImpl,
        validate: () => {
          throw new Error("malformed");
        },
      }),
    ).rejects.toThrow("malformed");
    expect(cache.size).toBe(0);
  });

  it("fails fast on a daily quota instead of waiting", async () => {
    const fetchImpl = vi.fn(() =>
      Promise.resolve(new Response('quotaId: "GenerateRequestsPerDayPerProjectPerModel-FreeTier"', { status: 429 })),
    );
    const sleeps: number[] = [];
    await expect(
      complete("rule", "daily", {
        cache: new ResponseCache(),
        env: LIVE,
        fetchImpl: fetchImpl as unknown as typeof fetch,
        sleep: async (ms) => {
          sleeps.push(ms);
        },
      }),
    ).rejects.toThrow("Daily model quota");
    expect(sleeps).toEqual([]);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("returns a recorded reply without calling the network", async () => {
    const cache = new ResponseCache({ [cacheKey("rule", "p")]: "saved" });
    const fetchImpl = vi.fn();
    const out = await complete("rule", "p", { cache, env: {}, fetchImpl: fetchImpl as unknown as typeof fetch });
    expect(out).toEqual({ text: "saved", source: "recorded" });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("throws a clear error when nothing is recorded and there is no key", async () => {
    await expect(complete("rule", "p", { cache: new ResponseCache(), env: {} })).rejects.toBeInstanceOf(
      ModelUnavailableError,
    );
  });

  it("calls Gemini live, then serves the same input from the cache", async () => {
    const cache = new ResponseCache();
    const fetchImpl = vi.fn(okGemini) as unknown as typeof fetch;
    const first = await complete("rule", "p", { cache, env: LIVE, fetchImpl });
    const second = await complete("rule", "p", { cache, env: LIVE, fetchImpl });
    expect(first).toEqual({ text: '{"rule":"x"}', source: "live" });
    expect(second.source).toBe("recorded");
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("sends the Gemini key in a header, not the URL", async () => {
    const fetchImpl = vi.fn(okGemini);
    await complete("rule", "p2", { cache: new ResponseCache(), env: { GEMINI_API_KEY: "secret", ALLOW_LIVE: "1" }, fetchImpl: fetchImpl as unknown as typeof fetch });
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).not.toContain("secret");
    expect((init.headers as Record<string, string>)["x-goog-api-key"]).toBe("secret");
  });

  it("uses OpenRouter when only that key is set", async () => {
    const fetchImpl = vi.fn(() =>
      Promise.resolve(new Response(JSON.stringify({ choices: [{ message: { content: "hi" } }] }), { status: 200 })),
    );
    const out = await complete("draft", "p3", {
      cache: new ResponseCache(),
      env: { OPENROUTER_API_KEY: "k", ALLOW_LIVE: "1" },
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(out.text).toBe("hi");
    expect((fetchImpl.mock.calls[0] as unknown as [string])[0]).toContain("openrouter.ai");
  });

  it("surfaces a failed request instead of caching it", async () => {
    const cache = new ResponseCache();
    const fetchImpl = vi.fn(() => Promise.resolve(new Response("nope", { status: 500 })));
    await expect(
      complete("rule", "p4", { cache, env: LIVE, fetchImpl: fetchImpl as unknown as typeof fetch }),
    ).rejects.toThrow("500");
    expect(cache.size).toBe(0);
  });

  it("waits the time the provider asks for after a 429, then succeeds", async () => {
    const responses = [
      new Response("Please retry in 17.5s.", { status: 429 }),
      new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: "done" }] } }] }), { status: 200 }),
    ];
    const fetchImpl = vi.fn(() => Promise.resolve(responses.shift() as Response));
    const sleeps: number[] = [];
    const out = await complete("rule", "p5", {
      cache: new ResponseCache(),
      env: LIVE,
      fetchImpl: fetchImpl as unknown as typeof fetch,
      sleep: async (ms) => {
        sleeps.push(ms);
      },
    });
    expect(out.text).toBe("done");
    expect(sleeps).toEqual([18500]);
  });

  it("gives up after the retry limit and reports the rate limit", async () => {
    const fetchImpl = vi.fn(() => Promise.resolve(new Response("retry in 1s", { status: 429 })));
    await expect(
      complete("rule", "p6", {
        cache: new ResponseCache(),
        env: LIVE,
        fetchImpl: fetchImpl as unknown as typeof fetch,
        maxRetries: 2,
        sleep: async () => {},
      }),
    ).rejects.toThrow("Rate limited");
    expect(fetchImpl).toHaveBeenCalledTimes(3);
  });
});
