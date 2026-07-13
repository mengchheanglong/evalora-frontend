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
      title=""
      description=""
    >
      {loading ? <PageLoader label="Loading live assessment data" /> : null}
      {!loading && error ? <ErrorState message={error} onRetry={() => void loadDashboard()} /> : null}
      {!loading && !error && summary ? <DashboardContent activity={activity} summary={summary} /> : null}
    </AppShell>
  );
}

function DashboardContent({ activity, summary }: { activity: ActivityItem[]; summary: AnalyticsSummary }) {
  // Calculate stats for the 5 top cards
  const statsData = [
    {
      label: "Total Candidates",
      value: summary.totalCandidates.toLocaleString(),
      detail: `${summary.totalSessions} sessions`,
      icon: "users" as IconName,
      tone: "bg-purple-100 text-purple-600",
    },
    {
      label: "Completed",
      value: summary.completedAssessments.toLocaleString(),
      detail: `${Math.round(summary.completionRate * 100)}% completion`,
      icon: "check" as IconName,
      tone: "bg-emerald-100 text-emerald-600",
    },
    {
      label: "In progress",
      value: summary.inProgressAssessments.toLocaleString(),
      detail: `${summary.pendingAssessments} not started`,
      icon: "clock" as IconName,
      tone: "bg-sky-100 text-sky-600",
    },
    {
      label: "Average Score",
      value: summary.averageScore ? `${Math.round((summary.averageScore / 5) * 100)}%` : "—",
      detail: summary.averageScore ? `${summary.averageScore.toFixed(1)}/5 scale` : "No reports yet",
      icon: "report" as IconName,
      tone: "bg-orange-100 text-orange-600",
    },
    {
      label: "Templates",
      value: summary.totalTemplates.toLocaleString(),
      detail: `${summary.expiredAssessments} expired`,
      icon: "clipboard" as IconName,
      tone: "bg-purple-100 text-purple-600",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">
            Live pipeline metrics from your organization workspace.
          </p>
        </div>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {statsData.map((stat) => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </section>

      <section className="grid gap-5 lg:grid-cols-3">
        <div className="lg:col-span-1 bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <ModulePerformanceList modules={summary.modulePerformance} />
        </div>
        <div className="lg:col-span-1 bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <StatusBreakdownChart breakdown={summary.statusBreakdown} total={summary.totalSessions} />
        </div>
        <div className="lg:col-span-1 bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <RecentActivitiesList activity={activity} />
        </div>
      </section>

      {/* Bottom Section: Tables & Lists */}
      <section className="grid gap-5 lg:grid-cols-2">
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <TopCandidatesTable recentCompleted={summary.recentCompleted} />
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <PipelineList activity={activity} />
        </div>
      </section>
    </div>
  );
}

// --- Sub-Components ---

function StatCard({ label, value, detail, icon, tone }: {
  label: string; value: string; detail: string; icon: IconName; tone: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm flex items-start gap-4">
      <span className={`flex size-12 shrink-0 items-center justify-center rounded-xl ${tone}`}>
        <Icon name={icon} size={24} />
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-gray-500">{label}</p>
        <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
        <p className="mt-2 text-xs text-gray-400">{detail}</p>
      </div>
    </div>
  );
}

function ModulePerformanceList({ modules }: { modules: AnalyticsSummary["modulePerformance"] }) {
  const rows = [...modules].sort((a, b) => b.average - a.average).slice(0, 6);
  return (
    <div>
      <h3 className="text-sm font-bold text-gray-900 mb-4">Module performance</h3>
      {rows.length === 0 ? (
        <p className="text-xs text-gray-500 text-center py-8">No evaluation data yet.</p>
      ) : (
        <div className="space-y-3">
          {rows.map((module) => (
            <div className="flex items-center justify-between gap-3 text-xs" key={`${module.moduleType}-${module.title}`}>
              <div className="min-w-0">
                <p className="font-semibold text-gray-900 truncate">{module.title}</p>
                <p className="text-[10px] text-gray-400">{module.evaluationCount} evaluations</p>
              </div>
              <p className="font-bold text-gray-900">{module.average.toFixed(1)}/5</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StatusBreakdownChart({
  breakdown,
  total,
}: {
  breakdown: AnalyticsSummary["statusBreakdown"];
  total: number;
}) {
  const colors: Record<string, string> = {
    completed: "#10b981",
    in_progress: "#0ea5e9",
    not_started: "#f59e0b",
    expired: "#f43f5e",
  };
  const labels: Record<string, string> = {
    completed: "Completed",
    in_progress: "In progress",
    not_started: "Not started",
    expired: "Expired",
  };
  const safeTotal = total || 1;

  return (
    <div>
      <h3 className="text-sm font-bold text-gray-900 mb-4">Sessions by status</h3>
      {total === 0 ? (
        <p className="text-xs text-gray-500 text-center py-8">No sessions yet.</p>
      ) : (
        <div className="space-y-3">
          {breakdown.map((row) => {
            const pct = Math.round((row.count / safeTotal) * 100);
            return (
              <div className="text-xs" key={row.status}>
                <div className="mb-1 flex justify-between gap-2">
                  <span className="font-semibold text-gray-700">{labels[row.status] ?? row.status}</span>
                  <span className="font-bold text-gray-900">{row.count} ({pct}%)</span>
                </div>
                <div className="h-2 rounded-full bg-gray-100">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${pct}%`, backgroundColor: colors[row.status] ?? "#94a3b8" }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function RecentActivitiesList({ activity }: { activity: ActivityItem[] }) {
  const getIcon = (status: string) => (status === "completed" ? "check" : "clock");
  const getTone = (status: string) =>
    status === "completed" ? "bg-emerald-100 text-emerald-600" : "bg-sky-100 text-sky-600";

  const formatRelative = (date: string) => {
    const minutes = Math.max(0, Math.round((Date.now() - new Date(date).getTime()) / 60_000));
    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-gray-900">Recent Activities</h3>
        <Link href="/assessment" className="text-xs font-semibold text-sky-600 hover:text-sky-700">View all</Link>
      </div>
      {activity.length === 0 ? (
        <p className="text-xs text-gray-500 text-center py-8">No recent activity.</p>
      ) : (
        <div className="space-y-3">
          {activity.slice(0, 5).map((item) => (
            <div key={item.id} className="flex items-start gap-3">
              <span className={`mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg ${getTone(item.status)}`}>
                <Icon name={getIcon(item.status)} size={14} />
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-gray-800">{item.message}</p>
                <p className="text-[10px] text-gray-400 mt-0.5">{formatRelative(item.createdAt)}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TopCandidatesTable({ recentCompleted }: { recentCompleted: AnalyticsSummary["recentCompleted"] }) {
  const topCandidates = [...recentCompleted]
    .sort((a, b) => (b.overallScore || 0) - (a.overallScore || 0))
    .slice(0, 5);

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      "AI Interview": "bg-purple-100 text-purple-600",
      "Coding Test": "bg-sky-100 text-sky-600",
      Behavioral: "bg-emerald-100 text-emerald-600",
      Leadership: "bg-orange-100 text-orange-600",
      Communication: "bg-rose-100 text-rose-600",
    };
    return colors[type] || "bg-gray-100 text-gray-600";
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-gray-900">Tops Perform Candidates</h3>
        <Link href="/candidates" className="text-xs font-semibold text-sky-600 hover:text-sky-700">View all</Link>
      </div>
      {topCandidates.length === 0 ? (
        <p className="text-xs text-gray-500 text-center py-8">No completed assessments yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="text-gray-500 border-b border-gray-100">
                <th className="pb-3 font-medium">Rank</th>
                <th className="pb-3 font-medium">Candidate</th>
                <th className="pb-3 font-medium">Position</th>
                <th className="pb-3 font-medium">Overall Score</th>
                <th className="pb-3 font-medium">Completed on</th>
                <th className="pb-3 font-medium">Assessment Type</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {topCandidates.map((c, index) => (
                <tr key={c.sessionId} className="hover:bg-gray-50 transition-colors">
                  <td className="py-3 font-bold text-gray-900">{index + 1}</td>
                  <td className="py-3 font-semibold text-gray-900">{c.candidateName}</td>
                  <td className="py-3 text-gray-600">{c.targetRole}</td>
                  <td className="py-3 font-bold text-gray-900">
                    {c.overallScore ? `${Math.round((c.overallScore / 5) * 100)}%` : "-"}
                  </td>
                  <td className="py-3 text-gray-500">
                    {c.completedAt ? new Date(c.completedAt).toLocaleDateString() : "-"}
                  </td>
                  <td className="py-3">
                    <span className={`px-2 py-1 rounded-md text-[10px] font-medium ${getTypeColor(c.assessmentName)}`}>
                      {c.assessmentName}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function PipelineList({ activity }: { activity: ActivityItem[] }) {
  const openItems = activity.filter((item) => item.status === "not_started" || item.status === "in_progress").slice(0, 6);
  const formatRelative = (date: string) => {
    const minutes = Math.max(0, Math.round((Date.now() - new Date(date).getTime()) / 60_000));
    if (minutes < 60) return `${Math.max(1, minutes)}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-gray-900">Open pipeline</h3>
        <Link href="/assessment" className="text-xs font-semibold text-sky-600 hover:text-sky-700">View all</Link>
      </div>
      {openItems.length === 0 ? (
        <p className="text-xs text-gray-500 text-center py-8">No open assessments right now.</p>
      ) : (
        <div className="space-y-4">
          {openItems.map((item) => (
            <Link className="flex items-center gap-4 rounded-lg p-1 transition hover:bg-gray-50" href={`/candidates/${item.sessionId}`} key={item.id}>
              <div className="flex flex-col items-center justify-center w-12 h-12 bg-gray-50 rounded-lg border border-gray-100">
                <span className="text-[10px] font-bold text-sky-600 uppercase">{item.status === "in_progress" ? "LIVE" : "NEW"}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-gray-900 truncate">{item.candidateName}</p>
                <p className="text-[10px] text-gray-400 truncate">{item.assessmentName}</p>
              </div>
              <span className="text-[10px] text-gray-400">{formatRelative(item.createdAt)}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}