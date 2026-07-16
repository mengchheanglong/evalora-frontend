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
          className="flex items-center gap-2 px-4 py-2 bg-sky-500 text-white rounded-lg text-sm font-medium hover:bg-sky-600 shadow-sm hidden h-10 sm:inline-flex" 
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
      icon: "users" as IconName, 
      tone: "bg-purple-100 text-purple-600" 
    },
    { 
      label: "Completed", 
      value: summary.completedAssessments.toLocaleString(), 
      detail: `${((summary.completedAssessments / total) * 100).toFixed(1)}% of total`, 
      icon: "check" as IconName, 
      tone: "bg-emerald-100 text-emerald-600" 
    },
    { 
      label: "In progress", 
      value: summary.inProgressAssessments.toLocaleString(), 
      detail: `${((summary.inProgressAssessments / total) * 100).toFixed(1)}% of total`, 
      icon: "clock" as IconName, 
      tone: "bg-sky-100 text-sky-600" 
    },
    { 
      label: "Average Score", 
      value: summary.averageScore ? `${Math.round((summary.averageScore / 5) * 100)}%` : "0%", 
      detail: "Overall performance", 
      icon: "report" as IconName, 
      tone: "bg-orange-100 text-orange-600" 
    },
    { 
      label: "Pass Rate", 
      value: `${Math.round(summary.completionRate * 100)}%`, 
      detail: "Success rate", 
      icon: "crown" as IconName, 
      tone: "bg-purple-100 text-purple-600" 
    },
  ];

  return (
    <div className="space-y-6">
      {/* Custom Header with Real Date */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">
            Live assessment metrics for your workspace.
          </p>
        </div>
        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-4 py-2.5 shadow-sm cursor-pointer">
          <Icon name="calendar" size={16} className="text-gray-400" />
          <span className="text-sm font-medium text-gray-700">{realDateRange}</span>
          <Icon name="chevron" size={14} className="text-gray-400 rotate-90" />
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
        <div className="lg:col-span-1 bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <PerformanceChart data={trendData} />
        </div>
        <div className="lg:col-span-1 bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <AssessmentPieChart modulePerformance={summary.modulePerformance} total={summary.totalCandidates} />
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
          <UpcomingAssessmentsList sessions={sessions} />
        </div>
      </section>
    </div>
  );
}

// --- Sub-Components ---

// Updated to match Interview Session page style (uses 'detail' instead of 'change')
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
        <p className="text-[10px] text-gray-400 mt-1">{detail}</p>
      </div>
    </div>
  );
}

// UPDATED: Uses REAL backend trend data dynamically
function PerformanceChart({ data }: { data: TrendDataPoint[] }) {
  if (!data || data.length === 0) {
    return (
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-gray-900">Assessment Performance Trend</h3>
        </div>
        <div className="flex flex-col items-center justify-center h-56 text-center border-2 border-dashed border-gray-200 rounded-lg">
          <Icon name="analytics" size={40} className="text-gray-300 mb-3" />
          <p className="text-sm font-medium text-gray-500">No performance data yet</p>
          <p className="text-xs text-gray-400 mt-1 max-w-[200px]">Complete more assessments to see the performance trend over time.</p>
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
    const x = (i / (data.length - 1)) * width;
    const y = height - ((point.score - min) / range) * (height - 10) - 5;
    return `${x},${y}`;
  });
  const pathD = points.length > 1 ? `M ${points.join(" L ")}` : "";

  const formatLabel = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-gray-900">Assessment Performance Trend</h3>
        <select className="text-xs border border-gray-200 rounded px-2 py-1 text-gray-600 outline-none">
          <option>By Week</option>
          <option>By Month</option>
        </select>
      </div>
      <div className="relative h-48 w-full">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-full w-full overflow-visible">
          {[0, 25, 50, 75, 100].map((y) => (
            <line key={y} x1="0" y1={y} x2="100" y2={y} stroke="#f3f4f6" strokeWidth="0.5" />
          ))}
          <path d={pathD} fill="none" stroke="#8b5cf6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          <path d={`${pathD} L 100,100 L 0,100 Z`} fill="#8b5cf6" opacity="0.05" />
          {points.map((point, i) => {
            const [cx, cy] = point.split(',');
            return <circle key={i} cx={cx} cy={cy} r="1.5" fill="#8b5cf6" stroke="white" strokeWidth="0.5" />;
          })}
        </svg>
      </div>
      <div className="flex justify-between text-[10px] text-gray-400 mt-2 px-1">
        {data.map((point, i) => (
          (data.length <= 5 || i === 0 || i === data.length - 1 || i === Math.floor(data.length / 2)) ? (
            <span key={i}>{formatLabel(point.date)}</span>
          ) : <span key={i}></span>
        ))}
      </div>
      <div className="mt-4 flex items-center justify-center gap-2 rounded-lg bg-purple-50 px-3 py-2">
        <span className="text-[11px] font-semibold text-purple-800">
          Latest: {formatLabel(data[data.length - 1].date)} - Average Score: {data[data.length - 1].score}%
        </span>
      </div>
    </div>
  );
}

// UPDATED: Uses REAL module performance data from backend
function AssessmentPieChart({ modulePerformance, total }: { modulePerformance: ModulePerformance[]; total: number }) {
  const totalEvaluations = modulePerformance.reduce((acc, m) => acc + m.evaluationCount, 0);
  const colors = ["#3b82f6", "#06b6d4", "#10b981", "#ef4444", "#f59e0b", "#eab308", "#8b5cf6"];
  
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
      <h3 className="text-sm font-bold text-gray-900 mb-4">Assessment by Types</h3>
      <div className="flex flex-col items-center">
        {segments.length > 0 && totalEvaluations > 0 ? (
          <>
            <div className="relative w-36 h-36">
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
                  return <path key={i} d={pathData} fill={seg.color} stroke="white" strokeWidth="0.05" />;
                })}
                <circle cx="0" cy="0" r="0.6" fill="white" />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-xl font-bold text-gray-900">{total.toLocaleString()}</span>
                <span className="text-[10px] text-gray-500">Total</span>
              </div>
            </div>
            <div className="w-full mt-4 space-y-2">
              {segments.map((seg, i) => (
                <div key={i} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: seg.color }} />
                    <span className="text-gray-600 truncate">{seg.label} ({seg.value.toFixed(1)}%)</span>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-56 text-center border-2 border-dashed border-gray-200 rounded-lg w-full">
            <Icon name="analytics" size={40} className="text-gray-300 mb-3" />
            <p className="text-sm font-medium text-gray-500">No assessment data yet</p>
            <p className="text-xs text-gray-400 mt-1 max-w-[200px]">Assessment types will appear here once modules are evaluated.</p>
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
        <h3 className="text-sm font-bold text-gray-900">Top Perform Candidates</h3>
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
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-gray-900">Active assessments</h3>
        <Link href="/assessment" className="text-xs font-semibold text-sky-600 hover:text-sky-700">View all</Link>
      </div>
      {upcoming.length === 0 ? (
        <p className="text-xs text-gray-500 text-center py-8">No candidates waiting or in progress.</p>
      ) : (
        <div className="space-y-4">
          {upcoming.map((item) => {
            const date = formatDate(item.createdAt);
            return (
              <div key={item.id} className="flex items-center gap-4">
                <div className="flex flex-col items-center justify-center w-12 h-12 bg-gray-50 rounded-lg border border-gray-100">
                  <span className="text-[10px] font-bold text-sky-600">{date.month}</span>
                  <span className="text-sm font-bold text-gray-900">{date.day}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-gray-900 truncate">{item.candidateName}</p>
                  <p className="text-[10px] text-gray-400 truncate">{item.targetRole || "General Assessment"}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}