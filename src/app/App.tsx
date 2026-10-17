"use client";

import { useEffect, useState } from "react";
import Chart from "./Chart";
import { HELD_OUT_TICKETS, TRAINING_TICKETS } from "@/data/tickets";
import { POLICIES } from "@/lib/policies";
import { removeRule } from "@/lib/rules";
import type { DraftOutcome, ReplayResult } from "@/lib/pipeline";
import type { Rule, Ticket } from "@/lib/types";

interface HistoryPoint {
  ticketId: string;
  rate: number;
}

interface Status {
  live: boolean;
  recordedReplies: number;
}

interface LearnResponse {
  rules: Rule[];
  ruleTexts: string[];
}

const STORAGE_KEY = "editloop-v1";
const pct = (n: number) => `${Math.round(n * 100)}%`;

async function post<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error ?? `Request failed (${res.status})`);
  return data as T;
}

function Checks({ failed, policies }: { failed: string[]; policies: string[] }) {
  return (
    <div className="chips">
      {policies.map((id) => {
        const bad = failed.includes(id);
        return (
          <span key={id} className={`chip ${bad ? "fail" : "pass"}`}>
            {bad ? "Missed" : "Met"}: {POLICIES[id]?.label ?? id}
          </span>
        );
      })}
    </div>
  );
}

export default function App() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [idx, setIdx] = useState(0);
  const [history, setHistory] = useState<HistoryPoint[]>([]);
  const [draft, setDraft] = useState<DraftOutcome | null>(null);
  const [edited, setEdited] = useState("");
  const [replay, setReplay] = useState<ReplayResult | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [status, setStatus] = useState<Status | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as { rules?: unknown; idx?: unknown; history?: unknown };
        const validRules =
          Array.isArray(saved.rules) &&
          saved.rules.every((r) => r && typeof r.id === "string" && typeof r.text === "string");
        const validIdx =
          typeof saved.idx === "number" &&
          Number.isInteger(saved.idx) &&
          saved.idx >= 0 &&
          saved.idx <= TRAINING_TICKETS.length;
        // Ignore saved state that does not look right, for example after the tickets changed.
        if (validRules && validIdx && Array.isArray(saved.history)) {
          setRules(saved.rules as Rule[]);
          setIdx(saved.idx as number);
          setHistory(saved.history as HistoryPoint[]);
        }
      }
    } catch {
      /* storage can be unavailable; the page works without it */
    }
    setLoaded(true);
    fetch("/api/status")
      .then((r) => r.json())
      .then(setStatus)
      .catch(() => setStatus(null));
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ rules, idx, history }));
    } catch {
      /* ignore */
    }
  }, [loaded, rules, idx, history]);

  const ticket: Ticket | undefined = TRAINING_TICKETS[idx];
  const finished = idx >= TRAINING_TICKETS.length;

  async function run<T>(name: string, fn: () => Promise<T>): Promise<T | undefined> {
    setBusy(name);
    setError(null);
    try {
      return await fn();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      return undefined;
    } finally {
      setBusy(null);
    }
  }

  async function getDraft() {
    if (!ticket) return;
    const out = await run("draft", () => post<DraftOutcome>("/api/draft", { ticketId: ticket.id, rules }));
    if (out) {
      setDraft(out);
      setEdited(ticket.agentEdit);
      setNote(null);
    }
  }

  async function learnOne(t: Ticket, rulesIn: Rule[], d: DraftOutcome, text: string) {
    const out = await post<LearnResponse>("/api/learn", { ticketId: t.id, rules: rulesIn, draft: d, edited: text });
    return {
      rules: out.rules,
      ruleTexts: out.ruleTexts,
      point: { ticketId: t.id, rate: d.total ? d.failed.length / d.total : 0 },
    };
  }

  async function sendEdit() {
    if (!ticket || !draft) return;
    const out = await run("learn", () => learnOne(ticket, rules, draft, edited));
    if (!out) return;
    setRules(out.rules);
    setHistory((h) => [...h, out.point]);
    setIdx((i) => i + 1);
    setDraft(null);
    setReplay(null);
    setNote(
      out.ruleTexts.length
        ? `Learned ${out.ruleTexts.length} new rule${out.ruleTexts.length === 1 ? "" : "s"} from your edit.`
        : "This draft already met every check, so nothing new was learned.",
    );
  }

  async function autoRun() {
    await run("auto", async () => {
      let r = rules;
      let h = history;
      let i = idx;
      while (i < TRAINING_TICKETS.length) {
        const t = TRAINING_TICKETS[i];
        const d = await post<DraftOutcome>("/api/draft", { ticketId: t.id, rules: r });
        const out = await learnOne(t, r, d, t.agentEdit);
        r = out.rules;
        h = [...h, out.point];
        i += 1;
        setRules(r);
        setHistory(h);
        setIdx(i);
      }
      setDraft(null);
      setReplay(null);
      setNote("Handled the remaining tickets using the suggested edits.");
    });
  }

  async function runReplay() {
    const out = await run("replay", () => post<ReplayResult>("/api/replay", { rules }));
    if (out) setReplay(out);
  }

  function revertRule(id: string) {
    setRules((rs) => removeRule(rs, id));
    setReplay(null);
    setDraft(null);
    setNote("Rule removed. Run the replay again to see the effect.");
  }

  function reset() {
    setRules([]);
    setIdx(0);
    setHistory([]);
    setDraft(null);
    setReplay(null);
    setNote(null);
    setError(null);
  }

  const mode = !status
    ? "Checking mode"
    : status.live
      ? "Live model on"
      : status.recordedReplies > 0
        ? "Replaying a recorded run"
        : "No recorded run yet";

  const points = history.map((h) => ({ label: h.ticketId, value: h.rate }));

  return (
    <main className="page">
      <header className="top">
        <div>
          <h1>EditLoop</h1>
          <p className="tagline">Every edit you make becomes a rule you can read, check and undo.</p>
        </div>
        <span className="badge">{mode}</span>
      </header>

      {error && (
        <div className="error" role="alert">
          {error}
        </div>
      )}

      <div className="grid3">
        <aside className="panel" aria-label="Ticket queue">
          <h2>Tickets</h2>
          <ul className="queue">
            {TRAINING_TICKETS.map((t, i) => (
              <li key={t.id} className={i === idx ? "current" : i < idx ? "done" : ""}>
                <span>{t.customer}</span>
                <span>{i < idx ? "done" : i === idx ? "now" : ""}</span>
              </li>
            ))}
            {HELD_OUT_TICKETS.map((t) => (
              <li key={t.id} className="heldout">
                <span>{t.customer}</span>
                <span>held out</span>
              </li>
            ))}
          </ul>
          <div className="row">
            <button className="small" onClick={reset} disabled={!!busy}>
              Start over
            </button>
          </div>
        </aside>

        <section className="panel" aria-label="Current ticket">
          {finished || !ticket ? (
            <>
              <h2>All {TRAINING_TICKETS.length} tickets handled</h2>
              <p>
                {rules.length} rule{rules.length === 1 ? "" : "s"} learned. Now replay the {HELD_OUT_TICKETS.length}{" "}
                held-out tickets, which were never used for learning, with and without the rules.
              </p>
              <div className="row">
                <button className="primary" onClick={runReplay} disabled={!!busy}>
                  {busy === "replay" ? "Replaying..." : "Replay held-out tickets"}
                </button>
              </div>
            </>
          ) : (
            <>
              <h2>
                Ticket {idx + 1} of {TRAINING_TICKETS.length}: {ticket.subject}
              </h2>
              <div className="label">{ticket.customer} wrote</div>
              <div className="customer">{ticket.body}</div>

              {!draft ? (
                <div className="row">
                  <button className="primary" onClick={getDraft} disabled={!!busy}>
                    {busy === "draft" ? "Drafting..." : "Get AI draft"}
                  </button>
                  <button onClick={autoRun} disabled={!!busy}>
                    {busy === "auto" ? "Working..." : "Auto-handle the rest"}
                  </button>
                </div>
              ) : (
                <>
                  <div className="label">AI draft{draft.appliedRuleIds.length ? " (used learned rules)" : ""}</div>
                  <div className="draftbox">{draft.reply}</div>
                  <Checks failed={draft.failed} policies={ticket.policies} />

                  <div className="label">Your edit (prefilled with a suggested edit, change it if you like)</div>
                  <textarea value={edited} onChange={(e) => setEdited(e.target.value)} aria-label="Edited reply" />
                  <div className="row">
                    <button className="primary" onClick={sendEdit} disabled={!!busy || !edited.trim()}>
                      {busy === "learn" ? "Learning..." : "Send my edit and learn"}
                    </button>
                  </div>
                </>
              )}
            </>
          )}
          {note && <div className="note">{note}</div>}
        </section>

        <aside className="panel" aria-label="Learned rules">
          <h2>Learned rules</h2>
          {rules.length === 0 ? (
            <p className="empty">No rules yet. Edit a draft and the rule behind your edit shows up here.</p>
          ) : (
            <ul className="rules">
              {rules.map((r) => {
                const applied = !!draft && draft.appliedRuleIds.includes(r.id);
                return (
                  <li key={r.id} className={`rule ${applied ? "applied" : ""}`}>
                    {applied && <div className="applied-tag">Applied to this draft</div>}
                    <div>{r.text}</div>
                    <div className="meta">
                      <span>
                        from {r.sourceTicketId} · used {r.fired} · kept {r.accepted}
                      </span>
                      <button className="small danger" onClick={() => revertRule(r.id)} disabled={!!busy}>
                        Delete
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </aside>
      </div>

      <div className="bottom">
        <section className="panel" aria-label="Edit rate chart">
          <h2>Share of policy checks missed, ticket by ticket</h2>
          <Chart points={points} />
          <p className="empty">Lower means fewer edits needed. Scored against house rules the AI is never shown.</p>
        </section>

        <section className="panel" aria-label="Held-out replay">
          <h2>Held-out replay</h2>
          {!replay ? (
            <p className="empty">
              Finish the tickets, then replay unseen ones with and without the learned rules.
            </p>
          ) : (
            <>
              <div className="compare">
                <div>
                  <div className="num bad">{pct(replay.baselineRate)}</div>
                  <div className="empty">missed without rules</div>
                </div>
                <div>
                  <div className={`num ${replay.learnedRate <= replay.baselineRate ? "good" : "bad"}`}>
                    {pct(replay.learnedRate)}
                  </div>
                  <div className="empty">missed with rules</div>
                </div>
              </div>
              {replay.rows.map((row) => {
                const t = HELD_OUT_TICKETS.find((x) => x.id === row.ticketId)!;
                const usedRules = rules.filter((r) => row.learned.appliedRuleIds.includes(r.id));
                return (
                  <div key={row.ticketId} className="replay-row">
                    <strong>{t.customer}</strong>: {t.subject}
                    <div className="label">Without rules</div>
                    <Checks failed={row.baseline.failed} policies={t.policies} />
                    <div className="label">With rules</div>
                    <Checks failed={row.learned.failed} policies={t.policies} />
                    {row.regressed.length > 0 && (
                      <div className="regress">
                        A rule made this reply worse ({row.regressed.map((id) => POLICIES[id]?.label ?? id).join(", ")}).
                        {usedRules.length > 0 ? (
                          usedRules.map((r) => (
                            <div key={r.id} className="row">
                              <span>{r.text}</span>
                              <button className="small danger" onClick={() => revertRule(r.id)} disabled={!!busy}>
                                Revert this rule
                              </button>
                            </div>
                          ))
                        ) : (
                          <div>The draft did not say which rule it used.</div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </>
          )}
        </section>
      </div>
    </main>
  );
}
