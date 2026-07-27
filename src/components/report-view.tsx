"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { Icon, type IconName } from "@/components/icons";
import { candidateAvatarTone, candidateInitials } from "@/lib/candidate-avatars";
import type { CandidateReport, ReviewerNote } from "@/lib/types";

type ReportViewProps = {
  report: CandidateReport;
  role?: string;
  notes: ReviewerNote[];
  onAddNote: (note: string) => Promise<boolean>;
  savingNote: boolean;
  /** When false, the identity block (avatar/name) is hidden — used where a
   *  profile header already shows the candidate (e.g. the candidate detail tab). */
  showIdentity?: boolean;
};

export function ReportView({ report, role, notes, onAddNote, savingNote, showIdentity = true }: ReportViewProps) {
  const score = Math.round(report.overallScore * 20);
  const meta = scoreMeta(score);
  const moduleEntries = Object.entries(report.moduleScores);

  return (
    <div className="space-y-4">
      {/* Hero */}
      <section className="card overflow-hidden rounded-xl border-[var(--theme-border)] shadow-[var(--shadow-card)]">
        <div className="grid gap-4 p-4 lg:grid-cols-[1fr_auto] lg:items-center">
          {showIdentity ? (
            <div className="flex flex-wrap items-center gap-3">
              <span className={`grid size-12 shrink-0 place-items-center rounded-[9px] bg-linear-to-br text-lg font-bold shadow-sm ${candidateAvatarTone(report.candidateName)}`}>
                {candidateInitials(report.candidateName)}
              </span>
              <div className="min-w-0">
                <h2 className="text-lg font-bold leading-tight text-[var(--theme-heading)]">{report.candidateName}</h2>
                <p className="mt-0.5 text-xs font-semibold text-[var(--theme-muted)]">{role ?? "Candidate"} · {report.assessmentName}</p>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] font-medium">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-primary-50)] px-2.5 py-1 text-[var(--color-primary-700)] ring-1 ring-[var(--color-primary-100)]"><Icon name="check" size={12} /> Completed</span>
                  {report.completedAt ? <span className="text-[var(--theme-faint)]">Submitted {formatDate(report.completedAt)}</span> : null}
                </div>
              </div>
            </div>
          ) : (
            <div>
              <p className="text-[var(--text-micro)] font-semibold uppercase tracking-[0.1em] text-[var(--color-primary-600)]">Assessment Report</p>
              <h2 className="mt-1 text-lg font-bold leading-tight text-[var(--theme-heading)]">{report.assessmentName}</h2>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] font-medium">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-primary-50)] px-2.5 py-1 text-[var(--color-primary-700)] ring-1 ring-[var(--color-primary-100)]"><Icon name="check" size={12} /> Completed</span>
                {report.completedAt ? <span className="text-[var(--theme-faint)]">Submitted {formatDate(report.completedAt)}</span> : null}
              </div>
            </div>
          )}
          <div className="flex items-center gap-4 lg:border-l lg:border-[var(--theme-border)] lg:pl-4">
            <ScoreRing score={score} />
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--theme-faint)]">Recommendation</p>
              <span className={`mt-1.5 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 ${meta.badge}`}>
                <span className={`size-2 rounded-full ${meta.dot}`} /> {meta.label}
              </span>
              <p className="mt-1.5 max-w-[210px] text-[10px] leading-3.5 text-[var(--theme-faint)]">Synthesized across {moduleEntries.length || "all"} assessment modules.</p>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-[1.45fr_1fr]">
        {/* Left: analytical + evidence */}
        <div className="space-y-4">
          <SectionCard icon="analytics" title="Competency breakdown">
            {moduleEntries.length ? (
              <div className="space-y-3.5">{moduleEntries.map(([name, value]) => <ScoreBar key={name} label={name} value={Math.round(value * 20)} />)}</div>
            ) : <Empty>No module scores were recorded for this assessment.</Empty>}
          </SectionCard>

          <SectionCard icon="report" title="Assessment summary">
            <p className="text-[13px] leading-5 text-[var(--theme-muted)]">{report.summary || "No summary was generated."}</p>
          </SectionCard>

          <SectionCard icon="message" title="Evidence from responses">
            {report.evidence.length ? (
              <div className="space-y-2.5">
                {report.evidence.slice(0, 6).map((item, index) => (
                  <blockquote className="rounded-[7px] border-l-[3px] border-[var(--color-primary-300)] bg-[var(--theme-panel-soft)] px-3.5 py-3 text-xs leading-5 text-[var(--theme-muted)]" key={index}>
                    {item}
                  </blockquote>
                ))}
              </div>
            ) : <Empty>No supporting evidence was extracted.</Empty>}
          </SectionCard>
        </div>

        {/* Right: qualitative + reviewer */}
        <div className="space-y-4">
          <SectionCard accent="primary" icon="sparkle" title="Key strengths">
            {report.strengths.length ? (
              <ul className="space-y-2.5">{report.strengths.map((item, index) => <SignalItem accent="primary" icon="check" key={index}>{item}</SignalItem>)}</ul>
            ) : <Empty>No standout strengths recorded.</Empty>}
          </SectionCard>

          <SectionCard accent="muted" icon="trend" title="Areas to develop">
            {report.improvementAreas.length ? (
              <ul className="space-y-2.5">{report.improvementAreas.map((item, index) => <SignalItem accent="muted" icon="chevron" key={index}>{item}</SignalItem>)}</ul>
            ) : <Empty>No development areas flagged.</Empty>}
          </SectionCard>

          <ReviewerCard notes={notes} onAddNote={onAddNote} reviewerSummary={report.reviewerSummary} savingNote={savingNote} />
        </div>
      </div>

      <p className="flex items-start gap-2 rounded-[8px] border border-[var(--theme-border)] bg-[var(--theme-panel-soft)] px-3.5 py-2.5 text-[11px] leading-4 text-[var(--theme-muted)]">
        <Icon className="mt-0.5 shrink-0 text-[var(--theme-faint)]" name="shield" size={14} />
        {report.advisoryNotice || "AI-supported feedback is advisory. A human reviewer remains responsible for hiring decisions."}
      </p>
    </div>
  );
}

/** Prompt shown when no report exists yet (completed → generate, else waiting). */
export function ReportGeneratePrompt({ completed, generating, onGenerate }: { completed: boolean; generating: boolean; onGenerate?: () => void }) {
  return (
    <section className="card rounded-xl border-[var(--theme-border)] shadow-[var(--shadow-card)] p-6 text-center sm:p-8">
      <span className="mx-auto flex size-10 items-center justify-center rounded-[9px] bg-primary-50 text-primary-600"><Icon name="report" size={20} /></span>
      <h2 className="mt-4 text-lg font-bold text-[var(--theme-heading)]">Report not ready</h2>
      <p className="mx-auto mt-1.5 max-w-[480px] text-xs leading-5 text-[var(--theme-muted)]">
        {completed
          ? "Generate an advisory report from the candidate's saved responses and coding evidence."
          : "The report becomes available once the candidate submits the assessment."}
      </p>
      {completed && onGenerate ? (
        <button className="button-primary mt-4 h-9 rounded-[7px] px-4 text-xs !bg-primary-600 hover:!bg-primary-700" disabled={generating} onClick={onGenerate} type="button">
          {generating ? "Generating report…" : "Generate report"}
        </button>
      ) : null}
    </section>
  );
}

function ReviewerCard({ notes, onAddNote, savingNote, reviewerSummary }: { notes: ReviewerNote[]; onAddNote: (note: string) => Promise<boolean>; savingNote: boolean; reviewerSummary?: string }) {
  const [text, setText] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (await onAddNote(text)) setText("");
  }

  return (
    <SectionCard accent="primary" icon="user" title="Reviewer notes">
      {reviewerSummary ? (
        <p className="mb-3 rounded-[8px] bg-[var(--color-primary-50)] px-3 py-2.5 text-xs leading-5 text-[var(--color-primary-700)]">{reviewerSummary}</p>
      ) : null}

      <form onSubmit={submit}>
        <textarea
          className="control min-h-[84px] rounded-[8px] text-xs"
          maxLength={1000}
          name="note"
          onChange={(event) => setText(event.target.value)}
          placeholder="Add a private note about this candidate…"
          required
          value={text}
        />
        <div className="mt-2 flex items-center justify-between">
          <span className="text-[var(--text-micro)] text-[var(--theme-faint)]">{text.length} / 1000</span>
          <button className="button-primary h-9 rounded-[7px] px-4 !bg-primary-600 text-xs hover:!bg-primary-700 disabled:opacity-60" disabled={savingNote || !text.trim()} type="submit">
            {savingNote ? "Saving…" : "Save note"}
          </button>
        </div>
      </form>

      {notes.length ? (
        <ul className="mt-3 space-y-2.5 border-t border-[var(--theme-border)] pt-3">
          {notes.map((note) => (
            <li className="text-xs" key={note.id}>
              <div className="mb-1 flex items-center justify-between gap-2">
                <span className="font-semibold text-[var(--theme-text)]">{note.reviewer?.name ?? "Reviewer"}</span>
                {note.createdAt ? <span className="text-[var(--text-micro)] text-[var(--theme-faint)]">{formatDate(note.createdAt)}</span> : null}
              </div>
              <p className="leading-5 text-[var(--theme-muted)]">{note.note}</p>
            </li>
          ))}
        </ul>
      ) : <p className="mt-3 border-t border-[var(--theme-border)] pt-3 text-xs text-[var(--theme-faint)]">No reviewer notes yet.</p>}
    </SectionCard>
  );
}

// --- Presentational primitives ---

const ACCENT_TONE: Record<string, string> = {
  primary: "bg-[var(--color-primary-50)] text-[var(--color-primary-600)]",
  muted: "bg-[var(--theme-panel-soft)] text-[var(--theme-muted)]",
};

function SectionCard({ icon, title, accent = "primary", children }: { icon: IconName; title: string; accent?: "primary" | "muted"; children: ReactNode }) {
  return (
    <section className="card rounded-xl border-[var(--theme-border)] shadow-[var(--shadow-card)] p-4">
      <div className="mb-3 flex items-center gap-2.5">
        <span className={`grid size-7 place-items-center rounded-[7px] ${ACCENT_TONE[accent] ?? ACCENT_TONE.primary}`}><Icon name={icon} size={14} /></span>
        <h3 className="text-[13px] font-bold text-[var(--theme-heading)]">{title}</h3>
      </div>
      {children}
    </section>
  );
}

function ScoreBar({ label, value }: { label: string; value: number }) {
  const meta = scoreMeta(value);
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between text-xs">
        <span className="truncate pr-2 font-semibold text-[var(--theme-text)]">{label}</span>
        <span className="shrink-0 font-bold text-[var(--theme-heading)]">{value}%</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-[var(--theme-panel-soft)]">
        <div className={`h-full rounded-full transition-all duration-500 ${meta.bar}`} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
      </div>
    </div>
  );
}

function SignalItem({ children, icon, accent }: { children: ReactNode; icon: IconName; accent: "primary" | "muted" }) {
  const tone = accent === "primary" ? "text-[var(--color-primary-500)]" : "text-[var(--theme-muted)]";
  return (
    <li className="flex gap-2.5 text-xs leading-5 text-[var(--theme-text)]">
      <span className={`mt-0.5 shrink-0 ${tone}`}><Icon name={icon} size={14} /></span>
      <span>{children}</span>
    </li>
  );
}

function Empty({ children }: { children: ReactNode }) {
  return <p className="rounded-[8px] bg-[var(--theme-panel-soft)] px-3 py-4 text-center text-xs text-[var(--theme-faint)]">{children}</p>;
}

function ScoreRing({ score }: { score: number }) {
  const meta = scoreMeta(score);
  const clamped = Math.max(0, Math.min(100, score));
  const circumference = 2 * Math.PI * 15.5;
  return (
    <div className="relative grid size-16 shrink-0 place-items-center">
      <svg className="size-16 -rotate-90" viewBox="0 0 36 36">
        <circle className="text-[var(--theme-panel-soft)]" cx="18" cy="18" fill="none" r="15.5" stroke="currentColor" strokeWidth="3.2" />
        <circle
          className={`${meta.ring} transition-all duration-700`}
          cx="18"
          cy="18"
          fill="none"
          r="15.5"
          stroke="currentColor"
          strokeDasharray={`${(clamped / 100) * circumference} ${circumference}`}
          strokeLinecap="round"
          strokeWidth="3.2"
        />
      </svg>
      <div className="absolute text-center">
        <span className="block text-base font-extrabold leading-none text-[var(--theme-heading)]">{score}%</span>
        <span className="mt-0.5 block text-[9px] font-semibold uppercase tracking-[0.1em] text-[var(--theme-faint)]">Overall</span>
      </div>
    </div>
  );
}

function scoreMeta(score: number) {
  if (score >= 80) return { label: "Strong Potential", ring: "text-[var(--color-primary-500)]", bar: "bg-[var(--color-primary-500)]", badge: "bg-[var(--color-primary-50)] text-[var(--color-primary-700)] ring-[var(--color-primary-300)]", dot: "bg-[var(--color-primary-500)]" };
  if (score >= 60) return { label: "Promising", ring: "text-[var(--color-primary-400)]", bar: "bg-[var(--color-primary-400)]", badge: "bg-[var(--color-primary-50)] text-[var(--color-primary-600)] ring-[var(--color-primary-100)]", dot: "bg-[var(--color-primary-400)]" };
  return { label: "Needs Review", ring: "text-[var(--theme-muted)]", bar: "bg-[var(--theme-muted)]", badge: "bg-[var(--theme-panel-soft)] text-[var(--theme-muted)] ring-[var(--theme-border)]", dot: "bg-[var(--theme-muted)]" };
}

function formatDate(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(date);
}
