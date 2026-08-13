"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Icon, type IconName } from "@/components/icons";
import { useAuth } from "@/components/auth-provider";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { ConnectionPill, PresenceChips } from "@/components/realtime-indicators";
import { EmptyState, ErrorState, InlineAlert } from "@/components/ui-states";
import { useInterviewSocket } from "@/components/use-interview-socket";
import { apiGet, apiPost, getErrorMessage } from "@/lib/api";


import type {
  IntegrityEvent,
  JsonValue,
  SessionTranscript,
  TranscriptCodeArtifact,
  TranscriptCounts,
  TranscriptEntry,
  TranscriptOrigin,
  TranscriptSourceCounts,
  TranscriptTruncation,
  SessionStatus,
} from "@/lib/types";

const REFRESH_DEBOUNCE_MS = 600;
const LIVE_RECONCILE_MS = 3_000;
const QUESTION_MAX = 2_000;

type Props = {
  onStatusChange?: (status: SessionStatus) => void;
  sessionId: string;
};

type OriginMeta = {
  label: string;
  icon: IconName;
  badge: string;
  countKey: keyof TranscriptCounts;
};

const ORIGIN_META: Record<TranscriptOrigin, OriginMeta> = {
  template: {
    label: "Prebuilt",
    icon: "clipboard",
    badge: "bg-sky-100 text-sky-700",
    countKey: "template",
  },
  ai_adaptive: {
    label: "AI follow-up",
    icon: "sparkle",
    badge: "bg-amber-100 text-amber-700",
    countKey: "aiAdaptive",
  },
  interviewer_follow_up: {
    label: "Interviewer follow-up",
    icon: "user",
    badge: "bg-violet-100 text-violet-700",
    countKey: "interviewerFollowUp",
  },
  code_submission: {
    label: "Code",
    icon: "code",
    badge: "bg-emerald-100 text-emerald-700",
    countKey: "codeSubmission",
  },
};

const ORIGIN_ORDER: TranscriptOrigin[] = [
  "template",
  "ai_adaptive",
  "interviewer_follow_up",
  "code_submission",
];

const OMITTED_KEY_BY_ORIGIN: Record<
  TranscriptOrigin,
  keyof TranscriptSourceCounts
> = {
  template: "responses",
  ai_adaptive: "aiMessages",
  interviewer_follow_up: "interviewerFollowUps",
  code_submission: "codeSubmissions",
};

type Truncation = {
  truncated: boolean;
  dropped: Array<{
    origin: TranscriptOrigin;
    count: number;
  }>;
};

export function SessionTranscriptView({
  onStatusChange,
  sessionId,
}: Props) {
  const { user } = useAuth();

  const [transcript, setTranscript] =
    useState<SessionTranscript | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const controller = useRef<AbortController | null>(null);
  const mounted = useRef(true);
  const refreshTimer = useRef<number | null>(null);

  const [composerFor, setComposerFor] =
    useState<string | null>(null);

  useEffect(() => {
    mounted.current = true;

    return () => {
      mounted.current = false;
      controller.current?.abort();
    };
  }, []);

  const load = useCallback(
    async (background = false) => {
      controller.current?.abort();

      const abort = new AbortController();
      controller.current = abort;

      const current = () =>
        mounted.current &&
        !abort.signal.aborted &&
        controller.current === abort;

      if (!background) {
        setLoading(true);
      }

      try {
        const loaded =
          await apiGet<SessionTranscript>(
            `/sessions/${encodeURIComponent(
              sessionId,
            )}/transcript`,
            {
              signal: abort.signal,
            },
          );

        if (!current()) return;

        setTranscript(loaded);
        onStatusChange?.(loaded.status);
        setError("");
      } catch (requestError) {
        if (!current()) return;

        if (!background) {
          setError(
            getErrorMessage(
              requestError,
              "Unable to load the transcript for this session.",
            ),
          );
        }
      } finally {
        if (current()) {
          setLoading(false);
        }

        if (controller.current === abort) {
          controller.current = null;
        }
      }
    },
    [onStatusChange, sessionId],
  );

  useEffect(() => {
    void load();
  }, [load]);

  const scheduleRefresh = useCallback(() => {
    if (refreshTimer.current !== null) return;

    refreshTimer.current = window.setTimeout(() => {
      refreshTimer.current = null;
      void load(true);
    }, REFRESH_DEBOUNCE_MS);
  }, [load]);

  useEffect(
    () => () => {
      if (refreshTimer.current === null) return;

      window.clearTimeout(refreshTimer.current);
      refreshTimer.current = null;
    },
    [scheduleRefresh],
  );

  const {
    connection,
    participants,
    latencyMs,
  } = useInterviewSocket({
    sessionId,
    enabled: transcript?.status === "in_progress",
    onEvent: scheduleRefresh,
  });

  const [showFloatingLive, setShowFloatingLive] =
    useState(false);

  useEffect(() => {
    if (transcript?.status !== "in_progress") {
      setShowFloatingLive(false);
      return;
    }

    const update = () =>
      setShowFloatingLive(window.scrollY > 96);

    update();

    window.addEventListener(
      "scroll",
      update,
      { passive: true },
    );

    return () =>
      window.removeEventListener("scroll", update);
  }, [transcript?.status]);

  useEffect(() => {
    if (transcript?.status !== "in_progress") {
      return;
    }

    const reconcile = () => {
      if (document.visibilityState !== "visible") {
        return;
      }

      if (!controller.current) {
        void load(true);
      }
    };

    const timer = window.setInterval(
      reconcile,
      LIVE_RECONCILE_MS,
    );

    document.addEventListener(
      "visibilitychange",
      reconcile,
    );

    return () => {
      window.clearInterval(timer);
      document.removeEventListener(
        "visibilitychange",
        reconcile,
      );
    };
  }, [load, transcript?.status]);

  const groups = useMemo(
    () => groupByModule(transcript?.entries ?? []),
    [transcript],
  );

  const truncation = useMemo(
    () => readTruncation(transcript),
    [transcript],
  );

  if (loading) {
    return (
      <p className="px-1 text-xs text-[var(--theme-muted)]">
        Loading transcript…
      </p>
    );
  }

  if (error) {
    return (
      <ErrorState
        message={error}
        onRetry={() => void load()}
      />
    );
  }

  if (!transcript) {
    return null;
  }

  const unscored = transcript.entries.filter(
    (entry) => !entry.isEvidence,
  ).length;

  const isLive =
    transcript.status === "in_progress";

  const canManageFollowUps =
    transcript.canManageFollowUps === true;

  const currentStage =
    groups.at(-1)?.title ??
    "Waiting for the first response";

  const evidenceNotice = isLive
    ? transcript.entries.length
      ? "Only submitted answers appear here. Scoring starts after the interview is completed."
      : "Submitted answers will appear here as the candidate progresses."
    : transcript.entries.length === 0
      ? "No submitted answers were recorded for this interview."
      : unscored
        ? `${unscored} of these answers are marked "Not scored as evidence" and are shown for context only.`
        : "All submitted answers are available as evidence for report generation.";

return (
  <div className="space-y-4">

    {/* =====================================================
        FLOATING LIVE CONNECTION STATUS
        ===================================================== */}
      {isLive ? (
        <div
          aria-atomic="true"
          aria-live="polite"
          className={`pointer-events-none fixed bottom-5 right-5 z-40 transition-all duration-200 ${
            showFloatingLive
              ? "translate-y-0 opacity-100"
              : "translate-y-2 opacity-0"
          }`}
          role="status"
        >
          <span className="inline-flex rounded-full border border-emerald-200 bg-white/95 p-1 shadow-lg backdrop-blur">
            <ConnectionPill
              latencyMs={latencyMs}
              showLatency={false}
              state={connection}
            />
          </span>
        </div>
      ) : null}

      {/* =====================================================
          INTERVIEW HEADER
          ===================================================== */}
      <section className="card rounded-xl border-[var(--theme-border)] p-4 shadow-[var(--shadow-card)]">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-bold text-[var(--theme-heading)]">
              Interview
            </h2>

            <p className="mt-1 text-xs text-[var(--theme-muted)]">
              {isLive
                ? `Saved turns from ${transcript.candidate.name} appear here as the interview progresses. Live typing is never exposed.`
                : truncation.truncated
                  ? `Part of what ${transcript.candidate.name} answered — this session is too long to show in full, so entries are missing and the order below is not the complete sequence.`
                  : `Every answer ${transcript.candidate.name} gave, in the order it happened.`}{" "}
              Each entry is labelled with the origin of its question.
            </p>
          </div>

          <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
            {isLive ? (
              <PresenceChips
                participants={participants}
              />
            ) : null}

            {isLive ? (
              <ConnectionPill
                latencyMs={latencyMs}
                state={connection}
              />
            ) : null}
          </div>
        </div>

        <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-[var(--theme-border)] pt-3 text-xs sm:grid-cols-4">
          <TranscriptMeta
            label="Template"
            value={transcript.templateTitle ?? "—"}
          />

          {isLive ? (
            <TranscriptMeta
              label="Current stage"
              value={currentStage}
            />
          ) : null}

          {isLive ? (
            <TranscriptMeta
              label="Saved turns"
              value={String(
                transcript.entries.length,
              )}
            />
          ) : null}

          <TranscriptMeta
            label="Started"
            value={formatDateTime(
              transcript.startedAt,
            )}
          />

          {!isLive ? (
            <TranscriptMeta
              label="Completed"
              value={formatDateTime(
                transcript.completedAt,
              )}
            />
          ) : null}

          {transcript.warningCount != null ? (
            <TranscriptMeta
              label="Integrity warnings"
              value={`${transcript.warningCount} of ${transcript.warningLimit ?? 2}`}
            />
          ) : null}
        </dl>

        <ul className="mt-3 flex flex-wrap items-center gap-2">
          {ORIGIN_ORDER.map((origin) => {
            const meta = ORIGIN_META[origin];

            return (
              <li key={origin}>
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${meta.badge}`}
                >
                  <Icon
                    name={meta.icon}
                    size={12}
                  />

                  {meta.label}

                  <span className="tabular-nums opacity-80">
                    {transcript.counts[
                      meta.countKey
                    ]}
                  </span>
                </span>
              </li>
            );
          })}

          <li>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--theme-panel-soft)] px-2.5 py-1 text-xs font-semibold text-[var(--theme-muted)]">
              {transcript.entries.length} turns{" "}
              {truncation.truncated
                ? "shown"
                : "total"}
            </span>
          </li>
        </ul>

        {truncation.truncated ? (
          <div className="mt-3">
            <InlineAlert tone="warning">
              <span className="font-bold">
                This record is incomplete.
              </span>{" "}
              Some of this session&rsquo;s entries are not
              shown here, so it must not be read as everything
              the candidate said.{" "}
              {truncation.dropped.length
                ? `Missing from this view: ${truncation.dropped
                    .map(
                      (item) =>
                        `${item.count} × ${ORIGIN_META[item.origin].label}`,
                    )
                    .join(", ")}.`
                : ""}
            </InlineAlert>
          </div>
        ) : null}

        <p className="mt-3 rounded-lg bg-[var(--theme-panel-soft)] px-3 py-2 text-xs leading-5 text-[var(--theme-muted)]">
          <Icon
            className="mr-1.5 inline align-[-2px] text-[var(--theme-faint)]"
            name="shield"
            size={12}
          />

          {evidenceNotice}
        </p>

        {isLive &&
        !canManageFollowUps ? (
          <p className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--theme-muted)]">
            <Icon name="eye" size={12} />
            View only. Only assigned interviewers can send
            or withdraw live follow-up questions.
          </p>
        ) : null}
      </section>

      {/* =====================================================
          INTEGRITY TIMELINE
          ===================================================== */}

      {transcript.integrityEvents?.length ||
      (transcript.warningCount ?? 0) > 0 ? (
        <IntegrityTimeline
          events={
            transcript.integrityEvents ?? []
          }
          warningCount={
            transcript.warningCount ?? 0
          }
          warningLimit={
            transcript.warningLimit ?? 2
          }
        />
      ) : null}

      {/* =====================================================
          TRANSCRIPT GROUPS
          ===================================================== */}
      {transcript.entries.length ? (
        groups.map((group) => (
          <section
            className="card rounded-xl border-[var(--theme-border)] p-4 shadow-[var(--shadow-card)]"
            key={group.key}
          >
            <div className="mb-3 flex flex-wrap items-center gap-2">
              {group.moduleType ? (
                <span className="rounded-md bg-[var(--color-primary-50)] px-2 py-0.5 text-xs font-bold uppercase tracking-wide text-[var(--color-primary-700)]">
                  {group.moduleType.replaceAll(
                    "_",
                    " ",
                  )}
                </span>
              ) : null}

              <h3 className="text-sm font-bold text-[var(--theme-heading)]">
                {group.title}
              </h3>

              <span className="text-xs text-[var(--theme-faint)]">
                {group.entries.length} entries
              </span>
            </div>

            <ol className="space-y-3">
              {threadTranscriptEntries(
                group.entries,
              ).map(
                ({
                  entry,
                  followUps,
                }) => (
                  <li key={entry.id}>
                    <TranscriptEntryCard
                      composing={
                        composerFor ===
                        entry.id
                      }
                      canManageFollowUps={
                        canManageFollowUps
                      }
                      currentUserId={
                        user?.id
                      }
                      entry={entry}
                      followUps={
                        followUps
                      }
                      isLive={isLive}
                      onComposerChange={(
                        open,
                      ) =>
                        setComposerFor(
                          open
                            ? entry.id
                            : null,
                        )
                      }
                      onChanged={async () => {
                        setComposerFor(
                          null,
                        );
                        await load(true);
                      }}
                      sessionId={
                        sessionId
                      }
                    />
                  </li>
                ),
              )}
            </ol>
          </section>
        ))
      ) : (
        <EmptyState
          description="This session has no recorded answers yet. Prebuilt questions, AI follow-ups, interviewer questions and code submissions appear here as the candidate works."
          icon="message"
          title="Nothing to review yet"
        />
      )}
    </div>
  );
}

/* ============================================================
   TRANSCRIPT ENTRY CARD
   ============================================================ */

function TranscriptEntryCard({
  entry,
  followUps,
  sessionId,
  isLive,
  canManageFollowUps,
  currentUserId,
  composing,
  onComposerChange,
  onChanged,
}: {
  entry: TranscriptEntry;
  followUps: TranscriptEntry[];
  sessionId: string;
  isLive: boolean;
  canManageFollowUps: boolean;
  currentUserId?: string;
  composing: boolean;
  onComposerChange: (open: boolean) => void;
  onChanged: () => Promise<void>;
}) {
  const meta = ORIGIN_META[entry.origin];

  const answer =
    entry.answerText?.trim();

  const timestamp = formatDateTime(
    entry.answeredAt ??
      entry.askedAt,
  );

  const [cancelling, setCancelling] =
    useState(false);

  const [actionError, setActionError] =
    useState("");

  const canAsk =
    canManageFollowUps &&
    isLive &&
    entry.origin !==
      "interviewer_follow_up" &&
    Boolean(
      answer || entry.code,
    ) &&
    Boolean(entry.questionId) &&
    Boolean(entry.moduleId);

  const canWithdraw =
    canManageFollowUps &&
    isLive &&
    entry.status === "sent" &&
    entry.askedBy?.id ===
      currentUserId;

  async function cancelFollowUp() {
    if (cancelling) return;

    setCancelling(true);
    setActionError("");

    try {
      await apiPost(
        `/interviewer-follow-ups/session/${encodeURIComponent(
          sessionId,
        )}/${encodeURIComponent(
          entry.id,
        )}/cancel`,
      );

      await onChanged();
    } catch (requestError) {
      setActionError(
        getErrorMessage(
          requestError,
          "The question could not be cancelled.",
        ),
      );
    } finally {
      setCancelling(false);
    }
  }

  return (
    <article
      className="rounded-lg border border-[var(--theme-border)] p-3"
      id={`transcript-entry-${entry.sequence}`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-bold tabular-nums text-[var(--theme-faint)]">
          <span className="sr-only">
            Transcript line{" "}
          </span>
          #{entry.sequence}
        </span>

        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-bold ${meta.badge}`}
        >
          <Icon
            name={meta.icon}
            size={11}
          />{" "}
          {meta.label}
        </span>

        {entry.askedBy ? (
          <span className="text-xs text-[var(--theme-faint)]">
            asked by{" "}
            {entry.askedBy.name}
          </span>
        ) : null}

        {entry.status ? (
          <span className="text-xs font-bold uppercase tracking-wide text-[var(--theme-muted)]">
            {entry.status}
          </span>
        ) : null}

        {timestamp !== "—" ? (
          <span className="ml-auto text-xs text-[var(--theme-faint)]">
            {timestamp}
          </span>
        ) : null}
      </div>

      <h4 className="mt-1.5 whitespace-pre-wrap text-sm font-semibold leading-5 text-[var(--theme-heading)]">
        {entry.questionText}
      </h4>

      {entry.liveQuestionText ? (
        <details className="mt-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950">
          <summary className="cursor-pointer font-bold">
            Question edited after this answer
          </summary>

          <p className="mt-1 whitespace-pre-wrap leading-5">
            Current template wording:{" "}
            {entry.liveQuestionText}
          </p>
        </details>
      ) : entry.questionTextIsSnapshot ? (
        <p className="mt-1 text-xs font-semibold text-[var(--theme-faint)]">
          Showing the wording asked at the time.
        </p>
      ) : null}

      <div className="mt-2 rounded-lg bg-[var(--theme-panel-soft)] px-3 py-2">
        <p className="text-xs font-bold uppercase tracking-wide text-[var(--theme-faint)]">
          {entry.origin ===
          "code_submission"
            ? "Candidate submission"
            : "Candidate answer"}
        </p>

        {answer ? (
          <p className="mt-1 whitespace-pre-wrap text-xs leading-5 text-[var(--theme-text)]">
            {answer}
          </p>
        ) : entry.code ? (
          <p className="mt-1 text-xs leading-5 text-[var(--theme-muted)]">
            Submitted as code — see below.
          </p>
        ) : (
          <p className="mt-1 text-xs leading-5 text-[var(--theme-faint)]">
            No answer recorded.
          </p>
        )}

        {entry.code ? (
          <CodeArtifact
            code={entry.code}
            sequence={entry.sequence}
          />
        ) : null}
      </div>

      {followUps.length ? (
        <div className="mt-3 rounded-lg bg-violet-50/35 p-3">
          <p className="mb-2 flex items-center gap-1.5 text-xs font-bold text-violet-700">
            <Icon
              name="message"
              size={12}
            />
            Follow-up thread

            <span className="font-semibold text-[var(--theme-faint)]">
              {followUps.length}{" "}
              {followUps.length ===
              1
                ? "question"
                : "questions"}
            </span>
          </p>

          <ol className="space-y-2">
            {followUps.map(
              (followUp) => (
                <li key={followUp.id}>
                  <TranscriptFollowUp
                    entry={followUp}
                    canManageFollowUps={
                      canManageFollowUps
                    }
                    currentUserId={
                      currentUserId
                    }
                    isLive={isLive}
                    onChanged={
                      onChanged
                    }
                    sessionId={
                      sessionId
                    }
                  />
                </li>
              ),
            )}
          </ol>
        </div>
      ) : null}

      {entry.isEvidence ? null : (
        <p className="mt-2 inline-flex items-center gap-1.5 rounded-md border border-dashed border-[var(--theme-border-strong)] px-2 py-1 text-xs font-bold leading-4 text-[var(--theme-muted)]">
          <Icon
            name="shield"
            size={11}
          />{" "}
          Not scored as evidence —
          shown for context only
        </p>
      )}

      {actionError ? (
        <p className="mt-2 text-xs text-rose-600">
          {actionError}
        </p>
      ) : null}

      {canWithdraw &&
      entry.origin ===
        "interviewer_follow_up" ? (
        <button
          className="mt-2 text-xs font-semibold text-rose-600 transition hover:underline disabled:opacity-50"
          disabled={cancelling}
          onClick={() =>
            void cancelFollowUp()
          }
          type="button"
        >
          {cancelling
            ? "Cancelling..."
            : "Cancel question"}
        </button>
      ) : null}

      {canAsk ? (
        composing ? (
          <LiveFollowUpComposer
            moduleId={entry.moduleId}
            onCancel={() =>
              onComposerChange(false)
            }
            onSent={onChanged}
            parentQuestionId={
              entry.questionId
            }
            sessionId={sessionId}
          />
        ) : (
          <button
            className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-[var(--theme-border)] px-2.5 py-1.5 text-xs font-semibold text-[var(--color-primary-700)] transition hover:bg-[var(--theme-panel-soft)]"
            onClick={() =>
              onComposerChange(true)
            }
            type="button"
          >
            <Icon
              name="message"
              size={13}
            />{" "}
            {followUps.length
              ? "Ask another follow-up"
              : "Ask live follow-up"}
          </button>
        )
      ) : null}
    </article>
  );
}

/* ============================================================
   FOLLOW-UP
   ============================================================ */

function TranscriptFollowUp({
  entry,
  sessionId,
  isLive,
  canManageFollowUps,
  currentUserId,
  onChanged,
}: {
  entry: TranscriptEntry;
  sessionId: string;
  isLive: boolean;
  canManageFollowUps: boolean;
  currentUserId?: string;
  onChanged: () => Promise<void>;
}) {
  const [cancelling, setCancelling] =
    useState(false);

  const [
    confirmWithdraw,
    setConfirmWithdraw,
  ] = useState(false);

  const [error, setError] =
    useState("");

  const answer =
    entry.answerText?.trim();

  const canWithdraw =
    canManageFollowUps &&
    isLive &&
    entry.status === "sent" &&
    entry.askedBy?.id ===
      currentUserId;

  async function cancel() {
    if (cancelling) return;

    setCancelling(true);
    setError("");

    try {
      await apiPost(
        `/interviewer-follow-ups/session/${encodeURIComponent(
          sessionId,
        )}/${encodeURIComponent(
          entry.id,
        )}/cancel`,
      );

      await onChanged();
    } catch (requestError) {
      setError(
        getErrorMessage(
          requestError,
          "The question could not be cancelled.",
        ),
      );
    } finally {
      setCancelling(false);
    }
  }

  return (
    <article
      className="rounded-lg border border-violet-200 bg-violet-50/35 p-3"
      id={`transcript-entry-${entry.sequence}`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-bold text-violet-700">
          {entry.askedBy?.name ??
            "Interviewer"}{" "}
          asked
        </span>

        {entry.status ? (
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-bold ${
              entry.status ===
              "answered"
                ? "bg-emerald-100 text-emerald-700"
                : entry.status ===
                    "cancelled"
                  ? "bg-neutral-100 text-neutral-500"
                  : "bg-violet-100 text-violet-700"
            }`}
          >
            {entry.status === "sent"
              ? "Waiting for answer"
              : entry.status ===
                  "answered"
                ? "Answered"
                : "Withdrawn"}
          </span>
        ) : null}

        <span className="ml-auto text-xs text-[var(--theme-faint)]">
          {formatDateTime(
            entry.answeredAt ??
              entry.askedAt,
          )}
        </span>
      </div>

      <p className="mt-1.5 whitespace-pre-wrap text-sm font-semibold leading-5 text-[var(--theme-heading)]">
        {entry.questionText}
      </p>

      <div className="mt-2 rounded-md bg-[var(--theme-panel)] px-3 py-2">
        <p className="text-xs font-bold uppercase text-[var(--theme-faint)]">
          Candidate reply
        </p>

        <p
          className={`mt-1 whitespace-pre-wrap text-xs leading-5 ${
            answer
              ? "text-[var(--theme-text)]"
              : "text-[var(--theme-faint)]"
          }`}
        >
          {answer ||
            "Waiting for the candidate to answer."}
        </p>
      </div>

      {!entry.isEvidence ||
      canWithdraw ? (
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
          {!entry.isEvidence ? (
            <p className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--theme-muted)]">
              <Icon
                name="shield"
                size={11}
              />{" "}
              Not scored as evidence
            </p>
          ) : null}

          {canWithdraw ? (
            <button
              className="ml-auto inline-flex h-8 items-center gap-1.5 rounded-lg border border-rose-200 bg-[var(--theme-panel)] px-2.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-50 disabled:opacity-50"
              disabled={cancelling}
              onClick={() =>
                setConfirmWithdraw(
                  true,
                )
              }
              type="button"
            >
              <Icon
                name="trash"
                size={12}
              />{" "}
              Withdraw
            </button>
          ) : null}
        </div>
      ) : null}

      {error ? (
        <p className="mt-2 text-xs text-rose-600">
          {error}
        </p>
      ) : null}

      <ConfirmDialog
        confirmLabel="Withdraw question"
        message="The candidate will no longer be asked to answer it. Questions that were already answered remain part of the interview record."
        onCancel={() =>
          setConfirmWithdraw(false)
        }
        onConfirm={() => {
          setConfirmWithdraw(false);
          void cancel();
        }}
        open={confirmWithdraw}
        pending={cancelling}
        title="Withdraw this follow-up?"
      />
    </article>
  );
}

/* ============================================================
   LIVE FOLLOW-UP COMPOSER
   ============================================================ */

function LiveFollowUpComposer({
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
  const [text, setText] =
    useState("");

  const [required, setRequired] =
    useState(true);

  const [sending, setSending] =
    useState(false);

  const [error, setError] =
    useState("");

  const idempotencyKey =
    useRef(cryptoRandomId());

  async function send() {
    if (
      text.trim().length < 3 ||
      sending
    ) {
      return;
    }

    setSending(true);
    setError("");

    try {
      await apiPost(
        `/interviewer-follow-ups/session/${encodeURIComponent(
          sessionId,
        )}`,
        {
          moduleId,
          parentQuestionId,
          questionText:
            text.trim(),
          required,
          idempotencyKey:
            idempotencyKey.current,
        },
      );

      await onSent();
    } catch (requestError) {
      setError(
        getErrorMessage(
          requestError,
          "Question was not sent. Your draft is preserved.",
        ),
      );
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="mt-2 rounded-lg border border-violet-300/60 bg-violet-50/40 p-3">
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-100 px-2 py-0.5 text-xs font-bold text-violet-700">
          <Icon
            name="lock"
            size={11}
          />{" "}
          Private draft
        </span>

        <span className="text-xs text-[var(--theme-faint)]">
          Visible to the candidate only
          after you send.
        </span>
      </div>

      <textarea
        autoFocus
        className="control mt-2 min-h-[84px] rounded-lg text-xs"
        maxLength={QUESTION_MAX}
        onChange={(event) =>
          setText(event.target.value)
        }
        onKeyDown={(event) => {
          if (
            (event.metaKey ||
              event.ctrlKey) &&
            event.key === "Enter"
          ) {
            void send();
          }
        }}
        placeholder="Ask the candidate to go deeper on this answer..."
        value={text}
      />

      {error ? (
        <p className="mt-1.5 text-xs text-rose-600">
          {error}
        </p>
      ) : null}

      <div className="mt-2 flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-xs font-semibold text-[var(--theme-muted)]">
          <input
            checked={required}
            onChange={(event) =>
              setRequired(
                event.target.checked,
              )
            }
            type="checkbox"
          />
          Required before submission
        </label>

        <span className="text-xs text-[var(--theme-faint)]">
          {text.length}/
          {QUESTION_MAX}
        </span>

        <div className="ml-auto flex items-center gap-2">
          <button
            className="button-secondary h-8 rounded-lg px-3 text-xs"
            onClick={onCancel}
            type="button"
          >
            Cancel
          </button>

          <button
            className="inline-flex h-8 items-center rounded-lg bg-violet-600 px-3 text-xs font-bold text-white transition hover:bg-violet-700 disabled:opacity-50"
            disabled={
              sending ||
              text.trim().length < 3
            }
            onClick={() =>
              void send()
            }
            type="button"
          >
            {sending
              ? "Sending..."
              : "Send question"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   HELPERS
   ============================================================ */

function cryptoRandomId(): string {
  if (
    typeof crypto !==
      "undefined" &&
    typeof crypto.randomUUID ===
      "function"
  ) {
    return crypto.randomUUID();
  }

  return `ifu-${Date.now()}-${Math.random()
    .toString(16)
    .slice(2)}`;
}

function CodeArtifact({
  code,
  sequence,
}: {
  code: TranscriptCodeArtifact;
  sequence: number;
}) {
  const tests = testSummary(
    code.testResults,
  );

  const stdout =
    code.stdout?.trim();

  const stderr =
    code.stderr?.trim();

  return (
    <div className="mt-2 space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-md bg-[var(--theme-panel)] px-2 py-0.5 text-xs font-bold uppercase tracking-wide text-[var(--theme-muted)]">
          <Icon
            name="code"
            size={11}
          />{" "}
          {code.language ||
            "Unknown language"}
        </span>

        {tests ? (
          <span className="text-xs font-semibold text-[var(--theme-muted)]">
            {tests}
          </span>
        ) : null}
      </div>

      <CodeBlock
        label={`Line ${sequence} source code`}
        text={code.sourceCode}
      />

      {stdout ? (
        <CodeBlock
          label={`Line ${sequence} program output`}
          text={stdout}
          title="stdout"
        />
      ) : null}

      {stderr ? (
        <CodeBlock
          label={`Line ${sequence} error output`}
          text={stderr}
          title="stderr"
        />
      ) : null}
    </div>
  );
}

function CodeBlock({
  label,
  text,
  title,
}: {
  label: string;
  text: string;
  title?: string;
}) {
  return (
    <div>
      {title ? (
        <p className="mb-1 text-xs font-bold uppercase tracking-wide text-[var(--theme-faint)]">
          {title}
        </p>
      ) : null}

      <div
        aria-label={label}
        className="max-h-[320px] overflow-auto rounded-[6px] bg-neutral-950 p-2.5"
        role="region"
        tabIndex={0}
      >
        <pre className="font-mono text-xs leading-5 text-slate-200">
          <code>{text}</code>
        </pre>
      </div>
    </div>
  );
}

/* ============================================================
   INTEGRITY TIMELINE (REVIEWER)
   ============================================================ */

const INTEGRITY_TYPE_LABELS: Record<string, string> = {
  visibilitychange: "Tab switch (visibility change)",
  pointer_exit: "Pointer left the assessment window",
  blur: "Window lost focus",
  pagehide: "Page left",
  beforeunload: "Exit attempted",
};

function integrityTypeLabel(type: string): string {
  return INTEGRITY_TYPE_LABELS[type] ?? type;
}

function formatDuration(ms?: number): string | null {
  if (ms == null || !Number.isFinite(ms)) return null;
  const seconds = Math.round(ms / 1000);
  if (seconds < 60) return `${seconds}s away`;
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${minutes}m ${rest}s away`;
}

function IntegrityTimeline({
  events,
  warningCount,
  warningLimit,
}: {
  events: IntegrityEvent[];
  warningCount: number;
  warningLimit: number;
}) {
  const ended = warningCount >= warningLimit;

  return (
    <section className="card rounded-xl border-[var(--theme-border)] p-4 shadow-[var(--shadow-card)]">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <h3 className="flex items-center gap-1.5 text-sm font-bold text-[var(--theme-heading)]">
          <Icon className="text-[var(--theme-faint)]" name="shield" size={14} />
          Integrity monitoring
        </h3>

        <span
          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${
            warningCount > 0
              ? "bg-amber-100 text-amber-800"
              : "bg-[var(--theme-panel-soft)] text-[var(--theme-muted)]"
          }`}
        >
          Official warnings {warningCount} / {warningLimit}
        </span>
      </div>

      {ended ? (
        <p className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-900">
          This session was ended after the official warning limit was reached.
          Review the events below; none of them are proof of cheating on their own.
        </p>
      ) : null}

      {events.length ? (
        <ol className="space-y-2">
          {events.map((event) => {
            const returnedAt = formatDateTime(event.returnedAt);
            const duration = formatDuration(event.durationMs);

            return (
              <li
                className="rounded-lg border border-[var(--theme-border)] bg-[var(--theme-panel)] px-3 py-2.5"
                key={event.id}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold ${
                      event.counted
                        ? "bg-amber-100 text-amber-800"
                        : "bg-[var(--theme-panel-soft)] text-[var(--theme-muted)]"
                    }`}
                  >
                    {event.counted ? "Counted" : "Supporting"}
                  </span>

                  <span className="text-xs font-bold text-[var(--theme-heading)]">
                    {integrityTypeLabel(event.type)}
                  </span>

                  <span className="ml-auto text-xs tabular-nums text-[var(--theme-faint)]">
                    Detected {formatDateTime(event.detectedAt)}
                  </span>
                </div>

                <p className="mt-1 text-xs leading-5 text-[var(--theme-muted)]">
                  {event.reason}
                </p>

                {event.returnedAt || duration ? (
                  <p className="mt-1 text-xs tabular-nums text-[var(--theme-faint)]">
                    {event.returnedAt ? `Returned ${returnedAt}` : ""}
                    {event.returnedAt && duration ? " · " : ""}
                    {duration ?? ""}
                  </p>
                ) : null}
              </li>
            );
          })}
        </ol>
      ) : (
        <p className="text-xs leading-5 text-[var(--theme-muted)]">
          No integrity events were recorded for this session.
        </p>
      )}
    </section>
  );
}

function TranscriptMeta({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0">
      <dt className="text-[var(--theme-muted)]">
        {label}
      </dt>

      <dd className="mt-0.5 break-words font-semibold leading-5 text-[var(--theme-heading)]">
        {value}
      </dd>
    </div>
  );
}

type TranscriptGroup = {
  key: string;
  title: string;
  moduleType?: string;
  entries: TranscriptEntry[];
};

type TranscriptThread = {
  entry: TranscriptEntry;
  followUps: TranscriptEntry[];
};

function threadTranscriptEntries(
  entries: TranscriptEntry[],
): TranscriptThread[] {
  const ordered = [...entries].sort(
    (first, second) =>
      first.sequence -
      second.sequence,
  );

  const parentIds = new Set(
    ordered
      .map(
        (entry) =>
          entry.questionId,
      )
      .filter(
        (
          id,
        ): id is string =>
          Boolean(id),
      ),
  );

  const children = new Map<
    string,
    TranscriptEntry[]
  >();

  const attached = new Set<string>();

  for (const entry of ordered) {
    if (
      entry.origin !==
        "interviewer_follow_up" ||
      !entry.parentQuestionId ||
      !parentIds.has(
        entry.parentQuestionId,
      )
    ) {
      continue;
    }

    const current =
      children.get(
        entry.parentQuestionId,
      ) ?? [];

    current.push(entry);

    children.set(
      entry.parentQuestionId,
      current,
    );

    attached.add(entry.id);
  }

  return ordered
    .filter(
      (entry) =>
        !attached.has(entry.id),
    )
    .map((entry) => ({
      entry,
      followUps:
        entry.questionId
          ? children.get(
              entry.questionId,
            ) ?? []
          : [],
    }));
}

function groupByModule(
  entries: TranscriptEntry[],
): TranscriptGroup[] {
  const groups = new Map<
    string,
    TranscriptGroup
  >();

  for (const entry of [
    ...entries,
  ].sort(
    (first, second) =>
      first.sequence -
      second.sequence,
  )) {
    const key =
      entry.moduleId ??
      "__unassigned";

    const group =
      groups.get(key);

    if (group) {
      group.entries.push(entry);

      if (
        !group.moduleType &&
        entry.moduleType
      ) {
        group.moduleType =
          entry.moduleType;
      }

      continue;
    }

    groups.set(key, {
      key,
      title:
        entry.moduleTitle ??
        "Outside the module structure",
      moduleType:
        entry.moduleType,
      entries: [entry],
    });
  }

  return [...groups.values()];
}

function readTruncation(
  transcript: SessionTranscript | null,
): Truncation {
  if (!transcript) {
    return {
      truncated: false,
      dropped: [],
    };
  }

  const signal =
    transcript.truncation as
      | TranscriptTruncation
      | undefined;

  const omitted =
    signal?.omitted;

  const dropped =
    ORIGIN_ORDER.map(
      (origin) => ({
        origin,
        count: Number(
          omitted?.[
            OMITTED_KEY_BY_ORIGIN[
              origin
            ]
          ] ?? 0,
        ),
      }),
    ).filter(
      (item) =>
        Number.isFinite(
          item.count,
        ) &&
        item.count > 0,
    );

  return {
    truncated:
      signal?.truncated === true ||
      dropped.length > 0,
    dropped,
  };
}

function testSummary(
  testResults?: JsonValue,
): string | null {
  if (
    !Array.isArray(
      testResults,
    ) ||
    !testResults.length
  ) {
    return null;
  }

  let passed = 0;

  for (const result of testResults) {
    if (
      result &&
      typeof result ===
        "object" &&
      !Array.isArray(result) &&
      result.passed === true
    ) {
      passed += 1;
    }
  }

  return `${passed}/${testResults.length} tests passed`;
}

function formatDateTime(
  value?: string,
) {
  return value
    ? new Intl.DateTimeFormat(
        "en",
        {
          dateStyle: "medium",
          timeStyle: "short",
        },
      ).format(new Date(value))
    : "—";
}
