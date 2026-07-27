"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { Icon } from "@/components/icons";
import { OverviewCard } from "@/components/overview-card";
import { EmptyState, ErrorState, PageLoader } from "@/components/ui-states";
import { apiGet, getErrorMessage } from "@/lib/api";
import type { ActivityItem, AnalyticsSummary, UpcomingAssessment } from "@/lib/types";

export default function DashboardPage() {
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [readyReports, setReadyReports] = useState<ActivityItem[]>([]);
  const [upcoming, setUpcoming] = useState<UpcomingAssessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [nextSummary, nextActivity, nextReadyReports, nextUpcoming] = await Promise.all([
        apiGet<AnalyticsSummary>("/analytics/summary"),
        apiGet<ActivityItem[]>("/analytics/activity"),
        apiGet<ActivityItem[]>("/analytics/ready-reports"),
        apiGet<UpcomingAssessment[]>("/analytics/upcoming"),
      ]);
      setSummary(nextSummary);
      setActivity(nextActivity);
      setReadyReports(nextReadyReports);
      setUpcoming(nextUpcoming);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadDashboard(); }, [loadDashboard]);

  return (
    <AppShell
      active="dashboard"
      actions={
        <Link
          className="session-blue-button h-10 px-4 text-[12px]"
          href="/assessment/create"
        >
          <Icon name="plus" size={15} /> New session
        </Link>
      }
      description="Operational work that needs attention now. Outcomes and comparisons live in Analytics."
      title="Overview"
    >
      {loading ? <PageLoader label="Loading assessment work" /> : null}
      {!loading && error ? <ErrorState message={error} onRetry={() => void loadDashboard()} /> : null}
      {!loading && !error && summary ? (
        <OverviewContent activity={activity} readyReports={readyReports} summary={summary} upcoming={upcoming} />
      ) : null}
    </AppShell>
  );
}

function OverviewContent({
  activity,
  readyReports,
  summary,
  upcoming,
}: {
  activity: ActivityItem[];
  readyReports: ActivityItem[];
  summary: AnalyticsSummary;
  upcoming: UpcomingAssessment[];
}) {
  return (
    <div className="space-y-6">
      <section>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <OverviewCard
            accent="var(--color-chart-1)"
            detail="Candidates actively completing an assessment"
            icon="clock"
            label="In progress"
            tone="text-[var(--color-chart-1)]"
            value={summary.inProgressAssessments.toLocaleString()}
          />
          <OverviewCard
            accent="#f59e0b"
            detail="Invitation sent; candidate has not started"
            icon="calendar"
            label="Awaiting start"
            tone="text-amber-600"
            value={summary.pendingAssessments.toLocaleString()}
          />
          <OverviewCard
            accent="var(--color-primary-500)"
            detail="Completed sessions without a persisted report"
            icon="report"
            label="Reports pending"
            tone="text-[var(--color-primary-700)]"
            value={summary.reportsPending.toLocaleString()}
          />
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        <Panel>
          <PanelHeader action={<Link className="text-[11px] font-bold text-[var(--color-primary-700)]" href="/assessment">View sessions</Link>} title="Next active assessments" />
          {upcoming.length ? <UpcomingList items={upcoming} /> : <EmptyState description="New invitations and active sessions will appear here." title="No active assessments" />}
        </Panel>
        <Panel>
          <PanelHeader action={<Link className="text-[11px] font-bold text-[var(--color-primary-700)]" href="/candidates">View candidates</Link>} title="Newly ready reports" />
          {readyReports.length ? <ReadyReportList items={readyReports} /> : <EmptyState description="Completed sessions with persisted reports will appear here." title="No newly ready reports" />}
        </Panel>
      </section>

      <Panel>
        <PanelHeader action={<Link className="text-[11px] font-bold text-[var(--color-primary-700)]" href="/assessment">View all</Link>} title="Recent session updates" />
        {activity.length ? <ActivityList items={activity.slice(0, 8)} /> : <EmptyState description="Session state changes will appear here." title="No recent updates" />}
      </Panel>
    </div>
  );
}

function Panel({ children }: { children: React.ReactNode }) {
  return <article className="card rounded-[10px] p-4 sm:p-5">{children}</article>;
}

function PanelHeader({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <h2 className="text-[14px] font-extrabold text-[var(--theme-heading)]">{title}</h2>
      {action}
    </div>
  );
}

function UpcomingList({ items }: { items: UpcomingAssessment[] }) {
  return (
    <div className="divide-y divide-[var(--theme-border)]">
      {items.map((item) => (
        <Link className="flex items-center gap-3 py-3 first:pt-0 last:pb-0" href={`/candidates/${item.sessionId}`} key={item.sessionId}>
          <span className="flex size-9 shrink-0 items-center justify-center rounded-[8px] bg-[var(--theme-panel-soft)] text-[var(--color-primary-700)]">
            <Icon name={item.status === "in_progress" ? "clock" : "calendar"} size={16} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[12px] font-bold text-[var(--theme-heading)]">{item.candidateName}</span>
            <span className="mt-0.5 block truncate text-[10px] text-[var(--theme-muted)]">{item.targetRole}</span>
          </span>
          <span className="shrink-0 text-right">
            <span className="block text-[10px] font-bold text-[var(--theme-text)]">{item.status === "in_progress" ? "In progress" : "Awaiting start"}</span>
            <span className="mt-0.5 block text-[9px] text-[var(--theme-faint)]">{formatMoment(item.scheduledAt ?? item.expiresAt)}</span>
          </span>
        </Link>
      ))}
    </div>
  );
}

function ReadyReportList({ items }: { items: ActivityItem[] }) {
  return (
    <div className="divide-y divide-[var(--theme-border)]">
      {items.map((item) => (
        <Link className="flex items-center gap-3 py-3 first:pt-0 last:pb-0" href={`/candidates/${item.sessionId}`} key={item.id}>
          <span className="flex size-9 shrink-0 items-center justify-center rounded-[8px] bg-emerald-50 text-emerald-600">
            <Icon name="report" size={16} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[12px] font-bold text-[var(--theme-heading)]">{item.candidateName}</span>
            <span className="mt-0.5 block truncate text-[10px] text-[var(--theme-muted)]">{item.assessmentName}</span>
          </span>
          <span className="shrink-0 text-[9px] font-medium text-[var(--theme-faint)]">{formatRelative(item.createdAt)}</span>
        </Link>
      ))}
    </div>
  );
}

function ActivityList({ items }: { items: ActivityItem[] }) {
  return (
    <div className="grid gap-x-5 sm:grid-cols-2">
      {items.map((item) => (
        <div className="flex items-start gap-3 border-b border-[var(--theme-border)] py-3" key={item.id}>
          <span className={`mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-[8px] ${item.status === "completed" ? "bg-emerald-50 text-emerald-600" : "bg-[var(--theme-panel-soft)] text-[var(--color-primary-700)]"}`}>
            <Icon name={item.status === "completed" ? "check" : "clock"} size={14} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold leading-4 text-[var(--theme-heading)]">{item.message}</p>
            <p className="mt-1 text-[9px] text-[var(--theme-faint)]">{formatRelative(item.createdAt)}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function formatMoment(value?: string) {
  if (!value) return "Unscheduled";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unscheduled";
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(date);
}

function formatRelative(value: string) {
  const minutes = Math.max(0, Math.round((Date.now() - new Date(value).getTime()) / 60_000));
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}
