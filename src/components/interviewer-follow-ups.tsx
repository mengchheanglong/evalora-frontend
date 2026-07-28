"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@/components/icons";
import { apiGet, apiPost, getErrorMessage } from "@/lib/api";
import { useInterviewSocket } from "@/components/use-interview-socket";
import { ConnectionPill, PresenceChips } from "@/components/realtime-indicators";
import type { AssessmentTemplate, CandidateResponse, InterviewerFollowUp, SessionStatus } from "@/lib/types";

const POLL_MS = 30_000; // safety net only — live push is the primary channel
const QUESTION_MAX = 2_000;

type Props = {
  sessionId: string;
  sessionStatus: SessionStatus;
  template: AssessmentTemplate;
  responses: CandidateResponse[];
};

/**
 * Interviewer evidence view: the candidate's raw answers per module, with a
 * private composer to ask a human follow-up on any answer, plus the queue of
 * sent/answered/cancelled questions.
 */
export function InterviewerFollowUps({ sessionId, sessionStatus, template, responses }: Props) {
  const [followUps, setFollowUps] = useState<InterviewerFollowUp[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [composerFor, setComposerFor] = useState<string | null>(null);
  const isLive = sessionStatus === "in_progress";

  const load = useCallback(async () => {
    try {
      setFollowUps(await apiGet<InterviewerFollowUp[]>(`/interviewer-follow-ups/session/${encodeURIComponent(sessionId)}`));
      setError("");
    } catch (requestError) {
      setError(getErrorMessage(requestError, "Unable to load interviewer questions."));
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => { void load(); }, [load]);

  // Live channel: any question/answer event refreshes the queue immediately.
  const { connection, participants, latencyMs } = useInterviewSocket({
    sessionId,
    enabled: isLive,
    onEvent: () => { void load(); },
  });

  // Poll while the candidate is still working so answers appear without a refresh.
  useEffect(() => {
    if (!isLive) return;
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void load();
    }, POLL_MS);
    return () => window.clearInterval(timer);
  }, [isLive, load]);

  const byParent = useMemo(() => {
    const map = new Map<string, InterviewerFollowUp[]>();
    for (const followUp of followUps) {
      const key = followUp.parentQuestionId ?? "__unattached";
      map.set(key, [...(map.get(key) ?? []), followUp]);
    }
    return map;
  }, [followUps]);

  const answerByQuestion = useMemo(() => {
    const map = new Map<string, CandidateResponse>();
    for (const response of responses) if (response.questionId) map.set(response.questionId, response);
    return map;
  }, [responses]);

  const pendingRequired = followUps.filter((item) => item.required && item.status === "sent").length;

  return (
    <div className="space-y-4">
      <section className="card rounded-xl border-[var(--theme-border)] p-4 shadow-[var(--shadow-card)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-[var(--theme-heading)]">Candidate responses &amp; follow-ups</h2>
            <p className="mt-1 text-xs text-[var(--theme-muted)]">
              The candidate&apos;s own words. Ask a follow-up on any answer — your draft stays private until you send it.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-2 rounded-full bg-[var(--theme-panel-soft)] px-3 py-1.5 text-[11px] font-semibold text-[var(--theme-muted)]">
              <Icon name="message" size={13} />
              {followUps.length} sent{pendingRequired ? ` · ${pendingRequired} awaiting answer` : ""}
            </span>
            {isLive ? <PresenceChips participants={participants} /> : null}
            {isLive ? <ConnectionPill latencyMs={latencyMs} state={connection} /> : null}
          </div>
        </div>
        {!isLive ? (
          <p className="mt-3 rounded-lg bg-[var(--theme-panel-soft)] px-3 py-2 text-[11px] text-[var(--theme-muted)]">
            This session is {sessionStatus.replace("_", " ")} — it no longer accepts new questions.
          </p>
        ) : null}
        {error ? <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-[11px] text-rose-700">{error}</p> : null}
      </section>

      {loading ? (
        <p className="px-1 text-xs text-[var(--theme-muted)]">Loading responses…</p>
      ) : (
        (template.modules ?? []).map((module) => {
          const questions = module.questions ?? [];
          if (!questions.length) return null;
          return (
            <section className="card rounded-xl border-[var(--theme-border)] p-4 shadow-[var(--shadow-card)]" key={module.id}>
              <div className="mb-3 flex items-center gap-2">
                <span className="rounded-md bg-[var(--color-primary-50)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[var(--color-primary-700)]">
                  {String(module.type ?? "").replaceAll("_", " ") || "Module"}
                </span>
                <h3 className="text-sm font-bold text-[var(--theme-heading)]">{module.title}</h3>
              </div>

              <div className="space-y-3">
                {questions.map((question) => {
                  const answer = answerByQuestion.get(question.id);
                  const thread = byParent.get(question.id) ?? [];
                  return (
                    <article className="rounded-lg border border-[var(--theme-border)] p-3" key={question.id}>
                      <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--theme-faint)]">Assessment question</p>
                      <p className="mt-1 text-[13px] font-semibold text-[var(--theme-heading)]">{question.questionText}</p>

                      <div className="mt-2 rounded-lg bg-[var(--theme-panel-soft)] px-3 py-2">
                        <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--theme-faint)]">Candidate answer</p>
                        <p className="mt-1 whitespace-pre-wrap text-xs leading-5 text-[var(--theme-text)]">
                          {answer?.responseText?.trim() || <span className="text-[var(--theme-faint)]">Not answered yet.</span>}
                        </p>
                      </div>

                      {thread.map((followUp) => (
                        <FollowUpThreadItem followUp={followUp} key={followUp.id} onChanged={load} sessionId={sessionId} />
                      ))}

                      {isLive ? (
                        composerFor === question.id ? (
                          <Composer
                            moduleId={module.id}
                            onCancel={() => setComposerFor(null)}
                            onSent={async () => { setComposerFor(null); await load(); }}
                            parentQuestionId={question.id}
                            sessionId={sessionId}
                          />
                        ) : (
                          <button
                            className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-[var(--theme-border)] px-2.5 py-1.5 text-[11px] font-semibold text-[var(--color-primary-700)] transition hover:bg-[var(--theme-panel-soft)]"
                            onClick={() => setComposerFor(question.id)}
                            type="button"
                          >
                            <Icon name="message" size={13} /> Ask follow-up
                          </button>
                        )
                      ) : null}
                    </article>
                  );
                })}
              </div>
            </section>
          );
        })
      )}

      {(byParent.get("__unattached") ?? []).length ? (
        <section className="card rounded-xl border-[var(--theme-border)] p-4 shadow-[var(--shadow-card)]">
          <h3 className="mb-2 text-sm font-bold text-[var(--theme-heading)]">General follow-ups</h3>
          {(byParent.get("__unattached") ?? []).map((followUp) => (
            <FollowUpThreadItem followUp={followUp} key={followUp.id} onChanged={load} sessionId={sessionId} />
          ))}
        </section>
      ) : null}
    </div>
  );
}

function FollowUpThreadItem({ followUp, sessionId, onChanged }: { followUp: InterviewerFollowUp; sessionId: string; onChanged: () => Promise<void> }) {
  const [busy, setBusy] = useState(false);
  const tone =
    followUp.status === "answered"
      ? "border-emerald-300/60 bg-emerald-50/60"
      : followUp.status === "cancelled"
        ? "border-[var(--theme-border)] bg-[var(--theme-panel-soft)] opacity-70"
        : "border-violet-300/60 bg-violet-50/50";

  async function cancel() {
    setBusy(true);
    try {
      await apiPost(`/interviewer-follow-ups/session/${encodeURIComponent(sessionId)}/${encodeURIComponent(followUp.id)}/cancel`);
      await onChanged();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={`mt-2 rounded-lg border px-3 py-2 ${tone}`}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-bold text-violet-700">
          <Icon name="user" size={11} /> Interviewer follow-up
        </span>
        <span className="text-[10px] text-[var(--theme-faint)]">by {followUp.askedBy.name}</span>
        <span className="text-[10px] font-semibold text-[var(--theme-muted)]">{followUp.required ? "Required" : "Optional"}</span>
        <span className="ml-auto text-[10px] font-bold uppercase tracking-wide text-[var(--theme-muted)]">{followUp.status}</span>
      </div>
      <p className="mt-1.5 whitespace-pre-wrap text-xs font-semibold leading-5 text-[var(--theme-heading)]">{followUp.questionText}</p>
      {followUp.answerText && followUp.status === "answered" ? (
        <p className="mt-1.5 whitespace-pre-wrap rounded-md bg-[var(--theme-panel)] px-2.5 py-2 text-xs leading-5 text-[var(--theme-text)]">
          {followUp.answerText}
        </p>
      ) : null}
      {followUp.status === "sent" ? (
        <button
          className="mt-2 text-[11px] font-semibold text-rose-600 transition hover:underline disabled:opacity-50"
          disabled={busy}
          onClick={() => void cancel()}
          type="button"
        >
          {busy ? "Cancelling…" : "Cancel question"}
        </button>
      ) : null}
    </div>
  );
}

function Composer({
  sessionId,
  moduleId,
  parentQuestionId,
  onSent,
  onCancel,
}: {
  sessionId: string;
  moduleId?: string;
  parentQuestionId?: string;
  onSent: () => Promise<void>;
  onCancel: () => void;
}) {
  const [text, setText] = useState("");
  const [required, setRequired] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  // Stable per composer instance so a retry after a network error cannot queue
  // the same question twice.
  const idempotencyKey = useRef(cryptoRandomId());

  async function send() {
    if (text.trim().length < 3 || sending) return;
    setSending(true);
    setError("");
    try {
      await apiPost(`/interviewer-follow-ups/session/${encodeURIComponent(sessionId)}`, {
        moduleId,
        parentQuestionId,
        questionText: text.trim(),
        required,
        idempotencyKey: idempotencyKey.current,
      });
      setText("");
      await onSent();
    } catch (requestError) {
      // Draft is deliberately preserved so the interviewer never loses wording.
      setError(getErrorMessage(requestError, "Question was not sent. Your draft is preserved."));
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="mt-2 rounded-lg border border-violet-300/60 bg-violet-50/40 p-3">
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-bold text-violet-700">
          <Icon name="lock" size={11} /> Private draft
        </span>
        <span className="text-[10px] text-[var(--theme-faint)]">The candidate sees nothing until you send.</span>
      </div>
      <textarea
        autoFocus
        className="control mt-2 min-h-[84px] rounded-lg text-xs"
        maxLength={QUESTION_MAX}
        onChange={(event) => setText(event.target.value)}
        onKeyDown={(event) => {
          if ((event.metaKey || event.ctrlKey) && event.key === "Enter") void send();
        }}
        placeholder="Ask the candidate to go deeper on this answer…"
        value={text}
      />
      {error ? <p className="mt-1.5 text-[11px] text-rose-600">{error}</p> : null}
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-[11px] font-semibold text-[var(--theme-muted)]">
          <input checked={required} onChange={(event) => setRequired(event.target.checked)} type="checkbox" />
          Required before they can submit
        </label>
        <span className="text-[10px] text-[var(--theme-faint)]">{text.length}/{QUESTION_MAX}</span>
        <div className="ml-auto flex items-center gap-2">
          <button className="button-secondary h-8 rounded-lg px-3 text-[11px]" onClick={onCancel} type="button">Cancel</button>
          <button
            className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-violet-600 px-3 text-[11px] font-bold text-white transition hover:bg-violet-700 disabled:opacity-50"
            disabled={sending || text.trim().length < 3}
            onClick={() => void send()}
            type="button"
          >
            {sending ? "Sending…" : "Send question"}
          </button>
        </div>
      </div>
    </div>
  );
}

function cryptoRandomId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  return `ifu-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
