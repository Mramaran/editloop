import type { DraftResult, Rule, Ticket } from "./types";

export function buildDraftPrompt(ticket: Ticket, rules: Rule[]): string {
  const ruleBlock = rules.length
    ? `Follow these rules learned from earlier edits by the support team:\n${rules
        .map((r) => `- [${r.id}] ${r.text}`)
        .join("\n")}\n\n`
    : "";
  return (
    `You write first-draft replies for Brightbox, a subscription app. A support agent will review your draft.\n\n` +
    ruleBlock +
    `Customer: ${ticket.customer}\nSubject: ${ticket.subject}\nMessage: ${ticket.body}\n\n` +
    `Write a short, friendly reply. ` +
    (rules.length
      ? `List the ids of the rules you actually used in appliedRuleIds.\n`
      : `Leave appliedRuleIds empty.\n`) +
    `Respond with JSON only: {"reply": string, "appliedRuleIds": string[]}`
  );
}

export function buildRulePrompt(ticket: Ticket, draft: string, edited: string): string {
  return (
    `A support agent edited an AI draft before sending it. Work out what general rules the edit shows.\n\n` +
    `Ticket subject: ${ticket.subject}\nCustomer message: ${ticket.body}\n\n` +
    `AI draft:\n${draft}\n\nAgent's edited reply:\n${edited}\n\n` +
    `Write up to 3 short rules, as instructions to the AI, that would have avoided the edit. ` +
    `Write one rule for each distinct change the agent made, including small ones such as how the reply is signed off. ` +
    `Only state what the edit clearly shows, and never reverse something the agent kept. ` +
    `Make each rule general: do not mention this customer's name or this ticket. ` +
    `Respond with JSON only: {"rules": string[]}`
  );
}

/** Pull the first JSON object out of a model reply, tolerating code fences and extra text. */
export function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : text;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end <= start) throw new Error("No JSON object in model reply");
  return JSON.parse(candidate.slice(start, end + 1));
}

export function parseDraft(text: string, knownRuleIds: string[]): DraftResult {
  const data = extractJson(text) as { reply?: unknown; appliedRuleIds?: unknown };
  if (typeof data.reply !== "string" || !data.reply.trim()) {
    throw new Error("Model reply had no reply text");
  }
  const applied = Array.isArray(data.appliedRuleIds)
    ? data.appliedRuleIds.filter((id): id is string => typeof id === "string" && knownRuleIds.includes(id))
    : [];
  return { reply: data.reply.trim(), appliedRuleIds: applied };
}

export const MAX_RULES_PER_EDIT = 3;

/** Read the rules out of a reply. Keeps at most three, trimmed, skipping blanks. */
export function parseRules(text: string): string[] {
  const data = extractJson(text) as { rules?: unknown };
  const rules = Array.isArray(data.rules)
    ? data.rules.filter((r): r is string => typeof r === "string" && r.trim().length > 0).map((r) => r.trim())
    : [];
  if (rules.length === 0) throw new Error("Model reply had no rules");
  return rules.slice(0, MAX_RULES_PER_EDIT);
}
