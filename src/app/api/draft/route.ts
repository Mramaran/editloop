import { NextResponse } from "next/server";
import { draftFor } from "@/lib/pipeline";
import { findTicket, handleError, jsonError, readJson, readRules } from "../_util";

export async function POST(req: Request) {
  const body = (await readJson(req)) as { ticketId?: unknown; rules?: unknown } | null;
  const ticket = findTicket(body?.ticketId);
  const rules = readRules(body?.rules);
  if (!ticket) return jsonError("Unknown ticket");
  if (!rules) return jsonError("Invalid rules");
  try {
    return NextResponse.json(await draftFor(ticket, rules));
  } catch (err) {
    return handleError(err);
  }
}
