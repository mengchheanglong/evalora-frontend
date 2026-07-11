"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { Icon } from "@/components/icons";
import { ErrorState, InlineAlert, PageLoader } from "@/components/ui-states";
import { apiGet, apiPost, getErrorMessage } from "@/lib/api";
import type { AssessmentTemplate, CandidateReport, CandidateResponse, InterviewSession, ReviewerNote, SessionStatus } from "@/lib/types";

export default function CandidateDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [session, setSession] = useState<InterviewSession | null>(null);
  const [template, setTemplate] = useState<AssessmentTemplate | null>(null);
  const [responses, setResponses] = useState<CandidateResponse[]>([]);
  const [report, setReport] = useState<CandidateReport | null>(null);
  const [notes, setNotes] = useState<ReviewerNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const loadCandidate = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const nextSession = await apiGet<InterviewSession>(`/sessions/${encodeURIComponent(id)}`);
      const [nextTemplate, nextResponses, nextReport, nextNotes] = await Promise.all([
        apiGet<AssessmentTemplate>(`/templates/${encodeURIComponent(nextSession.templateId)}`),
        apiGet<CandidateResponse[]>(`/responses/session/${encodeURIComponent(id)}`).catch(() => []),
        nextSession.reportReady ? apiGet<CandidateReport>(`/reports/${encodeURIComponent(id)}`).catch(() => null) : Promise.resolve(null),
        apiGet<ReviewerNote[]>(`/reports/${encodeURIComponent(id)}/notes`).catch(() => []),
      ]);
      setSession(nextSession);
      setTemplate(nextTemplate);
      setResponses(nextResponses);
      setReport(nextReport);
      setNotes(nextNotes);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { void loadCandidate(); }, [loadCandidate]);

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
    <AppShell active="candidates" breadcrumbs={[{ label: "Candidates", href: "/candidates" }, { label: session?.candidateName ?? "Candidate" }]} description="View comprehensive information and assessment history." title="Candidate Detail">
      {loading ? <PageLoader label="Loading candidate evidence" /> : null}
      {!loading && error && !session ? <ErrorState message={error} onRetry={() => void loadCandidate()} /> : null}
      {!loading && session && template ? (
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_310px]">
          <div className="space-y-5">
            {error ? <InlineAlert tone="error">{error}</InlineAlert> : null}
            {copied ? <InlineAlert tone="success">Private invitation link copied.</InlineAlert> : null}
            <ProfileHero session={session} template={template} />
            <Tabs reportReady={Boolean(report)} sessionId={session.id} />
            <section className="grid gap-4 lg:grid-cols-3">
              <AboutCard session={session} />
              <SkillsCard report={report} template={template} />
              <LatestSessionCard session={session} template={template} />
            </section>
            <RecentActivityCard notes={notes} responses={responses} session={session} />
          </div>
          <aside className="space-y-5">
            <OverallSummary report={report} session={session} />
            <QuickActions copied={copied} copyInvite={copyInvite} generateReport={generateReport} generating={generating} report={report} session={session} />
          </aside>
        </div>
      ) : null}
    </AppShell>
  );
}

function ProfileHero({ session, template }: { session: InterviewSession; template: AssessmentTemplate }) {
  return (
    <section className="card grid gap-6 rounded-[10px] p-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(280px,0.9fr)]">
      <div className="flex flex-wrap items-center gap-6">
        <span className="grid size-28 shrink-0 place-items-center rounded-full bg-gradient-to-br from-sky-100 to-violet-100 text-[30px] font-black text-primary-700 ring-8 ring-neutral-50">
          {initials(session.candidateName)}
        </span>
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-[28px] font-black leading-tight text-neutral-950">{session.candidateName}</h2>
            <StatusBadge status={session.status} />
          </div>
          <p className="mt-2 text-[13px] font-semibold text-neutral-600">{session.targetRole ?? template.roleType}</p>
          <div className="mt-4 grid gap-2 text-[12px] text-neutral-600">
            <ProfileMeta icon="mail" text={`Email: ${session.candidateEmail ?? "No email"}`} />
            <ProfileMeta icon="globe" text="Location: Phnom Penh" />
            <ProfileMeta icon="calendar" text={`Applied On: ${formatDate(session.createdAt)}`} />
          </div>
        </div>
      </div>
      <dl className="grid content-center gap-3 border-neutral-100 text-[12px] lg:border-l lg:pl-8">
        <Meta label="Candidate ID" value={session.candidateId ?? session.id} />
        <Meta label="Source" value="LinkedIn" />
        <Meta label="Current Status" value={statusLabel(session.status)} />
        <Meta label="Owner / Recruiter" value="Maya Chen" />
        <Meta label="Tags" value={tagList(template)} />
      </dl>
    </section>
  );
}

function Tabs({ reportReady, sessionId }: { reportReady: boolean; sessionId: string }) {
  return (
    <div className="flex gap-5 border-b border-neutral-200">
      <button className="border-b-2 border-primary-700 px-3 pb-3 text-[13px] font-bold text-primary-700" type="button">
        <Icon className="mr-2 inline" name="clipboard" size={15} />Overview
      </button>
      <Link className="px-3 pb-3 text-[13px] font-bold text-neutral-500 hover:text-neutral-900" href={reportReady ? `/reports/${sessionId}` : "#"}>
        <Icon className="mr-2 inline" name="file" size={15} />Report
      </Link>
    </div>
  );
}

function AboutCard({ session }: { session: InterviewSession }) {
  return (
    <article className="card rounded-[10px] p-5">
      <h2 className="text-[14px] font-black text-neutral-900">About Candidate</h2>
      <p className="mt-3 text-[12px] leading-5 text-neutral-600">Candidate for {session.targetRole ?? "the assigned role"} with assessment evidence collected through Evalora&apos;s structured interview workflow.</p>
      <dl className="mt-5 space-y-3 text-[11px]">
        <Meta label="Experience" value="3.2 years" />
        <Meta label="Current Company" value="TechSolutions Co., Ltd." />
        <Meta label="Education" value="KIT" />
        <Meta label="Availability" value="2 weeks notice period" />
      </dl>
    </article>
  );
}

function SkillsCard({ report, template }: { report: CandidateReport | null; template: AssessmentTemplate }) {
  const skills = report ? Object.entries(report.moduleScores).map(([label, score]) => ({ label, value: Math.round(score * 20) })) : template.modules.slice(0, 5).map((module, index) => ({ label: module.title, value: 90 - index * 6 }));
  return (
    <article className="card rounded-[10px] p-5">
      <h2 className="text-[14px] font-black text-neutral-900">Skills</h2>
      <div className="mt-4 space-y-3">
        {skills.map((skill) => (
          <div className="grid grid-cols-[92px_1fr_34px] items-center gap-2 text-[10px]" key={skill.label}>
            <span className="truncate font-bold text-neutral-700">{skill.label}</span>
            <span className="h-1.5 rounded-full bg-neutral-200"><span className="block h-full rounded-full bg-primary-500" style={{ width: `${skill.value}%` }} /></span>
            <span className="font-bold text-neutral-700">{skill.value}%</span>
          </div>
        ))}
      </div>
      <button className="mt-5 text-[11px] font-bold text-primary-700" type="button">View all skills ({skills.length})</button>
    </article>
  );
}

function LatestSessionCard({ session, template }: { session: InterviewSession; template: AssessmentTemplate }) {
  const progress = session.status === "completed" ? 100 : session.status === "in_progress" ? 65 : 0;
  return (
    <article className="card rounded-[10px] p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-[14px] font-black text-neutral-900">Latest Session</h2>
          <p className="mt-2 text-[11px] font-bold text-neutral-700">{template.title}</p>
          <p className="mt-0.5 text-[10px] text-neutral-400">{session.id}</p>
        </div>
        <StatusBadge status={session.status} />
      </div>
      <dl className="mt-4 space-y-2 text-[11px]">
        <Meta label="Date" value={formatDate(session.updatedAt ?? session.createdAt)} />
        <Meta label="Duration" value={`${template.timeLimitMin ?? 60} min`} />
        <Meta label="Interviewers" value="Maya Chen" />
      </dl>
      <div className="mt-4">
        <div className="mb-1 flex justify-between text-[10px] font-bold text-neutral-500"><span>Progress</span><span>{progress}%</span></div>
        <div className="h-2 rounded-full bg-neutral-100"><div className="h-full rounded-full bg-primary-500" style={{ width: `${progress}%` }} /></div>
      </div>
      <Link className="button-primary mt-4 h-9 w-full rounded-[7px] !bg-primary-500 text-[11px] hover:!bg-primary-600" href={`/candidates/${session.id}`}>
        View Session Details <Icon className="-rotate-90" name="chevron" size={12} />
      </Link>
    </article>
  );
}

function RecentActivityCard({ session, responses, notes }: { session: InterviewSession; responses: CandidateResponse[]; notes: ReviewerNote[] }) {
  const activities = [
    { icon: "calendar" as const, tone: "bg-sky-100 text-sky-700", title: "Interview session started", detail: `${session.templateTitle ?? "Assessment"} has been started by ${session.candidateName}.`, date: session.startedAt },
    { icon: "mail" as const, tone: "bg-amber-100 text-amber-700", title: "Assessment invitation sent", detail: `Assessment has been sent to ${session.candidateEmail ?? "candidate"}.`, date: session.createdAt },
    { icon: "file" as const, tone: "bg-emerald-100 text-emerald-700", title: notes.length ? "Note added" : "Response evidence saved", detail: notes[0]?.note ?? `${responses.length} response records available for review.`, date: notes[0]?.createdAt ?? responses[0]?.createdAt },
  ];
  return (
    <article className="card rounded-[10px] p-5">
      <h2 className="text-[14px] font-black text-neutral-900">Recent Activity</h2>
      <div className="mt-4 space-y-4">
        {activities.map((activity) => (
          <div className="grid grid-cols-[36px_1fr_auto] gap-3 text-[11px]" key={activity.title}>
            <span className={`flex size-9 items-center justify-center rounded-[7px] ${activity.tone}`}><Icon name={activity.icon} size={16} /></span>
            <div><p className="font-bold text-neutral-900">{activity.title}</p><p className="mt-1 text-neutral-500">{activity.detail}</p></div>
            <span className="hidden whitespace-nowrap text-neutral-400 sm:block">{formatDateTime(activity.date)}</span>
          </div>
        ))}
      </div>
      <button className="mt-4 text-[11px] font-bold text-primary-700" type="button">View all activity</button>
    </article>
  );
}

function OverallSummary({ report, session }: { report: CandidateReport | null; session: InterviewSession }) {
  const score = Math.round((report?.overallScore ?? session.overallScore ?? 3.25) * 20);
  return (
    <article className="card rounded-[10px] p-6">
      <h2 className="text-[15px] font-black text-neutral-900">Overall Summary</h2>
      <div className="mx-auto mt-5 grid size-40 place-items-center rounded-full text-[34px] font-black text-[#6b63f6]" style={{ background: `conic-gradient(#6765f2 ${score * 3.6}deg, #d8f4ff 0deg)` }}>
        <span className="grid size-32 place-items-center rounded-full bg-white">{score}%</span>
      </div>
      <h3 className="mt-4 text-center text-[14px] font-black text-neutral-900">{score >= 75 ? "Good Candidate" : "Needs Review"}</h3>
      <p className="mt-2 text-center text-[12px] leading-5 text-neutral-600">{report?.summary ?? `${session.candidateName} is currently moving through the assessment workflow. Summary evidence will update after report generation.`}</p>
      <SummaryList items={report?.strengths ?? ["Technical reasoning", "Communication", "Structured answers"]} title="Strengths" />
      <SummaryList items={report?.improvementAreas ?? ["System design", "Communication depth"]} title="Areas to Improve" />
    </article>
  );
}

function QuickActions({ session, report, copied, generating, copyInvite, generateReport }: { session: InterviewSession; report: CandidateReport | null; copied: boolean; generating: boolean; copyInvite: () => Promise<void>; generateReport: () => Promise<void> }) {
  return (
    <article className="card rounded-[10px] p-5">
      <h2 className="text-[15px] font-black text-neutral-900">Quick Actions</h2>
      <div className="mt-4 divide-y divide-neutral-100">
        <ActionButton icon="calendar" label="Schedule New Interview" />
        <button className="flex w-full items-center gap-3 py-3 text-left text-[13px] font-bold text-neutral-700 hover:text-primary-700" onClick={() => void copyInvite()} type="button"><Icon name="mail" size={17} /><span>{copied ? "Invitation Copied" : "Send Assessment Invitation"}</span><Icon className="ml-auto -rotate-90" name="chevron" size={12} /></button>
        <ActionButton icon="trend" label="Move to Next Stage" />
        <ActionButton icon="file" label="Add Note" />
        {report ? <Link className="flex items-center gap-3 py-3 text-[13px] font-bold text-neutral-700 hover:text-primary-700" href={`/reports/${session.id}`}><Icon name="report" size={17} /><span>Open Report</span><Icon className="ml-auto -rotate-90" name="chevron" size={12} /></Link> : session.status === "completed" ? <button className="flex w-full items-center gap-3 py-3 text-left text-[13px] font-bold text-neutral-700 hover:text-primary-700" disabled={generating} onClick={() => void generateReport()} type="button"><Icon name="report" size={17} /><span>{generating ? "Generating Report" : "Generate Report"}</span><Icon className="ml-auto -rotate-90" name="chevron" size={12} /></button> : null}
        <ActionButton danger icon="paperPlane" label="Reject Candidate" />
      </div>
    </article>
  );
}

function ActionButton({ icon, label, danger = false }: { icon: "calendar" | "trend" | "file" | "paperPlane"; label: string; danger?: boolean }) {
  return <button className={`flex w-full items-center gap-3 py-3 text-left text-[13px] font-bold ${danger ? "text-red-600 hover:text-red-700" : "text-neutral-700 hover:text-primary-700"}`} type="button"><Icon name={icon} size={17} /><span>{label}</span><Icon className="ml-auto -rotate-90" name="chevron" size={12} /></button>;
}

function ProfileMeta({ icon, text }: { icon: "mail" | "globe" | "calendar"; text: string }) { return <span className="flex items-center gap-2"><Icon className="text-neutral-400" name={icon} size={14} />{text}</span>; }
function SummaryList({ title, items }: { title: string; items: string[] }) { return <div className="mt-4"><h4 className="text-[12px] font-black text-neutral-900">{title}</h4><ul className="mt-2 list-disc space-y-1 pl-5 text-[11px] leading-5 text-neutral-600">{items.slice(0, 3).map((item) => <li key={item}>{item}</li>)}</ul></div>; }
function Meta({ label, value }: { label: string; value: string }) { return <div className="flex items-center justify-between gap-4 border-b border-neutral-100 pb-2 last:border-0 last:pb-0"><dt className="text-neutral-500">{label}</dt><dd className="text-right font-bold text-neutral-900">{value}</dd></div>; }
function StatusBadge({ status }: { status: SessionStatus }) { const style = { not_started: "bg-amber-50 text-amber-700", in_progress: "bg-sky-50 text-sky-700", completed: "bg-emerald-50 text-emerald-700", expired: "bg-rose-50 text-rose-700" }[status]; return <span className={`rounded-[5px] px-2 py-1 text-[10px] font-bold ${style}`}>{statusLabel(status)}</span>; }
function statusLabel(status: SessionStatus) { return { not_started: "Not Started", in_progress: "In Assessment", completed: "Completed", expired: "Withdrawn" }[status]; }
function tagList(template: AssessmentTemplate) { return template.modules.slice(0, 3).map((module) => module.title.replace(" Assessment", "")).join(", "); }
function initials(name: string) { return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "EV"; }
function formatDate(value?: string) { return value ? new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(new Date(value)) : "-"; }
function formatDateTime(value?: string) { return value ? new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "-"; }
