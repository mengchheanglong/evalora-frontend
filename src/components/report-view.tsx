"use client";

import { useState, type FormEvent, type KeyboardEvent, type ReactNode } from "react";
import { Icon, type IconName } from "@/components/icons";
import { candidateAvatarTone, candidateInitials } from "@/lib/candidate-avatars";
import type { CandidateReport, RecruiterVerdict, ReviewerNote } from "@/lib/types";
import { RecruiterDecisionHeroBadge } from "@/components/recruiter-decision-badge";

type ReportViewProps = {
  report: CandidateReport;
  role?: string;
  notes: ReviewerNote[];
  onAddNote: (note: string) => Promise<boolean>;
  savingNote: boolean;
  onViewInterview?: () => void;
  /** When false, the identity block (avatar/name) is hidden — used where a
   *  profile header already shows the candidate (e.g. the candidate detail tab). */
  showIdentity?: boolean;
  onSaveVerdict?: (payload: { verdict: RecruiterVerdict; tags?: string[]; notes?: string }) => Promise<boolean>;
  savingVerdict?: boolean;
};

export function ReportView({ report, role, notes, onAddNote, savingNote, onViewInterview, showIdentity = true, onSaveVerdict, savingVerdict }: ReportViewProps) {
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
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs font-medium">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-primary-50)] px-2.5 py-1 text-[var(--color-primary-700)] ring-1 ring-[var(--color-primary-100)]"><Icon name="check" size={12} /> Completed</span>
                  {report.completedAt ? <span className="text-[var(--theme-faint)]">Submitted {formatDate(report.completedAt)}</span> : null}
                </div>
              </div>
            </div>
          ) : (
            <div>
              <p className="text-[var(--text-micro)] font-semibold uppercase tracking-[0.1em] text-[var(--color-primary-600)]">Assessment Report</p>
              <h2 className="mt-1 text-lg font-bold leading-tight text-[var(--theme-heading)]">{report.assessmentName}</h2>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs font-medium">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-primary-50)] px-2.5 py-1 text-[var(--color-primary-700)] ring-1 ring-[var(--color-primary-100)]"><Icon name="check" size={12} /> Completed</span>
                {report.completedAt ? <span className="text-[var(--theme-faint)]">Submitted {formatDate(report.completedAt)}</span> : null}
              </div>
            </div>
          )}
          <div className="flex items-center gap-4 lg:border-l lg:border-[var(--theme-border)] lg:pl-4">
            <ScoreRing score={score} />
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--theme-faint)]">Recommendation</p>
              <span className={`mt-1.5 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ring-1 ${meta.badge}`}>
                <span className={`size-2 rounded-full ${meta.dot}`} /> {meta.label}
              </span>
              <p className="mt-1.5 max-w-[210px] text-xs text-[var(--theme-faint)]">Synthesized across {moduleEntries.length || "all"} assessment modules.</p>
            </div>
            <RecruiterDecisionHeroBadge verdict={report.recruiterVerdict} />
          </div>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-[1.45fr_1fr]">
        {/* Left: analytical summary */}
        <div className="space-y-4">
          <SectionCard icon="analytics" title="Competency breakdown">
            {moduleEntries.length ? (
              <div className="space-y-3.5">{moduleEntries.map(([name, value]) => <ScoreBar key={name} label={name} value={Math.round(value * 20)} />)}</div>
            ) : <Empty>No module scores were recorded for this assessment.</Empty>}
          </SectionCard>

          <SectionCard icon="report" title="Assessment summary">
            <p className="text-sm text-[var(--theme-muted)]">{report.summary || "No summary was generated."}</p>
            {onViewInterview ? (
              <button
                className="mt-3 inline-flex h-8 items-center gap-1.5 rounded-[7px] border border-[var(--theme-border)] px-2.5 text-xs font-semibold text-[var(--theme-text)] transition hover:border-[var(--color-primary-300)] hover:bg-[var(--theme-panel-soft)] hover:text-[var(--color-primary-700)]"
                onClick={onViewInterview}
                type="button"
              >
                <Icon name="eye" size={13} /> View interview
              </button>
            ) : null}
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

          <ReviewerCard
            notes={notes}
            onAddNote={onAddNote}
            reviewerSummary={report.reviewerSummary}
            savingNote={savingNote}
            report={report}
            onSaveVerdict={onSaveVerdict}
            savingVerdict={savingVerdict}
          />
        </div>
      </div>

      <p className="flex items-start gap-2 rounded-[8px] border border-[var(--theme-border)] bg-[var(--theme-panel-soft)] px-3.5 py-2.5 text-xs text-[var(--theme-muted)]">
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
      <p className="mx-auto mt-1.5 max-w-[480px] text-sm text-[var(--theme-muted)]">
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

const DECISION_BUTTONS: Array<{
  value: RecruiterVerdict;
  label: string;
  icon: IconName;
  isSelected: (v?: RecruiterVerdict) => boolean;
  activeStyle: string;
}> = [
  {
    value: "HIRE",
    label: "Approve",
    icon: "check",
    isSelected: (v) => v === "HIRE" || v === "STRONG_HIRE",
    activeStyle: "bg-emerald-50 text-emerald-700 border-emerald-300 ring-1 ring-emerald-300",
  },
  {
    value: "NO_HIRE",
    label: "Reject",
    icon: "chevron",
    isSelected: (v) => v === "NO_HIRE",
    activeStyle: "bg-rose-50 text-rose-700 border-rose-300 ring-1 ring-rose-300",
  },
  {
    value: "NEUTRAL",
    label: "Pending",
    icon: "clock",
    isSelected: (v) => v === "NEUTRAL",
    activeStyle: "bg-amber-50 text-amber-700 border-amber-300 ring-1 ring-amber-300",
  },
];

const DEFAULT_TAGS = ["Strong Problem Solving", "Great Communication", "Needs System Design Depth", "Culture Add"];

// Local hero badge wrapper is now handled by RecruiterDecisionHeroBadge
// (imported above). No local VerdictBadge needed.

function ReviewerCard({ notes, onAddNote, savingNote, reviewerSummary, report, onSaveVerdict, savingVerdict }: {
  notes: ReviewerNote[];
  onAddNote: (note: string) => Promise<boolean>;
  savingNote: boolean;
  reviewerSummary?: string;
  report: CandidateReport;
  onSaveVerdict?: (payload: { verdict: RecruiterVerdict; tags?: string[]; notes?: string }) => Promise<boolean>;
  savingVerdict?: boolean;
}) {
  const [noteText, setNoteText] = useState("");
  const [verdict, setVerdict] = useState<RecruiterVerdict | undefined>(report.recruiterVerdict);
  const [selectedTags, setSelectedTags] = useState<string[]>(() => report.recruiterTags ?? []);
  const [customTagInput, setCustomTagInput] = useState("");
  const [verdictNotice, setVerdictNotice] = useState("");
  const [verdictError, setVerdictError] = useState("");

  function toggleTag(tag: string) {
    setSelectedTags((current) => current.includes(tag) ? current.filter((t) => t !== tag) : [...current, tag]);
  }

  function addCustomTag() {
    const trimmed = customTagInput.trim();
    if (trimmed && !selectedTags.includes(trimmed)) {
      setSelectedTags((current) => [...current, trimmed]);
    }
    setCustomTagInput("");
  }

  function handleCustomTagKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      addCustomTag();
    }
  }

  async function submitNote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (await onAddNote(noteText)) setNoteText("");
  }

  async function submitVerdict() {
    if (!verdict || !onSaveVerdict) return;
    setVerdictError("");
    setVerdictNotice("");
    const ok = await onSaveVerdict({
      verdict,
      tags: selectedTags.length ? selectedTags : undefined,
      notes: noteText.trim() || undefined,
    });
    if (ok) {
      setVerdictNotice("Recruiter decision recorded.");
      if (noteText.trim()) setNoteText("");
    } else {
      setVerdictError("Unable to save decision. Please try again.");
    }
  }

  return (
    <SectionCard accent="primary" icon="user" title="Reviewer notes">
      {reviewerSummary ? (
        <p className="mb-3 rounded-[8px] bg-[var(--color-primary-50)] px-3 py-2.5 text-sm text-[var(--color-primary-700)]">{reviewerSummary}</p>
      ) : null}

      {verdictNotice ? <p className="mb-3 rounded-[8px] bg-emerald-50 px-3 py-2.5 text-sm text-emerald-700">{verdictNotice}</p> : null}
      {verdictError ? <p className="mb-3 rounded-[8px] bg-rose-50 px-3 py-2.5 text-sm text-rose-700">{verdictError}</p> : null}

      {/* Decision selector */}
      {onSaveVerdict ? (
        <div className="mb-4">
          <p className="mb-2 text-xs font-bold text-[var(--theme-heading)]">Hiring Decision</p>
          <div className="grid grid-cols-3 gap-2">
            {DECISION_BUTTONS.map((option) => {
              const selected = option.isSelected(verdict);
              return (
                <button
                  aria-pressed={selected}
                  className={`flex items-center justify-center gap-1.5 rounded-[7px] border px-2.5 py-2 text-xs font-semibold transition ${
                    selected
                      ? option.activeStyle
                      : "border-[var(--theme-border)] text-[var(--theme-muted)] hover:border-[var(--color-primary-300)] hover:text-[var(--color-primary-700)]"
                  }`}
                  key={option.value}
                  onClick={() => setVerdict(option.value)}
                  type="button"
                >
                  <Icon name={option.icon} size={12} /> {option.label}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      {/* Quick tags */}
      {onSaveVerdict ? (
        <div className="mb-4">
          <p className="mb-2 text-xs font-bold text-[var(--theme-heading)]">Tags</p>
          <div className="flex flex-wrap gap-1.5">
            {DEFAULT_TAGS.map((tag) => (
              <button
                aria-pressed={selectedTags.includes(tag)}
                className={`rounded-full border px-2.5 py-1 text-xs font-medium transition ${
                  selectedTags.includes(tag)
                    ? "border-[var(--color-primary-500)] bg-[var(--color-primary-50)] text-[var(--color-primary-700)]"
                    : "border-[var(--theme-border)] text-[var(--theme-muted)] hover:border-[var(--color-primary-300)]"
                }`}
                key={tag}
                onClick={() => toggleTag(tag)}
                type="button"
              >
                {selectedTags.includes(tag) ? tag : `+ ${tag}`}
              </button>
            ))}
          </div>
          <div className="mt-2 flex items-center gap-1.5">
            <input
              className="control h-8 min-w-0 flex-1 rounded-[6px] px-2 text-xs"
              onChange={(event) => setCustomTagInput(event.target.value)}
              onKeyDown={handleCustomTagKeyDown}
              placeholder="Add custom tag…"
              value={customTagInput}
            />
            <button className="h-8 rounded-[6px] border border-[var(--theme-border)] px-2 text-xs font-semibold text-[var(--theme-muted)] transition hover:border-[var(--color-primary-300)] hover:text-[var(--color-primary-700)]" onClick={addCustomTag} type="button">Add</button>
          </div>
          {selectedTags.length ? (
            <div className="mt-2 flex flex-wrap gap-1">
              {selectedTags.map((tag) => (
                <span className="inline-flex items-center gap-1 rounded-full bg-[var(--color-primary-50)] px-2 py-0.5 text-xs font-medium text-[var(--color-primary-700)]" key={tag}>
                  {tag}
                  <button aria-label={`Remove ${tag}`} className="ml-0.5 rounded-full p-0.5 text-[var(--color-primary-400)] hover:text-[var(--color-primary-700)]" onClick={() => toggleTag(tag)} type="button">×</button>
                </span>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      {/* Private note textarea */}
      <form onSubmit={submitNote}>
        <textarea
          className="control min-h-[84px] rounded-[8px] text-sm"
          maxLength={1000}
          name="note"
          onChange={(event) => setNoteText(event.target.value)}
          placeholder="Add a private note about this candidate…"
          value={noteText}
        />
        <div className="mt-2 flex items-center justify-between">
          <span className="text-[var(--text-micro)] text-[var(--theme-faint)]">{noteText.length} / 1000</span>
          <button className="button-primary h-9 rounded-[7px] px-4 !bg-primary-600 text-xs hover:!bg-primary-700 disabled:opacity-60" disabled={savingNote || !noteText.trim()} type="submit">
            {savingNote ? "Saving…" : "Save note"}
          </button>
        </div>
      </form>

      {/* Submit decision button */}
      {onSaveVerdict ? (
        <button
          className="mt-3 w-full rounded-[7px] bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-60"
          disabled={savingVerdict || !verdict}
          onClick={() => void submitVerdict()}
          type="button"
        >
          {savingVerdict ? "Saving decision…" : "Submit Decision & Notes"}
        </button>
      ) : null}

      {notes.length ? (
        <ul className="mt-3 space-y-2.5 border-t border-[var(--theme-border)] pt-3">
          {notes.map((note) => (
            <li className="text-sm" key={note.id}>
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
        <h3 className="text-sm font-bold text-[var(--theme-heading)]">{title}</h3>
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
    <li className="flex gap-2.5 text-sm text-[var(--theme-text)]">
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
    <div className="relative grid size-18 shrink-0 place-items-center">
      <svg className="size-18 -rotate-90" viewBox="0 0 36 36">
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
        <span className="mt-0.5 block text-[var(--text-micro)] font-semibold text-[var(--theme-faint)]">Overall</span>
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
