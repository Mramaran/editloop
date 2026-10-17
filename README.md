# EditLoop

A support-reply copilot that learns from your edits. When an agent fixes an AI draft, EditLoop turns the fix into plain-language rules, shows them in a panel, applies them to the next draft, and lets you delete any rule that turns out to be wrong.

Built for SEPHacks 2026 (USC SEP x LA Tech Week).

## Why it is not just another support bot

Most support AI tools learn from edits in ways you cannot see. EditLoop keeps the memory as a short list of readable rules. You can see which rules a draft used, how often each was used and kept, and delete the ones you disagree with. Tools in the same space include Intercom Fin, Zendesk AI and Lindy.

## How the demo works

1. Ten seeded support tickets for a fictional subscription app ("Brightbox").
2. For each ticket the model writes a draft. A person edits it (a suggested edit is prefilled). EditLoop extracts up to three rules from the difference.
3. Later drafts get the learned rules, and the panel marks which rules a draft used.
4. Four held-out tickets are never used for learning. Replaying them with and without the learned rules shows whether the rules carry over.

The score is the share of policy checks a draft misses. The policies are hidden house rules (no refund promises after 30 days, sign off as "Brightbox Support", send billing disputes to a billing specialist, and so on). They are checked with fixed patterns in `src/lib/policies.ts`, not by a model, and the model is never shown them.

## Results from the recorded run

Recorded once with `gemini-3.1-flash-lite` at temperature 0:

| | Held-out checks missed |
|---|---|
| Without learned rules | 43% (3 of 7) |
| With learned rules | 14% (1 of 7) |

Please read these numbers with their limits:

- **Small sample.** Four held-out tickets and seven checks. One run, one model. It shows the loop works, not how well it works in general. The one remaining miss is a sign-off the learned rules did not fix.
- **The checks were corrected after a first run.** An earlier version of the policy checks wrongly counted some replies, for example "I can't guarantee a fix time", as misses. Fixing that changed which training drafts counted as misses, so the run was recorded again.
- **The training order was chosen.** Tickets are ordered so each kind of lesson appears twice early on. The held-out tickets are not affected by the order.
- **The rule list is noisy.** The run produced 12 rules. Several are near-duplicates and some conflict (for example, two sign-off rules disagree on whether to name an individual or the team). Nothing merges or resolves them automatically; the latest rule simply stays alongside the others, and you can delete any of them.
- **The checks are simple patterns.** They catch the policies listed above and nothing else. They do not judge tone or overall quality.
- **Not built:** sign-in, real helpdesk integrations, and rule ranking beyond used and kept counts.

## Run it

```bash
npm install
npm run dev
```

With no API key the app replays the recorded run in `cache/cache.json`, so the public demo needs no key. An input the recording does not cover returns a clear error. That includes editing the prefilled reply, or deleting a rule and replaying, because those need a new model call.

Live model calls spend your quota, so they are off unless you turn them on. Copy `.env.example` to `.env.local`, add a key, and set `ALLOW_LIVE=1`:

```
GEMINI_API_KEY=...        # used first if set
OPENROUTER_API_KEY=...    # used if there is no Gemini key
ALLOW_LIVE=1              # without this, only recorded replies are used
```

Leave `ALLOW_LIVE` unset on any public deployment. `npm run record` turns it on by itself.

```bash
npm run record    # runs the whole guided session against the live model and saves cache/cache.json
npm run inspect   # prints what a recording learned and how the held-out tickets scored (no network)
npm test          # unit tests
npm run typecheck
```

Free-tier Gemini keys have low limits (per minute and per day, per model). The recorder waits when it is rate limited and saves its progress if it stops, so running it again picks up where it left off.

Changing a prompt changes its cache key, so replies recorded with older prompts are no longer used. Re-record after any prompt change.

## Layout

- `src/lib/policies.ts`, `metric.ts`: the hidden policies and the edit-rate score
- `src/lib/prompts.ts`: what the model is asked and how replies are read
- `src/lib/model.ts`: recorded replies first, then Gemini or OpenRouter, with retry on rate limits
- `src/lib/pipeline.ts`: draft, learn from an edit, held-out replay
- `src/lib/rules.ts`: the rule list
- `src/data/tickets.ts`: the seeded tickets
- `src/app`: the page and the API routes
- `scripts/record.ts`, `scripts/inspect.ts`: recording and inspecting a run
