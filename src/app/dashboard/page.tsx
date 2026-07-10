"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { Icon, type IconName } from "@/components/icons";
import { EmptyState, ErrorState, PageLoader } from "@/components/ui-states";
import { apiGet, getErrorMessage } from "@/lib/api";
import type { ActivityItem, AnalyticsSummary, SessionStatus } from "@/lib/types";

export default function DashboardPage() {
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [nextSummary, nextActivity] = await Promise.all([
        apiGet<AnalyticsSummary>("/analytics/summary"),
        apiGet<ActivityItem[]>("/analytics/activity"),
      ]);
      setSummary(nextSummary);
      setActivity(nextActivity);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  return (
    <AppShell
      active="dashboard"
      actions={<Link className="button-primary hidden h-10 sm:inline-flex" href="/assessment/create"><Icon name="plus" size={15} /> New session</Link>}
      description="Monitor candidate progress, report readiness, and assessment performance across your workspace."
      title="Dashboard"
    >
      {loading ? <PageLoader label="Loading live assessment data" /> : null}
      {!loading && error ? <ErrorState message={error} onRetry={() => void loadDashboard()} /> : null}
      {!loading && !error && summary ? <DashboardContent activity={activity} summary={summary} /> : null}
    </AppShell>
  );
}

function DashboardContent({ activity, summary }: { activity: ActivityItem[]; summary: AnalyticsSummary }) {
  const stats: Array<{ label: string; value: string; detail: string; icon: IconName; tone: string }> = [
    { label: "Candidates", value: String(summary.totalCandidates), detail: `${summary.totalSessions} assigned sessions`, icon: "users", tone: "bg-violet-100 text-violet-700" },
    { label: "In progress", value: String(summary.inProgressAssessments), detail: "Currently active", icon: "clock", tone: "bg-sky-100 text-sky-700" },
    { label: "Completed", value: String(summary.completedAssessments), detail: `${formatPercent(summary.completionRate)} completion rate`, icon: "check", tone: "bg-emerald-100 text-emerald-700" },
    { label: "Average score", value: summary.averageScore ? `${summary.averageScore.toFixed(1)}/5` : "-", detail: "Advisory reviewer signal", icon: "report", tone: "bg-amber-100 text-amber-700" },
  ];

  return (
    <div className="space-y-5">
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <article className="card p-5" key={stat.label}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[12px] font-semibold text-neutral-500">{stat.label}</p>
                <p className="mt-2 text-[28px] font-black leading-none text-neutral-950">{stat.value}</p>
                <p className="mt-3 text-[11px] font-medium text-neutral-500">{stat.detail}</p>
              </div>
              <span className={`flex size-9 items-center justify-center rounded-[7px] ${stat.tone}`}><Icon name={stat.icon} size={17} /></span>
            </div>
          </article>
        ))}
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.45fr_0.8fr]">
        <article className="card p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-[15px] font-bold text-neutral-950">Assessment pipeline</h2>
              <p className="mt-1 text-[12px] text-neutral-500">Live session status across this workspace.</p>
            </div>
            <Link className="text-[12px] font-bold text-[#087aa4] hover:text-[#065e7e]" href="/assessment">View sessions</Link>
          </div>
          {summary.totalSessions ? <Pipeline summary={summary} /> : (
            <div className="mt-6"><EmptyState action={<Link className="button-primary" href="/assessment/create">Create first session</Link>} description="Invite a candidate to begin tracking progress here." icon="message" title="No sessions yet" /></div>
          )}
        </article>

        <article className="card p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-[15px] font-bold text-neutral-950">Module performance</h2>
            <Link className="text-[12px] font-bold text-[#087aa4]" href="/analytics">Details</Link>
          </div>
          {summary.modulePerformance.length ? (
            <div className="mt-6 space-y-4">
              {summary.modulePerformance.slice(0, 6).map((module) => (
                <div key={module.moduleId ?? module.moduleType}>
                  <div className="flex items-center justify-between gap-3 text-[12px]">
                    <span className="truncate font-semibold text-neutral-700">{module.title}</span>
                    <span className="font-bold text-neutral-950">{module.average.toFixed(1)}/5</span>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-neutral-100"><div className="h-full rounded-full bg-[#28aedb]" style={{ width: `${Math.min(100, module.average * 20)}%` }} /></div>
                </div>
              ))}
            </div>
          ) : <p className="mt-6 text-sm leading-6 text-neutral-500">Module averages appear after completed responses are evaluated.</p>}
        </article>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.45fr_0.8fr]">
        <article className="card overflow-hidden">
          <div className="flex items-center justify-between border-b border-neutral-200 px-5 py-4 sm:px-6">
            <div>
              <h2 className="text-[15px] font-bold text-neutral-950">Recently completed</h2>
              <p className="mt-1 text-[11px] text-neutral-500">Scores support review and should be read with response evidence.</p>
            </div>
            <Link className="shrink-0 text-[12px] font-bold text-[#087aa4]" href="/candidates">All candidates</Link>
          </div>
          {summary.recentCompleted.length ? (
            <>
              <div className="divide-y divide-neutral-100 sm:hidden">
                {summary.recentCompleted.map((item) => (
                  <Link className="flex items-center gap-3 px-5 py-4" href={`/reports/${item.sessionId}`} key={item.sessionId}>
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-[7px] bg-neutral-900 text-[11px] font-black text-white">{initials(item.candidateName)}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[12px] font-bold text-neutral-900">{item.candidateName}</span>
                      <span className="mt-0.5 block truncate text-[10px] text-neutral-500">{item.assessmentName}</span>
                      <span className="mt-1 block text-[10px] text-neutral-400">{formatDate(item.completedAt)}</span>
                    </span>
                    <span className="flex shrink-0 items-center gap-2"><ScorePill score={item.overallScore} /><Icon className="-rotate-90 text-neutral-400" name="chevron" size={13} /></span>
                  </Link>
                ))}
              </div>
              <div className="hidden overflow-x-auto sm:block">
              <table className="w-full min-w-[680px] text-left text-[12px]">
                <thead className="bg-neutral-50 text-[11px] font-semibold text-neutral-500">
                  <tr><th className="px-6 py-3">Candidate</th><th className="px-4 py-3">Assessment</th><th className="px-4 py-3">Completed</th><th className="px-4 py-3">Advisory score</th><th className="px-6 py-3 text-right">Report</th></tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {summary.recentCompleted.map((item) => (
                    <tr className="hover:bg-neutral-50/70" key={item.sessionId}>
                      <td className="px-6 py-4"><p className="font-bold text-neutral-900">{item.candidateName}</p><p className="mt-0.5 text-[11px] text-neutral-500">{item.targetRole}</p></td>
                      <td className="px-4 py-4 font-medium text-neutral-700">{item.assessmentName}</td>
                      <td className="px-4 py-4 text-neutral-500">{formatDate(item.completedAt)}</td>
                      <td className="px-4 py-4"><ScorePill score={item.overallScore} /></td>
                      <td className="px-6 py-4 text-right"><Link className="font-bold text-[#087aa4] hover:underline" href={`/reports/${item.sessionId}`}>Open</Link></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            </>
          ) : <div className="p-6"><EmptyState description="Completed sessions will appear here once candidates submit their assessments." icon="check" title="No completed assessments" /></div>}
        </article>

        <article className="card p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3"><h2 className="text-[15px] font-bold text-neutral-950">Recent activity</h2><Link className="text-[12px] font-bold text-[#087aa4]" href="/assessment">View all</Link></div>
          {activity.length ? (
            <div className="mt-5 divide-y divide-neutral-100">
              {activity.slice(0, 6).map((item) => (
                <Link className="flex gap-3 py-3 first:pt-0" href={`/candidates/${item.sessionId}`} key={item.id}>
                  <span className={`mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-[6px] ${activityTone(item.status)}`}><Icon name={activityIcon(item.status)} size={14} /></span>
                  <span className="min-w-0"><span className="block text-[12px] font-semibold leading-5 text-neutral-800">{item.message}</span><span className="mt-0.5 block text-[10px] text-neutral-400">{formatRelative(item.createdAt)}</span></span>
                </Link>
              ))}
            </div>
          ) : <p className="mt-5 text-sm text-neutral-500">No recent session activity.</p>}
        </article>
      </section>
    </div>
  );
}

function Pipeline({ summary }: { summary: AnalyticsSummary }) {
  const items = [
    { status: "not_started" as const, label: "Not started", count: summary.pendingAssessments, color: "bg-amber-400" },
    { status: "in_progress" as const, label: "In progress", count: summary.inProgressAssessments, color: "bg-sky-500" },
    { status: "completed" as const, label: "Completed", count: summary.completedAssessments, color: "bg-emerald-500" },
    { status: "expired" as const, label: "Expired", count: summary.expiredAssessments, color: "bg-neutral-400" },
  ];
  return (
    <div className="mt-8">
      <div className="flex h-3 overflow-hidden rounded-full bg-neutral-100">
        {items.map((item) => item.count ? <div className={item.color} key={item.status} style={{ width: `${(item.count / summary.totalSessions) * 100}%` }} /> : null)}
      </div>
      <div className="mt-6 grid gap-3 sm:grid-cols-4">
        {items.map((item) => (
          <div className="border-l-2 border-neutral-100 pl-3" key={item.status}>
            <p className="flex items-center gap-2 text-[11px] font-semibold text-neutral-500"><span className={`size-2 rounded-full ${item.color}`} />{item.label}</p>
            <p className="mt-2 text-xl font-black text-neutral-950">{item.count}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function ScorePill({ score }: { score?: number }) {
  return score === undefined ? <span className="text-neutral-400">Pending</span> : <span className="inline-flex rounded-[5px] bg-sky-50 px-2 py-1 font-bold text-sky-800">{score.toFixed(1)}/5</span>;
}

function formatPercent(value: number) { return `${Math.round(value * 100)}%`; }
function formatDate(value?: string) { return value ? new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(new Date(value)) : "-"; }
function initials(value: string) { return value.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "C"; }
function formatRelative(value: string) {
  const minutes = Math.max(0, Math.round((Date.now() - new Date(value).getTime()) / 60_000));
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}
function activityIcon(status: SessionStatus): IconName { return status === "completed" ? "check" : status === "in_progress" ? "clock" : status === "expired" ? "question" : "paperPlane"; }
function activityTone(status: SessionStatus) { return status === "completed" ? "bg-emerald-100 text-emerald-700" : status === "in_progress" ? "bg-sky-100 text-sky-700" : status === "expired" ? "bg-neutral-100 text-neutral-600" : "bg-amber-100 text-amber-700"; }
