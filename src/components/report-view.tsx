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
    <div className="space-y-6">
      {/* Hero */}
      <section className="card overflow-hidden rounded-[16px]">
        <div className="h-1.5 w-full bg-gradient-to-r from-primary-500 via-indigo-500 to-fuchsia-500" />
        <div className="grid gap-8 p-7 sm:p-9 lg:grid-cols-[1fr_auto] lg:items-center">
          {showIdentity ? (
            <div className="flex flex-wrap items-center gap-6">
              <span className={`grid size-24 shrink-0 place-items-center rounded-[22px] bg-gradient-to-br text-[28px] font-black shadow-sm ${candidateAvatarTone(report.candidateName)}`}>
                {candidateInitials(report.candidateName)}
              </span>
              <div className="min-w-0">
                <h2 className="text-[30px] font-black leading-tight text-neutral-950">{report.candidateName}</h2>
                <p className="mt-1.5 text-[16px] font-semibold text-neutral-500">{role ?? "Candidate"} · {report.assessmentName}</p>
                <div className="mt-4 flex flex-wrap items-center gap-2.5 text-[13px] font-semibold">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-emerald-700 ring-1 ring-emerald-100"><Icon name="check" size={14} /> Completed</span>
                  {report.completedAt ? <span className="text-neutral-400">Submitted {formatDate(report.completedAt)}</span> : null}
                </div>
              </div>
            </div>
          ) : (
            <div>
              <p className="text-[12px] font-bold uppercase tracking-[0.1em] text-primary-600">Assessment Report</p>
              <h2 className="mt-1.5 text-[26px] font-black leading-tight text-neutral-950">{report.assessmentName}</h2>
              <div className="mt-3 flex flex-wrap items-center gap-2.5 text-[13px] font-semibold">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-emerald-700 ring-1 ring-emerald-100"><Icon name="check" size={14} /> Completed</span>
                {report.completedAt ? <span className="text-neutral-400">Submitted {formatDate(report.completedAt)}</span> : null}
              </div>
            </div>
          )}
          <div className="flex items-center gap-7 lg:border-l lg:border-neutral-100 lg:pl-9">
            <ScoreRing score={score} />
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-neutral-400">Recommendation</p>
              <span className={`mt-2.5 inline-flex items-center gap-2 rounded-full px-3.5 py-2 text-[14px] font-bold ring-1 ${meta.badge}`}>
                <span className={`size-2.5 rounded-full ${meta.dot}`} /> {meta.label}
              </span>
              <p className="mt-3 max-w-[210px] text-[12px] leading-5 text-neutral-400">Synthesized across {moduleEntries.length || "all"} assessment modules.</p>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[1.45fr_1fr]">
        {/* Left: analytical + evidence */}
        <div className="space-y-6">
          <SectionCard icon="analytics" title="Competency breakdown">
            {moduleEntries.length ? (
              <div className="space-y-5">{moduleEntries.map(([name, value]) => <ScoreBar key={name} label={name} value={Math.round(value * 20)} />)}</div>
            ) : <Empty>No module scores were recorded for this assessment.</Empty>}
          </SectionCard>

          <SectionCard icon="report" title="Assessment summary">
            <p className="text-[15px] leading-7 text-neutral-600">{report.summary || "No summary was generated."}</p>
          </SectionCard>

          <SectionCard icon="message" title="Evidence from responses">
            {report.evidence.length ? (
              <div className="space-y-3.5">
                {report.evidence.slice(0, 6).map((item, index) => (
                  <blockquote className="rounded-[12px] border-l-[3px] border-primary-300 bg-neutral-50 px-5 py-4 text-[14px] leading-6 text-neutral-600" key={index}>
                    {item}
                  </blockquote>
                ))}
              </div>
            ) : <Empty>No supporting evidence was extracted.</Empty>}
          </SectionCard>
        </div>

        {/* Right: qualitative + reviewer */}
        <div className="space-y-6">
          <SectionCard accent="emerald" icon="sparkle" title="Key strengths">
            {report.strengths.length ? (
              <ul className="space-y-3">{report.strengths.map((item, index) => <SignalItem accent="emerald" icon="check" key={index}>{item}</SignalItem>)}</ul>
            ) : <Empty>No standout strengths recorded.</Empty>}
          </SectionCard>

          <SectionCard accent="amber" icon="trend" title="Areas to develop">
            {report.improvementAreas.length ? (
              <ul className="space-y-3">{report.improvementAreas.map((item, index) => <SignalItem accent="amber" icon="chevron" key={index}>{item}</SignalItem>)}</ul>
            ) : <Empty>No development areas flagged.</Empty>}
          </SectionCard>

          <ReviewerCard notes={notes} onAddNote={onAddNote} reviewerSummary={report.reviewerSummary} savingNote={savingNote} />
        </div>
      </div>

      <p className="flex items-start gap-2.5 rounded-[14px] border border-neutral-200 bg-neutral-50 px-5 py-4 text-[13px] leading-6 text-neutral-500">
        <Icon className="mt-0.5 shrink-0 text-neutral-400" name="shield" size={16} />
        {report.advisoryNotice || "AI-supported feedback is advisory. A human reviewer remains responsible for hiring decisions."}
      </p>
    </div>
  );
}

/** Prompt shown when no report exists yet (completed → generate, else waiting). */
export function ReportGeneratePrompt({ completed, generating, onGenerate }: { completed: boolean; generating: boolean; onGenerate?: () => void }) {
  return (
    <section className="card rounded-[16px] p-10 text-center sm:p-16">
      <span className="mx-auto flex size-16 items-center justify-center rounded-[16px] bg-primary-50 text-primary-600"><Icon name="report" size={30} /></span>
      <h2 className="mt-6 text-[22px] font-black text-neutral-950">Report not ready</h2>
      <p className="mx-auto mt-2.5 max-w-[540px] text-[15px] leading-7 text-neutral-500">
        {completed
          ? "Generate an advisory report from the candidate's saved responses and coding evidence."
          : "The report becomes available once the candidate submits the assessment."}
      </p>
      {completed && onGenerate ? (
        <button className="button-primary mt-7 h-11 rounded-[10px] px-6 text-[14px] !bg-primary-600 hover:!bg-primary-700" disabled={generating} onClick={onGenerate} type="button">
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
        <p className="mb-4 rounded-[12px] bg-primary-50 px-5 py-4 text-[14px] leading-6 text-primary-700">{reviewerSummary}</p>
      ) : null}

      <form onSubmit={submit}>
        <textarea
          className="control min-h-[112px] rounded-[10px] text-[14px]"
          maxLength={1000}
          name="note"
          onChange={(event) => setText(event.target.value)}
          placeholder="Add a private note about this candidate…"
          required
          value={text}
        />
        <div className="mt-2 flex items-center justify-between">
          <span className="text-[12px] text-neutral-400">{text.length} / 1000</span>
          <button className="button-primary h-10 rounded-[9px] px-5 !bg-primary-600 text-[13px] hover:!bg-primary-700 disabled:opacity-60" disabled={savingNote || !text.trim()} type="submit">
            {savingNote ? "Saving…" : "Save note"}
          </button>
        </div>
      </form>

      {notes.length ? (
        <ul className="mt-5 space-y-4 border-t border-neutral-100 pt-5">
          {notes.map((note) => (
            <li className="text-[14px]" key={note.id}>
              <div className="mb-1 flex items-center justify-between gap-2">
                <span className="font-bold text-neutral-800">{note.reviewer?.name ?? "Reviewer"}</span>
                {note.createdAt ? <span className="text-[12px] text-neutral-400">{formatDate(note.createdAt)}</span> : null}
              </div>
              <p className="leading-6 text-neutral-600">{note.note}</p>
            </li>
          ))}
        </ul>
      ) : <p className="mt-5 border-t border-neutral-100 pt-5 text-[13px] text-neutral-400">No reviewer notes yet.</p>}
    </SectionCard>
  );
}

// --- Presentational primitives ---

const ACCENT_TONE: Record<string, string> = {
  primary: "bg-primary-50 text-primary-600",
  emerald: "bg-emerald-50 text-emerald-600",
  amber: "bg-amber-50 text-amber-600",
};

function SectionCard({ icon, title, accent = "primary", children }: { icon: IconName; title: string; accent?: "primary" | "emerald" | "amber"; children: ReactNode }) {
  return (
    <section className="card rounded-[16px] p-6 sm:p-7">
      <div className="mb-5 flex items-center gap-3">
        <span className={`grid size-9 place-items-center rounded-[10px] ${ACCENT_TONE[accent] ?? ACCENT_TONE.primary}`}><Icon name={icon} size={18} /></span>
        <h3 className="text-[17px] font-black text-neutral-900">{title}</h3>
      </div>
      {children}
    </section>
  );
}

function ScoreBar({ label, value }: { label: string; value: number }) {
  const meta = scoreMeta(value);
  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-[14px]">
        <span className="truncate pr-2 font-semibold text-neutral-700">{label}</span>
        <span className="shrink-0 font-black text-neutral-900">{value}%</span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-neutral-100">
        <div className={`h-full rounded-full transition-all duration-500 ${meta.bar}`} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
      </div>
    </div>
  );
}

function SignalItem({ children, icon, accent }: { children: ReactNode; icon: IconName; accent: "emerald" | "amber" }) {
  const tone = accent === "emerald" ? "text-emerald-500" : "text-amber-500";
  return (
    <li className="flex gap-3 text-[14px] leading-6 text-neutral-700">
      <span className={`mt-0.5 shrink-0 ${tone}`}><Icon name={icon} size={16} /></span>
      <span>{children}</span>
    </li>
  );
}

function Empty({ children }: { children: ReactNode }) {
  return <p className="rounded-[12px] bg-neutral-50 px-5 py-8 text-center text-[14px] text-neutral-400">{children}</p>;
}

function ScoreRing({ score }: { score: number }) {
  const meta = scoreMeta(score);
  const clamped = Math.max(0, Math.min(100, score));
  const circumference = 2 * Math.PI * 15.5;
  return (
    <div className="relative grid size-[132px] shrink-0 place-items-center">
      <svg className="size-[132px] -rotate-90" viewBox="0 0 36 36">
        <circle className="text-neutral-100" cx="18" cy="18" fill="none" r="15.5" stroke="currentColor" strokeWidth="3.2" />
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
        <span className="block text-[32px] font-black leading-none text-neutral-900">{score}%</span>
        <span className="mt-1.5 block text-[10px] font-bold uppercase tracking-[0.1em] text-neutral-400">Overall</span>
      </div>
    </div>
  );
}

function scoreMeta(score: number) {
  if (score >= 80) return { label: "Strong Potential", ring: "text-emerald-500", bar: "bg-emerald-500", badge: "bg-emerald-50 text-emerald-700 ring-emerald-200", dot: "bg-emerald-500" };
  if (score >= 60) return { label: "Promising", ring: "text-amber-500", bar: "bg-amber-500", badge: "bg-amber-50 text-amber-700 ring-amber-200", dot: "bg-amber-500" };
  return { label: "Needs Review", ring: "text-rose-500", bar: "bg-rose-500", badge: "bg-rose-50 text-rose-700 ring-rose-200", dot: "bg-rose-500" };
}

function formatDate(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(date);
}
