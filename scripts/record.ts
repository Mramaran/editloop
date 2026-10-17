/**
 * Records a full guided run against a live model and saves every reply to cache/cache.json,
 * so the deployed demo can replay it without any API key.
 *
 * Usage: set GEMINI_API_KEY (or OPENROUTER_API_KEY), then run `npm run record`.
 */
import { writeFileSync } from "node:fs";
import path from "node:path";
import { activeProvider, exportCache } from "../src/lib/model";
import { runGuidedSession } from "../src/lib/pipeline";

// Recording is the one place live calls are meant to happen, and free tiers need patient retries.
process.env.ALLOW_LIVE = "1";
process.env.MODEL_MAX_RETRIES = process.env.MODEL_MAX_RETRIES || "6";

async function main() {
  const provider = activeProvider();
  if (!provider) {
    console.error("Set GEMINI_API_KEY or OPENROUTER_API_KEY first. Nothing was recorded.");
    process.exit(1);
  }
  const file = path.resolve(__dirname, "../cache/cache.json");
  const save = () => writeFileSync(file, JSON.stringify(exportCache(), null, 2) + "\n");
  console.log(`Recording with ${provider}. The free tier is slow, so this can take several minutes...`);
  let result: Awaited<ReturnType<typeof runGuidedSession>>;
  try {
    result = await runGuidedSession();
  } catch (err) {
    // Keep what was recorded so far. Running the script again picks up from the saved replies.
    save();
    console.error(`Stopped early. Saved ${Object.keys(exportCache()).length} replies so far.`);
    throw err;
  }
  const { steps, rules, replay } = result;

  for (const s of steps) {
    console.log(`${s.ticketId}: ${s.failed.length}/${s.total} checks failed${s.ruleTexts.map((t) => `\n    learned: ${t}`).join("")}`);
  }
  console.log(`Rules learned: ${rules.length}`);
  console.log(
    `Held-out edit rate: ${(replay.baselineRate * 100).toFixed(0)}% without rules, ${(replay.learnedRate * 100).toFixed(0)}% with rules`,
  );

  save();
  console.log(`Saved ${Object.keys(exportCache()).length} replies to cache/cache.json`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
