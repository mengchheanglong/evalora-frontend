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
      change: 18,
      changeType: "increase" as const,
      icon: "users" as IconName,
      tone: "bg-purple-100 text-purple-600",
    },
    {
      label: "Completed",
      value: summary.completedAssessments.toLocaleString(),
      change: 16,
      changeType: "increase" as const,
      icon: "check" as IconName,
      tone: "bg-emerald-100 text-emerald-600",
    },
    {
      label: "In progress",
      value: summary.inProgressAssessments.toLocaleString(),
      change: 8,
      changeType: "decrease" as const,
      icon: "clock" as IconName,
      tone: "bg-sky-100 text-sky-600",
    },
    {
      label: "Average Score",
      value: summary.averageScore ? `${Math.round((summary.averageScore / 5) * 100)}%` : "0%",
      change: 6,
      changeType: "increase" as const,
      icon: "report" as IconName,
      tone: "bg-orange-100 text-orange-600",
    },
    {
      label: "Pass Rate",
      value: `${Math.round(summary.completionRate * 100)}%`,
      change: 8,
      changeType: "increase" as const,
      icon: "crown" as IconName,
      tone: "bg-purple-100 text-purple-600",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Custom Header matching Figma */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">
            Welcome back, Here's what's happening with your assessments today.
          </p>
        </div>
        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-4 py-2.5 shadow-sm cursor-pointer">
          <Icon name="calendar" size={16} className="text-gray-400" />
          <span className="text-sm font-medium text-gray-700">May 1, 2026 - May 31, 2026</span>
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
          <PerformanceChart />
        </div>
        <div className="lg:col-span-1 bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <AssessmentPieChart total={summary.totalCandidates} />
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
          <UpcomingAssessmentsList />
        </div>
      </section>
    </div>
  );
}

// --- Sub-Components ---

function StatCard({ label, value, change, changeType, icon, tone }: {
  label: string; value: string; change: number; changeType: "increase" | "decrease"; icon: IconName; tone: string;
}) {
  const isIncrease = changeType === "increase";
  
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm flex items-start gap-4">
      {/* Icon on the left */}
      <span className={`flex size-12 shrink-0 items-center justify-center rounded-xl ${tone}`}>
        <Icon name={icon} size={24} />
      </span>
      
      {/* Text and Trend on the right */}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-gray-500">{label}</p>
        <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
        <div className="flex items-center gap-1 mt-2">
          <Icon
            name="chevron"
            size={14}
            className={`${isIncrease ? "text-emerald-500 -rotate-90" : "text-rose-500 rotate-90"}`}
          />
          <span className={`text-xs font-semibold ${isIncrease ? "text-emerald-500" : "text-rose-500"}`}>
            {change}%
          </span>
          <span className="text-xs text-gray-400">vs last month</span>
        </div>
      </div>
    </div>
  );
}

function PerformanceChart() {
  // Mock data for the line chart
  const data = [20, 35, 25, 45, 40, 60, 55, 75, 70, 85, 80, 90];
  const max = 100;
  const min = 0;
  const range = max - min || 1;
  const width = 100;
  const height = 100;
  const points = data.map((val, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((val - min) / range) * (height - 10) - 5;
    return `${x},${y}`;
  });
  const pathD = `M ${points.join(" L ")}`;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-gray-900">Assessment Performance Trend</h3>
        <select className="text-xs border border-gray-200 rounded px-2 py-1 text-gray-600 outline-none">
          <option>By Day</option>
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
        </svg>
      </div>
      <div className="flex justify-between text-[10px] text-gray-400 mt-2">
        <span>May 1</span><span>May 6</span><span>May 11</span><span>May 16</span><span>May 21</span><span>May 26</span>
      </div>
      <div className="mt-4 flex items-center justify-center gap-2 rounded-lg bg-purple-50 px-3 py-2">
        <span className="text-[11px] font-semibold text-purple-800">May 21, 2026 - Average Score: 83%</span>
      </div>
    </div>
  );
}

function AssessmentPieChart({ total }: { total: number }) {
  const segments = [
    { label: "AI Interview", value: 16.66, color: "#3b82f6" },
    { label: "Coding Test", value: 16.66, color: "#06b6d4" },
    { label: "Behavioral", value: 16.66, color: "#10b981" },
    { label: "Communication", value: 16.66, color: "#ef4444" },
    { label: "Leadership", value: 16.66, color: "#f59e0b" },
    { label: "Other", value: 16.70, color: "#eab308" },
  ];

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
        <div className="relative w-36 h-36">
          <svg viewBox="-1 -1 2 2" className="w-full h-full -rotate-90">
            {segments.map((seg, i) => {
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
                <span className="text-gray-600">{seg.label}({seg.value}%)</span>
              </div>
            </div>
          ))}
        </div>
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

function UpcomingAssessmentsList() {
  // Mock data for upcoming assessments
  const upcoming = [
    { date: "JUN 03", name: "Alex Thompson", role: "Full Stack Developer Interview", time: "2h ago" },
    { date: "JUN 03", name: "Alex Thompson", role: "Full Stack Developer Interview", time: "4h ago" },
    { date: "JUN 02", name: "Alex Thompson", role: "Full Stack Developer Interview", time: "1d ago" },
    { date: "JUN 01", name: "Alex Thompson", role: "Full Stack Developer Interview", time: "2d ago" },
    { date: "JUN 01", name: "Alex Thompson", role: "Full Stack Developer Interview", time: "2d ago" },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-gray-900">Upcoming Assessments</h3>
        <Link href="/assessment" className="text-xs font-semibold text-sky-600 hover:text-sky-700">View all</Link>
      </div>
      <div className="space-y-4">
        {upcoming.map((item, i) => (
          <div key={i} className="flex items-center gap-4">
            <div className="flex flex-col items-center justify-center w-12 h-12 bg-gray-50 rounded-lg border border-gray-100">
              <span className="text-[10px] font-bold text-sky-600">{item.date.split(" ")[0]}</span>
              <span className="text-sm font-bold text-gray-900">{item.date.split(" ")[1]}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-gray-900 truncate">{item.name}</p>
              <p className="text-[10px] text-gray-400 truncate">{item.role}</p>
            </div>
            <span className="text-[10px] text-gray-400">{item.time}</span>
          </div>
        ))}
      </div>
    </div>
  );
}