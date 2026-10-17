import type { Rule } from "./types";

const normalize = (text: string) => text.trim().toLowerCase().replace(/\s+/g, " ");

function nextId(rules: Rule[]): string {
  const max = rules.reduce((m, r) => Math.max(m, Number(r.id.slice(1)) || 0), 0);
  return `r${max + 1}`;
}

/** Add a rule learned from an edit. A rule that already exists is not added twice. */
export function addRule(rules: Rule[], text: string, sourceTicketId: string): Rule[] {
  const clean = text.trim();
  if (!clean) return rules;
  if (rules.some((r) => normalize(r.text) === normalize(clean))) return rules;
  return [...rules, { id: nextId(rules), text: clean, sourceTicketId, fired: 0, accepted: 0 }];
}

export function removeRule(rules: Rule[], id: string): Rule[] {
  return rules.filter((r) => r.id !== id);
}

/** Count that a draft used these rules. Unknown ids are ignored. */
export function recordFired(rules: Rule[], ids: string[]): Rule[] {
  return rules.map((r) => (ids.includes(r.id) ? { ...r, fired: r.fired + 1 } : r));
}

/** Count that the agent kept a draft that used these rules. */
export function recordAccepted(rules: Rule[], ids: string[]): Rule[] {
  return rules.map((r) => (ids.includes(r.id) ? { ...r, accepted: r.accepted + 1 } : r));
}
