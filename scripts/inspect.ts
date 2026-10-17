/**
 * Replays the recorded run from cache/cache.json and prints what was learned and how the
 * held-out tickets scored. Makes no network calls: if a reply is missing it stops with an error.
 *
 * Usage: npm run inspect
 */
import { HELD_OUT_TICKETS } from "../src/data/tickets";
import { runGuidedSession } from "../src/lib/pipeline";

async function main() {
  const { steps, rules, replay } = await runGuidedSession();

  console.log("Training tickets (share of checks missed by the draft):");
  for (const s of steps) console.log(`  ${s.ticketId}: ${s.failed.length}/${s.total}${s.ruleTexts.length ? `  -> ${s.ruleTexts.length} rule(s) learned` : ""}`);

  console.log("\nLearned rules:");
  for (const r of rules) console.log(`  ${r.id}: ${r.text} (used ${r.fired}, kept ${r.accepted})`);

  console.log(
    `\nHeld-out replay: ${(replay.baselineRate * 100).toFixed(0)}% missed without rules, ${(replay.learnedRate * 100).toFixed(0)}% with rules`,
  );
  for (const row of replay.rows) {
    const t = HELD_OUT_TICKETS.find((x) => x.id === row.ticketId);
    console.log(
      `  ${row.ticketId} [${t?.policies.join(", ")}] without: ${row.baseline.failed.join(", ") || "none"} | with: ${row.learned.failed.join(", ") || "none"} | regressed: ${row.regressed.join(", ") || "none"} | rules used: ${row.learned.appliedRuleIds.join(", ") || "none"}`,
    );
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
