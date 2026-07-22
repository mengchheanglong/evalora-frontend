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
        <div className="space-y-4">
          {error ? <InlineAlert tone="error">{error}</InlineAlert> : null}
          {copied ? <InlineAlert tone="success">Private invitation link copied.</InlineAlert> : null}
          <ProfileHero session={session} template={template} />
          <Tabs active={activeTab} onChange={setActiveTab} reportReady={Boolean(report)} />

          {activeTab === "overview" ? (
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_310px]">
              <div className="space-y-4">
                <section className="grid gap-4 lg:grid-cols-2">
                  <SessionDetailsCard session={session} template={template} />
                  <SkillsCard report={report} template={template} />
                </section>
                <RecentActivityCard notes={notes} responses={responses} session={session} />
              </div>
              <aside className="space-y-4">
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
    <section className="card grid gap-4 rounded-xl border-[var(--theme-border)] shadow-[var(--shadow-card)] p-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(280px,0.9fr)]">
      <div className="flex flex-wrap items-center gap-4">
        <span className={`grid size-20 shrink-0 place-items-center overflow-hidden rounded-full bg-linear-to-br text-2xl font-bold ring-2 ring-[var(--theme-border)] ${candidateAvatarTone(session.candidateName)}`}>
          {candidateInitials(session.candidateName)}
        </span>
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-[var(--text-h2)] font-bold leading-tight text-[var(--theme-heading)]">{session.candidateName}</h2>
            <StatusBadge status={session.status} />
          </div>
          <p className="mt-1.5 text-[var(--text-caption)] font-semibold text-[var(--theme-muted)]">{session.targetRole ?? template.roleType}</p>
          <div className="mt-3 grid gap-1.5 text-[var(--text-caption)] text-[var(--theme-muted)]">
            <ProfileMeta icon="mail" text={`Email: ${session.candidateEmail ?? "No email"}`} />
            <ProfileMeta icon="calendar" text={`Invited: ${formatDate(session.createdAt)}`} />
          </div>
        </div>
      </div>
      <dl className="grid content-center gap-2.5 border-[var(--theme-border)] text-[var(--text-caption)] lg:border-l lg:pl-6">
        <Meta label="Template" value={template.title} />
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
    <div className="flex gap-1 border-b border-[var(--theme-border)]">
      {tabs.map((tab) => {
        const isActive = active === tab.id;
        return (
          <button
            aria-current={isActive ? "page" : undefined}
            className={`relative flex items-center gap-2 px-4 pb-3.5 pt-1 text-[var(--text-h3)] font-bold transition-colors ${isActive ? "text-[var(--color-primary-700)]" : "text-[var(--theme-muted)] hover:text-[var(--theme-heading)]"}`}
            key={tab.id}
            onClick={() => onChange(tab.id)}
            type="button"
          >
            <Icon name={tab.icon} size={17} />
            {tab.label}
            {tab.id === "report" && reportReady ? <span className="size-1.5 rounded-full bg-[var(--color-primary-500)]" title="Report ready" /> : null}
            {isActive ? <span className="absolute inset-x-0 -bottom-px h-[2.5px] rounded-full bg-[var(--color-primary-600)]" /> : null}
          </button>
        );
      })}
    </div>
  );
}

function SessionDetailsCard({ session, template }: { session: InterviewSession; template: AssessmentTemplate }) {
  const done = session.status === "completed";
  const active = session.status === "in_progress";
  return (
    <article className="card rounded-xl border-[var(--theme-border)] shadow-[var(--shadow-card)] p-5">
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-[var(--text-h3)] font-bold text-[var(--theme-heading)]">Session details</h2>
        <StatusBadge status={session.status} />
      </div>
      <p className="mt-2 text-[var(--text-caption)] leading-[var(--text-caption--line-height)] text-[var(--theme-muted)]">
        Assessment invite for {session.targetRole ?? "the assigned role"}.
      </p>
      <dl className="mt-4 space-y-2.5 text-[var(--text-caption)]">
        <Meta label="Email" value={session.candidateEmail ?? "—"} />
        <Meta label="Department" value={session.department ?? "—"} />
        <Meta label="Scheduled" value={formatDateTime(session.scheduledAt)} />
        <Meta label="Duration" value={`${template.timeLimitMin ?? 60} min`} />
        <Meta label="Interviewers" value={session.interviewerName ?? (session.interviewers?.join(", ") || "—")} />
        <Meta label="Language" value={session.language ?? "—"} />
      </dl>
      <div className="mt-4">
        <div className="mb-1 flex justify-between text-[var(--text-micro)] font-semibold text-[var(--theme-muted)]">
          <span>Progress</span>
          <span>{done ? "Completed" : statusLabel(session.status)}</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-[var(--theme-panel-soft)]">
          {done ? (
            <div className="h-full w-full rounded-full bg-[var(--color-primary-500)]" />
          ) : active ? (
            <div className="h-full w-2/5 animate-pulse rounded-full bg-[var(--color-primary-400)]" />
          ) : (
            <div className="h-full w-0 rounded-full" />
          )}
        </div>
      </div>
      {session.status !== "completed" && session.status !== "expired" ? (
        <Link className="button-secondary mt-4 h-9 w-full rounded-[7px] text-[var(--text-micro)]" href={`/assessment/${encodeURIComponent(session.accessCode)}`}>
          Open candidate link <Icon className="-rotate-90" name="chevron" size={12} />
        </Link>
      ) : null}
    </article>
  );
}

function SkillsCard({ report, template }: { report: CandidateReport | null; template: AssessmentTemplate }) {
  const skills = report
    ? Object.entries(report.moduleScores).map(([label, score]) => ({ label, value: Math.round(score * 20) }))
    : template.modules.slice(0, 5).map((module) => ({ label: module.title, value: null as number | null }));
  return (
    <article className="card rounded-xl border-[var(--theme-border)] shadow-[var(--shadow-card)] p-5">
      <h2 className="text-[var(--text-h3)] font-bold text-[var(--theme-heading)]">Module scores</h2>
      <div className="mt-4 space-y-2.5">
        {skills.map((skill) => (
          <div className="grid grid-cols-[1fr_auto] items-center gap-2 text-[var(--text-caption)]" key={skill.label}>
            <span className="truncate font-semibold text-[var(--theme-text)]">{skill.label}</span>
            <span className="font-semibold text-[var(--theme-heading)]">{skill.value == null ? "Pending" : `${skill.value}%`}</span>
          </div>
        ))}
      </div>
      {!report ? <p className="mt-4 text-[var(--text-caption)] text-[var(--theme-muted)]">Scores appear after report generation.</p> : null}
    </article>
  );
}

function RecentActivityCard({ session, responses, notes }: { session: InterviewSession; responses: CandidateResponse[]; notes: ReviewerNote[] }) {
  const activities = [
    { icon: "calendar" as const, tone: "bg-[var(--theme-active)] text-[var(--theme-active-text)]", title: "Interview session started", detail: `${session.templateTitle ?? "Assessment"} has been started by ${session.candidateName}.`, date: session.startedAt },
    { icon: "mail" as const, tone: "bg-[var(--color-primary-50)] text-[var(--color-primary-700)]", title: "Assessment invitation sent", detail: `Assessment has been sent to ${session.candidateEmail ?? "candidate"}.`, date: session.createdAt },
    { icon: "file" as const, tone: "bg-[var(--color-primary-50)] text-[var(--color-primary-600)]", title: notes.length ? "Note added" : "Response evidence saved", detail: notes[0]?.note ?? `${responses.length} response records available for review.`, date: notes[0]?.createdAt ?? responses[0]?.createdAt },
  ];
  return (
    <article className="card rounded-xl border-[var(--theme-border)] shadow-[var(--shadow-card)] p-5">
      <h2 className="text-[var(--text-h3)] font-bold text-[var(--theme-heading)]">Recent Activity</h2>
      <div className="mt-4 space-y-4">
        {activities.map((activity) => (
          <div className="grid grid-cols-[38px_1fr_auto] gap-3 text-[var(--text-caption)]" key={activity.title}>
            <span className={`flex size-9 items-center justify-center rounded-[8px] ${activity.tone}`}><Icon name={activity.icon} size={17} /></span>
            <div><p className="font-semibold text-[var(--theme-heading)]">{activity.title}</p><p className="mt-1 leading-5 text-[var(--theme-muted)]">{activity.detail}</p></div>
            <span className="hidden whitespace-nowrap text-[var(--text-caption)] text-[var(--theme-faint)] sm:block">{formatDateTime(activity.date)}</span>
          </div>
        ))}
      </div>
    </article>
  );
}

function OverallSummary({ report, session }: { report: CandidateReport | null; session: InterviewSession }) {
  const hasScore = report?.overallScore != null || session.overallScore != null;
  const score = hasScore ? Math.round(((report?.overallScore ?? session.overallScore ?? 0) / 5) * 100) : null;
  const meta = scoreMeta(score);
  return (
    <article className="card overflow-hidden rounded-xl border-[var(--theme-border)] shadow-[var(--shadow-card)]">
      <div className="p-5">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-[var(--text-h3)] font-bold text-[var(--theme-heading)]">Overall summary</h2>
          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[var(--text-micro)] font-bold ring-1 ${meta.badge}`}>
            <span className={`size-1.5 rounded-full ${meta.dot}`} /> {meta.label}
          </span>
        </div>
        <div className="mt-4 grid place-items-center">
          <ScoreDonut meta={meta} score={score} />
        </div>
        <p className="mt-4 text-center text-[var(--text-caption)] leading-[var(--text-caption--line-height)] text-[var(--theme-muted)]">
          {report?.summary ?? `${session.candidateName} is progressing through the assessment — a full advisory summary appears once the report is generated.`}
        </p>
        {report ? (
          <>
            <SummaryList items={report.strengths} title="Strengths" />
            <SummaryList items={report.improvementAreas} title="Areas to improve" />
          </>
        ) : null}
        {report?.advisoryNotice ? (
          <p className="mt-4 border-t border-[var(--theme-border)] pt-3 text-center text-[var(--text-micro)] leading-5 text-[var(--theme-faint)]">{report.advisoryNotice}</p>
        ) : null}
      </div>
    </article>
  );
}

function ScoreDonut({ score, meta }: { score: number | null; meta: ScoreMeta }) {
  const clamped = Math.max(0, Math.min(100, score ?? 0));
  const circumference = 2 * Math.PI * 15.5;
  return (
    <div className="relative grid size-24 place-items-center">
      <svg className="size-24 -rotate-90" viewBox="0 0 36 36">
        <circle className="text-[var(--theme-panel-soft)]" cx="18" cy="18" fill="none" r="15.5" stroke="currentColor" strokeWidth="3" />
        {score != null ? (
          <circle
            className={`${meta.ring} transition-all duration-700`}
            cx="18"
            cy="18"
            fill="none"
            r="15.5"
            stroke="currentColor"
            strokeDasharray={`${(clamped / 100) * circumference} ${circumference}`}
            strokeLinecap="round"
            strokeWidth="3"
          />
        ) : null}
      </svg>
      <div className="absolute text-center">
        <span className="block text-xl font-extrabold leading-none text-[var(--theme-heading)]">{score == null ? "—" : `${score}%`}</span>
        <span className="mt-1 block text-[var(--text-micro)] font-semibold uppercase tracking-[0.08em] text-[var(--theme-faint)]">Overall</span>
      </div>
    </div>
  );
}

type ScoreMeta = { label: string; ring: string; badge: string; dot: string };
function scoreMeta(score: number | null): ScoreMeta {
  if (score == null)
    return { label: "Pending", ring: "text-[var(--theme-faint)]", badge: "bg-[var(--theme-panel-soft)] text-[var(--theme-muted)] ring-[var(--theme-border)]", dot: "bg-[var(--theme-faint)]" };
  if (score >= 80)
    return { label: "Strong", ring: "text-[var(--color-primary-500)]", badge: "bg-[var(--color-primary-50)] text-[var(--color-primary-700)] ring-[var(--color-primary-300)]", dot: "bg-[var(--color-primary-500)]" };
  if (score >= 60)
    return { label: "Promising", ring: "text-[var(--color-primary-400)]", badge: "bg-[var(--color-primary-50)] text-[var(--color-primary-600)] ring-[var(--color-primary-100)]", dot: "bg-[var(--color-primary-400)]" };
  return { label: "Needs review", ring: "text-[var(--theme-muted)]", badge: "bg-[var(--theme-panel-soft)] text-[var(--theme-muted)] ring-[var(--theme-border)]", dot: "bg-[var(--theme-muted)]" };
}

function QuickActions({ session, report, copied, generating, copyInvite, generateReport, onOpenReport }: { session: InterviewSession; report: CandidateReport | null; copied: boolean; generating: boolean; copyInvite: () => Promise<void>; generateReport: () => Promise<void>; onOpenReport: () => void }) {
  return (
    <article className="card rounded-xl border-[var(--theme-border)] shadow-[var(--shadow-card)] p-5">
      <h2 className="text-[var(--text-caption)] font-semibold text-[var(--theme-heading)]">Quick Actions</h2>
      <div className="mt-3 divide-y divide-[var(--theme-border)]">
        <button className="flex w-full items-center gap-3 py-3 text-left text-[var(--text-caption)] font-medium text-[var(--theme-text)] transition-colors hover:text-[var(--color-primary-700)]" onClick={() => void copyInvite()} type="button">
          <Icon name="mail" size={18} />
          <span>{copied ? "Invitation copied" : "Copy assessment invitation"}</span>
          <Icon className="ml-auto -rotate-90" name="chevron" size={13} />
        </button>
        {report ? (
          <button className="flex w-full items-center gap-3 py-3 text-left text-[var(--text-caption)] font-medium text-[var(--theme-text)] transition-colors hover:text-[var(--color-primary-700)]" onClick={onOpenReport} type="button">
            <Icon name="report" size={18} />
            <span>Open report</span>
            <Icon className="ml-auto -rotate-90" name="chevron" size={13} />
          </button>
        ) : session.status === "completed" ? (
          <button className="flex w-full items-center gap-3 py-3 text-left text-[var(--text-caption)] font-medium text-[var(--theme-text)] transition-colors hover:text-[var(--color-primary-700)]" disabled={generating} onClick={() => void generateReport()} type="button">
            <Icon name="report" size={18} />
            <span>{generating ? "Generating report" : "Generate report"}</span>
            <Icon className="ml-auto -rotate-90" name="chevron" size={13} />
          </button>
        ) : null}
        {report ? (
          <button className="flex w-full items-center gap-3 py-3 text-left text-[var(--text-caption)] font-medium text-[var(--theme-text)] transition-colors hover:text-[var(--color-primary-700)]" onClick={onOpenReport} type="button">
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
      <Icon className="text-[var(--theme-faint)]" name={icon} size={14} />
      {text}
    </span>
  );
}
function SummaryList({ title, items }: { title: string; items: string[] }) {
  if (!items.length) return null;
  return (
    <div className="mt-4">
      <h4 className="text-[var(--text-caption)] font-semibold text-[var(--theme-heading)]">{title}</h4>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-[var(--text-micro)] leading-5 text-[var(--theme-muted)]">
        {items.slice(0, 3).map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}
function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-[var(--theme-border)] pb-1.5 last:border-0 last:pb-0">
      <dt className="text-[var(--theme-muted)]">{label}</dt>
      <dd className="text-right font-semibold text-[var(--theme-heading)]">{value}</dd>
    </div>
  );
}
function StatusBadge({ status }: { status: SessionStatus }) {
  const style = {
    not_started: "bg-[var(--theme-panel-soft)] text-[var(--theme-muted)]",
    in_progress: "bg-[var(--theme-active)] text-[var(--theme-active-text)]",
    completed: "bg-[var(--color-primary-50)] text-[var(--color-primary-700)]",
    expired: "bg-[var(--theme-panel-soft)] text-[var(--theme-faint)]",
  }[status];
  return <span className={`rounded-[5px] px-2 py-1 text-[var(--text-micro)] font-bold ${style}`}>{statusLabel(status)}</span>;
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
