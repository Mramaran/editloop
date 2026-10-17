import { POLICIES } from "./policies";
import type { CheckResult } from "./types";

/** Score a reply against the policies that apply to its ticket. */
export function checkDraft(rawReply: string, policyIds: string[]): CheckResult {
  // Models often write curly apostrophes; the patterns use straight ones.
  const reply = rawReply.replace(/[‘’]/g, "'");
  const failed: string[] = [];
  for (const id of policyIds) {
    const policy = POLICIES[id];
    if (!policy) throw new Error(`Unknown policy: ${id}`);
    const hitForbidden = (policy.forbid ?? []).some((re) => re.test(reply));
    const missingRequired = (policy.require ?? []).some((re) => !re.test(reply));
    if (hitForbidden || missingRequired) failed.push(id);
  }
  return { failed, total: policyIds.length };
}

/** Share of checks that failed across a set of drafts. 0 means no edits needed. */
export function editRate(results: CheckResult[]): number {
  const total = results.reduce((sum, r) => sum + r.total, 0);
  if (total === 0) return 0;
  const failed = results.reduce((sum, r) => sum + r.failed.length, 0);
  return failed / total;
}
