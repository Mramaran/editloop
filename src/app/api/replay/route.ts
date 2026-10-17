import { NextResponse } from "next/server";
import { replayHeldOut } from "@/lib/pipeline";
import { handleError, jsonError, readJson, readRules } from "../_util";

// Eight model calls in a row can take a while when live mode is on.
export const maxDuration = 60;

export async function POST(req: Request) {
  const body = (await readJson(req)) as { rules?: unknown } | null;
  const rules = readRules(body?.rules);
  if (!rules) return jsonError("Invalid rules");
  try {
    return NextResponse.json(await replayHeldOut(rules));
  } catch (err) {
    return handleError(err);
  }
}
