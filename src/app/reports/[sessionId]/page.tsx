"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { AppShell } from "@/components/app-shell";
import { Icon } from "@/components/icons";
import { EmptyState, ErrorState, InlineAlert, PageLoader } from "@/components/ui-states";
import { ApiError, apiGet, apiPost, getErrorMessage } from "@/lib/api";
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

  async function addNote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setSavingNote(true);
    setError("");
    try {
      const note = await apiPost<ReviewerNote>(`/reports/${encodeURIComponent(sessionId)}/notes`, { note: String(data.get("note") ?? "") });
      setNotes((current) => [note, ...current]);
      form.reset();
      setNotice("Reviewer note saved.");
    } catch (requestError) {
      setError(getErrorMessage(requestError, "Unable to save this note."));
    } finally {
      setSavingNote(false);
    }
  }

  return (
    <AppShell active="candidates" breadcrumbs={[{ label: "Candidates", href: "/candidates" }, { label: session?.candidateName ?? "Candidate", href: session ? `/candidates/${session.id}` : undefined }, { label: "Report" }]} description="Evidence-backed AI analysis for human review. Scores are advisory and should be interpreted with the original responses." title="Candidate report">
      {loading ? <PageLoader label="Loading private report" /> : null}
      {!loading && error && !session ? <ErrorState message={error} onRetry={() => void loadReport()} /> : null}
      {!loading && session ? (
        <div className="space-y-5">
          {error ? <InlineAlert tone="error">{error}</InlineAlert> : null}
          {notice ? <InlineAlert tone="success">{notice}</InlineAlert> : null}
          {!report ? <ReportNotReady generating={generating} onGenerate={() => void generateReport()} session={session} /> : <ReportContent notes={notes} onAddNote={addNote} report={report} savingNote={savingNote} session={session} />}
        </div>
      ) : null}
    </AppShell>
  );
}

function ReportNotReady({ session, generating, onGenerate }: { session: InterviewSession; generating: boolean; onGenerate: () => void }) {
  return <section className="card p-8 text-center sm:p-12"><span className="mx-auto flex size-12 items-center justify-center rounded-[8px] bg-sky-50 text-sky-700"><Icon name="report" size={22} /></span><h2 className="mt-5 text-xl font-black text-neutral-950">Report not ready</h2><p className="mx-auto mt-2 max-w-[520px] text-sm leading-6 text-neutral-600">{session.status === "completed" ? "Generate an advisory report from the candidate's saved responses and coding evidence." : "The report becomes available after the candidate submits the assessment."}</p>{session.status === "completed" ? <button className="button-primary mt-6" disabled={generating} onClick={onGenerate} type="button">{generating ? "Generating report" : "Generate report"}</button> : <Link className="button-secondary mt-6" href={`/candidates/${session.id}`}>Back to candidate</Link>}</section>;
}

function ReportContent({ report, session, notes, onAddNote, savingNote }: { report: CandidateReport; session: InterviewSession; notes: ReviewerNote[]; onAddNote: (event: FormEvent<HTMLFormElement>) => void; savingNote: boolean }) {
  const moduleEntries = Object.entries(report.moduleScores);
  return <>
    <section className="card grid gap-6 p-5 sm:p-6 lg:grid-cols-[1fr_auto] lg:items-center">
      <div className="flex items-center gap-4"><span className="flex size-14 shrink-0 items-center justify-center rounded-[8px] bg-[#171b24] text-sm font-black text-white">{initials(report.candidateName)}</span><div><div className="flex flex-wrap items-center gap-2"><h2 className="text-xl font-black text-neutral-950">{report.candidateName}</h2><span className="rounded-[5px] bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-800">Completed</span></div><p className="mt-1 text-[12px] font-semibold text-neutral-700">{session.targetRole ?? "Candidate"} · {report.assessmentName}</p><p className="mt-1 text-[11px] text-neutral-500">Completed {formatDate(report.completedAt)}</p></div></div>
      <div className="flex items-center gap-4"><ScoreRing score={report.overallScore} /><div className="max-w-[240px]"><p className="text-[10px] font-bold uppercase text-neutral-400">Advisory score</p><p className="mt-1 text-[11px] leading-5 text-neutral-600">Use with response evidence and reviewer judgment. This is not a final hiring decision.</p></div></div>
    </section>

    <section className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
      <div className="space-y-5">
        <article className="card p-5 sm:p-6"><div className="flex items-center gap-2"><Icon className="text-sky-700" name="sparkle" size={17} /><h2 className="text-[14px] font-bold text-neutral-950">AI-supported summary</h2></div><p className="mt-4 text-[13px] leading-7 text-neutral-700">{report.summary}</p><div className="mt-5 rounded-[6px] border border-sky-100 bg-sky-50 px-4 py-3 text-[11px] leading-5 text-sky-900">{report.advisoryNotice}</div></article>
        <article className="card overflow-hidden"><div className="border-b border-neutral-200 px-5 py-4 sm:px-6"><h2 className="text-[14px] font-bold text-neutral-950">Module score breakdown</h2><p className="mt-1 text-[11px] text-neutral-500">Each score uses the documented 1-5 rubric scale.</p></div>{moduleEntries.length ? <div className="grid gap-x-8 gap-y-5 p-5 sm:grid-cols-2 sm:p-6">{moduleEntries.map(([name, score]) => <div key={name}><div className="flex items-center justify-between gap-3 text-[12px]"><span className="font-semibold text-neutral-700">{name}</span><span className="font-black text-neutral-950">{score.toFixed(1)}/5</span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-neutral-100"><div className="h-full rounded-full bg-[#29b7e5]" style={{ width: `${Math.min(100, score * 20)}%` }} /></div></div>)}</div> : <div className="p-5"><EmptyState description="Module analysis will appear after evaluation." title="No module scores" /></div>}</article>
        <article className="card overflow-hidden"><div className="border-b border-neutral-200 px-5 py-4 sm:px-6"><h2 className="text-[14px] font-bold text-neutral-950">Response evidence</h2><p className="mt-1 text-[11px] text-neutral-500">Excerpts used to support the analysis above.</p></div>{report.evidence.length ? <div className="divide-y divide-neutral-100">{report.evidence.map((evidence, index) => <blockquote className="flex gap-4 px-5 py-5 text-[12px] leading-6 text-neutral-700 sm:px-6" key={`${index}-${evidence.slice(0, 20)}`}><span className="text-xl font-black text-sky-500">“</span><span className="whitespace-pre-wrap">{evidence}</span></blockquote>)}</div> : <div className="p-6 text-sm text-neutral-500">No response excerpts were available.</div>}</article>
      </div>

      <div className="space-y-5">
        <article className="card p-5 sm:p-6"><h2 className="text-[14px] font-bold text-neutral-950">Observed strengths</h2>{report.strengths.length ? <ul className="mt-4 space-y-3">{report.strengths.map((strength) => <li className="flex gap-3 text-[12px] leading-5 text-neutral-700" key={strength}><span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700"><Icon name="check" size={11} /></span>{strength}</li>)}</ul> : <p className="mt-4 text-sm text-neutral-500">No strength themes were extracted.</p>}</article>
        <article className="card p-5 sm:p-6"><h2 className="text-[14px] font-bold text-neutral-950">Areas for deeper review</h2>{report.improvementAreas.length ? <ul className="mt-4 space-y-3">{report.improvementAreas.map((area) => <li className="flex gap-3 text-[12px] leading-5 text-neutral-700" key={area}><span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700"><Icon name="question" size={11} /></span>{area}</li>)}</ul> : <p className="mt-4 text-sm text-neutral-500">No improvement themes were extracted.</p>}</article>
        <article className="card overflow-hidden"><div className="border-b border-neutral-200 px-5 py-4"><h2 className="text-[14px] font-bold text-neutral-950">Reviewer notes</h2><p className="mt-1 text-[11px] text-neutral-500">Human context is retained with the report.</p></div><form className="p-5" onSubmit={onAddNote}><textarea className="control min-h-[110px]" maxLength={2000} name="note" placeholder="Add context, follow-up questions, or evidence to verify..." required /><div className="mt-3 flex justify-end"><button className="button-primary" disabled={savingNote} type="submit">{savingNote ? "Saving" : "Add note"}</button></div></form>{notes.length ? <div className="divide-y divide-neutral-100 border-t border-neutral-200">{notes.map((note) => <div className="px-5 py-4" key={note.id}><div className="flex items-center justify-between gap-3"><p className="text-[11px] font-bold text-neutral-900">{note.reviewer.name}</p><span className="text-[9px] text-neutral-400">{formatDate(note.createdAt)}</span></div><p className="mt-2 whitespace-pre-wrap text-[11px] leading-5 text-neutral-600">{note.note}</p></div>)}</div> : null}</article>
      </div>
    </section>
  </>;
}

function ScoreRing({ score }: { score: number }) { const degrees = Math.max(0, Math.min(360, (score / 5) * 360)); return <div className="relative flex size-[104px] shrink-0 items-center justify-center rounded-full" style={{ background: `conic-gradient(#25acd8 ${degrees}deg, #e7eef1 0deg)` }}><div className="flex size-[76px] flex-col items-center justify-center rounded-full bg-white"><span className="text-[24px] font-black leading-none text-neutral-950">{score.toFixed(1)}</span><span className="mt-1 text-[9px] font-bold text-neutral-400">out of 5</span></div></div>; }
function initials(name: string) { return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "EV"; }
function formatDate(value?: string) { return value ? new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "-"; }
