"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from "react";
import { AppShell } from "@/components/app-shell";
import { Icon } from "@/components/icons";
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
    <AppShell active="candidates" description="AI-supported assessment summary and extracted candidate insights." showPageHeader={false} title="Candidate Report">
      {loading ? <PageLoader label="Loading private report" /> : null}
      {!loading && error && !session ? <ErrorState message={error} onRetry={() => void loadReport()} /> : null}
      {!loading && session ? (
        <div className="space-y-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-[32px] font-black leading-tight text-neutral-950">Candidate Report</h1>
              <p className="mt-2 text-[13px] font-medium text-neutral-600">AI-supported assessment summary and extracted candidate insights.</p>
            </div>
            <Link className="button-secondary h-10 rounded-[8px] px-4" href={`/candidates/${session.id}`}><Icon className="rotate-90" name="chevron" size={13} /> Back to report</Link>
          </div>
          {error ? <InlineAlert tone="error">{error}</InlineAlert> : null}
          {notice ? <InlineAlert tone="success">{notice}</InlineAlert> : null}
          {!report ? <ReportNotReady generating={generating} onGenerate={() => void generateReport()} session={session} /> : <ReportDashboard notes={notes} onAddNote={addNote} report={report} savingNote={savingNote} session={session} />}
        </div>
      ) : null}
    </AppShell>
  );
}

function ReportNotReady({ session, generating, onGenerate }: { session: InterviewSession; generating: boolean; onGenerate: () => void }) {
  return (
    <section className="card rounded-[10px] p-8 text-center sm:p-12">
      <span className="mx-auto flex size-12 items-center justify-center rounded-[8px] bg-sky-50 text-sky-700"><Icon name="report" size={22} /></span>
      <h2 className="mt-5 text-xl font-black text-neutral-950">Report not ready</h2>
      <p className="mx-auto mt-2 max-w-[520px] text-sm leading-6 text-neutral-600">{session.status === "completed" ? "Generate an advisory report from the candidate's saved responses and coding evidence." : "The report becomes available after the candidate submits the assessment."}</p>
      {session.status === "completed" ? <button className="button-primary mt-6 !bg-primary-500 hover:!bg-primary-600" disabled={generating} onClick={onGenerate} type="button">{generating ? "Generating report" : "Generate report"}</button> : <Link className="button-secondary mt-6" href={`/candidates/${session.id}`}>Back to candidate</Link>}
    </section>
  );
}

function ReportDashboard({ report, session, notes, onAddNote, savingNote }: { report: CandidateReport; session: InterviewSession; notes: ReviewerNote[]; onAddNote: (event: FormEvent<HTMLFormElement>) => void; savingNote: boolean }) {
  const score = Math.round(report.overallScore * 20);
  return (
    <>
      <section className="card grid gap-6 rounded-[10px] p-6 lg:grid-cols-[minmax(0,1fr)_220px_250px] lg:items-center">
        <div className="flex flex-wrap items-center gap-6">
          <span className={`grid size-28 shrink-0 place-items-center overflow-hidden rounded-full bg-gradient-to-br text-[30px] font-black ring-4 ring-fuchsia-200 ${candidateAvatarTone(report.candidateName)}`}>
            {candidateInitials(report.candidateName)}
          </span>
          <div>
            <h2 className="text-[28px] font-black text-neutral-950">{report.candidateName}</h2>
            <dl className="mt-4 grid gap-2 text-[12px]">
              <InfoRow icon="clipboard" label="Target Role" value={session.targetRole ?? "Software Engineer"} />
              <InfoRow icon="file" label="Assessment" value={report.assessmentName} />
              <InfoRow icon="check" label="Status" value="Completed" />
            </dl>
          </div>
        </div>
        <ScoreRing score={score} />
        <div>
          <h3 className="text-[15px] font-medium text-neutral-900">Recommendation</h3>
          <span className="mt-4 inline-flex rounded-[6px] bg-gradient-to-r from-[#4d4df7] to-[#f075e7] px-4 py-2 text-[12px] font-bold text-white">{score >= 80 ? "Strong Potential" : "Review Further"}</span>
          <div className="mt-6 flex gap-3 rounded-[8px] bg-violet-50 p-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-[7px] bg-fuchsia-200 text-fuchsia-700"><Icon name="sparkle" size={16} /></span>
            <p className="text-[11px] leading-4 text-neutral-600">Profile synthesized from interview, coding, behavioral, and leadership modules.</p>
          </div>
        </div>
      </section>

      <section className="grid gap-3 lg:grid-cols-4">
        <BreakdownCard scores={report.moduleScores} />
        <SignalsCard strengths={report.strengths} areas={report.improvementAreas} />
        <CapabilityCard score={score} />
        <BehaviorCard />
        <ModuleCard scores={report.moduleScores} />
        <EvidenceCard evidence={report.evidence} />
        <SummaryCard summary={report.summary} />
        <ReviewerNotesCard notes={notes} onAddNote={onAddNote} savingNote={savingNote} />
      </section>
    </>
  );
}

function BreakdownCard({ scores }: { scores: Record<string, number> }) {
  const entries = Object.entries(scores).slice(0, 6);
  return <ReportCard title="1. Core Competency Breakdown">{entries.map(([name, score]) => <BarRow key={name} label={name} value={Math.round(score * 20)} />)}</ReportCard>;
}

function SignalsCard({ strengths, areas }: { strengths: string[]; areas: string[] }) {
  const items = [
    { icon: "sparkle" as const, text: strengths[0] ?? "Strategic thinker", tone: "bg-violet-50 text-violet-700" },
    { icon: "shield" as const, text: strengths[1] ?? "Strong ownership", tone: "bg-emerald-50 text-emerald-700" },
    { icon: "code" as const, text: strengths[2] ?? "Clear technical reasoning", tone: "bg-sky-50 text-sky-700" },
    { icon: "users" as const, text: "Moderate leadership confidence", tone: "bg-amber-50 text-amber-700" },
    { icon: "users" as const, text: "Collaborative under pressure", tone: "bg-violet-50 text-violet-700" },
    { icon: "message" as const, text: areas[0] ?? "Needs more concise communication", tone: "bg-rose-50 text-rose-700" },
  ];
  return <ReportCard title="2. AI Extracted Candidate Signals"><div className="grid grid-cols-2 gap-2">{items.map((item) => <div className={`flex min-h-14 items-center gap-2 rounded-[7px] p-2 ${item.tone}`} key={item.text}><Icon size={16} name={item.icon} /><span className="text-[10px] font-bold leading-3">{item.text}</span></div>)}</div></ReportCard>;
}

function CapabilityCard({ score }: { score: number }) {
  return (
    <ReportCard title="3. Capability Map">
      <div className="grid min-h-[190px] place-items-center">
        <div className="relative grid size-40 place-items-center rounded-full border border-violet-100 bg-[radial-gradient(circle,#ffffff_24%,#f7f4ff_25%,#f7f4ff_45%,#ffffff_46%)]">
          <div className="grid size-28 place-items-center rounded-full border-2 border-violet-500 text-[26px] font-black text-violet-700">{score}%</div>
          {["Technical", "Communication", "Adaptability", "Leadership", "Problem Solving", "Ownership"].map((label, index) => <span className={`absolute text-[8px] font-bold text-neutral-500 ${radarLabelClass(index)}`} key={label}>{label}</span>)}
        </div>
      </div>
    </ReportCard>
  );
}

function BehaviorCard() {
  const rows = [["Decision Style", "Analytical"], ["Work Preference", "Hybrid / Team-oriented"], ["Stress Response", "Stable"], ["Learning Style", "Hands-on"], ["Initiative Level", "High"]];
  return <ReportCard title="4. Behavioral Pattern Analysis">{rows.map(([label, value]) => <div className="flex items-center justify-between gap-3 border-b border-neutral-100 py-3 text-[11px] last:border-0" key={label}><span className="font-bold text-neutral-700">{label}</span><span className="text-right font-bold text-primary-700">{value}</span></div>)}</ReportCard>;
}

function ModuleCard({ scores }: { scores: Record<string, number> }) {
  return <ReportCard title="5. Module Analysis">{Object.entries(scores).slice(0, 4).map(([name, score]) => <BarRow key={name} label={name} value={Math.round(score * 20)} />)}</ReportCard>;
}

function EvidenceCard({ evidence }: { evidence: string[] }) {
  return <ReportCard title="6. Evidence Extracted from Responses"><div className="space-y-2">{evidence.slice(0, 3).map((item) => <blockquote className="rounded-[7px] bg-violet-50 p-3 text-[10px] leading-4 text-neutral-700" key={item}><span className="mr-1 text-lg font-black text-violet-700">&quot;</span>{item}</blockquote>)}</div></ReportCard>;
}

function SummaryCard({ summary }: { summary: string }) {
  return <ReportCard title="7. AI Summary"><p className="text-[11px] leading-5 text-neutral-600">{summary}</p></ReportCard>;
}

function ReviewerNotesCard({ notes, onAddNote, savingNote }: { notes: ReviewerNote[]; onAddNote: (event: FormEvent<HTMLFormElement>) => void; savingNote: boolean }) {
  return (
    <ReportCard title="8. Reviewer Notes">
      <form onSubmit={onAddNote}>
        <textarea className="control min-h-[120px] rounded-[7px] text-[11px]" maxLength={1000} name="note" placeholder="Write your notes about the candidate..." required />
        <p className="mt-1 text-[10px] text-neutral-400">0 / 1000 characters</p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button className="button-secondary h-9 rounded-[7px] text-[11px]" type="button"><Icon name="file" size={13} /> Export report</button>
          <button className="button-primary h-9 rounded-[7px] !bg-primary-500 text-[11px] hover:!bg-primary-600" disabled={savingNote} type="submit">{savingNote ? "Saving" : "Save"}</button>
        </div>
      </form>
      {notes[0] ? <p className="mt-3 rounded-[7px] bg-neutral-50 p-3 text-[10px] leading-4 text-neutral-600">{notes[0].note}</p> : null}
    </ReportCard>
  );
}

function ReportCard({ title, children }: { title: string; children: ReactNode }) {
  return <article className="card min-h-[230px] rounded-[10px] p-4"><h2 className="mb-4 text-[15px] font-black text-neutral-900">{title}</h2>{children}</article>;
}

function BarRow({ label, value }: { label: string; value: number }) {
  return <div className="mb-3 grid grid-cols-[92px_1fr_34px] items-center gap-2 text-[10px] last:mb-0"><span className="truncate font-bold text-neutral-700">{label}</span><span className="h-1.5 rounded-full bg-neutral-200"><span className="block h-full rounded-full bg-primary-500" style={{ width: `${value}%` }} /></span><span className="font-bold text-neutral-700">{value}%</span></div>;
}

function InfoRow({ icon, label, value }: { icon: "clipboard" | "file" | "check"; label: string; value: string }) {
  return <div className="grid grid-cols-[18px_88px_1fr] items-center gap-2"><Icon className="text-neutral-500" name={icon} size={14} /><span className="font-bold text-neutral-500">{label}</span><span className="font-bold text-neutral-900">{value}</span></div>;
}

function ScoreRing({ score }: { score: number }) {
  return (
    <div
      className="mx-auto grid size-36 place-items-center rounded-full text-[34px] font-black text-violet-950 shadow-[0_12px_32px_rgba(124,58,237,0.1)]"
      style={{ background: `conic-gradient(from 0deg, #bf00ff 0deg, #6d5dfc ${score * 3.6}deg, #f4c7ff ${score * 3.6}deg, #f4c7ff 360deg)` }}
    >
      <span className="grid size-28 place-items-center rounded-full bg-white text-center">
        <span className="leading-none">
          {score}%
          <span className="mt-2 block text-[10px] font-bold normal-case text-neutral-500">Over all score</span>
        </span>
      </span>
    </div>
  );
}

function radarLabelClass(index: number) {
  return ["-top-3 left-1/2 -translate-x-1/2", "right-[-34px] top-1/4", "right-[-34px] bottom-1/4", "-bottom-3 left-1/2 -translate-x-1/2", "left-[-42px] bottom-1/4", "left-[-30px] top-1/4"][index] ?? "";
}


