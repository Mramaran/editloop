import { describe, expect, it } from "vitest";
import { ResponseCache, cacheKey } from "./cache";

describe("cacheKey", () => {
  it("is stable for the same inputs", () => {
    expect(cacheKey("draft", "hello")).toBe(cacheKey("draft", "hello"));
  });

  it("differs by kind and by prompt", () => {
    expect(cacheKey("draft", "hello")).not.toBe(cacheKey("rule", "hello"));
    expect(cacheKey("draft", "hello")).not.toBe(cacheKey("draft", "hello!"));
  });
});

describe("ResponseCache", () => {
  it("returns seeded and newly set values", () => {
    const cache = new ResponseCache({ a: "1" });
    cache.set("b", "2");
    expect(cache.get("a")).toBe("1");
    expect(cache.get("b")).toBe("2");
    expect(cache.get("c")).toBeUndefined();
    expect(cache.size).toBe(2);
  });

  it("round-trips through JSON", () => {
    const cache = new ResponseCache();
    cache.set("k", "v");
    expect(new ResponseCache(cache.toJSON()).get("k")).toBe("v");
  });
});
