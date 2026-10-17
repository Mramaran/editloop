import { createHash } from "node:crypto";

/** Stable key for a model call. The same inputs always map to the same key. */
export function cacheKey(kind: string, prompt: string): string {
  return createHash("sha256").update(`${kind}\n${prompt}`).digest("hex");
}

/** Recorded model responses. Starts from a seed and can be added to while running. */
export class ResponseCache {
  private entries: Map<string, string>;

  constructor(seed: Record<string, string> = {}) {
    this.entries = new Map(Object.entries(seed));
  }

  get(key: string): string | undefined {
    return this.entries.get(key);
  }

  set(key: string, value: string): void {
    this.entries.set(key, value);
  }

  get size(): number {
    return this.entries.size;
  }

  toJSON(): Record<string, string> {
    return Object.fromEntries(this.entries);
  }
}
