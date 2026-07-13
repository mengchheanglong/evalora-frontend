"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { Icon, type IconName } from "@/components/icons";
import { EmptyState, ErrorState, PageLoader } from "@/components/ui-states";
import { apiGet, getErrorMessage } from "@/lib/api";
import type { InterviewSession, SessionStatus } from "@/lib/types";

// --- UI Types (Matches Figma Design) ---
type SessionStatusUI = "Completed" | "In Progress" | "Scheduled" | "Cancelled";

interface SessionRow {
  id: string;
  sessionId: string;
  candidateName: string;
  candidateEmail: string;
  templateTitle: string;
  category: string;
  interviewerName: string;
  interviewerRole: string;
  date: string;
  time: string;
  status: SessionStatusUI;
  progress: number;
}

// --- Helper: Map Backend Data to UI Structure ---
function mapSessionToRow(session: InterviewSession): SessionRow {
  // Map backend status to UI status
  const statusMap: Record<SessionStatus, SessionStatusUI> = {
    not_started: "Scheduled",
    in_progress: "In Progress",
    completed: "Completed",
    expired: "Cancelled",
  };

  // Calculate progress based on status
  const progressMap: Record<SessionStatus, number> = {
    not_started: 0,
    in_progress: 50, // Default for in progress
    completed: 100,
    expired: 0,
  };

  // Infer category from targetRole
  let category = "General";
  const roleLower = (session.targetRole || "").toLowerCase();
  if (roleLower.includes("developer") || roleLower.includes("engineer") || roleLower.includes("data") || roleLower.includes("technical")) {
    category = "Technical";
  } else if (roleLower.includes("behavioral")) {
    category = "Behavioral";
  } else if (roleLower.includes("lead") || roleLower.includes("manager")) {
    category = "Leadership";
  }

  // Prefer scheduled time from create form; fall back to createdAt.
  const dateObj = session.scheduledAt
    ? new Date(session.scheduledAt)
    : session.createdAt
      ? new Date(session.createdAt)
      : new Date();
  const date = dateObj.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  const time = dateObj.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });

  // Generate a nice Session ID
  const sessionId = `SES-${session.id.slice(0, 8).toUpperCase()}`;

  return {
    id: session.id,
    sessionId,
    candidateName: session.candidateName,
    candidateEmail: session.candidateEmail || "No email",
    templateTitle: session.title || session.templateTitle || "Assessment",
    category,
    interviewerName: session.interviewerName || session.interviewers?.[0] || "Unassigned",
    interviewerRole: session.interviewerRole || "Reviewer",
    date,
    time,
    status: statusMap[session.status],
    progress: progressMap[session.status],
  };
}

export default function SessionsPage() {
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All Status");

  // Fetch real data from backend
  const loadSessions = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await apiGet<InterviewSession[]>("/sessions");
      setSessions(data.map(mapSessionToRow));
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSessions();
  }, [loadSessions]);

  // Filter logic based on real data
  const filteredSessions = useMemo(() => {
    return sessions.filter((s) => {
      const matchesSearch = s.candidateName.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            s.sessionId.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === "All Status" || s.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [sessions, searchQuery, statusFilter]);

  // Calculate real stats
  const stats = useMemo(() => {
    const total = sessions.length;
    const completed = sessions.filter(s => s.status === "Completed").length;
    const inProgress = sessions.filter(s => s.status === "In Progress").length;
    const scheduled = sessions.filter(s => s.status === "Scheduled").length;
    const cancelled = sessions.filter(s => s.status === "Cancelled").length;

    const getPercent = (count: number) => total > 0 ? `${((count / total) * 100).toFixed(1)}% of total` : "0% of total";

    return {
      total,
      completed,
      inProgress,
      scheduled,
      cancelled,
      completedPercent: getPercent(completed),
      inProgressPercent: getPercent(inProgress),
      scheduledPercent: getPercent(scheduled),
      cancelledPercent: getPercent(cancelled),
    };
  }, [sessions]);

  if (loading) {
    return <AppShell active="session" title="" description=""><PageLoader label="Loading interview sessions" /></AppShell>;
  }

  if (error && !sessions.length) {
    return <AppShell active="session" title="" description=""><ErrorState message={error} onRetry={() => void loadSessions()} /></AppShell>;
  }

  return (
    <AppShell active="session" title="" description="">
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Interview Sessions</h1>
            <p className="text-sm text-gray-500 mt-1">
              Create, manage, and monitor all candidate interview sessions.
            </p>
          </div>
          <div className="flex items-center gap-3">
            
            <Link href="/assessment/create" className="flex items-center gap-2 px-4 py-2 bg-sky-500 text-white rounded-lg text-sm font-medium hover:bg-sky-600 shadow-sm">
              <Icon name="plus" size={16} /> New Session
            </Link>
          </div>
        </div>

        {/* Stats Cards (Now Real) */}
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <StatCard label="Total Sessions" value={String(stats.total)} detail="All time sessions" icon="clipboard" tone="bg-purple-100 text-purple-600" />
          <StatCard label="Completed" value={String(stats.completed)} detail={stats.completedPercent} icon="check" tone="bg-emerald-100 text-emerald-600" />
          <StatCard label="In Progress" value={String(stats.inProgress)} detail={stats.inProgressPercent} icon="clock" tone="bg-sky-100 text-sky-600" />
          <StatCard label="Scheduled" value={String(stats.scheduled)} detail={stats.scheduledPercent} icon="calendar" tone="bg-blue-100 text-blue-600" />
          <StatCard label="Cancelled" value={String(stats.cancelled)} detail={stats.cancelledPercent} icon="more" tone="bg-rose-100 text-rose-600" />
        </section>

        {/* Main Content Card */}
        <section className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          {/* Filters Bar */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between border-b border-gray-200 px-5 py-4 gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <SelectFilter value={statusFilter} onChange={setStatusFilter} options={["All Status", "Completed", "In Progress", "Scheduled", "Cancelled"]} />
              <SelectFilter value="All Templates" onChange={() => {}} options={["All Templates", "Technical", "Behavioral"]} />
              <SelectFilter value="All Interviewers" onChange={() => {}} options={["All Interviewers", "Unassigned"]} />
              <SelectFilter value="All Time" onChange={() => {}} options={["All Time", "Today", "This Week", "This Month"]} />
            </div>
            <div className="relative w-full lg:w-64">
              <Icon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" name="search" size={16} />
              <input
                type="search"
                placeholder="Search sessions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Table */}
          {filteredSessions.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  <tr>
                    <th className="px-5 py-3 w-10"><input type="checkbox" className="rounded border-gray-300" /></th>
                    <th className="px-4 py-3">Session ID</th>
                    <th className="px-4 py-3">Candidate</th>
                    <th className="px-4 py-3">Template</th>
                    <th className="px-4 py-3">Interviewer</th>
                    <th className="px-4 py-3">Session Date & Time</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Progress</th>
                    <th className="px-5 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredSessions.map((session) => (
                    <tr key={session.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-4"><input type="checkbox" className="rounded border-gray-300" /></td>
                      <td className="px-4 py-4 font-mono text-xs text-gray-600">{session.sessionId}</td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-sky-100 flex items-center justify-center text-sky-700 font-bold text-xs">
                            {session.candidateName.split(' ').map(n => n[0]).join('')}
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900">{session.candidateName}</p>
                            <p className="text-xs text-gray-500">{session.candidateEmail}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <p className="font-medium text-gray-900">{session.templateTitle}</p>
                        <span className={`inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-medium ${getCategoryColor(session.category)}`}>
                          {session.category}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 font-bold text-xs">
                            {session.interviewerName.split(' ').map(n => n[0]).join('')}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{session.interviewerName}</p>
                            <p className="text-xs text-gray-500">{session.interviewerRole}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-1.5 text-gray-700">
                            <Icon name="calendar" size={12} className="text-gray-400" />
                            <span className="text-xs">{session.date}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-gray-700">
                            <Icon name="clock" size={12} className="text-gray-400" />
                            <span className="text-xs">{session.time}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <StatusBadge status={session.status} />
                      </td>
                      <td className="px-4 py-4 w-32">
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-bold text-gray-900 w-8">{session.progress}%</span>
                          <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full ${session.progress === 100 ? 'bg-sky-500' : session.progress > 0 ? 'bg-sky-400' : 'bg-gray-200'}`} 
                              style={{ width: `${session.progress}%` }} 
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link href={`/candidates/${session.id}`} className="p-1.5 text-gray-400 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition-colors">
                            <Icon name="eye" size={16} />
                          </Link>
                          <button className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                            <Icon name="more" size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-10 text-center">
              <EmptyState 
                action={<Link href="/assessment/create" className="button-primary">Create Session</Link>}
                title="No sessions found" 
                description="Try adjusting your search or filter, or create a new session." 
                icon="message" 
              />
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}

// --- Sub-Components ---

function StatCard({ label, value, detail, icon, tone }: { label: string; value: string; detail: string; icon: IconName; tone: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm flex items-start gap-4">
      <span className={`flex size-12 shrink-0 items-center justify-center rounded-xl ${tone}`}>
        <Icon name={icon} size={24} />
      </span>
      <div>
        <p className="text-xs font-medium text-gray-500">{label}</p>
        <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
        <p className="text-[10px] text-gray-400 mt-1">{detail}</p>
      </div>
    </div>
  );
}

function SelectFilter({ value, onChange, options }: { value: string; onChange: (val: string) => void; options: string[] }) {
  return (
    <select 
      value={value} 
      onChange={(e) => onChange(e.target.value)}
      className="h-9 px-3 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 outline-none focus:ring-2 focus:ring-sky-500 cursor-pointer"
    >
      {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
    </select>
  );
}

function StatusBadge({ status }: { status: SessionStatusUI }) {
  const styles: Record<SessionStatusUI, string> = {
    Completed: "text-emerald-700 bg-emerald-50 border-emerald-100",
    "In Progress": "text-sky-700 bg-sky-50 border-sky-100",
    Scheduled: "text-amber-700 bg-amber-50 border-amber-100",
    Cancelled: "text-rose-700 bg-rose-50 border-rose-100",
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold border ${styles[status]}`}>
      {status}
    </span>
  );
}

function getCategoryColor(category: string) {
  const colors: Record<string, string> = {
    Technical: "bg-purple-50 text-purple-600",
    Behavioral: "bg-emerald-50 text-emerald-600",
    Leadership: "bg-sky-50 text-sky-600",
    General: "bg-gray-50 text-gray-600",
  };
  return colors[category] || "bg-gray-50 text-gray-600";
}