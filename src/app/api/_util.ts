import { NextResponse } from "next/server";
import { ModelUnavailableError } from "@/lib/model";
import { TICKETS } from "@/data/tickets";
import type { Rule, Ticket } from "@/lib/types";

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

/** Map thrown errors to a response the UI can show, without leaking internals. */
export function handleError(err: unknown) {
  if (err instanceof ModelUnavailableError) {
    return jsonError(
      "This demo replays a recorded run. That step needs a new model call, which only works when live mode is on.",
      503,
    );
  }
  console.error(err);
  return jsonError("The model service is unavailable right now. Please try again.", 502);
}

export const MAX_BODY_BYTES = 64 * 1024;
export const MAX_RULES = 30;
export const MAX_RULE_TEXT = 400;
export const MAX_REPLY_TEXT = 4000;

/** Read a JSON body, refusing anything larger than the limit. */
export async function readJson(req: Request): Promise<unknown> {
  const length = Number(req.headers.get("content-length") ?? 0);
  if (length > MAX_BODY_BYTES) return null;
  const text = await req.text().catch(() => "");
  if (text.length > MAX_BODY_BYTES) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export function findTicket(id: unknown): Ticket | null {
  return typeof id === "string" ? (TICKETS.find((t) => t.id === id) ?? null) : null;
}

export function readRules(value: unknown): Rule[] | null {
  if (!Array.isArray(value) || value.length > MAX_RULES) return null;
  const isCount = (n: unknown) => Number.isInteger(n) && (n as number) >= 0 && (n as number) < 1_000_000;
  const ok = value.every(
    (r) =>
      r &&
      typeof r.id === "string" &&
      r.id.length <= 40 &&
      typeof r.text === "string" &&
      r.text.length <= MAX_RULE_TEXT &&
      typeof r.sourceTicketId === "string" &&
      r.sourceTicketId.length <= 40 &&
      isCount(r.fired) &&
      isCount(r.accepted),
  );
  if (!ok) return null;
  // Copy only the known fields so nothing extra reaches a prompt.
  return (value as Rule[]).map((r) => ({
    id: r.id,
    text: r.text,
    sourceTicketId: r.sourceTicketId,
    fired: r.fired,
    accepted: r.accepted,
  }));
}
