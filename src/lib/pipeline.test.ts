import { describe, expect, it } from "vitest";
import { draftFor, learnFromEdit, replayHeldOut, runGuidedSession, type Completer } from "./pipeline";
import { TICKETS } from "@/data/tickets";
import type { Rule } from "./types";

const byId = (id: string) => TICKETS.find((t) => t.id === id)!;

/** A fake model: drafts are bad unless the prompt contains a rule, and every rule request returns one rule. */
const fake: Completer = async (kind, prompt) => {
  if (kind === "rule") return { text: '{"rules":["Sign off as Brightbox Support","Be brief"]}', source: "live" };
  const hasRule = prompt.includes("[r1]");
  const reply = hasRule
    ? "Hi, a billing specialist will help. I can't refund after 30 days.\n\nBrightbox Support"
    : "Hi, we will issue a full refund.\n\nThe team";
  return { text: JSON.stringify({ reply, appliedRuleIds: hasRule ? ["r1"] : [] }), source: "live" };
};

describe("draftFor", () => {
  it("scores the draft against the ticket's policies", async () => {
    const out = await draftFor(byId("t1"), [], fake);
    expect(out.failed).toEqual(["refund-window", "sign-off"]);
    expect(out.total).toBe(2);
  });
});

describe("learnFromEdit", () => {
  it("adds a rule when the draft broke a policy", async () => {
    const draft = await draftFor(byId("t1"), [], fake);
    const out = await learnFromEdit(byId("t1"), [], draft, byId("t1").agentEdit, fake);
    expect(out.rules.map((r) => r.text)).toEqual(["Sign off as Brightbox Support", "Be brief"]);
    expect(out.ruleTexts).toEqual(["Sign off as Brightbox Support", "Be brief"]);
  });

  it("learns nothing and counts the rules as accepted when the draft was fine", async () => {
    const rules: Rule[] = [{ id: "r1", text: "x", sourceTicketId: "t1", fired: 0, accepted: 0 }];
    const draft = await draftFor(byId("t1"), rules, fake);
    expect(draft.failed).toEqual([]);
    const out = await learnFromEdit(byId("t1"), rules, draft, byId("t1").agentEdit, fake);
    expect(out.ruleTexts).toEqual([]);
    expect(out.rules[0]).toMatchObject({ fired: 1, accepted: 1 });
  });
});

describe("replayHeldOut", () => {
  it("shows a lower edit rate with rules than without", async () => {
    const rules: Rule[] = [{ id: "r1", text: "x", sourceTicketId: "t1", fired: 0, accepted: 0 }];
    const out = await replayHeldOut(rules, fake);
    expect(out.rows).toHaveLength(4);
    expect(out.learnedRate).toBeLessThan(out.baselineRate);
  });

  it("flags a policy that passed without rules but fails with them", async () => {
    const worse: Completer = async (_kind, prompt) => {
      const hasRule = prompt.includes("[r1]");
      const reply = hasRule ? "We guarantee a billing specialist by tomorrow.\n\nBrightbox Support" : "Hi Raj, we are on it.\n\nBrightbox Support";
      return { text: JSON.stringify({ reply, appliedRuleIds: hasRule ? ["r1"] : [] }), source: "live" };
    };
    const rules: Rule[] = [{ id: "r1", text: "x", sourceTicketId: "t1", fired: 0, accepted: 0 }];
    const out = await replayHeldOut(rules, worse);
    const h3 = out.rows.find((r) => r.ticketId === "h3")!;
    expect(h3.regressed).toContain("no-delivery-promise");
  });
});

describe("runGuidedSession", () => {
  it("learns a rule from the first failing ticket and records one step per training ticket", async () => {
    const out = await runGuidedSession(fake);
    expect(out.steps).toHaveLength(10);
    expect(out.rules.length).toBeGreaterThanOrEqual(1);
    expect(out.steps[0].ruleTexts.length).toBeGreaterThan(0);
  });
});
