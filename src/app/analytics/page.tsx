"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { Icon, type IconName } from "@/components/icons";
import { EmptyState, ErrorState, PageLoader } from "@/components/ui-states";
import { apiGet, getErrorMessage } from "@/lib/api";
import type { ActivityItem, AnalyticsSummary, ModulePerformance } from "@/lib/types";

type Distribution = Array<{ label: string; count: number }>;
type Themes = { strengths: Array<{ label: string; count: number }>; improvementAreas: Array<{ label: string; count: number }> };

export default function AnalyticsPage() {
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [modules, setModules] = useState<ModulePerformance[]>([]);
  const [distribution, setDistribution] = useState<Distribution>([]);
  const [themes, setThemes] = useState<Themes>({ strengths: [], improvementAreas: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadAnalytics = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [nextSummary, nextActivity, nextModules, nextDistribution, nextThemes] = await Promise.all([
        apiGet<AnalyticsSummary>("/analytics/summary"),
        apiGet<ActivityItem[]>("/analytics/activity"),
        apiGet<ModulePerformance[]>("/analytics/module-performance"),
        apiGet<Distribution>("/analytics/score-distribution"),
        apiGet<Themes>("/analytics/themes"),
      ]);
      setSummary(nextSummary);
      setActivity(nextActivity);
      setModules(nextModules);
      setDistribution(nextDistribution);
      setThemes(nextThemes);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadAnalytics(); }, [loadAnalytics]);

  return (
    <AppShell active="analytics" description="Explore completion patterns and advisory evaluation themes across your organization." title="Analytics">
      {loading ? <PageLoader label="Calculating workspace analytics" /> : null}
      {!loading && error ? <ErrorState message={error} onRetry={() => void loadAnalytics()} /> : null}
      {!loading && !error && summary ? <AnalyticsContent activity={activity} distribution={distribution} modules={modules} summary={summary} themes={themes} /> : null}
    </AppShell>
  );
}

function AnalyticsContent({ summary, activity, modules, distribution, themes }: { summary: AnalyticsSummary; activity: ActivityItem[]; modules: ModulePerformance[]; distribution: Distribution; themes: Themes }) {
  const stats: Array<{ label: string; value: string; detail: string; icon: IconName; tone: string }> = [
    { label: "Assigned sessions", value: String(summary.totalSessions), detail: `${summary.totalTemplates} templates`, icon: "clipboard", tone: "bg-violet-100 text-violet-700" },
    { label: "Completion rate", value: `${Math.round(summary.completionRate * 100)}%`, detail: `${summary.completedAssessments} completed`, icon: "check", tone: "bg-emerald-100 text-emerald-700" },
    { label: "Active sessions", value: String(summary.inProgressAssessments), detail: `${summary.pendingAssessments} not started`, icon: "clock", tone: "bg-sky-100 text-sky-700" },
    { label: "Average score", value: summary.averageScore ? `${summary.averageScore.toFixed(1)}/5` : "-", detail: "Across persisted reports", icon: "report", tone: "bg-amber-100 text-amber-700" },
  ];
  return <div className="space-y-5">
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{stats.map((stat) => <article className="card p-5" key={stat.label}><div className="flex items-start justify-between gap-4"><div><p className="text-[11px] font-semibold text-neutral-500">{stat.label}</p><p className="mt-2 text-[27px] font-black leading-none text-neutral-950">{stat.value}</p><p className="mt-3 text-[10px] text-neutral-500">{stat.detail}</p></div><span className={`flex size-9 items-center justify-center rounded-[7px] ${stat.tone}`}><Icon name={stat.icon} size={17} /></span></div></article>)}</section>

    <section className="grid gap-5 xl:grid-cols-[1.12fr_0.88fr]">
      <article className="card p-5 sm:p-6"><div className="flex items-center justify-between gap-3"><div><h2 className="text-[14px] font-bold text-neutral-950">Module performance</h2><p className="mt-1 text-[11px] text-neutral-500">Average advisory scores from completed evaluations.</p></div><span className="text-[10px] font-semibold text-neutral-400">1-5 scale</span></div>{modules.length ? <div className="mt-6 space-y-5">{modules.map((module) => <div key={module.moduleId ?? module.moduleType}><div className="flex items-center justify-between gap-4 text-[12px]"><div><p className="font-bold text-neutral-800">{module.title}</p><p className="mt-0.5 text-[10px] text-neutral-400">{module.evaluationCount} evaluations</p></div><span className="font-black text-neutral-950">{module.average.toFixed(1)}</span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-neutral-100"><div className="h-full rounded-full bg-[#29b7e5]" style={{ width: `${Math.min(100, module.average * 20)}%` }} /></div></div>)}</div> : <div className="mt-5"><EmptyState description="Module averages appear after reports are generated." title="No evaluation data" /></div>}</article>
      <article className="card p-5 sm:p-6"><h2 className="text-[14px] font-bold text-neutral-950">Score distribution</h2><p className="mt-1 text-[11px] text-neutral-500">Persisted report scores grouped by rubric range.</p><DistributionChart data={distribution} /></article>
    </section>

    <section className="grid gap-5 lg:grid-cols-2">
      <ThemePanel icon="star" items={themes.strengths} title="Common evidence-backed strengths" tone="emerald" />
      <ThemePanel icon="search" items={themes.improvementAreas} title="Common areas for deeper review" tone="amber" />
    </section>

    <section className="card overflow-hidden"><div className="flex items-center justify-between border-b border-neutral-200 px-5 py-4 sm:px-6"><div><h2 className="text-[14px] font-bold text-neutral-950">Workspace activity</h2><p className="mt-1 text-[11px] text-neutral-500">Recent invitation, progress, and report events.</p></div><Link className="text-[11px] font-bold text-[#087aa4]" href="/assessment">Sessions</Link></div>{activity.length ? <div className="divide-y divide-neutral-100">{activity.map((item) => <Link className="grid gap-2 px-5 py-4 transition hover:bg-neutral-50 sm:grid-cols-[1fr_180px_120px] sm:items-center sm:px-6" href={`/candidates/${item.sessionId}`} key={item.id}><div className="flex items-center gap-3"><span className={`flex size-8 shrink-0 items-center justify-center rounded-[6px] ${activityTone(item.status)}`}><Icon name={item.status === "completed" ? "check" : item.status === "in_progress" ? "clock" : "paperPlane"} size={14} /></span><div><p className="text-[12px] font-semibold text-neutral-800">{item.message}</p><p className="mt-0.5 text-[10px] text-neutral-400">{item.candidateName}</p></div></div><span className="text-[11px] text-neutral-500">{item.assessmentName}</span><span className="text-[10px] text-neutral-400 sm:text-right">{formatDate(item.createdAt)}</span></Link>)}</div> : <div className="p-6"><EmptyState description="Activity will appear after sessions are created." title="No activity yet" /></div>}</section>
  </div>;
}

function DistributionChart({ data }: { data: Distribution }) { const max = Math.max(1, ...data.map((item) => item.count)); const total = data.reduce((sum, item) => sum + item.count, 0); return data.length ? <div className="mt-7 flex h-[210px] items-end gap-4 border-b border-neutral-200 px-2">{data.map((item) => <div className="flex h-full flex-1 flex-col justify-end" key={item.label}><div className="flex flex-1 items-end justify-center"><div className="relative w-full max-w-[58px] rounded-t-[5px] bg-sky-100" style={{ height: `${Math.max(item.count ? 12 : 2, (item.count / max) * 100)}%` }}><span className="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] font-bold text-neutral-700">{item.count}</span><div className="absolute inset-x-0 bottom-0 h-1/2 rounded-t-[5px] bg-sky-500/70" /></div></div><p className="py-3 text-center text-[9px] font-semibold text-neutral-500">{item.label}</p></div>)}</div> : <p className="mt-6 text-sm text-neutral-500">{total ? "" : "No persisted report scores yet."}</p>; }
function ThemePanel({ title, items, icon, tone }: { title: string; items: Array<{ label: string; count: number }>; icon: IconName; tone: "emerald" | "amber" }) { const colors = tone === "emerald" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"; return <article className="card p-5 sm:p-6"><div className="flex items-center gap-3"><span className={`flex size-8 items-center justify-center rounded-[6px] ${colors}`}><Icon name={icon} size={15} /></span><h2 className="text-[14px] font-bold text-neutral-950">{title}</h2></div>{items.length ? <div className="mt-5 flex flex-wrap gap-2">{items.map((item) => <span className="inline-flex items-center gap-2 rounded-[5px] border border-neutral-200 bg-neutral-50 px-3 py-2 text-[11px] font-semibold text-neutral-700" key={item.label}>{item.label}<span className="rounded bg-white px-1.5 py-0.5 text-[9px] font-bold text-neutral-500">{item.count}</span></span>)}</div> : <p className="mt-5 text-sm text-neutral-500">Themes appear after multiple candidate reports are generated.</p>}</article>; }
function activityTone(status: string) { return status === "completed" ? "bg-emerald-100 text-emerald-700" : status === "in_progress" ? "bg-sky-100 text-sky-700" : "bg-amber-100 text-amber-700"; }
function formatDate(value: string) { return new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)); }
