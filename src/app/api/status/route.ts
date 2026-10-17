import { NextResponse } from "next/server";
import { exportCache, liveAllowed } from "@/lib/model";

export const dynamic = "force-dynamic";

/** Tells the page which mode it is in. Never returns a key or the provider name. */
export function GET() {
  return NextResponse.json({
    live: liveAllowed(),
    recordedReplies: Object.keys(exportCache()).length,
  });
}
