"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { AppShell } from "@/components/app-shell";
import { Icon, type IconName } from "@/components/icons";
import { ErrorState, InlineAlert, PageLoader } from "@/components/ui-states";
import { ApiError, apiGet, apiPost, getErrorMessage } from "@/lib/api";
import { candidateAvatarTone, candidateInitials } from "@/lib/candidate-avatars";
import type { CandidateReport, InterviewSession, ReviewerNote } from "@/lib/types";

export default function ReportPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [session, setSession] = useState<InterviewSession | null>(null);
  const [report, setReport] = useState<CandidateReport | null>(null);
  const [notes, setNotes] = useState<ReviewerNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [savingNote, setSavingNote] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadReport = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const nextSession = await apiGet<InterviewSession>(`/sessions/${encodeURIComponent(sessionId)}`);
      setSession(nextSession);
      const [nextNotes, nextReport] = await Promise.all([
        apiGet<ReviewerNote[]>(`/reports/${encodeURIComponent(sessionId)}/notes`),
        apiGet<CandidateReport>(`/reports/${encodeURIComponent(sessionId)}`).catch((requestError) => {
          if (requestError instanceof ApiError && requestError.status === 404) return null;
          throw requestError;
        }),
      ]);
      setNotes(nextNotes);
      setReport(nextReport);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => { void loadReport(); }, [loadReport]);

  async function generateReport() {
    setGenerating(true);
    setError("");
    try {
      const generated = await apiPost<CandidateReport>(`/reports/${encodeURIComponent(sessionId)}/generate`);
      setReport(generated);
      setNotice(generated.persistence?.status === "persisted" ? "Report generated from saved candidate evidence." : "Report processing completed, but persistence is still pending.");
    } catch (requestError) {
      setError(getErrorMessage(requestError, "Unable to generate this report."));
    } finally {
      setGenerating(false);
    }
  }

  async function addNote(note: string): Promise<boolean> {
    const trimmed = note.trim();
    if (!trimmed) return false;
    setSavingNote(true);
    setError("");
    try {
      const saved = await apiPost<ReviewerNote>(`/reports/${encodeURIComponent(sessionId)}/notes`, { note: trimmed });
      setNotes((current) => [saved, ...current]);
      setNotice("Reviewer note saved.");
      return true;
    } catch (requestError) {
      setError(getErrorMessage(requestError, "Unable to save this note."));
      return false;
    } finally {
      setSavingNote(false);
    }
  }

  return (
    <AppShell active="candidates" description="AI-supported assessment summary and extracted candidate insights." showPageHeader={false} title="Candidate Report">
      {loading ? <PageLoader label="Loading private report" /> : null}
      {!loading && error && !session ? <ErrorState message={error} onRetry={() => void loadReport()} /> : null}
      {!loading && session ? (
        <div className="mx-auto max-w-[1180px] space-y-5">
          <header className="flex flex-wrap items-center justify-between gap-3 print:hidden">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-primary-600">Candidate Report</p>
              <h1 className="mt-1 text-[26px] font-black leading-tight text-neutral-950">Assessment Summary</h1>
            </div>
            <div className="flex items-center gap-2">
              <Link className="button-secondary h-10 rounded-[8px] px-4 text-[12px]" href={`/candidates/${session.id}`}>
                <Icon className="rotate-90" name="chevron" size={13} /> Back
              </Link>
              {report ? (
                <button className="button-primary h-10 rounded-[8px] px-4 text-[12px] !bg-primary-600 hover:!bg-primary-700" onClick={() => window.print()} type="button">
                  <Icon name="file" size={14} /> Print / Export
                </button>
              ) : null}
            </div>
          </header>

          {error ? <InlineAlert tone="error">{error}</InlineAlert> : null}
          {notice ? <InlineAlert tone="success">{notice}</InlineAlert> : null}

          {!report
            ? <ReportNotReady generating={generating} onGenerate={() => void generateReport()} session={session} />
            : <ReportBody notes={notes} onAddNote={addNote} report={report} savingNote={savingNote} session={session} />}
        </div>
      ) : null}
    </AppShell>
  );
}

function ReportNotReady({ session, generating, onGenerate }: { session: InterviewSession; generating: boolean; onGenerate: () => void }) {
  const completed = session.status === "completed";
  return (
    <section className="card rounded-[14px] p-8 text-center sm:p-14">
      <span className="mx-auto flex size-14 items-center justify-center rounded-[12px] bg-primary-50 text-primary-600"><Icon name="report" size={26} /></span>
      <h2 className="mt-5 text-xl font-black text-neutral-950">Report not ready</h2>
      <p className="mx-auto mt-2 max-w-[520px] text-[13px] leading-6 text-neutral-500">
        {completed
          ? "Generate an advisory report from the candidate's saved responses and coding evidence."
          : "The report becomes available once the candidate submits the assessment."}
      </p>
      {completed
        ? <button className="button-primary mt-6 !bg-primary-600 hover:!bg-primary-700" disabled={generating} onClick={onGenerate} type="button">{generating ? "Generating report…" : "Generate report"}</button>
        : <Link className="button-secondary mt-6" href={`/candidates/${session.id}`}>Back to candidate</Link>}
    </section>
  );
}

function ReportBody({ report, session, notes, onAddNote, savingNote }: { report: CandidateReport; session: InterviewSession; notes: ReviewerNote[]; onAddNote: (note: string) => Promise<boolean>; savingNote: boolean }) {
  const score = Math.round(report.overallScore * 20);
  const meta = scoreMeta(score);
  const moduleEntries = Object.entries(report.moduleScores);

  return (
    <>
      {/* Hero */}
      <section className="card overflow-hidden rounded-[14px]">
        <div className="h-1.5 w-full bg-gradient-to-r from-primary-500 via-indigo-500 to-fuchsia-500" />
        <div className="grid gap-6 p-6 sm:p-8 lg:grid-cols-[1fr_auto] lg:items-center">
          <div className="flex flex-wrap items-center gap-5">
            <span className={`grid size-20 shrink-0 place-items-center rounded-[18px] bg-gradient-to-br text-2xl font-black ${candidateAvatarTone(report.candidateName)}`}>
              {candidateInitials(report.candidateName)}
            </span>
            <div className="min-w-0">
              <h2 className="text-2xl font-black leading-tight text-neutral-950 sm:text-[28px]">{report.candidateName}</h2>
              <p className="mt-1 text-[13px] font-semibold text-neutral-500">{session.targetRole ?? "Candidate"} · {report.assessmentName}</p>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] font-semibold">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-emerald-700 ring-1 ring-emerald-100"><Icon name="check" size={12} /> Completed</span>
                {report.completedAt ? <span className="text-neutral-400">Submitted {formatDate(report.completedAt)}</span> : null}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-6 lg:border-l lg:border-neutral-100 lg:pl-8">
            <ScoreRing score={score} />
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-neutral-400">Recommendation</p>
              <span className={`mt-2 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[12px] font-bold ring-1 ${meta.badge}`}>
                <span className={`size-2 rounded-full ${meta.dot}`} /> {meta.label}
              </span>
              <p className="mt-3 max-w-[190px] text-[10px] leading-4 text-neutral-400">Synthesized across {moduleEntries.length || "all"} assessment modules.</p>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-[1.45fr_1fr]">
        {/* Left: analytical + evidence */}
        <div className="space-y-5">
          <SectionCard icon="analytics" title="Competency breakdown">
            {moduleEntries.length ? (
              <div className="space-y-4">{moduleEntries.map(([name, value]) => <ScoreBar key={name} label={name} value={Math.round(value * 20)} />)}</div>
            ) : <Empty>No module scores were recorded for this assessment.</Empty>}
          </SectionCard>

          <SectionCard icon="report" title="Assessment summary">
            <p className="text-[13px] leading-6 text-neutral-600">{report.summary || "No summary was generated."}</p>
          </SectionCard>

          <SectionCard icon="message" title="Evidence from responses">
            {report.evidence.length ? (
              <div className="space-y-3">
                {report.evidence.slice(0, 6).map((item, index) => (
                  <blockquote className="rounded-[10px] border-l-[3px] border-primary-300 bg-neutral-50 px-4 py-3 text-[12px] leading-5 text-neutral-600" key={index}>
                    {item}
                  </blockquote>
                ))}
              </div>
            ) : <Empty>No supporting evidence was extracted.</Empty>}
          </SectionCard>
        </div>

        {/* Right: qualitative + reviewer */}
        <div className="space-y-5">
          <SectionCard accent="emerald" icon="sparkle" title="Key strengths">
            {report.strengths.length ? (
              <ul className="space-y-2.5">{report.strengths.map((item, index) => <SignalItem accent="emerald" icon="check" key={index}>{item}</SignalItem>)}</ul>
            ) : <Empty>No standout strengths recorded.</Empty>}
          </SectionCard>

          <SectionCard accent="amber" icon="trend" title="Areas to develop">
            {report.improvementAreas.length ? (
              <ul className="space-y-2.5">{report.improvementAreas.map((item, index) => <SignalItem accent="amber" icon="chevron" key={index}>{item}</SignalItem>)}</ul>
            ) : <Empty>No development areas flagged.</Empty>}
          </SectionCard>

          <ReviewerCard notes={notes} onAddNote={onAddNote} reviewerSummary={report.reviewerSummary} savingNote={savingNote} />
        </div>
      </div>

      <p className="flex items-start gap-2 rounded-[12px] border border-neutral-200 bg-neutral-50 px-4 py-3 text-[11px] leading-5 text-neutral-500">
        <Icon className="mt-0.5 shrink-0 text-neutral-400" name="shield" size={14} />
        {report.advisoryNotice || "AI-supported feedback is advisory. A human reviewer remains responsible for hiring decisions."}
      </p>
    </>
  );
}

function ReviewerCard({ notes, onAddNote, savingNote, reviewerSummary }: { notes: ReviewerNote[]; onAddNote: (note: string) => Promise<boolean>; savingNote: boolean; reviewerSummary?: string }) {
  const [text, setText] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (await onAddNote(text)) setText("");
  }

  return (
    <SectionCard accent="primary" icon="user" title="Reviewer notes">
      {reviewerSummary ? (
        <p className="mb-4 rounded-[10px] bg-primary-50 px-4 py-3 text-[12px] leading-5 text-primary-700">{reviewerSummary}</p>
      ) : null}

      <form onSubmit={submit}>
        <textarea
          className="control min-h-[104px] rounded-[8px] text-[12px]"
          maxLength={1000}
          name="note"
          onChange={(event) => setText(event.target.value)}
          placeholder="Add a private note about this candidate…"
          required
          value={text}
        />
        <div className="mt-1.5 flex items-center justify-between">
          <span className="text-[10px] text-neutral-400">{text.length} / 1000</span>
          <button className="button-primary h-9 rounded-[7px] px-4 !bg-primary-600 text-[12px] hover:!bg-primary-700 disabled:opacity-60" disabled={savingNote || !text.trim()} type="submit">
            {savingNote ? "Saving…" : "Save note"}
          </button>
        </div>
      </form>

      {notes.length ? (
        <ul className="mt-4 space-y-3 border-t border-neutral-100 pt-4">
          {notes.map((note) => (
            <li className="text-[12px]" key={note.id}>
              <div className="mb-1 flex items-center justify-between gap-2">
                <span className="font-bold text-neutral-800">{note.reviewer?.name ?? "Reviewer"}</span>
                {note.createdAt ? <span className="text-[10px] text-neutral-400">{formatDate(note.createdAt)}</span> : null}
              </div>
              <p className="leading-5 text-neutral-600">{note.note}</p>
            </li>
          ))}
        </ul>
      ) : <p className="mt-4 border-t border-neutral-100 pt-4 text-[11px] text-neutral-400">No reviewer notes yet.</p>}
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
    <section className="card rounded-[14px] p-5 sm:p-6">
      <div className="mb-4 flex items-center gap-2.5">
        <span className={`grid size-8 place-items-center rounded-[9px] ${ACCENT_TONE[accent] ?? ACCENT_TONE.primary}`}><Icon name={icon} size={16} /></span>
        <h3 className="text-[14px] font-black text-neutral-900">{title}</h3>
      </div>
      {children}
    </section>
  );
}

function ScoreBar({ label, value }: { label: string; value: number }) {
  const meta = scoreMeta(value);
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between text-[12px]">
        <span className="truncate pr-2 font-semibold text-neutral-700">{label}</span>
        <span className="shrink-0 font-black text-neutral-900">{value}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-neutral-100">
        <div className={`h-full rounded-full transition-all ${meta.bar}`} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
      </div>
    </div>
  );
}

function SignalItem({ children, icon, accent }: { children: ReactNode; icon: IconName; accent: "emerald" | "amber" }) {
  const tone = accent === "emerald" ? "text-emerald-500" : "text-amber-500";
  return (
    <li className="flex gap-2.5 text-[12px] leading-5 text-neutral-700">
      <span className={`mt-0.5 shrink-0 ${tone}`}><Icon name={icon} size={14} /></span>
      <span>{children}</span>
    </li>
  );
}

function Empty({ children }: { children: ReactNode }) {
  return <p className="rounded-[10px] bg-neutral-50 px-4 py-6 text-center text-[12px] text-neutral-400">{children}</p>;
}

function ScoreRing({ score }: { score: number }) {
  const meta = scoreMeta(score);
  const clamped = Math.max(0, Math.min(100, score));
  const circumference = 2 * Math.PI * 15.5;
  return (
    <div className="relative grid size-[120px] shrink-0 place-items-center">
      <svg className="size-[120px] -rotate-90" viewBox="0 0 36 36">
        <circle className="text-neutral-100" cx="18" cy="18" fill="none" r="15.5" stroke="currentColor" strokeWidth="3.2" />
        <circle
          className={`${meta.ring} transition-all`}
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
        <span className="block text-[26px] font-black leading-none text-neutral-900">{score}%</span>
        <span className="mt-1 block text-[9px] font-bold uppercase tracking-[0.08em] text-neutral-400">Overall</span>
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
