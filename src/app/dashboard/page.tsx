"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { Icon, type IconName } from "@/components/icons";
import { ErrorState, PageLoader } from "@/components/ui-states";
import { apiGet, getErrorMessage } from "@/lib/api";
import type { ActivityItem, AnalyticsSummary, InterviewSession, ModulePerformance } from "@/lib/types";

// Define the shape of the real trend data from backend
interface TrendDataPoint {
  date: string;
  score: number;
}

export default function DashboardPage() {
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [sessions, setSessions] = useState<InterviewSession[]>([]);
  const [trendData, setTrendData] = useState<TrendDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      // Fetch all real data in parallel
      const [nextSummary, nextActivity, nextSessions, nextTrend] = await Promise.all([
        apiGet<AnalyticsSummary>("/analytics/summary"),
        apiGet<ActivityItem[]>("/analytics/activity"),
        apiGet<InterviewSession[]>("/sessions"),
        apiGet<TrendDataPoint[]>("/analytics/trend").catch(() => []), // Fails gracefully if backend isn't ready
      ]);
      
      setSummary(nextSummary);
      setActivity(nextActivity);
      setSessions(nextSessions);
      setTrendData(nextTrend);
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
      // Blue button matching other pages
      actions={
        <Link 
           className="flex h-10 items-center justify-center gap-1 rounded-lg border border-sky-500 bg-sky-500 px-5 text-sm font-bold text-white shadow-sm transition hover:border-sky-600 hover:bg-sky-600 focus:outline-none focus:ring-2 focus:ring-sky-500/25"
          href="/assessment/create"
        >
          <Icon name="plus" size={15} /> New session
        </Link>
      }
      title=""
      description=""
    >
      {loading ? <PageLoader label="Loading live assessment data" /> : null}
      {!loading && error ? <ErrorState message={error} onRetry={() => void loadDashboard()} /> : null}
      {!loading && !error && summary ? (
        <DashboardContent 
          activity={activity} 
          summary={summary}
          sessions={sessions}
          trendData={trendData}
        />
      ) : null}
    </AppShell>
  );
}

function DashboardContent({ 
  activity, 
  summary,
  sessions,
  trendData
}: { 
  activity: ActivityItem[]; 
  summary: AnalyticsSummary;
  sessions: InterviewSession[];
  trendData: TrendDataPoint[];
}) {
  // --- REAL DATE CALCULATION ---
  const today = new Date();
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };
  
  // Dynamically outputs the real current month range (e.g., "Jul 1, 2026 - Jul 31, 2026")
  const realDateRange = `${formatDate(startOfMonth)} - ${formatDate(endOfMonth)}`;
  // -----------------------------

  // Calculate percentages for details to match Interview Session page style
  const total = summary.totalCandidates || 1;
  const statsData = [
    { 
      label: "Total Candidates", 
      value: summary.totalCandidates.toLocaleString(), 
      detail: "All time candidates", 
      progress: 100,
      icon: "users" as IconName, 
      tone: "text-[var(--color-chart-1)]",
      accent: "var(--color-chart-1)",
    },
    { 
      label: "Completed", 
      value: summary.completedAssessments.toLocaleString(), 
      detail: `${((summary.completedAssessments / total) * 100).toFixed(1)}% of total`, 
      progress: (summary.completedAssessments / total) * 100,
      icon: "check" as IconName, 
      tone: "text-emerald-500",
      accent: "#10b981",
    },
    { 
      label: "In progress", 
      value: summary.inProgressAssessments.toLocaleString(), 
      detail: `${((summary.inProgressAssessments / total) * 100).toFixed(1)}% of total`, 
      progress: (summary.inProgressAssessments / total) * 100,
      icon: "clock" as IconName, 
      tone: "text-[var(--color-chart-2)]",
      accent: "var(--color-chart-2)",
    },
    { 
      label: "Average Score", 
      value: summary.averageScore ? `${Math.round((summary.averageScore / 5) * 100)}%` : "0%", 
      detail: "Overall performance", 
      progress: summary.averageScore ? (summary.averageScore / 5) * 100 : 0,
      icon: "report" as IconName, 
      tone: "text-amber-500",
      accent: "#f59e0b",
    },
    { 
      label: "Pass Rate", 
      value: `${Math.round(summary.completionRate * 100)}%`, 
      detail: "Success rate", 
      progress: summary.completionRate * 100,
      icon: "crown" as IconName, 
      tone: "text-[var(--color-chart-3)]",
      accent: "var(--color-chart-3)",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Custom Header with Real Date */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[var(--theme-heading)]">Dashboard</h1>
          <p className="mt-1 text-sm text-[var(--theme-muted)]">
            Live assessment metrics for your workspace.
          </p>
        </div>
        <div className="flex h-10 items-center gap-2 rounded-lg border border-[var(--theme-border)] bg-[var(--theme-panel)] px-4 text-[var(--theme-text)] shadow-sm">
          <Icon name="calendar" size={16} className="text-[var(--theme-muted)]" />
          <span className="text-sm font-medium">{realDateRange}</span>
        </div>
      </div>

      {/* Top Stats Cards */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {statsData.map((stat) => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </section>

      {/* Middle Section: Charts & Activities */}
      <section className="grid gap-5 lg:grid-cols-3">
        <DashboardPanel className="lg:col-span-1">
          <PerformanceChart data={trendData} />
        </DashboardPanel>
        <DashboardPanel className="lg:col-span-1">
          <AssessmentPieChart modulePerformance={summary.modulePerformance} total={summary.totalCandidates} />
        </DashboardPanel>
        <DashboardPanel className="lg:col-span-1">
          <RecentActivitiesList activity={activity} />
        </DashboardPanel>
      </section>

      {/* Bottom Section: Tables & Lists */}
      <section className="grid gap-5 lg:grid-cols-2">
        <DashboardPanel>
          <TopCandidatesTable recentCompleted={summary.recentCompleted} />
        </DashboardPanel>
        <DashboardPanel>
          <UpcomingAssessmentsList sessions={sessions} />
        </DashboardPanel>
      </section>
    </div>
  );
}

// --- Sub-Components ---

function DashboardPanel({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border border-[var(--theme-border)] bg-[var(--theme-panel)] p-5 shadow-sm ${className}`}>
      {children}
    </div>
  );
}

function SectionHeader({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3">
      <h3 className="text-sm font-bold text-[var(--theme-heading)]">{title}</h3>
      {action}
    </div>
  );
}

// Updated to match Interview Session page style (uses 'detail' instead of 'change')
function StatCard({ label, value, detail, progress, icon, tone, accent }: {
  label: string; value: string; detail: string; progress: number; icon: IconName; tone: string; accent: string;
}) {
  const clampedProgress = Math.max(0, Math.min(100, progress));

  return (
    <div className="group rounded-xl border border-[var(--theme-border)] bg-[var(--theme-panel)] p-5 shadow-[var(--theme-shadow)] transition hover:-translate-y-0.5 hover:border-[var(--theme-border-strong)] hover:shadow-[0_16px_42px_rgba(15,23,42,0.16)]">
      <div className="flex items-start gap-4">
        <span
          className={`flex size-12 shrink-0 items-center justify-center rounded-xl border ${tone}`}
          style={{ backgroundColor: `color-mix(in srgb, ${accent} 12%, transparent)`, borderColor: `color-mix(in srgb, ${accent} 35%, transparent)` }}
        >
          <Icon name={icon} size={24} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold text-[var(--theme-text)]">{label}</p>
          <p className="mt-1 text-2xl font-extrabold leading-none text-[var(--theme-heading)]">{value}</p>
          <p className="mt-2 text-[11px] font-medium text-[var(--theme-muted)]">{detail}</p>
        </div>
      </div>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-[var(--theme-panel-soft)]">
        <div className="h-full rounded-full" style={{ width: `${clampedProgress}%`, backgroundColor: accent }} />
      </div>
    </div>
  );
}

// UPDATED: Uses REAL backend trend data dynamically
function PerformanceChart({ data }: { data: TrendDataPoint[] }) {
  if (!data || data.length === 0) {
    return (
      <div>
        <SectionHeader title="Assessment Performance Trend" />
        <div className="flex h-64 flex-col items-center justify-center rounded-lg border border-dashed border-[var(--theme-border)] bg-[var(--theme-panel-tint)] text-center">
          <Icon name="analytics" size={40} className="mb-3 text-[var(--theme-faint)]" />
          <p className="text-sm font-semibold text-[var(--theme-heading)]">No performance data yet</p>
          <p className="mt-1 max-w-[230px] text-xs text-[var(--theme-muted)]">Complete more assessments to see the performance trend over time.</p>
        </div>
      </div>
    );
  }

  const scores = data.map(d => d.score);
  const max = Math.max(...scores, 100);
  const min = Math.min(...scores, 0);
  const range = max - min || 1;
  const width = 100;
  const height = 100;
  
  const points = data.map((point, i) => {
    const x = data.length > 1 ? (i / (data.length - 1)) * width : width / 2;
    const y = height - ((point.score - min) / range) * (height - 10) - 5;
    return `${x},${y}`;
  });
  const pathD = points.length ? `M ${points.join(" L ")}` : "";

  const formatLabel = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div>
      <SectionHeader
        title="Assessment Performance Trend"
        action={(
          <select className="h-9 rounded-md border border-[var(--theme-border)] bg-[var(--theme-panel-soft)] px-3 text-xs font-medium text-[var(--theme-text)] outline-none">
          <option>By Week</option>
          <option>By Month</option>
          </select>
        )}
      />
      <div className="relative h-52 w-full rounded-lg bg-[var(--theme-panel-tint)] px-1 py-2">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-full w-full overflow-visible">
          {[0, 25, 50, 75, 100].map((y) => (
            <line key={y} x1="0" y1={y} x2="100" y2={y} stroke="var(--color-chart-grid)" strokeWidth="0.5" />
          ))}
          {points.length > 1 ? <path d={`${pathD} L 100,100 L 0,100 Z`} fill="var(--color-chart-1)" opacity="0.14" /> : null}
          <path d={pathD} fill="none" stroke="var(--color-chart-1)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          {points.map((point, i) => {
            const [cx, cy] = point.split(',');
            return <circle key={i} cx={cx} cy={cy} r="1.6" fill="var(--color-chart-1)" stroke="var(--theme-panel)" strokeWidth="0.6" />;
          })}
        </svg>
      </div>
      <div className="mt-2 flex justify-between px-1 text-[10px] text-[var(--theme-muted)]">
        {data.map((point, i) => (
          (data.length <= 5 || i === 0 || i === data.length - 1 || i === Math.floor(data.length / 2)) ? (
            <span key={i}>{formatLabel(point.date)}</span>
          ) : <span key={i}></span>
        ))}
      </div>
      <div className="mt-4 flex items-center justify-center gap-2 rounded-lg border border-[var(--color-chart-1)]/20 bg-[var(--color-chart-1)]/10 px-3 py-2">
        <span className="text-[11px] font-semibold text-[var(--color-chart-1)]">
          Latest: {formatLabel(data[data.length - 1].date)} - Average Score: {data[data.length - 1].score}%
        </span>
      </div>
    </div>
  );
}

// UPDATED: Uses REAL module performance data from backend
function AssessmentPieChart({ modulePerformance, total }: { modulePerformance: ModulePerformance[]; total: number }) {
  const totalEvaluations = modulePerformance.reduce((acc, m) => acc + m.evaluationCount, 0);
  const colors = [
    "var(--color-chart-1)",
    "var(--color-chart-2)",
    "var(--color-chart-3)",
    "var(--color-chart-4)",
    "var(--color-chart-5)",
    "var(--color-chart-6)",
    "var(--color-chart-7)",
  ];
  
  const segments = modulePerformance.map((m, i) => ({
    label: m.title,
    value: totalEvaluations > 0 ? (m.evaluationCount / totalEvaluations) * 100 : 0,
    color: colors[i % colors.length],
  }));

  let cumulativePercent = 0;
  const getCoordinatesForPercent = (percent: number) => {
    const x = Math.cos(2 * Math.PI * percent);
    const y = Math.sin(2 * Math.PI * percent);
    return [x, y];
  };

  return (
    <div>
      <SectionHeader title="Assessment by Types" />
      <div className="flex flex-col items-center">
        {segments.length > 0 && totalEvaluations > 0 ? (
          <>
            <div className="relative h-40 w-40">
              <svg viewBox="-1 -1 2 2" className="w-full h-full -rotate-90">
                {segments.map((seg, i) => {
                  if (seg.value === 0) return null;
                  const startPercent = cumulativePercent / 100;
                  const endPercent = (cumulativePercent + seg.value) / 100;
                  cumulativePercent += seg.value;
                  const [startX, startY] = getCoordinatesForPercent(startPercent);
                  const [endX, endY] = getCoordinatesForPercent(endPercent);
                  const largeArcFlag = seg.value > 50 ? 1 : 0;
                  const pathData = [`M ${startX} ${startY}`, `A 1 1 0 ${largeArcFlag} 1 ${endX} ${endY}`, `L 0 0`].join(" ");
                  return <path key={i} d={pathData} fill={seg.color} stroke="var(--theme-panel)" strokeWidth="0.05" />;
                })}
                <circle cx="0" cy="0" r="0.6" fill="var(--theme-panel)" />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-extrabold text-[var(--theme-heading)]">{total.toLocaleString()}</span>
                <span className="text-[10px] font-medium text-[var(--theme-muted)]">Total</span>
              </div>
            </div>
            <div className="mt-5 w-full space-y-2">
              {segments.map((seg, i) => (
                <div key={i} className="grid grid-cols-[12px_1fr_auto] items-center gap-2 text-xs">
                  <span className="h-3 w-3 rounded-full" style={{ backgroundColor: seg.color }} />
                  <span className="truncate text-[var(--theme-text)]">{seg.label}</span>
                  <span className="font-semibold text-[var(--theme-muted)]">{seg.value.toFixed(1)}%</span>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="flex h-64 w-full flex-col items-center justify-center rounded-lg border border-dashed border-[var(--theme-border)] bg-[var(--theme-panel-tint)] text-center">
            <Icon name="analytics" size={40} className="mb-3 text-[var(--theme-faint)]" />
            <p className="text-sm font-semibold text-[var(--theme-heading)]">No assessment data yet</p>
            <p className="mt-1 max-w-[230px] text-xs text-[var(--theme-muted)]">Assessment types will appear here once modules are evaluated.</p>
          </div>
        )}
      </div>
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
      <SectionHeader title="Recent Activities" action={<Link href="/assessment" className="text-xs font-semibold text-sky-600 hover:text-sky-700">View all</Link>} />
      {activity.length === 0 ? (
        <p className="rounded-lg border border-dashed border-[var(--theme-border)] bg-[var(--theme-panel-tint)] py-10 text-center text-xs text-[var(--theme-muted)]">No recent activity.</p>
      ) : (
        <div className="space-y-2">
          {activity.slice(0, 5).map((item) => (
            <div key={item.id} className="flex items-start gap-3 rounded-lg p-2 transition hover:bg-[var(--theme-panel-soft)]">
              <span className={`mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg ${getTone(item.status)}`}>
                <Icon name={getIcon(item.status)} size={14} />
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold leading-5 text-[var(--theme-heading)]">{item.message}</p>
                <p className="mt-0.5 text-[10px] text-[var(--theme-muted)]">{formatRelative(item.createdAt)}</p>
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
      "AI Interview": "bg-blue-100 text-blue-600",
      "Coding Test": "bg-sky-100 text-sky-600",
      Behavioral: "bg-cyan-100 text-cyan-600",
      Leadership: "bg-indigo-100 text-indigo-600",
      Communication: "bg-teal-100 text-teal-600",
    };
    return colors[type] || "bg-gray-100 text-gray-600";
  };

  return (
    <div>
      <SectionHeader title="Top Candidates" action={<Link href="/candidates" className="text-xs font-semibold text-sky-600 hover:text-sky-700">View all</Link>} />
      {topCandidates.length === 0 ? (
        <p className="rounded-lg border border-dashed border-[var(--theme-border)] bg-[var(--theme-panel-tint)] py-10 text-center text-xs text-[var(--theme-muted)]">No completed assessments yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-[var(--theme-border)]">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[var(--theme-border)] bg-[var(--theme-panel-tint)] text-[var(--theme-muted)]">
                <th className="rounded-tl-lg px-3 py-3 font-medium">Rank</th>
                <th className="px-3 py-3 font-medium">Candidate</th>
                <th className="px-3 py-3 font-medium">Position</th>
                <th className="px-3 py-3 font-medium">Overall Score</th>
                <th className="px-3 py-3 font-medium">Completed on</th>
                <th className="rounded-tr-lg px-3 py-3 font-medium">Assessment Type</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--theme-border)]">
              {topCandidates.map((c, index) => (
                <tr key={c.sessionId} className="transition-colors hover:bg-[var(--theme-panel-soft)]">
                  <td className="px-3 py-3 font-bold text-[var(--theme-heading)]">{index + 1}</td>
                  <td className="px-3 py-3 font-semibold text-[var(--theme-heading)]">{c.candidateName}</td>
                  <td className="px-3 py-3 text-[var(--theme-text)]">{c.targetRole}</td>
                  <td className="px-3 py-3 font-bold text-[var(--theme-heading)]">
                    {c.overallScore ? `${Math.round((c.overallScore / 5) * 100)}%` : "-"}
                  </td>
                  <td className="px-3 py-3 text-[var(--theme-muted)]">
                    {c.completedAt ? new Date(c.completedAt).toLocaleDateString() : "-"}
                  </td>
                  <td className="px-3 py-3">
                    <span className={`inline-block max-w-[160px] rounded-lg px-3 py-1.5 text-[11px] font-semibold leading-snug ${getTypeColor(c.assessmentName)}`}>
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

// UPDATED: Uses REAL upcoming sessions data from backend
function UpcomingAssessmentsList({ sessions }: { sessions: InterviewSession[] }) {
  const upcoming = sessions
    .filter(s => s.status === "not_started" || s.status === "in_progress")
    .sort((a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime())
    .slice(0, 5);

  const formatDate = (dateString?: string) => {
    if (!dateString) return { month: "TBD", day: "TBD" };
    const date = new Date(dateString);
    return {
      month: date.toLocaleDateString("en-US", { month: "short" }).toUpperCase(),
      day: date.getDate().toString().padStart(2, "0"),
    };
  };

  return (
    <div>
      <SectionHeader title="Active Assessments" action={<Link href="/assessment" className="text-xs font-semibold text-sky-600 hover:text-sky-700">View all</Link>} />
      {upcoming.length === 0 ? (
        <p className="rounded-lg border border-dashed border-[var(--theme-border)] bg-[var(--theme-panel-tint)] py-10 text-center text-xs text-[var(--theme-muted)]">No candidates waiting or in progress.</p>
      ) : (
        <div className="space-y-2">
          {upcoming.map((item) => {
            const date = formatDate(item.createdAt);
            return (
              <div key={item.id} className="flex items-center gap-4 rounded-lg p-2 transition hover:bg-[var(--theme-panel-soft)]">
                <div className="flex h-12 w-12 flex-col items-center justify-center rounded-lg border border-[var(--theme-border)] bg-[var(--theme-panel-soft)]">
                  <span className="text-[10px] font-bold text-sky-600">{date.month}</span>
                  <span className="text-sm font-bold text-[var(--theme-heading)]">{date.day}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="truncate text-xs font-semibold text-[var(--theme-heading)]">{item.candidateName}</p>
                  <p className="truncate text-[10px] text-[var(--theme-muted)]">{item.targetRole || "General Assessment"}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
