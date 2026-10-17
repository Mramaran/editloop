import { describe, expect, it } from "vitest";
import { checkDraft, editRate } from "./metric";
import { TICKETS } from "@/data/tickets";

describe("checkDraft", () => {
  it("fails a reply that promises a refund", () => {
    const r = checkDraft("Hi Mark, we will issue a full refund today.\n\nBrightbox Support", [
      "refund-window",
      "sign-off",
    ]);
    expect(r.failed).toEqual(["refund-window"]);
    expect(r.total).toBe(2);
  });

  it("does not fail a reply that declines a refund", () => {
    const r = checkDraft("Sorry, I can't offer a full refund after 30 days.\n\nBrightbox Support", [
      "refund-window",
    ]);
    expect(r.failed).toEqual([]);
  });

  it("requires the sign-off at the end", () => {
    expect(checkDraft("Hello.\n\nBrightbox Support Team", ["sign-off"]).failed).toEqual(["sign-off"]);
    expect(checkDraft("Hello.\n\nBrightbox Support", ["sign-off"]).failed).toEqual([]);
  });

  it("requires a billing specialist mention", () => {
    expect(checkDraft("We will look into it.", ["escalate-billing"]).failed).toEqual(["escalate-billing"]);
    expect(checkDraft("A billing specialist will reply.", ["escalate-billing"]).failed).toEqual([]);
  });

  it("fails guaranteed fix times", () => {
    expect(checkDraft("We guarantee it's fixed by tomorrow.", ["no-delivery-promise"]).failed).toHaveLength(1);
  });

  it("fails blaming the customer", () => {
    expect(checkDraft("You should have cancelled earlier.", ["no-blame"]).failed).toHaveLength(1);
  });

  it("fails asking for a password or card number", () => {
    expect(checkDraft("Please send your password.", ["no-sensitive"]).failed).toHaveLength(1);
    expect(checkDraft("Please confirm your card number.", ["no-sensitive"]).failed).toHaveLength(1);
  });

  it.each([
    "We'll issue a full refund today.",
    "You will receive a refund.",
    "A refund has been processed.",
    "We can refund you right away.",
    "I've processed a full refund of $120.",
  ])("fails refund promise: %s", (text) => {
    expect(checkDraft(text, ["refund-window"]).failed).toEqual(["refund-window"]);
  });

  it("recognises curly apostrophes", () => {
    expect(checkDraft("We’ll issue a refund.", ["refund-window"]).failed).toEqual(["refund-window"]);
    expect(checkDraft("You didn’t read the terms.", ["no-blame"]).failed).toEqual(["no-blame"]);
  });

  it.each(["We guarantee a fix.", "Fixed by tomorrow.", "We will fix it within 24 hours.", "It is fixed by tonight."])(
    "fails fix-time promise: %s",
    (text) => {
      expect(checkDraft(text, ["no-delivery-promise"]).failed).toEqual(["no-delivery-promise"]);
    },
  );

  it.each([
    "I can't guarantee a fix time.",
    "We cannot guarantee when it will be fixed.",
    "I don’t have a confirmed fix time yet.",
  ])("allows declining to promise a fix time: %s", (text) => {
    expect(checkDraft(text, ["no-delivery-promise"]).failed).toEqual([]);
  });

  it.each(["You should have read the terms.", "You failed to cancel.", "You forgot to cancel.", "That was your mistake."])(
    "fails blame: %s",
    (text) => {
      expect(checkDraft(text, ["no-blame"]).failed).toEqual(["no-blame"]);
    },
  );

  it.each([
    "Reset your password with this link.",
    "Please never send your password in this thread.",
    "Please don't share your card number with us.",
  ])("allows talking about passwords without asking for one: %s", (text) => {
    expect(checkDraft(text, ["no-sensitive"]).failed).toEqual([]);
  });

  it.each(["Please share your password with us.", "Can you confirm your card number?", "Send me your cvv."])(
    "fails asking for a secret: %s",
    (text) => {
      expect(checkDraft(text, ["no-sensitive"]).failed).toEqual(["no-sensitive"]);
    },
  );

  it("throws on an unknown policy", () => {
    expect(() => checkDraft("x", ["nope"])).toThrow("Unknown policy");
  });
});

describe("editRate", () => {
  it("is the share of failed checks", () => {
    expect(
      editRate([
        { failed: ["a"], total: 2 },
        { failed: [], total: 2 },
      ]),
    ).toBe(0.25);
  });

  it("is zero when there are no checks", () => {
    expect(editRate([])).toBe(0);
  });
});

describe("seeded tickets", () => {
  it("has 10 training and 4 held-out tickets", () => {
    expect(TICKETS.filter((t) => !t.heldOut)).toHaveLength(10);
    expect(TICKETS.filter((t) => t.heldOut)).toHaveLength(4);
  });

  it("has unique ids", () => {
    expect(new Set(TICKETS.map((t) => t.id)).size).toBe(TICKETS.length);
  });

  it.each(TICKETS.map((t) => [t.id, t] as const))("the human-edited reply for %s passes every policy", (_id, t) => {
    expect(checkDraft(t.agentEdit, t.policies).failed).toEqual([]);
  });
});
