"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { FilterPanelFrame, FilterSelectField, FilterToggleButton } from "@/components/filter-controls";
import { Icon } from "@/components/icons";
import { OverviewCard } from "@/components/overview-card";
import { EmptyState, ErrorState, PageLoader } from "@/components/ui-states";
import { apiDelete, apiGet, getErrorMessage } from "@/lib/api";
import type { AnalyticsSummary, InterviewSession, SessionStatus } from "@/lib/types";

// --- UI Types (Matches Figma Design) ---
type SessionStatusUI = "Completed" | "In Progress" | "Scheduled" | "Expired";

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
  timestamp: number;
  status: SessionStatusUI;
}

// --- Helper: Map Backend Data to UI Structure ---
function mapSessionToRow(session: InterviewSession): SessionRow {
  // Map backend status to UI status
  const statusMap: Record<SessionStatus, SessionStatusUI> = {
    not_started: "Scheduled",
    in_progress: "In Progress",
    completed: "Completed",
    expired: "Expired",
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
    timestamp: dateObj.getTime(),
    status: statusMap[session.status],
  };
}

export default function SessionsPage() {
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [templateFilter, setTemplateFilter] = useState("all");
  const [interviewerFilter, setInterviewerFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState("");

  // Fetch real data from backend
  const loadSessions = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [data, nextSummary] = await Promise.all([
        apiGet<InterviewSession[]>("/sessions"),
        apiGet<AnalyticsSummary>("/analytics/summary"),
      ]);
      setSessions(data.map(mapSessionToRow));
      setSummary(nextSummary);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSessions();
  }, [loadSessions]);

  const removeSession = useCallback(async (session: SessionRow) => {
    if (!window.confirm(`Delete ${session.candidateName}'s session (${session.sessionId})? This permanently removes the session and its saved responses, submissions, and report.`)) return;
    setDeletingId(session.id);
    setActionError("");
    try {
      await apiDelete(`/sessions/${session.id}`);
      await loadSessions();
    } catch (requestError) {
      setActionError(getErrorMessage(requestError, "Could not delete this session. Please try again."));
    } finally {
      setDeletingId(null);
    }
  }, [loadSessions]);

  const templates = useMemo(
    () => uniqueValues(sessions.map((session) => session.templateTitle)),
    [sessions],
  );
  const interviewers = useMemo(
    () => uniqueValues(sessions.map((session) => session.interviewerName)),
    [sessions],
  );

  // Filter logic based on real data
  const filteredSessions = useMemo(() => {
    const normalizedSearch = searchQuery.trim().toLowerCase();
    return sessions.filter((s) => {
      const matchesSearch = !normalizedSearch || [
        s.candidateName,
        s.candidateEmail,
        s.sessionId,
        s.templateTitle,
        s.interviewerName,
      ].some((value) => value.toLowerCase().includes(normalizedSearch));
      const matchesStatus = statusFilter === "all" || s.status === statusFilter;
      const matchesTemplate = templateFilter === "all" || s.templateTitle === templateFilter;
      const matchesInterviewer = interviewerFilter === "all" || s.interviewerName === interviewerFilter;
      return matchesSearch && matchesStatus && matchesTemplate && matchesInterviewer && withinSessionDate(s.timestamp, dateFilter);
    });
  }, [sessions, searchQuery, statusFilter, templateFilter, interviewerFilter, dateFilter]);

  const activeFilterCount = [
    statusFilter !== "all",
    templateFilter !== "all",
    interviewerFilter !== "all",
    dateFilter !== "all",
  ].filter(Boolean).length;

  const clearFilters = useCallback(() => {
    setStatusFilter("all");
    setTemplateFilter("all");
    setInterviewerFilter("all");
    setDateFilter("all");
  }, []);


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
            <h1 className="text-3xl font-bold text-[var(--theme-heading)]">Interview Sessions</h1>
            <p className="text-sm text-[var(--theme-muted)] mt-1">
              Create, manage, and monitor all candidate interview sessions.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/assessment/create" className="flex h-12 items-center justify-center gap-2 rounded-xl border border-[var(--color-primary-500)] bg-[var(--color-primary-500)] px-5 text-sm font-bold text-[var(--theme-panel)] shadow-sm transition hover:border-[var(--color-primary-600)] hover:bg-[var(--color-primary-600)] focus:outline-none focus:ring-2 focus:ring-[var(--theme-ring)]">
              <Icon name="plus" size={16} /> New Session
            </Link>
          </div>
        </div>

        {summary ? (
          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <OverviewCard label="Awaiting start" value={summary.pendingAssessments.toLocaleString()} detail="Invitation sent; candidate has not started" icon="calendar" tone="text-amber-500" accent="#f59e0b" />
            <OverviewCard label="In progress" value={summary.inProgressAssessments.toLocaleString()} detail="Candidates actively completing assessments" icon="clock" tone="text-sky-500" accent="#0ea5e9" />
            <OverviewCard label="Reports pending" value={summary.reportsPending.toLocaleString()} detail="Completed sessions still awaiting a report" emphasis={summary.reportsPending > 0 ? "attention" : "quiet"} icon="more" tone="text-amber-600" accent="#f59e0b" />
            <OverviewCard label="Reports ready" value={summary.reportReadyAssessments.toLocaleString()} detail={`${summary.completedAssessments} completed assessments`} progress={summary.reportCoverageRate == null ? null : summary.reportCoverageRate * 100} icon="report" tone="text-[var(--color-chart-1)]" accent="var(--color-chart-1)" />
          </section>
        ) : null}

        {/* Main Content Card */}
        <section className="bg-[var(--theme-panel)] rounded-xl border border-[var(--theme-border)] shadow-[var(--shadow-card)] overflow-hidden">
          <div className="flex flex-wrap items-center gap-3 border-b border-[var(--theme-border)] px-4 py-2.5 sm:px-5">
            <label className="group flex h-9 min-w-[220px] flex-1 items-center gap-2 rounded-[7px] border border-[var(--color-primary-300)]/70 bg-[var(--color-primary-50)]/70 px-3 text-[var(--color-primary-700)] shadow-[inset_0_1px_0_rgba(255,255,255,0.55)] transition focus-within:border-[var(--color-primary-500)] focus-within:bg-[var(--theme-panel)] focus-within:ring-4 focus-within:ring-[var(--theme-ring)] sm:max-w-[360px]">
              <span className="sr-only">Search sessions</span>
              <input
                className="min-w-0 flex-1 border-0 bg-transparent text-xs font-medium text-[var(--theme-text)] outline-none placeholder:text-[var(--theme-muted)]"
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search sessions..."
                type="search"
                value={searchQuery}
              />
              <Icon className="pointer-events-none relative -top-px shrink-0 text-[var(--color-primary-700)]/70 transition group-focus-within:text-[var(--color-primary-700)]" name="search" size={15} />
            </label>
            <span className="ml-auto hidden text-[11px] font-semibold text-[var(--theme-faint)] sm:inline">
              {filteredSessions.length} {filteredSessions.length === 1 ? "session" : "sessions"}
            </span>
            <FilterToggleButton activeCount={activeFilterCount} controls="session-filters" onToggle={() => setFiltersOpen((open) => !open)} open={filtersOpen} subject="session" />
          </div>
          <div hidden={!filtersOpen} id="session-filters">
            <FilterPanelFrame description="Results update as you make a selection." onClear={clearFilters} title="Filter sessions">
              <FilterSelectField label="Status" onChange={setStatusFilter} value={statusFilter}>
                <option value="all">All Statuses</option>
                <option value="Completed">Completed</option>
                <option value="In Progress">In Progress</option>
                <option value="Scheduled">Scheduled</option>
                <option value="Expired">Expired</option>
              </FilterSelectField>
              <FilterSelectField label="Template" onChange={setTemplateFilter} value={templateFilter}>
                <option value="all">All Templates</option>
                {templates.map((template) => <option key={template} value={template}>{template}</option>)}
              </FilterSelectField>
              <FilterSelectField label="Interviewer" onChange={setInterviewerFilter} value={interviewerFilter}>
                <option value="all">All Interviewers</option>
                {interviewers.map((interviewer) => <option key={interviewer} value={interviewer}>{interviewer}</option>)}
              </FilterSelectField>
              <FilterSelectField label="Session date" onChange={setDateFilter} value={dateFilter}>
                <option value="all">All Time</option>
                <option value="today">Today</option>
                <option value="7days">Last 7 Days</option>
                <option value="30days">Last 30 Days</option>
              </FilterSelectField>
            </FilterPanelFrame>
          </div>

          {actionError ? (
            <div className="border-b border-rose-100 bg-rose-50 px-5 py-3 text-sm text-rose-700" role="alert">{actionError}</div>
          ) : null}

          {/* Table */}
          {filteredSessions.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-[var(--theme-panel-soft)] text-xs font-semibold text-[var(--theme-faint)] uppercase tracking-wider">
                  <tr>
                    <th className="px-5 py-3">Session ID</th>
                    <th className="px-4 py-3">Candidate</th>
                    <th className="px-4 py-3">Template</th>
                    <th className="px-4 py-3">Interviewer</th>
                    <th className="px-4 py-3">Session Date & Time</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-5 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--theme-border)]">
                  {filteredSessions.map((session) => (
                    <tr key={session.id} className="hover:bg-[var(--theme-panel-soft)] transition-colors">
                      <td className="px-5 py-4 font-mono text-xs text-[var(--theme-text)]">{session.sessionId}</td>
                      <td className="px-4 py-4">
                        <Link href={`/candidates/${session.id}`} className="group flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-[var(--theme-active)] flex items-center justify-center text-[var(--theme-active-text)] font-bold text-xs">
                            {session.candidateName.split(' ').map(n => n[0]).join('')}
                          </div>
                          <div>
                            <p className="font-semibold text-[var(--theme-heading)] group-hover:text-[var(--color-primary-700)]">{session.candidateName}</p>
                            <p className="text-xs text-[var(--theme-muted)]">{session.candidateEmail}</p>
                          </div>
                        </Link>
                      </td>
                      <td className="px-4 py-4">
                        <p className="font-medium text-[var(--theme-heading)]">{session.templateTitle}</p>
                        <span className={`inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-medium ${getCategoryColor(session.category)}`}>
                          {session.category}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-[var(--theme-panel-soft)] flex items-center justify-center text-[var(--theme-muted)] font-bold text-xs">
                            {session.interviewerName.split(' ').map(n => n[0]).join('')}
                          </div>
                          <div>
                            <p className="font-medium text-[var(--theme-heading)]">{session.interviewerName}</p>
                            <p className="text-xs text-[var(--theme-muted)]">{session.interviewerRole}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-1.5 text-[var(--theme-text)]">
                            <Icon name="calendar" size={12} className="text-[var(--theme-faint)]" />
                            <span className="text-xs">{session.date}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-[var(--theme-text)]">
                            <Icon name="clock" size={12} className="text-[var(--theme-faint)]" />
                            <span className="text-xs">{session.time}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <StatusBadge status={session.status} />
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            aria-label={`Delete ${session.candidateName}'s session`}
                            disabled={deletingId === session.id}
                            onClick={() => void removeSession(session)}
                            className="p-1.5 text-[var(--theme-faint)] hover:text-[var(--theme-muted)] hover:bg-[var(--theme-panel-soft)] rounded-lg transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {deletingId === session.id
                              ? <span className="block size-4 animate-spin rounded-full border-2 border-[var(--theme-border)] border-t-[var(--color-primary-500)]" />
                              : <Icon name="trash" size={16} />}
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
                action={<Link href="/assessment/create" className="session-blue-button min-h-11 px-5 text-[13px]">Create Session</Link>}
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

function StatusBadge({ status }: { status: SessionStatusUI }) {
  const styles: Record<SessionStatusUI, string> = {
    Completed: "text-emerald-700 bg-emerald-50 border-emerald-100",
    "In Progress": "text-sky-700 bg-sky-50 border-sky-100",
    Scheduled: "text-amber-700 bg-amber-50 border-amber-100",
    Expired: "text-[var(--theme-muted)] bg-[var(--theme-panel-soft)] border-[var(--theme-border)]",
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold border ${styles[status]}`}>
      {status}
    </span>
  );
}

function getCategoryColor(category: string) {
  const colors: Record<string, string> = {
    Technical: "bg-[var(--color-primary-50)] text-[var(--color-primary-700)]",
    Behavioral: "bg-emerald-50 text-emerald-600",
    Leadership: "bg-sky-50 text-sky-600",
    General: "bg-[var(--theme-panel-soft)] text-[var(--theme-muted)]",
  };
  return colors[category] || "bg-[var(--theme-panel-soft)] text-[var(--theme-muted)]";
}

function withinSessionDate(timestamp: number, filter: string) {
  if (filter === "all") return true;
  const now = new Date();
  if (filter === "today") {
    const sessionDate = new Date(timestamp);
    return sessionDate.getFullYear() === now.getFullYear()
      && sessionDate.getMonth() === now.getMonth()
      && sessionDate.getDate() === now.getDate();
  }
  const days = filter === "7days" ? 7 : 30;
  return timestamp >= now.getTime() - days * 24 * 60 * 60 * 1000;
}

function uniqueValues(values: string[]) {
  return [...new Set(values.filter((value) => value.trim()).map((value) => value.trim()))].sort((a, b) => a.localeCompare(b));
}
