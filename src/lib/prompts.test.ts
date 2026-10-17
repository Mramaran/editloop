import { describe, expect, it } from "vitest";
import { buildDraftPrompt, buildRulePrompt, extractJson, parseDraft, parseRules } from "./prompts";
import { TICKETS } from "@/data/tickets";
import type { Rule } from "./types";

const rule: Rule = { id: "r1", text: "Sign off as Brightbox Support", sourceTicketId: "t1", fired: 0, accepted: 0 };

describe("buildDraftPrompt", () => {
  it("never reveals the hidden policies", () => {
    const prompt = buildDraftPrompt(TICKETS[0], []);
    expect(prompt).not.toMatch(/30 days|billing specialist|Brightbox Support/);
  });

  it("includes learned rules with their ids", () => {
    expect(buildDraftPrompt(TICKETS[0], [rule])).toContain("[r1] Sign off as Brightbox Support");
  });

  it("is identical for the same inputs so cached replies match", () => {
    expect(buildDraftPrompt(TICKETS[0], [rule])).toBe(buildDraftPrompt(TICKETS[0], [rule]));
  });
});

describe("buildRulePrompt", () => {
  it("includes both the draft and the edit", () => {
    const p = buildRulePrompt(TICKETS[0], "DRAFT TEXT", "EDITED TEXT");
    expect(p).toContain("DRAFT TEXT");
    expect(p).toContain("EDITED TEXT");
  });
});

describe("extractJson", () => {
  it("reads plain JSON", () => {
    expect(extractJson('{"a":1}')).toEqual({ a: 1 });
  });

  it("reads JSON inside a code fence with chatter around it", () => {
    expect(extractJson('Sure!\n```json\n{"a":2}\n```\nDone')).toEqual({ a: 2 });
  });

  it("throws when there is no JSON", () => {
    expect(() => extractJson("no braces here")).toThrow("No JSON object");
  });
});

describe("parseDraft", () => {
  it("keeps only rule ids that exist", () => {
    const out = parseDraft('{"reply":"Hi","appliedRuleIds":["r1","r9"]}', ["r1"]);
    expect(out).toEqual({ reply: "Hi", appliedRuleIds: ["r1"] });
  });

  it("treats a missing applied list as empty", () => {
    expect(parseDraft('{"reply":"Hi"}', ["r1"]).appliedRuleIds).toEqual([]);
  });

  it("throws on an empty reply", () => {
    expect(() => parseDraft('{"reply":"  "}', [])).toThrow("no reply text");
  });
});

describe("parseRules", () => {
  it("returns trimmed rules and skips blanks and non-text entries", () => {
    expect(parseRules('{"rules":["  Be brief  ","", 3, "Sign off clearly"]}')).toEqual(["Be brief", "Sign off clearly"]);
  });

  it("keeps at most three rules", () => {
    expect(parseRules('{"rules":["a","b","c","d","e"]}')).toEqual(["a", "b", "c"]);
  });

  it("throws when there are no usable rules", () => {
    expect(() => parseRules('{"rules":[]}')).toThrow("no rules");
    expect(() => parseRules('{"other":1}')).toThrow("no rules");
  });
});

describe("buildRulePrompt wording", () => {
  it("asks for one rule per change and for small changes like the sign-off", () => {
    const p = buildRulePrompt(TICKETS[0], "d", "e");
    expect(p).toContain("up to 3");
    expect(p).toContain("sign");
  });
});
