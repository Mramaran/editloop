import { describe, expect, it } from "vitest";
import { addRule, recordAccepted, recordFired, removeRule } from "./rules";

describe("rules", () => {
  it("adds a rule with counts at zero", () => {
    const rules = addRule([], "Never promise a refund after 30 days", "t1");
    expect(rules).toEqual([
      { id: "r1", text: "Never promise a refund after 30 days", sourceTicketId: "t1", fired: 0, accepted: 0 },
    ]);
  });

  it("does not add the same rule twice, ignoring case and spacing", () => {
    const once = addRule([], "Sign off as Brightbox Support", "t1");
    const twice = addRule(once, "  sign off  as brightbox support ", "t2");
    expect(twice).toHaveLength(1);
  });

  it("ignores empty rule text", () => {
    expect(addRule([], "   ", "t1")).toEqual([]);
  });

  it("gives new rules fresh ids after one is removed", () => {
    let rules = addRule([], "A", "t1");
    rules = addRule(rules, "B", "t2");
    rules = removeRule(rules, "r1");
    rules = addRule(rules, "C", "t3");
    expect(rules.map((r) => r.id)).toEqual(["r2", "r3"]);
  });

  it("counts fired and accepted only for the given rules", () => {
    let rules = addRule([], "A", "t1");
    rules = addRule(rules, "B", "t2");
    rules = recordFired(rules, ["r1", "nope"]);
    rules = recordAccepted(rules, ["r1"]);
    expect(rules[0]).toMatchObject({ fired: 1, accepted: 1 });
    expect(rules[1]).toMatchObject({ fired: 0, accepted: 0 });
  });

  it("removes a rule by id", () => {
    const rules = addRule(addRule([], "A", "t1"), "B", "t2");
    expect(removeRule(rules, "r1").map((r) => r.text)).toEqual(["B"]);
  });
});
