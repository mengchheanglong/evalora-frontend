"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { Icon, type IconName } from "@/components/icons";
import { EmptyState, ErrorState, PageLoader } from "@/components/ui-states";
import { apiGet, getErrorMessage } from "@/lib/api";
import type { ActivityItem, AnalyticsSummary, ModulePerformance, SessionStatus } from "@/lib/types";

type ScoreBucket = { label: string; count: number };

export default function AnalyticsPage() {
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [scoreDistribution, setScoreDistribution] = useState<ScoreBucket[]>([]);
  const [modulePerformance, setModulePerformance] = useState<ModulePerformance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [nextSummary, nextActivity, nextScores, nextModules] = await Promise.all([
        apiGet<AnalyticsSummary>("/analytics/summary"),
        apiGet<ActivityItem[]>("/analytics/activity"),
        apiGet<ScoreBucket[]>("/analytics/score-distribution"),
        apiGet<ModulePerformance[]>("/analytics/module-performance"),
      ]);
      setSummary(nextSummary);
      setActivity(nextActivity);
      setScoreDistribution(nextScores);
      setModulePerformance(nextModules);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <AppShell
      active="analytics"
      description="Live organization metrics from completed assessments and activity."
      title="Analytics"
    >
      {loading ? <PageLoader label="Loading analytics" /> : null}
      {!loading && error ? <ErrorState message={error} onRetry={() => void load()} /> : null}
      {!loading && !error && summary ? (
        <AnalyticsContent
          activity={activity}
          modulePerformance={modulePerformance.length ? modulePerformance : summary.modulePerformance}
          scoreDistribution={scoreDistribution}
          summary={summary}
        />
      ) : null}
    </AppShell>
  );
}

function AnalyticsContent({
  summary,
  activity,
  scoreDistribution,
  modulePerformance,
}: {
  summary: AnalyticsSummary;
  activity: ActivityItem[];
  scoreDistribution: ScoreBucket[];
  modulePerformance: ModulePerformance[];
}) {
  const totalCandidates = summary.totalCandidates || 1;
  const averageScoreProgress = summary.averageScore ? (summary.averageScore / 5) * 100 : 0;
  const kpis: Array<{ label: string; value: string; detail: string; progress: number; icon: IconName; tone: string; accent: string }> = [
    {
      label: "Total Candidates",
      value: summary.totalCandidates.toLocaleString(),
      detail: `${summary.totalSessions} sessions`,
      progress: 100,
      icon: "users",
      tone: "text-[#D504FF]",
      accent: "#D504FF",
    },
    {
      label: "Completed",
      value: summary.completedAssessments.toLocaleString(),
      detail: `${Math.round(summary.completionRate * 100)}% completion rate`,
      progress: summary.completionRate * 100,
      icon: "check",
      tone: "text-emerald-600",
      accent: "#10b981",
    },
    {
      label: "In progress",
      value: summary.inProgressAssessments.toLocaleString(),
      detail: `${summary.pendingAssessments} not started`,
      progress: (summary.inProgressAssessments / totalCandidates) * 100,
      icon: "clock",
      tone: "text-sky-600",
      accent: "#0ea5e9",
    },
    {
      label: "Average score",
      value: summary.averageScore ? `${summary.averageScore.toFixed(1)}/5` : "—",
      detail: "Across generated reports",
      progress: averageScoreProgress,
      icon: "report",
      tone: "text-amber-600",
      accent: "#f59e0b",
    },
    {
      label: "Templates",
      value: summary.totalTemplates.toLocaleString(),
      detail: `${summary.expiredAssessments} expired sessions`,
      progress: 100,
      icon: "clipboard",
      tone: "text-rose-600",
      accent: "#e11d48",
    },
  ];

  const statusRows = useMemo(() => {
    const colors: Record<string, string> = {
      completed: "#2fc49a",
      in_progress: "#3b82f6",
      not_started: "#fb923c",
      expired: "#ec5b91",
    };
    const labels: Record<string, string> = {
      completed: "Completed",
      in_progress: "In progress",
      not_started: "Not started",
      expired: "Expired",
    };
    const total = summary.totalSessions || 1;
    return summary.statusBreakdown.map((row) => ({
      label: labels[row.status] ?? row.status,
      value: row.count,
      percent: `${Math.round((row.count / total) * 1000) / 10}%`,
      color: colors[row.status] ?? "#94a3b8",
      status: row.status as SessionStatus,
    }));
  }, [summary]);

  const topModules = [...modulePerformance].sort((a, b) => b.average - a.average).slice(0, 6);
  const topCompleted = [...summary.recentCompleted]
    .sort((a, b) => (b.overallScore ?? 0) - (a.overallScore ?? 0))
    .slice(0, 6);

  return (
    <div className="space-y-5">
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {kpis.map((kpi) => (
          <article className="group rounded-xl border border-[var(--theme-border)] bg-[var(--theme-panel)] p-5 shadow-[var(--theme-shadow)] transition hover:-translate-y-0.5 hover:border-[var(--theme-border-strong)] hover:shadow-[0_16px_42px_rgba(15,23,42,0.16)]" key={kpi.label}>
            <div className="flex items-start gap-4">
              <span
                className={`flex size-12 shrink-0 items-center justify-center rounded-xl border ${kpi.tone}`}
                style={{ backgroundColor: `${kpi.accent}18`, borderColor: `${kpi.accent}55` }}
              >
                <Icon name={kpi.icon} size={24} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-[var(--theme-text)]">{kpi.label}</p>
                <p className="mt-1 text-2xl font-extrabold leading-none text-[var(--theme-heading)]">{kpi.value}</p>
                <p className="mt-2 text-[11px] font-medium text-[var(--theme-muted)]">{kpi.detail}</p>
              </div>
            </div>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-[var(--theme-panel-soft)]">
              <div
                className="h-full rounded-full"
                style={{ width: `${Math.max(0, Math.min(100, kpi.progress))}%`, backgroundColor: kpi.accent }}
              />
            </div>
          </article>
        ))}
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        <ChartCard title="Sessions by status">
          {summary.totalSessions === 0 ? (
            <EmptyState description="Create interview sessions to see status breakdown." title="No sessions yet" />
          ) : (
            <div className="space-y-3">
              {statusRows.map((row) => (
                <div className="grid grid-cols-[120px_1fr_70px] items-center gap-3 text-[12px]" key={row.status}>
                  <span className="flex items-center gap-2 font-semibold text-gray-700">
                    <span className="size-2.5 rounded-full" style={{ backgroundColor: row.color }} />
                    {row.label}
                  </span>
                  <div className="h-2 overflow-hidden rounded bg-gray-100">
                    <div className="h-full rounded" style={{ width: row.percent, backgroundColor: row.color }} />
                  </div>
                  <span className="text-right font-bold text-gray-800">
                    {row.value} ({row.percent})
                  </span>
                </div>
              ))}
            </div>
          )}
        </ChartCard>

        <ChartCard title="Score distribution">
          {scoreDistribution.every((b) => b.count === 0) ? (
            <EmptyState description="Scores appear after candidate reports are generated." title="No scores yet" />
          ) : (
            <ScoreBars buckets={scoreDistribution} />
          )}
        </ChartCard>
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        <ChartCard title="Module performance">
          {topModules.length === 0 ? (
            <EmptyState description="Module averages appear after evaluations are saved." title="No evaluations yet" />
          ) : (
            <div className="space-y-3">
              {topModules.map((module, index) => (
                <div className="grid grid-cols-[1fr_auto] items-center gap-3 border-b border-gray-50 pb-2 text-[12px] last:border-0" key={module.moduleId ?? `${module.moduleType}-${module.title}-${index}`}>
                  <div>
                    <p className="font-bold text-gray-900">{module.title}</p>
                    <p className="text-[10px] text-gray-500">
                      {module.moduleType} · {module.evaluationCount} evaluations
                    </p>
                  </div>
                  <p className="font-black text-gray-900">{module.average.toFixed(1)}/5</p>
                </div>
              ))}
            </div>
          )}
        </ChartCard>

        <ChartCard
          action={
            <Link className="text-[12px] font-bold text-sky-600 hover:text-sky-700" href="/candidates">
              View candidates
            </Link>
          }
          title="Top completed candidates"
        >
          {topCompleted.length === 0 ? (
            <EmptyState description="Completed assessments with reports will show here." title="No completions yet" />
          ) : (
            <div className="space-y-3">
              {topCompleted.map((row) => (
                <Link
                  className="flex items-center justify-between gap-3 rounded-[8px] border border-gray-100 px-3 py-2 text-[12px] transition hover:border-sky-200 hover:bg-sky-50/40"
                  href={`/candidates/${row.sessionId}`}
                  key={row.sessionId}
                >
                  <div className="min-w-0">
                    <p className="truncate font-bold text-gray-900">{row.candidateName}</p>
                    <p className="truncate text-[10px] text-gray-500">{row.assessmentName}</p>
                  </div>
                  <p className="shrink-0 font-black text-gray-900">
                    {row.overallScore != null ? `${Math.round((row.overallScore / 5) * 100)}%` : "—"}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </ChartCard>
      </section>

      <ChartCard
        action={
          <Link className="text-[12px] font-bold text-sky-600 hover:text-sky-700" href="/assessment">
            View sessions
          </Link>
        }
        title="Recent activity"
      >
        {activity.length === 0 ? (
          <EmptyState description="Session activity will appear as candidates progress." title="No activity yet" />
        ) : (
          <div className="space-y-3">
            {activity.slice(0, 10).map((item) => (
              <div className="grid grid-cols-[1fr_auto] gap-3 border-b border-gray-50 pb-2 text-[12px] last:border-0" key={item.id}>
                <div>
                  <p className="font-semibold text-gray-900">{item.message}</p>
                  <p className="text-[10px] text-gray-500">{item.assessmentName}</p>
                </div>
                <span className="text-[10px] text-gray-400">{formatRelative(item.createdAt)}</span>
              </div>
            ))}
          </div>
        )}
      </ChartCard>
    </div>
  );
}

function ChartCard({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <article className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-[14px] font-black text-gray-950">{title}</h2>
        {action}
      </div>
      {children}
    </article>
  );
}

function ScoreBars({ buckets }: { buckets: ScoreBucket[] }) {
  const max = Math.max(1, ...buckets.map((item) => item.count));
  return (
    <div className="flex h-[220px] items-end gap-3 border-b border-gray-100 px-1 pt-2">
      {buckets.map((item) => (
        <div className="flex h-full flex-1 flex-col justify-end" key={item.label}>
          <div className="flex flex-1 items-end justify-center">
            <div
              className="relative w-full max-w-[48px] rounded-t bg-violet-200"
              style={{ height: `${Math.max(8, (item.count / max) * 100)}%` }}
            >
              <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[11px] font-black text-gray-700">{item.count}</span>
            </div>
          </div>
          <p className="py-2 text-center text-[10px] font-semibold text-gray-600">{item.label}</p>
        </div>
      ))}
    </div>
  );
}

function formatRelative(date: string) {
  const minutes = Math.max(0, Math.round((Date.now() - new Date(date).getTime()) / 60_000));
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}
