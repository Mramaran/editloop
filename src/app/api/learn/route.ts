import { NextResponse } from "next/server";
import { checkDraft } from "@/lib/metric";
import { learnFromEdit, type DraftOutcome } from "@/lib/pipeline";
import { MAX_REPLY_TEXT, findTicket, handleError, jsonError, readJson, readRules } from "../_util";

export async function POST(req: Request) {
  const body = (await readJson(req)) as { ticketId?: unknown; rules?: unknown; draft?: unknown; edited?: unknown } | null;
  const ticket = findTicket(body?.ticketId);
  const rules = readRules(body?.rules);
  const edited = body?.edited;
  const draftIn = body?.draft as { reply?: unknown; appliedRuleIds?: unknown } | undefined;
  if (!ticket) return jsonError("Unknown ticket");
  if (!rules) return jsonError("Invalid rules");
  if (!draftIn || typeof draftIn.reply !== "string" || draftIn.reply.length > MAX_REPLY_TEXT) {
    return jsonError("Invalid draft");
  }
  if (typeof edited !== "string" || !edited.trim() || edited.length > MAX_REPLY_TEXT) {
    return jsonError("The edited reply is empty or too long");
  }

  // Work out the checks and the rules used on the server instead of trusting the browser.
  const known = new Set(rules.map((r) => r.id));
  const applied = Array.isArray(draftIn.appliedRuleIds)
    ? draftIn.appliedRuleIds.filter((id): id is string => typeof id === "string" && known.has(id))
    : [];
  const check = checkDraft(draftIn.reply, ticket.policies);
  const draft: DraftOutcome = {
    reply: draftIn.reply,
    appliedRuleIds: applied,
    source: "recorded",
    failed: check.failed,
    total: check.total,
  };

  try {
    return NextResponse.json(await learnFromEdit(ticket, rules, draft, edited));
  } catch (err) {
    return handleError(err);
  }
}
