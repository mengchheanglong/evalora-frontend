"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Icon } from "@/components/icons";
import { apiGet, apiPut, getErrorMessage } from "@/lib/api";
import { useInterviewSocket } from "@/components/use-interview-socket";
import type { InterviewerFollowUp } from "@/lib/types";

const POLL_MS = 30_000; // safety net only — live push is the primary channel
const AUTOSAVE_MS = 800;

type SaveState = "idle" | "saving" | "saved" | "error";

/**
 * Candidate-side queue of questions a human interviewer sent during this
 * session. Polling is the delivery mechanism (REST is authoritative), so this
 * keeps working when a live connection is unavailable.
 */
export function useInterviewerFollowUps(accessCode: string, active: boolean) {
  const [followUps, setFollowUps] = useState<InterviewerFollowUp[]>([]);

  const load = useCallback(async () => {
    if (!accessCode) return;
    try {
      setFollowUps(await apiGet<InterviewerFollowUp[]>(`/interviewer-follow-ups/access/${encodeURIComponent(accessCode)}`));
    } catch {
      // Silent: a transient poll failure must never disturb the assessment.
    }
  }, [accessCode]);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    if (!active) return;
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void load();
    }, POLL_MS);
    const onVisible = () => { if (document.visibilityState === "visible") void load(); };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("online", onVisible);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("online", onVisible);
    };
  }, [active, load]);

  // Live channel: a question pushed by the interviewer appears at once.
  const { connection, participants, latencyMs } = useInterviewSocket({
    accessCode,
    enabled: active,
    onEvent: () => { void load(); },
  });

  const pending = followUps.filter((item) => item.status === "sent");
  const pendingRequired = pending.filter((item) => item.required);
  return { followUps, pending, pendingRequired, reload: load, connection, participants, latencyMs };
}

export function CandidateInterviewerQuestions({
  accessCode,
  followUps,
  onChanged,
  disabled,
}: {
  accessCode: string;
  followUps: InterviewerFollowUp[];
  onChanged: () => Promise<void>;
  disabled?: boolean;
}) {
  const visible = followUps.filter((item) => item.status !== "cancelled");
  const cancelled = followUps.filter((item) => item.status === "cancelled");

  if (!visible.length && !cancelled.length) return null;

  return (
    <section className="mx-auto max-w-[860px]">
      <div className="mb-3 flex items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-100 px-2.5 py-1 text-[11px] font-bold text-violet-700">
          <Icon name="user" size={13} /> Questions from your interviewer
        </span>
      </div>
      <div className="space-y-3">
        {visible.map((followUp) => (
          <QuestionCard accessCode={accessCode} disabled={disabled} followUp={followUp} key={followUp.id} onChanged={onChanged} />
        ))}
        {cancelled.map((followUp) => (
          <div className="rounded-[10px] border border-neutral-200 bg-neutral-50 px-4 py-3 opacity-70" key={followUp.id}>
            <p className="text-[11px] font-semibold text-neutral-500">This question was withdrawn by the interviewer.</p>
            <p className="mt-1 text-[12px] text-neutral-400 line-through">{followUp.questionText}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function QuestionCard({
  accessCode,
  followUp,
  onChanged,
  disabled,
}: {
  accessCode: string;
  followUp: InterviewerFollowUp;
  onChanged: () => Promise<void>;
  disabled?: boolean;
}) {
  const [answer, setAnswer] = useState(followUp.answerText ?? "");
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const answered = followUp.status === "answered";
  const locked = answered || disabled;

  useEffect(() => () => { if (autosaveTimer.current) clearTimeout(autosaveTimer.current); }, []);

  function onType(value: string) {
    setAnswer(value);
    if (locked) return;
    setSaveState("saving");
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    autosaveTimer.current = setTimeout(() => void persist(value, false), AUTOSAVE_MS);
  }

  async function persist(value: string, submit: boolean) {
    try {
      await apiPut(`/interviewer-follow-ups/access/${encodeURIComponent(accessCode)}/${encodeURIComponent(followUp.id)}/answer`, {
        answerText: value,
        submit,
      });
      setSaveState("saved");
      setError("");
      if (submit) await onChanged();
      return true;
    } catch (requestError) {
      setSaveState("error");
      // The typed text stays on screen — never claim success the server didn't confirm.
      setError(getErrorMessage(requestError, submit ? "Answer was not sent. Try again." : "Answer could not be saved. Your text remains here."));
      return false;
    }
  }

  async function submit() {
    if (!answer.trim() || submitting || locked) return;
    setSubmitting(true);
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    await persist(answer, true);
    setSubmitting(false);
  }

  return (
    <article className={`rounded-[10px] border p-4 ${answered ? "border-emerald-300 bg-emerald-50/50" : "border-violet-300 bg-violet-50/40"}`}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[10px] font-bold uppercase tracking-wide text-violet-700">Question from {followUp.askedBy.name}</span>
        <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-bold text-neutral-500 ring-1 ring-neutral-200">
          {followUp.required ? "Required" : "Optional"}
        </span>
        {answered ? <span className="ml-auto text-[10px] font-bold uppercase text-emerald-700">Answered</span> : null}
      </div>
      <p className="mt-2 whitespace-pre-wrap text-[15px] font-bold leading-6 text-neutral-950">{followUp.questionText}</p>

      {answered ? (
        <p className="mt-3 whitespace-pre-wrap rounded-[8px] bg-white px-3 py-2.5 text-[13px] leading-6 text-neutral-700">{answer}</p>
      ) : (
        <>
          <textarea
            className="control mt-3 min-h-[120px] text-[13px] leading-6"
            maxLength={12_000}
            onChange={(event) => onType(event.target.value)}
            placeholder="Answer your interviewer…"
            readOnly={locked}
            value={answer}
          />
          {error ? <p className="mt-2 rounded-[6px] bg-amber-50 px-3 py-2 text-[11px] text-amber-800">{error}</p> : null}
          <div className="mt-3 flex items-center justify-between gap-3">
            <span className="text-[11px] text-neutral-500">
              {saveState === "saving" ? "Saving…" : saveState === "saved" ? "Answer saved" : saveState === "error" ? "Not saved" : ""}
            </span>
            <button
              className="inline-flex h-10 items-center gap-1.5 rounded-[8px] bg-violet-600 px-4 text-[12px] font-bold text-white transition hover:bg-violet-700 disabled:opacity-50"
              disabled={submitting || locked || !answer.trim()}
              onClick={() => void submit()}
              type="button"
            >
              {submitting ? "Sending…" : "Send answer"}
            </button>
          </div>
        </>
      )}
    </article>
  );
}
