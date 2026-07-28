"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Icon } from "@/components/icons";
import { apiGet, apiPut, getErrorMessage } from "@/lib/api";
import { useInterviewSocket } from "@/components/use-interview-socket";
import type { InterviewerFollowUp } from "@/lib/types";

const POLL_MS = 30_000; // safety net only — live push is the primary channel
const AUTOSAVE_MS = 800;
const RELATIVE_TICK_MS = 30_000;
// The DTO falls back to the epoch when a timestamp is missing; rendering that as
// "20000 days ago" is worse than showing nothing.
const EARLIEST_REAL_TIMESTAMP_MS = Date.UTC(2000, 0, 1);

type SaveState = "idle" | "saving" | "saved" | "error";

/**
 * Candidate-side queue of questions a human interviewer sent during this
 * session. Polling is the delivery mechanism (REST is authoritative), so this
 * keeps working when a live connection is unavailable.
 */
export function useInterviewerFollowUps(accessCode: string, active: boolean) {
  const [followUps, setFollowUps] = useState<InterviewerFollowUp[]>([]);
  const [arrival, setArrival] = useState<InterviewerFollowUp | null>(null);
  // Ids the candidate has already been shown. Seeded from the first load so a
  // page refresh never re-announces questions they have seen before.
  const seenIds = useRef<Set<string> | null>(null);

  // Returns the freshly fetched queue. A caller that reloads and then needs to act
  // on the result cannot read it from this hook's return value in the same tick —
  // that value belongs to the render it closed over — so it comes back directly.
  const load = useCallback(async (): Promise<InterviewerFollowUp[]> => {
    if (!accessCode) return [];
    try {
      const next = await apiGet<InterviewerFollowUp[]>(`/interviewer-follow-ups/access/${encodeURIComponent(accessCode)}`);
      setFollowUps(next);
      const known = seenIds.current;
      if (!known) {
        seenIds.current = new Set(next.map((item) => item.id));
        return next;
      }
      const fresh = next.filter((item) => item.status === "sent" && !known.has(item.id));
      for (const item of next) known.add(item.id);
      if (fresh.length) setArrival(fresh[fresh.length - 1]);
      return next;
    } catch {
      // Silent: a transient poll failure must never disturb the assessment.
      return [];
    }
  }, [accessCode]);

  useEffect(() => {
    // A different invitation is a different queue — forget what was announced.
    seenIds.current = null;
    setArrival(null);
    void load();
  }, [load]);

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

  const dismissArrival = useCallback(() => setArrival(null), []);

  const pending = followUps.filter((item) => item.status === "sent");
  const pendingRequired = pending.filter((item) => item.required);
  return { followUps, pending, pendingRequired, arrival, dismissArrival, reload: load, connection, participants, latencyMs };
}

export function CandidateInterviewerQuestions({
  accessCode,
  followUps,
  onChanged,
  disabled,
  highlightId,
}: {
  accessCode: string;
  followUps: InterviewerFollowUp[];
  /** Refresh the queue. The reloaded list is returned but not needed here. */
  onChanged: () => Promise<unknown>;
  disabled?: boolean;
  /** Question to ring and scroll to — a fresh arrival, or the one blocking submission. */
  highlightId?: string;
}) {
  const visible = followUps.filter((item) => item.status !== "cancelled");
  const cancelled = followUps.filter((item) => item.status === "cancelled");

  if (!visible.length && !cancelled.length) return null;

  return (
    <section aria-labelledby="interviewer-questions-heading" className="mx-auto max-w-[860px]">
      <h2 className="mb-3 flex items-center gap-2" id="interviewer-questions-heading">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-100 px-2.5 py-1 text-[11px] font-bold text-violet-700">
          <Icon name="user" size={13} /> Questions from your interviewer
        </span>
      </h2>
      <div className="space-y-3">
        {visible.map((followUp) => (
          <QuestionCard
            accessCode={accessCode}
            disabled={disabled}
            followUp={followUp}
            highlighted={followUp.id === highlightId}
            key={followUp.id}
            onChanged={onChanged}
          />
        ))}
        {cancelled.map((followUp) => (
          <div className="rounded-[10px] border border-neutral-200 bg-neutral-50 px-4 py-3 opacity-70" key={followUp.id}>
            <p className="text-[11px] font-semibold text-neutral-500">This question was withdrawn by the interviewer.</p>
            <p className="mt-1 text-[12px] text-neutral-400 line-through">{followUp.questionText}</p>
            <RelativeTime className="mt-1 block" prefix="Withdrawn" value={followUp.cancelledAt} />
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
  highlighted,
}: {
  accessCode: string;
  followUp: InterviewerFollowUp;
  /** Refresh the queue. The reloaded list is returned but not needed here. */
  onChanged: () => Promise<unknown>;
  disabled?: boolean;
  highlighted?: boolean;
}) {
  const [answer, setAnswer] = useState(followUp.answerText ?? "");
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [savedAt, setSavedAt] = useState<string | undefined>(followUp.answerSavedAt);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cardRef = useRef<HTMLElement>(null);
  const answered = followUp.status === "answered";
  const locked = answered || disabled;

  useEffect(() => () => { if (autosaveTimer.current) clearTimeout(autosaveTimer.current); }, []);

  useEffect(() => {
    if (!highlighted || !cardRef.current) return;
    // Bringing the card into view is enough — moving focus out of a field they
    // are typing in would be a bigger interruption than the one we are fixing.
    const active = document.activeElement;
    if (active instanceof HTMLTextAreaElement || active instanceof HTMLInputElement) return;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    cardRef.current.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "center" });
    // The control that brought them here (the arrival alert, or the review-panel
    // notice) unmounts on the same click, which drops focus to the top of the
    // document — a keyboard user would have to tab through the whole page to get
    // back. Land them on the question instead.
    if (active === null || active === document.body) cardRef.current.focus({ preventScroll: true });
  }, [highlighted]);

  function onType(value: string) {
    setAnswer(value);
    if (locked) return;
    // The write is debounced, so flipping to "Saving…" here would flicker on
    // every keystroke and read as instability. persist() owns that state.
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    autosaveTimer.current = setTimeout(() => void persist(value, false), AUTOSAVE_MS);
  }

  async function persist(value: string, submit: boolean) {
    setSaveState("saving");
    try {
      await apiPut(`/interviewer-follow-ups/access/${encodeURIComponent(accessCode)}/${encodeURIComponent(followUp.id)}/answer`, {
        answerText: value,
        submit,
      });
      setSavedAt(new Date().toISOString());
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
    <article
      className={`rounded-[10px] border p-4 transition focus:outline-none ${answered ? "border-emerald-300 bg-emerald-50/50" : "border-violet-300 bg-violet-50/40"} ${highlighted ? "ring-2 ring-violet-500 ring-offset-2" : ""}`}
      ref={cardRef}
      // Focusable only as a landing target, never a stop in the tab order.
      tabIndex={-1}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[10px] font-bold uppercase tracking-wide text-violet-700">Question from {followUp.askedBy.name}</span>
        <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-bold text-neutral-500 ring-1 ring-neutral-200">
          {followUp.required ? "Required" : "Optional"}
        </span>
        <RelativeTime prefix="Sent" value={followUp.sentAt} />
        {answered ? <span className="ml-auto text-[10px] font-bold uppercase text-emerald-700">Answered</span> : null}
      </div>
      <p className="mt-2 whitespace-pre-wrap text-[15px] font-bold leading-6 text-neutral-950">{followUp.questionText}</p>

      {answered ? (
        <>
          <p className="mt-3 whitespace-pre-wrap rounded-[8px] bg-white px-3 py-2.5 text-[13px] leading-6 text-neutral-700">{answer}</p>
          <RelativeTime className="mt-2 block" prefix="You answered" value={followUp.answeredAt} />
        </>
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
            <span className="flex min-w-0 items-center gap-1.5">
              {/* Only the label is live: a ticking relative time inside the region
                  would re-announce itself every minute. */}
              <span className="flex items-center gap-1.5 text-[11px] text-neutral-500" role="status">
                {saveState === "saving" ? "Saving…" : null}
                {saveState === "error" ? <span className="font-semibold text-amber-800">Not saved</span> : null}
                {saveState !== "saving" && saveState !== "error" && savedAt ? (
                  <>
                    <Icon className="text-emerald-600" name="check" size={12} /> Answer saved
                  </>
                ) : null}
              </span>
              {saveState !== "saving" && saveState !== "error" && savedAt ? <RelativeTime prefix="·" value={savedAt} /> : null}
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

/** "2 minutes ago", kept current, with the exact moment in the tooltip. */
function RelativeTime({ value, prefix, className = "" }: { value?: string; prefix: string; className?: string }) {
  const [, setTick] = useState(0);
  useEffect(() => {
    const timer = window.setInterval(() => setTick((count) => count + 1), RELATIVE_TICK_MS);
    return () => window.clearInterval(timer);
  }, []);

  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime()) || date.getTime() < EARLIEST_REAL_TIMESTAMP_MS) return null;
  return (
    <time className={`text-[10px] font-semibold text-neutral-500 ${className}`} dateTime={value} title={absoluteTime(date)}>
      {prefix} {relativeTime(date)}
    </time>
  );
}

function relativeTime(date: Date) {
  const minutes = Math.max(0, Math.round((Date.now() - date.getTime()) / 60_000));
  if (minutes < 1) return "just now";
  if (minutes === 1) return "1 minute ago";
  if (minutes < 60) return `${minutes} minutes ago`;
  const hours = Math.floor(minutes / 60);
  if (hours === 1) return "1 hour ago";
  if (hours < 24) return `${hours} hours ago`;
  const days = Math.floor(hours / 24);
  return days === 1 ? "1 day ago" : `${days} days ago`;
}

function absoluteTime(date: Date) {
  return new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(date);
}
