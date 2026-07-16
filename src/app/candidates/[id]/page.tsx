"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { Icon } from "@/components/icons";
import { ReportGeneratePrompt, ReportView } from "@/components/report-view";
import { ErrorState, InlineAlert, PageLoader } from "@/components/ui-states";
import { apiGet, apiPost, getErrorMessage } from "@/lib/api";
import { candidateAvatarTone, candidateInitials } from "@/lib/candidate-avatars";
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
  const [savingNote, setSavingNote] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "report">("overview");

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

  async function addNote(note: string): Promise<boolean> {
    const trimmed = note.trim();
    if (!trimmed) return false;
    setSavingNote(true);
    setError("");
    try {
      const saved = await apiPost<ReviewerNote>(`/reports/${encodeURIComponent(id)}/notes`, { note: trimmed });
      setNotes((current) => [saved, ...current]);
      return true;
    } catch (requestError) {
      setError(getErrorMessage(requestError, "Unable to save this note."));
      return false;
    } finally {
      setSavingNote(false);
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
        <div className="space-y-5">
          {error ? <InlineAlert tone="error">{error}</InlineAlert> : null}
          {copied ? <InlineAlert tone="success">Private invitation link copied.</InlineAlert> : null}
          <ProfileHero session={session} template={template} />
          <Tabs active={activeTab} onChange={setActiveTab} reportReady={Boolean(report)} />

          {activeTab === "overview" ? (
            <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_310px]">
              <div className="space-y-5">
                <section className="grid gap-4 lg:grid-cols-3">
                  <AboutCard session={session} />
                  <SkillsCard report={report} template={template} />
                  <LatestSessionCard session={session} template={template} />
                </section>
                <RecentActivityCard notes={notes} responses={responses} session={session} />
              </div>
              <aside className="space-y-5">
                <OverallSummary report={report} session={session} />
                <QuickActions copied={copied} copyInvite={copyInvite} generateReport={generateReport} generating={generating} onOpenReport={() => setActiveTab("report")} report={report} session={session} />
              </aside>
            </div>
          ) : report ? (
            <ReportView notes={notes} onAddNote={addNote} report={report} role={session.targetRole ?? template.roleType} savingNote={savingNote} showIdentity={false} />
          ) : (
            <ReportGeneratePrompt completed={session.status === "completed"} generating={generating} onGenerate={() => void generateReport()} />
          )}
        </div>
      ) : null}
    </AppShell>
  );
}

function ProfileHero({ session, template }: { session: InterviewSession; template: AssessmentTemplate }) {
  return (
    <section className="card grid gap-6 rounded-[10px] p-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(280px,0.9fr)]">
      <div className="flex flex-wrap items-center gap-6">
        <span className={`grid size-28 shrink-0 place-items-center overflow-hidden rounded-full bg-linear-to-br text-[30px] font-black ring-8 ring-neutral-50 ${candidateAvatarTone(session.candidateName)}`}>
          {candidateInitials(session.candidateName)}
        </span>
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-[28px] font-black leading-tight text-neutral-950">{session.candidateName}</h2>
            <StatusBadge status={session.status} />
          </div>
          <p className="mt-2 text-[13px] font-semibold text-neutral-600">{session.targetRole ?? template.roleType}</p>
          <div className="mt-4 grid gap-2 text-[12px] text-neutral-600">
            <ProfileMeta icon="mail" text={`Email: ${session.candidateEmail ?? "No email"}`} />
            <ProfileMeta icon="calendar" text={`Invited: ${formatDate(session.createdAt)}`} />
            <ProfileMeta icon="clipboard" text={`Access code: ${session.accessCode}`} />
          </div>
        </div>
      </div>
      <dl className="grid content-center gap-3 border-neutral-100 text-[12px] lg:border-l lg:pl-8">
        <Meta label="Session ID" value={session.id} />
        <Meta label="Template" value={template.title} />
        <Meta label="Current Status" value={statusLabel(session.status)} />
        <Meta label="Interviewer" value={session.interviewerName ?? "Workspace team"} />
        <Meta label="Modules" value={tagList(template)} />
      </dl>
    </section>
  );
}

function Tabs({ active, onChange, reportReady }: { active: "overview" | "report"; onChange: (tab: "overview" | "report") => void; reportReady: boolean }) {
  const tabs = [
    { id: "overview" as const, label: "Overview", icon: "clipboard" as const },
    { id: "report" as const, label: "Report", icon: "file" as const },
  ];
  return (
    <div className="flex gap-1 border-b border-neutral-200">
      {tabs.map((tab) => {
        const isActive = active === tab.id;
        return (
          <button
            aria-current={isActive ? "page" : undefined}
            className={`relative flex items-center gap-2 px-4 pb-3.5 pt-1 text-[15px] font-bold transition-colors ${isActive ? "text-primary-700" : "text-neutral-500 hover:text-neutral-900"}`}
            key={tab.id}
            onClick={() => onChange(tab.id)}
            type="button"
          >
            <Icon name={tab.icon} size={17} />
            {tab.label}
            {tab.id === "report" && reportReady ? <span className="size-1.5 rounded-full bg-emerald-500" title="Report ready" /> : null}
            {isActive ? <span className="absolute inset-x-0 -bottom-px h-[2.5px] rounded-full bg-primary-600" /> : null}
          </button>
        );
      })}
    </div>
  );
}

function AboutCard({ session }: { session: InterviewSession }) {
  return (
    <article className="card rounded-[10px] p-5">
      <h2 className="text-[15px] font-black text-neutral-900">About session</h2>
      <p className="mt-3 text-[13px] leading-6 text-neutral-600">
        Assessment invite for {session.targetRole ?? "the assigned role"}. Candidate data below comes only from this session record.
      </p>
      <dl className="mt-5 space-y-3 text-[13px]">
        <Meta label="Email" value={session.candidateEmail ?? "—"} />
        <Meta label="Department" value={session.department ?? "—"} />
        <Meta label="Scheduled" value={formatDateTime(session.scheduledAt)} />
        <Meta label="Language" value={session.language ?? "—"} />
      </dl>
    </article>
  );
}

function SkillsCard({ report, template }: { report: CandidateReport | null; template: AssessmentTemplate }) {
  const skills = report
    ? Object.entries(report.moduleScores).map(([label, score]) => ({ label, value: Math.round(score * 20) }))
    : template.modules.slice(0, 5).map((module) => ({ label: module.title, value: null as number | null }));
  return (
    <article className="card rounded-[10px] p-5">
      <h2 className="text-[15px] font-black text-neutral-900">Module scores</h2>
      <div className="mt-4 space-y-2.5">
        {skills.map((skill) => (
          <div className="grid grid-cols-[1fr_auto] items-center gap-2 text-[13px]" key={skill.label}>
            <span className="truncate font-semibold text-neutral-700">{skill.label}</span>
            <span className="font-bold text-neutral-900">{skill.value == null ? "Pending" : `${skill.value}%`}</span>
          </div>
        ))}
      </div>
      {!report ? <p className="mt-4 text-[12px] text-neutral-500">Scores appear after report generation.</p> : null}
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
        <Meta label="Interviewers" value={session.interviewerName ?? (session.interviewers?.join(", ") || "—")} />
      </dl>
      <div className="mt-4">
        <div className="mb-1 flex justify-between text-[10px] font-bold text-neutral-500"><span>Progress</span><span>{progress}%</span></div>
        <div className="h-2 rounded-full bg-neutral-100"><div className="h-full rounded-full bg-primary-500" style={{ width: `${progress}%` }} /></div>
      </div>
      {session.status !== "completed" && session.status !== "expired" ? (
        <Link className="button-secondary mt-4 h-9 w-full rounded-[7px] text-[11px]" href={`/assessment/${encodeURIComponent(session.accessCode)}`}>
          Open candidate link <Icon className="-rotate-90" name="chevron" size={12} />
        </Link>
      ) : null}
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
      <h2 className="text-[15px] font-black text-neutral-900">Recent Activity</h2>
      <div className="mt-4 space-y-4">
        {activities.map((activity) => (
          <div className="grid grid-cols-[38px_1fr_auto] gap-3 text-[13px]" key={activity.title}>
            <span className={`flex size-9 items-center justify-center rounded-[8px] ${activity.tone}`}><Icon name={activity.icon} size={17} /></span>
            <div><p className="font-bold text-neutral-900">{activity.title}</p><p className="mt-1 leading-5 text-neutral-500">{activity.detail}</p></div>
            <span className="hidden whitespace-nowrap text-[12px] text-neutral-400 sm:block">{formatDateTime(activity.date)}</span>
          </div>
        ))}
      </div>
    </article>
  );
}

function OverallSummary({ report, session }: { report: CandidateReport | null; session: InterviewSession }) {
  const hasScore = report?.overallScore != null || session.overallScore != null;
  const score = hasScore ? Math.round(((report?.overallScore ?? session.overallScore ?? 0) / 5) * 100) : null;
  return (
    <article className="card rounded-[10px] p-6">
      <h2 className="text-[15px] font-black text-neutral-900">Overall Summary</h2>
      <div className="mx-auto mt-5 grid size-40 place-items-center rounded-full text-[34px] font-black text-[#6b63f6]" style={{ background: `conic-gradient(#6765f2 ${(score ?? 0) * 3.6}deg, #d8f4ff 0deg)` }}>
        <span className="grid size-32 place-items-center rounded-full bg-white">{score == null ? "—" : `${score}%`}</span>
      </div>
      <h3 className="mt-4 text-center text-[14px] font-black text-neutral-900">{report ? "Advisory review ready" : "Awaiting report"}</h3>
      <p className="mt-2 text-center text-[12px] leading-5 text-neutral-600">{report?.summary ?? `${session.candidateName} is progressing through the assessment. Summary appears after report generation.`}</p>
      {report ? (
        <>
          <SummaryList items={report.strengths} title="Strengths" />
          <SummaryList items={report.improvementAreas} title="Areas to improve" />
        </>
      ) : null}
      {report?.advisoryNotice ? <p className="mt-4 text-center text-[10px] text-neutral-500">{report.advisoryNotice}</p> : null}
    </article>
  );
}

function QuickActions({ session, report, copied, generating, copyInvite, generateReport, onOpenReport }: { session: InterviewSession; report: CandidateReport | null; copied: boolean; generating: boolean; copyInvite: () => Promise<void>; generateReport: () => Promise<void>; onOpenReport: () => void }) {
  return (
    <article className="card rounded-[10px] p-5">
      <h2 className="text-[16px] font-black text-neutral-900">Quick Actions</h2>
      <div className="mt-3 divide-y divide-neutral-100">
        <button className="flex w-full items-center gap-3 py-3.5 text-left text-[14px] font-bold text-neutral-700 transition-colors hover:text-primary-700" onClick={() => void copyInvite()} type="button">
          <Icon name="mail" size={18} />
          <span>{copied ? "Invitation copied" : "Copy assessment invitation"}</span>
          <Icon className="ml-auto -rotate-90" name="chevron" size={13} />
        </button>
        {report ? (
          <button className="flex w-full items-center gap-3 py-3.5 text-left text-[14px] font-bold text-neutral-700 transition-colors hover:text-primary-700" onClick={onOpenReport} type="button">
            <Icon name="report" size={18} />
            <span>Open report</span>
            <Icon className="ml-auto -rotate-90" name="chevron" size={13} />
          </button>
        ) : session.status === "completed" ? (
          <button className="flex w-full items-center gap-3 py-3.5 text-left text-[14px] font-bold text-neutral-700 transition-colors hover:text-primary-700" disabled={generating} onClick={() => void generateReport()} type="button">
            <Icon name="report" size={18} />
            <span>{generating ? "Generating report" : "Generate report"}</span>
            <Icon className="ml-auto -rotate-90" name="chevron" size={13} />
          </button>
        ) : null}
        {report ? (
          <button className="flex w-full items-center gap-3 py-3.5 text-left text-[14px] font-bold text-neutral-700 transition-colors hover:text-primary-700" onClick={onOpenReport} type="button">
            <Icon name="file" size={18} />
            <span>Add reviewer note</span>
            <Icon className="ml-auto -rotate-90" name="chevron" size={13} />
          </button>
        ) : null}
      </div>
    </article>
  );
}

function ProfileMeta({ icon, text }: { icon: "mail" | "calendar" | "clipboard"; text: string }) {
  return (
    <span className="flex items-center gap-2">
      <Icon className="text-neutral-400" name={icon} size={14} />
      {text}
    </span>
  );
}
function SummaryList({ title, items }: { title: string; items: string[] }) {
  if (!items.length) return null;
  return (
    <div className="mt-4">
      <h4 className="text-[12px] font-black text-neutral-900">{title}</h4>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-[11px] leading-5 text-neutral-600">
        {items.slice(0, 3).map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}
function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-neutral-100 pb-2 last:border-0 last:pb-0">
      <dt className="text-neutral-500">{label}</dt>
      <dd className="text-right font-bold text-neutral-900">{value}</dd>
    </div>
  );
}
function StatusBadge({ status }: { status: SessionStatus }) {
  const style = {
    not_started: "bg-amber-50 text-amber-700",
    in_progress: "bg-sky-50 text-sky-700",
    completed: "bg-emerald-50 text-emerald-700",
    expired: "bg-rose-50 text-rose-700",
  }[status];
  return <span className={`rounded-[5px] px-2 py-1 text-[10px] font-bold ${style}`}>{statusLabel(status)}</span>;
}
function statusLabel(status: SessionStatus) {
  return { not_started: "Not Started", in_progress: "In Assessment", completed: "Completed", expired: "Expired" }[status];
}
function tagList(template: AssessmentTemplate) {
  return template.modules.slice(0, 3).map((module) => module.title.replace(" Assessment", "")).join(", ") || "—";
}
function formatDate(value?: string) {
  return value ? new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(new Date(value)) : "—";
}
function formatDateTime(value?: string) {
  return value ? new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "—";
}
