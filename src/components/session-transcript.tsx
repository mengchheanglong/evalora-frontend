"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Icon, type IconName } from "@/components/icons";
import { EmptyState, ErrorState, InlineAlert } from "@/components/ui-states";
import { apiGet, getErrorMessage } from "@/lib/api";
import type {
  JsonValue,
  SessionTranscript,
  TranscriptCodeArtifact,
  TranscriptCounts,
  TranscriptEntry,
  TranscriptOrigin,
  TranscriptSourceCounts,
  TranscriptTruncation,
} from "@/lib/types";

type Props = {
  sessionId: string;
};

type OriginMeta = {
  label: string;
  icon: IconName;
  badge: string;
  rail: string;
  countKey: keyof TranscriptCounts;
};

/**
 * Provenance is the whole point of this screen: a reviewer must never have to
 * guess whether a question came from the template, the model, or a colleague.
 */
const ORIGIN_META: Record<TranscriptOrigin, OriginMeta> = {
  template: { label: "Prebuilt", icon: "clipboard", badge: "bg-sky-100 text-sky-700", rail: "border-l-sky-400", countKey: "template" },
  ai_adaptive: { label: "AI follow-up", icon: "sparkle", badge: "bg-amber-100 text-amber-700", rail: "border-l-amber-400", countKey: "aiAdaptive" },
  interviewer_follow_up: { label: "Interviewer follow-up", icon: "user", badge: "bg-violet-100 text-violet-700", rail: "border-l-violet-400", countKey: "interviewerFollowUp" },
  code_submission: { label: "Code", icon: "code", badge: "bg-emerald-100 text-emerald-700", rail: "border-l-emerald-400", countKey: "codeSubmission" },
};

const ORIGIN_ORDER: TranscriptOrigin[] = ["template", "ai_adaptive", "interviewer_follow_up", "code_submission"];

/**
 * The backend caps each source relation, so a very long session comes back
 * incomplete. It reports the shortfall per SOURCE (the relation it read), which
 * is not the same vocabulary as the per-ORIGIN counts shown in the legend.
 */
const OMITTED_KEY_BY_ORIGIN: Record<TranscriptOrigin, keyof TranscriptSourceCounts> = {
  template: "responses",
  ai_adaptive: "aiMessages",
  interviewer_follow_up: "interviewerFollowUps",
  code_submission: "codeSubmissions",
};

type Truncation = {
  truncated: boolean;
  dropped: Array<{ origin: TranscriptOrigin; count: number }>;
};

/**
 * The evidence trail for one session — the candidate's answers in the order
 * they happened, each labelled with where its question came from and whether
 * the report was allowed to score it. The page only claims to be complete when
 * the backend confirms nothing was dropped.
 */
export function SessionTranscriptView({ sessionId }: Props) {
  const [transcript, setTranscript] = useState<SessionTranscript | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const controller = useRef<AbortController | null>(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      controller.current?.abort();
    };
  }, []);

  const load = useCallback(async () => {
    // Only the newest request may write state: a reviewer who switches session
    // fast would otherwise see the previous candidate's transcript land here.
    controller.current?.abort();
    const abort = new AbortController();
    controller.current = abort;
    const current = () => mounted.current && !abort.signal.aborted && controller.current === abort;

    setLoading(true);
    try {
      const loaded = await apiGet<SessionTranscript>(`/sessions/${encodeURIComponent(sessionId)}/transcript`, {
        signal: abort.signal,
      });
      if (!current()) return;
      setTranscript(loaded);
      setError("");
    } catch (requestError) {
      if (!current()) return;
      setError(getErrorMessage(requestError, "Unable to load the transcript for this session."));
    } finally {
      if (current()) setLoading(false);
      if (controller.current === abort) controller.current = null;
    }
  }, [sessionId]);

  useEffect(() => { void load(); }, [load]);

  const groups = useMemo(() => groupByModule(transcript?.entries ?? []), [transcript]);
  const truncation = useMemo(() => readTruncation(transcript), [transcript]);

  if (loading) return <p className="px-1 text-xs text-[var(--theme-muted)]">Loading transcript…</p>;
  if (error) return <ErrorState message={error} onRetry={() => void load()} />;
  if (!transcript) return null;

  const unscored = transcript.entries.filter((entry) => !entry.isEvidence).length;

  return (
    <div className="space-y-4">
      <section className="card rounded-xl border-[var(--theme-border)] p-4 shadow-[var(--shadow-card)]">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-[var(--theme-heading)]">{truncation.truncated ? "Partial transcript" : "Full transcript"}</h2>
            <p className="mt-1 text-xs text-[var(--theme-muted)]">
              {truncation.truncated
                ? `Part of what ${transcript.candidate.name} answered — this session is too long to show in full, so entries are missing and the order below is not the complete sequence.`
                : `Every answer ${transcript.candidate.name} gave, in the order it happened.`}{" "}
              Each entry is labelled with the origin of its question.
            </p>
          </div>
          <dl className="grid gap-1 text-[11px] text-[var(--theme-muted)]">
            <TranscriptMeta label="Template" value={transcript.templateTitle ?? "—"} />
            <TranscriptMeta label="Started" value={formatDateTime(transcript.startedAt)} />
            <TranscriptMeta label="Completed" value={formatDateTime(transcript.completedAt)} />
          </dl>
        </div>

        <ul className="mt-3 flex flex-wrap items-center gap-2">
          {ORIGIN_ORDER.map((origin) => {
            const meta = ORIGIN_META[origin];
            return (
              <li key={origin}>
                <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ${meta.badge}`}>
                  <Icon name={meta.icon} size={12} />
                  {meta.label}
                  <span className="tabular-nums opacity-80">{transcript.counts[meta.countKey]}</span>
                </span>
              </li>
            );
          })}
          <li>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--theme-panel-soft)] px-2.5 py-1 text-[11px] font-semibold text-[var(--theme-muted)]">
              {transcript.entries.length} entries {truncation.truncated ? "shown" : "total"}
            </span>
          </li>
        </ul>

        {truncation.truncated ? (
          <div className="mt-3">
            <InlineAlert tone="warning">
              <span className="font-bold">This record is incomplete.</span> Some of this session&rsquo;s entries are not shown here, so it must not be
              read as everything the candidate said.{" "}
              {truncation.dropped.length
                ? `Missing from this view: ${truncation.dropped.map((item) => `${item.count} × ${ORIGIN_META[item.origin].label}`).join(", ")}.`
                : ""}
            </InlineAlert>
          </div>
        ) : null}

        <p className="mt-3 rounded-lg bg-[var(--theme-panel-soft)] px-3 py-2 text-[11px] leading-5 text-[var(--theme-muted)]">
          <Icon className="mr-1.5 inline align-[-2px] text-[var(--theme-faint)]" name="shield" size={12} />
          {unscored
            ? `${unscored} of these answers are marked “Not scored as evidence” — they are shown for context but the report was not allowed to score them.`
            : "Every answer below was used as evidence when the report was scored."}
        </p>
      </section>

      {transcript.entries.length ? (
        groups.map((group) => (
          <section className="card rounded-xl border-[var(--theme-border)] p-4 shadow-[var(--shadow-card)]" key={group.key}>
            <div className="mb-3 flex flex-wrap items-center gap-2">
              {group.moduleType ? (
                <span className="rounded-md bg-[var(--color-primary-50)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[var(--color-primary-700)]">
                  {group.moduleType.replaceAll("_", " ")}
                </span>
              ) : null}
              <h3 className="text-sm font-bold text-[var(--theme-heading)]">{group.title}</h3>
              <span className="text-[11px] text-[var(--theme-faint)]">{group.entries.length} entries</span>
            </div>
            <ol className="space-y-3">
              {group.entries.map((entry) => (
                <li key={entry.id}>
                  <TranscriptEntryCard entry={entry} />
                </li>
              ))}
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

function TranscriptEntryCard({ entry }: { entry: TranscriptEntry }) {
  const meta = ORIGIN_META[entry.origin];
  const answer = entry.answerText?.trim();
  const timestamp = formatDateTime(entry.answeredAt ?? entry.askedAt);

  return (
    <article className={`rounded-lg border border-l-4 border-[var(--theme-border)] p-3 ${meta.rail}`} id={`transcript-entry-${entry.sequence}`}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[10px] font-bold tabular-nums text-[var(--theme-faint)]">
          <span className="sr-only">Transcript line </span>#{entry.sequence}
        </span>
        <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-bold ${meta.badge}`}>
          <Icon name={meta.icon} size={11} /> {meta.label}
        </span>
        {entry.askedBy ? <span className="text-[10px] text-[var(--theme-faint)]">asked by {entry.askedBy.name}</span> : null}
        {entry.status ? (
          <span className="text-[10px] font-bold uppercase tracking-wide text-[var(--theme-muted)]">{entry.status}</span>
        ) : null}
        {timestamp !== "—" ? <span className="ml-auto text-[10px] text-[var(--theme-faint)]">{timestamp}</span> : null}
      </div>

      <h4 className="mt-1.5 whitespace-pre-wrap text-[13px] font-semibold leading-5 text-[var(--theme-heading)]">{entry.questionText}</h4>

      <div className="mt-2 rounded-lg bg-[var(--theme-panel-soft)] px-3 py-2">
        <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--theme-faint)]">
          {entry.origin === "code_submission" ? "Candidate submission" : "Candidate answer"}
        </p>
        {answer ? (
          <p className="mt-1 whitespace-pre-wrap text-xs leading-5 text-[var(--theme-text)]">{answer}</p>
        ) : entry.code ? (
          <p className="mt-1 text-xs leading-5 text-[var(--theme-muted)]">Submitted as code — see below.</p>
        ) : (
          <p className="mt-1 text-xs leading-5 text-[var(--theme-faint)]">No answer recorded.</p>
        )}
        {entry.code ? <CodeArtifact code={entry.code} sequence={entry.sequence} /> : null}
      </div>

      {entry.isEvidence ? null : (
        <p className="mt-2 inline-flex items-center gap-1.5 rounded-md border border-dashed border-[var(--theme-border-strong)] px-2 py-1 text-[10px] font-bold leading-4 text-[var(--theme-muted)]">
          <Icon name="shield" size={11} /> Not scored as evidence — shown for context only
        </p>
      )}
    </article>
  );
}

function CodeArtifact({ code, sequence }: { code: TranscriptCodeArtifact; sequence: number }) {
  const tests = testSummary(code.testResults);
  const stdout = code.stdout?.trim();
  const stderr = code.stderr?.trim();

  return (
    <div className="mt-2 space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-md bg-[var(--theme-panel)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[var(--theme-muted)]">
          <Icon name="code" size={11} /> {code.language || "Unknown language"}
        </span>
        {tests ? <span className="text-[10px] font-semibold text-[var(--theme-muted)]">{tests}</span> : null}
      </div>
      <CodeBlock label={`Line ${sequence} source code`} text={code.sourceCode} />
      {stdout ? <CodeBlock label={`Line ${sequence} program output`} text={stdout} title="stdout" /> : null}
      {stderr ? <CodeBlock label={`Line ${sequence} error output`} text={stderr} title="stderr" /> : null}
    </div>
  );
}

/** Scrollable regions must be focusable, otherwise keyboard users cannot read past the fold. */
function CodeBlock({ label, text, title }: { label: string; text: string; title?: string }) {
  return (
    <div>
      {title ? <p className="mb-1 text-[9px] font-bold uppercase tracking-wide text-[var(--theme-faint)]">{title}</p> : null}
      <div
        aria-label={label}
        className="max-h-[320px] overflow-auto rounded-[6px] bg-neutral-950 p-2.5"
        role="region"
        tabIndex={0}
      >
        <pre className="font-mono text-[11px] leading-5 text-slate-200"><code>{text}</code></pre>
      </div>
    </div>
  );
}

function TranscriptMeta({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt>{label}</dt>
      <dd className="font-semibold text-[var(--theme-heading)]">{value}</dd>
    </div>
  );
}

type TranscriptGroup = {
  key: string;
  title: string;
  moduleType?: string;
  entries: TranscriptEntry[];
};

/**
 * Groups by module while preserving transcript order: a module appears where
 * its first answer appears, and entries inside it stay in sequence.
 */
function groupByModule(entries: TranscriptEntry[]): TranscriptGroup[] {
  const groups = new Map<string, TranscriptGroup>();
  for (const entry of [...entries].sort((first, second) => first.sequence - second.sequence)) {
    const key = entry.moduleId ?? "__unassigned";
    const group = groups.get(key);
    if (group) {
      group.entries.push(entry);
      if (!group.moduleType && entry.moduleType) group.moduleType = entry.moduleType;
      continue;
    }
    groups.set(key, {
      key,
      title: entry.moduleTitle ?? "Outside the module structure",
      moduleType: entry.moduleType,
      entries: [entry],
    });
  }
  return [...groups.values()];
}

/**
 * A missing flag must never be read as "nothing was dropped by mistake": any
 * per-origin drop count on its own is enough to stop the page claiming the
 * record is complete.
 */
function readTruncation(transcript: SessionTranscript | null): Truncation {
  if (!transcript) return { truncated: false, dropped: [] };
  // Optional at runtime: an older backend, or the offline mock, omits it entirely.
  const signal = transcript.truncation as TranscriptTruncation | undefined;
  const omitted = signal?.omitted;
  const dropped = ORIGIN_ORDER
    .map((origin) => ({ origin, count: Number(omitted?.[OMITTED_KEY_BY_ORIGIN[origin]] ?? 0) }))
    .filter((item) => Number.isFinite(item.count) && item.count > 0);
  return { truncated: signal?.truncated === true || dropped.length > 0, dropped };
}

function testSummary(testResults?: JsonValue): string | null {
  if (!Array.isArray(testResults) || !testResults.length) return null;
  let passed = 0;
  for (const result of testResults) {
    if (result && typeof result === "object" && !Array.isArray(result) && result.passed === true) passed += 1;
  }
  return `${passed}/${testResults.length} tests passed`;
}

function formatDateTime(value?: string) {
  return value ? new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "—";
}
