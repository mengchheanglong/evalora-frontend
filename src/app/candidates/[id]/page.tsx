"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { Icon } from "@/components/icons";
import { ErrorState, InlineAlert, PageLoader } from "@/components/ui-states";
import { apiGet, apiPost, getErrorMessage } from "@/lib/api";
import type { AssessmentTemplate, CandidateReport, CandidateResponse, InterviewSession, SessionStatus } from "@/lib/types";

export default function CandidateDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [session, setSession] = useState<InterviewSession | null>(null);
  const [template, setTemplate] = useState<AssessmentTemplate | null>(null);
  const [responses, setResponses] = useState<CandidateResponse[]>([]);
  const [report, setReport] = useState<CandidateReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const loadCandidate = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const nextSession = await apiGet<InterviewSession>(`/sessions/${encodeURIComponent(id)}`);
      const [nextTemplate, nextResponses, nextReport] = await Promise.all([
        apiGet<AssessmentTemplate>(`/templates/${encodeURIComponent(nextSession.templateId)}`),
        apiGet<CandidateResponse[]>(`/responses/session/${encodeURIComponent(id)}`),
        nextSession.reportReady ? apiGet<CandidateReport>(`/reports/${encodeURIComponent(id)}`) : Promise.resolve(null),
      ]);
      setSession(nextSession);
      setTemplate(nextTemplate);
      setResponses(nextResponses);
      setReport(nextReport);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { void loadCandidate(); }, [loadCandidate]);

  const questionMap = useMemo(() => new Map(template?.modules.flatMap((module) => (module.questions ?? []).map((question) => [question.id, { question: question.questionText, module: module.title }] as const)) ?? []), [template]);

  async function generateReport() {
    setGenerating(true);
    setError("");
    try {
      const generated = await apiPost<CandidateReport>(`/reports/${encodeURIComponent(id)}/generate`);
      setReport(generated);
      setSession((current) => current ? { ...current, reportReady: generated.persistence?.status === "persisted" } : current);
    } catch (requestError) {
      setError(getErrorMessage(requestError, "Unable to generate the report."));
    } finally {
      setGenerating(false);
    }
  }

  async function copyInvite() {
    if (!session) return;
    await navigator.clipboard.writeText(`${window.location.origin}/assessment/${encodeURIComponent(session.accessCode)}`);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <AppShell active="candidates" breadcrumbs={[{ label: "Candidates", href: "/candidates" }, { label: session?.candidateName ?? "Candidate" }]} description="Review invitation state, submitted evidence, and AI-supported analysis in one place." title={session?.candidateName ?? "Candidate profile"}>
      {loading ? <PageLoader label="Loading candidate evidence" /> : null}
      {!loading && error && !session ? <ErrorState message={error} onRetry={() => void loadCandidate()} /> : null}
      {!loading && session && template ? (
        <div className="space-y-5">
          {error ? <InlineAlert tone="error">{error}</InlineAlert> : null}
          {copied ? <InlineAlert tone="success">Private invitation link copied.</InlineAlert> : null}
          <section className="card grid gap-5 p-5 sm:p-6 lg:grid-cols-[1fr_auto] lg:items-center">
            <div className="flex items-center gap-4"><span className="flex size-14 shrink-0 items-center justify-center rounded-[8px] bg-[#171b24] text-sm font-black text-white">{initials(session.candidateName)}</span><div><div className="flex flex-wrap items-center gap-2"><h2 className="text-xl font-black text-neutral-950">{session.candidateName}</h2><StatusBadge status={session.status} /></div><p className="mt-1 text-[12px] text-neutral-500">{session.candidateEmail}</p><p className="mt-2 text-[12px] font-semibold text-neutral-700">{session.targetRole ?? template.roleType} · {template.title}</p></div></div>
            <div className="flex flex-wrap gap-2">{session.status !== "completed" && session.status !== "expired" ? <button className="button-secondary" onClick={() => void copyInvite()} type="button"><Icon name="file" size={14} />{copied ? "Copied" : "Copy invitation"}</button> : null}{report ? <Link className="button-primary" href={`/reports/${session.id}`}>Open report</Link> : session.status === "completed" ? <button className="button-primary" disabled={generating} onClick={() => void generateReport()} type="button">{generating ? "Generating" : "Generate report"}</button> : null}</div>
          </section>

          <section className="grid gap-5 xl:grid-cols-[0.82fr_1.18fr]">
            <div className="space-y-5">
              <article className="card p-5"><h2 className="text-[14px] font-bold text-neutral-950">Session details</h2><dl className="mt-4 space-y-3 text-[12px]"><Meta label="Access code" value={session.accessCode} /><Meta label="Created" value={formatDateTime(session.createdAt)} /><Meta label="Started" value={formatDateTime(session.startedAt)} /><Meta label="Completed" value={formatDateTime(session.completedAt)} /><Meta label="Expires" value={formatDateTime(session.expiresAt)} /></dl></article>
              <article className="card p-5"><div className="flex items-center justify-between gap-3"><h2 className="text-[14px] font-bold text-neutral-950">Assessment structure</h2><span className="text-[11px] font-semibold text-neutral-500">{template.timeLimitMin ?? "-"} min</span></div><div className="mt-4 divide-y divide-neutral-100">{template.modules.map((module, index) => <div className="flex items-center gap-3 py-3" key={module.id}><span className="flex size-7 items-center justify-center rounded-[5px] bg-neutral-100 text-[10px] font-bold text-neutral-600">{index + 1}</span><div className="min-w-0"><p className="truncate text-[12px] font-bold text-neutral-900">{module.title}</p><p className="mt-0.5 text-[10px] text-neutral-500">{module.questions?.length ?? 0} prompts · weight {module.weight}</p></div></div>)}</div></article>
              {report ? <article className="rounded-[8px] border border-sky-100 bg-sky-50 p-5"><p className="text-[11px] font-bold uppercase text-sky-700">Advisory overall score</p><p className="mt-2 text-3xl font-black text-sky-950">{report.overallScore.toFixed(1)}<span className="text-base text-sky-700">/5</span></p><p className="mt-3 text-[11px] leading-5 text-sky-900/80">{report.advisoryNotice}</p></article> : null}
            </div>

            <article className="card overflow-hidden">
              <div className="border-b border-neutral-200 px-5 py-4 sm:px-6"><h2 className="text-[14px] font-bold text-neutral-950">Submitted response evidence</h2><p className="mt-1 text-[11px] text-neutral-500">Responses are shown verbatim for reviewer context.</p></div>
              {responses.length ? <div className="divide-y divide-neutral-100">{responses.map((response, index) => { const context = response.questionId ? questionMap.get(response.questionId) : undefined; return <div className="px-5 py-5 sm:px-6" key={response.id}><div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-bold uppercase text-[#087aa4]">{context?.module ?? `Response ${index + 1}`}</p><h3 className="mt-1 text-[13px] font-bold leading-5 text-neutral-900">{context?.question ?? "Structured candidate response"}</h3></div><span className="shrink-0 text-[10px] text-neutral-400">{formatDateTime(response.savedAt ?? response.createdAt)}</span></div><p className="mt-3 whitespace-pre-wrap rounded-[6px] bg-neutral-50 px-4 py-3 text-[12px] leading-6 text-neutral-700">{response.responseText || "No written response"}</p></div>; })}</div> : <div className="p-8 text-center"><span className="mx-auto flex size-10 items-center justify-center rounded-[7px] bg-neutral-100 text-neutral-500"><Icon name="message" size={18} /></span><p className="mt-3 text-[13px] font-bold text-neutral-900">No responses saved yet</p><p className="mt-1 text-[11px] text-neutral-500">Evidence appears as the candidate progresses through the assessment.</p></div>}
            </article>
          </section>
        </div>
      ) : null}
    </AppShell>
  );
}

function Meta({ label, value }: { label: string; value: string }) { return <div className="flex items-center justify-between gap-4 border-b border-neutral-100 pb-3 last:border-0 last:pb-0"><dt className="text-neutral-500">{label}</dt><dd className="text-right font-bold text-neutral-900">{value}</dd></div>; }
function StatusBadge({ status }: { status: SessionStatus }) { const style = { not_started: "bg-amber-50 text-amber-800", in_progress: "bg-sky-50 text-sky-800", completed: "bg-emerald-50 text-emerald-800", expired: "bg-neutral-100 text-neutral-600" }[status]; return <span className={`rounded-[5px] px-2 py-1 text-[10px] font-bold ${style}`}>{status.replaceAll("_", " ")}</span>; }
function initials(name: string) { return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "EV"; }
function formatDateTime(value?: string) { return value ? new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "-"; }
