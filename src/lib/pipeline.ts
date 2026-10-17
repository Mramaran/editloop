import { checkDraft, editRate } from "./metric";
import { complete, type Source } from "./model";
import { buildDraftPrompt, buildRulePrompt, parseDraft, parseRules } from "./prompts";
import { addRule, recordAccepted, recordFired } from "./rules";
import { HELD_OUT_TICKETS, TRAINING_TICKETS } from "@/data/tickets";
import type { DraftResult, Rule, Ticket } from "./types";

export type Completer = typeof complete;

export interface DraftOutcome extends DraftResult {
  source: Source;
  failed: string[];
  total: number;
}

/** Ask the model for a draft with the given rules, then score it against the hidden policies. */
export async function draftFor(ticket: Ticket, rules: Rule[], c: Completer = complete): Promise<DraftOutcome> {
  const knownIds = rules.map((r) => r.id);
  const { text, source } = await c("draft", buildDraftPrompt(ticket, rules), {
    validate: (reply) => void parseDraft(reply, knownIds),
  });
  const draft = parseDraft(text, knownIds);
  const check = checkDraft(draft.reply, ticket.policies);
  return { ...draft, source, failed: check.failed, total: check.total };
}

/** Turn one human edit into a rule, and update the usage counts of the rules the draft used. */
export async function learnFromEdit(
  ticket: Ticket,
  rules: Rule[],
  draft: DraftOutcome,
  edited: string,
  c: Completer = complete,
): Promise<{ rules: Rule[]; ruleTexts: string[]; source: Source | null }> {
  const withFired = recordFired(rules, draft.appliedRuleIds);
  // No policy was broken, so the agent had nothing to correct and nothing is learned.
  if (draft.failed.length === 0) {
    return { rules: recordAccepted(withFired, draft.appliedRuleIds), ruleTexts: [], source: null };
  }
  const { text, source } = await c("rule", buildRulePrompt(ticket, draft.reply, edited), {
    validate: (reply) => void parseRules(reply),
  });
  const ruleTexts: string[] = [];
  let updated = withFired;
  for (const ruleText of parseRules(text)) {
    const next = addRule(updated, ruleText, ticket.id);
    // Only count a rule as learned if it was actually added, not skipped as a duplicate.
    if (next.length > updated.length) ruleTexts.push(ruleText);
    updated = next;
  }
  return { rules: updated, ruleTexts, source };
}

export interface ReplayRow {
  ticketId: string;
  baseline: DraftOutcome;
  learned: DraftOutcome;
  /** Policies the draft passed without rules but fails with them. */
  regressed: string[];
}

export interface ReplayResult {
  rows: ReplayRow[];
  baselineRate: number;
  learnedRate: number;
}

/** Re-draft the held-out tickets with and without the learned rules and compare edit rates. */
export async function replayHeldOut(rules: Rule[], c: Completer = complete): Promise<ReplayResult> {
  const rows: ReplayRow[] = [];
  for (const ticket of HELD_OUT_TICKETS) {
    const baseline = await draftFor(ticket, [], c);
    const learned = await draftFor(ticket, rules, c);
    const regressed = learned.failed.filter((id) => !baseline.failed.includes(id));
    rows.push({ ticketId: ticket.id, baseline, learned, regressed });
  }
  return {
    rows,
    baselineRate: editRate(rows.map((r) => ({ failed: r.baseline.failed, total: r.baseline.total }))),
    learnedRate: editRate(rows.map((r) => ({ failed: r.learned.failed, total: r.learned.total }))),
  };
}

export interface SessionStep {
  ticketId: string;
  failed: string[];
  total: number;
  ruleTexts: string[];
}

/** Run the whole guided session: draft each training ticket, apply the agent's edit, learn the rule. */
export async function runGuidedSession(
  c: Completer = complete,
): Promise<{ steps: SessionStep[]; rules: Rule[]; replay: ReplayResult }> {
  let rules: Rule[] = [];
  const steps: SessionStep[] = [];
  for (const ticket of TRAINING_TICKETS) {
    const draft = await draftFor(ticket, rules, c);
    const learned = await learnFromEdit(ticket, rules, draft, ticket.agentEdit, c);
    rules = learned.rules;
    steps.push({ ticketId: ticket.id, failed: draft.failed, total: draft.total, ruleTexts: learned.ruleTexts });
  }
  return { steps, rules, replay: await replayHeldOut(rules, c) };
}
