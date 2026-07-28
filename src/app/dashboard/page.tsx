"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { DataTable, HeroStat, PipelineBar, TrendChart, type TrendPoint } from "@/components/charts";
import { Icon } from "@/components/icons";
import { EmptyState, ErrorState, PageLoader } from "@/components/ui-states";
import { apiGet, getErrorMessage } from "@/lib/api";
import type { ActivityItem, AnalyticsSummary, SessionStatus, UpcomingAssessment } from "@/lib/types";

/**
 * One validated hue per lifecycle state. A single-hue sequential ramp was tried
 * first and rejected: its light steps fall below 3:1 on white, so "awaiting
 * start" was effectively invisible. See --color-state-* in globals.css.
 */
const STATUS_META: Record<SessionStatus, { label: string; color: string }> = {
  not_started: { label: "Awaiting start", color: "var(--color-state-not-started)" },
  in_progress: { label: "In progress", color: "var(--color-state-in-progress)" },
  completed: { label: "Completed", color: "var(--color-state-completed)" },
  expired: { label: "Expired", color: "var(--color-state-expired)" },
};

const STATUS_ORDER: SessionStatus[] = ["not_started", "in_progress", "completed", "expired"];

export default function DashboardPage() {
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [readyReports, setReadyReports] = useState<ActivityItem[]>([]);
  const [upcoming, setUpcoming] = useState<UpcomingAssessment[]>([]);
  const [trend, setTrend] = useState<TrendPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [nextSummary, nextActivity, nextReadyReports, nextUpcoming, nextTrend] = await Promise.all([
        apiGet<AnalyticsSummary>("/analytics/summary"),
        apiGet<ActivityItem[]>("/analytics/activity"),
        apiGet<ActivityItem[]>("/analytics/ready-reports"),
        apiGet<UpcomingAssessment[]>("/analytics/upcoming"),
        apiGet<TrendPoint[]>("/analytics/trend").catch(() => [] as TrendPoint[]),
      ]);
      setSummary(nextSummary);
      setActivity(nextActivity);
      setReadyReports(nextReadyReports);
      setUpcoming(nextUpcoming);
      setTrend(nextTrend);
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
          className="session-blue-button h-10 px-4 text-xs"
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
        <OverviewContent activity={activity} readyReports={readyReports} summary={summary} trend={trend} upcoming={upcoming} />
      ) : null}
    </AppShell>
  );
}

function OverviewContent({
  activity,
  readyReports,
  summary,
  trend,
  upcoming,
}: {
  activity: ActivityItem[];
  readyReports: ActivityItem[];
  summary: AnalyticsSummary;
  trend: TrendPoint[];
  upcoming: UpcomingAssessment[];
}) {
  const counts = new Map(summary.statusBreakdown.map((entry) => [entry.status, entry.count]));
  const segments = STATUS_ORDER.map((status) => ({
    label: STATUS_META[status].label,
    value: counts.get(status) ?? 0,
    color: STATUS_META[status].color,
  }));
  const inFlight = summary.pendingAssessments + summary.inProgressAssessments;

  return (
    <div className="space-y-5">
      {/* The pipeline is the headline: one shape that answers "where is everyone?" */}
      <section className="card rounded-[10px] p-4 sm:p-5">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,200px)_minmax(0,1fr)] lg:gap-8">
          <div className="lg:border-r lg:border-[var(--theme-border)] lg:pr-8">
            <HeroStat
              detail={`of ${summary.totalSessions.toLocaleString()} total sessions`}
              label="In flight"
              value={inFlight.toLocaleString()}
            />
            {summary.closedCompletionRate !== null ? (
              <p className="mt-3 border-t border-[var(--theme-border)] pt-3 text-xs text-[var(--theme-muted)]">
                <span className="font-bold text-[var(--theme-heading)]">{summary.closedCompletionRate}%</span> of finished
                sessions were completed
              </p>
            ) : null}
          </div>
          <div className="min-w-0">
            <h2 className="mb-3 text-base font-extrabold text-[var(--theme-heading)]">Assessment pipeline</h2>
            {summary.totalSessions ? (
              <>
                <PipelineBar segments={segments} />
                <DataTable
                  caption="Sessions by status"
                  rows={segments.map((segment) => ({ label: segment.label, value: segment.value }))}
                />
              </>
            ) : (
              <EmptyState description="Invite a candidate to start building your pipeline." title="No sessions yet" />
            )}
          </div>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
        <Panel>
          <PanelHeader
            action={<Link className="text-xs font-bold text-[var(--color-primary-700)]" href="/analytics">Full analytics</Link>}
            title="Average score by day"
          />
          {trend.length > 1 ? (
            <TrendChart points={trend} />
          ) : (
            <EmptyState
              description="Scores appear here once candidates finish assessments on more than one day."
              title="Not enough completed assessments yet"
            />
          )}
        </Panel>
        <Panel>
          <PanelHeader title="Needs attention" />
          <div className="space-y-1">
            <AttentionRow
              count={summary.reportsPending}
              href="/candidates"
              icon="report"
              label="Reports pending"
              note="Completed, no report generated"
            />
            <AttentionRow
              count={summary.pendingAssessments}
              href="/assessment"
              icon="calendar"
              label="Awaiting start"
              note="Invited, not yet opened"
            />
            <AttentionRow
              count={summary.expiredAssessments}
              href="/assessment"
              icon="clock"
              label="Expired"
              note="Window closed before completion"
            />
          </div>
        </Panel>
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        <Panel>
          <PanelHeader action={<Link className="text-xs font-bold text-[var(--color-primary-700)]" href="/assessment">View sessions</Link>} title="Next active assessments" />
          {upcoming.length ? <UpcomingList items={upcoming} /> : <EmptyState description="New invitations and active sessions will appear here." title="No active assessments" />}
        </Panel>
        <Panel>
          <PanelHeader action={<Link className="text-xs font-bold text-[var(--color-primary-700)]" href="/candidates">View candidates</Link>} title="Newly ready reports" />
          {readyReports.length ? <ReadyReportList items={readyReports} /> : <EmptyState description="Completed sessions with persisted reports will appear here." title="No newly ready reports" />}
        </Panel>
      </section>

      <Panel>
        <PanelHeader action={<Link className="text-xs font-bold text-[var(--color-primary-700)]" href="/assessment">View all</Link>} title="Recent session updates" />
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
      <h2 className="text-base font-extrabold text-[var(--theme-heading)]">{title}</h2>
      {action}
    </div>
  );
}

/** A queue with a count. Zero is deliberately quiet so non-zero reads as work. */
function AttentionRow({
  label,
  note,
  count,
  href,
  icon,
}: {
  label: string;
  note: string;
  count: number;
  href: string;
  icon: "report" | "calendar" | "clock";
}) {
  const active = count > 0;
  return (
    <Link
      className="flex items-center gap-3 rounded-[8px] px-2 py-2.5 transition-colors hover:bg-[var(--theme-panel-soft)]"
      href={href}
    >
      <span
        className={`flex size-8 shrink-0 items-center justify-center rounded-[8px] ${
          active ? "bg-[var(--theme-panel-soft)] text-[var(--color-primary-700)]" : "bg-[var(--theme-panel-soft)] text-[var(--theme-faint)]"
        }`}
      >
        <Icon name={icon} size={15} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-xs font-bold text-[var(--theme-heading)]">{label}</span>
        <span className="mt-0.5 block truncate text-xs text-[var(--theme-muted)]">{note}</span>
      </span>
      <span
        className={`shrink-0 text-xl font-bold tabular-nums leading-none ${
          active ? "text-[var(--theme-heading)]" : "text-[var(--theme-faint)]"
        }`}
      >
        {count}
      </span>
    </Link>
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
            <span className="block truncate text-xs font-bold text-[var(--theme-heading)]">{item.candidateName}</span>
            <span className="mt-0.5 block truncate text-xs text-[var(--theme-muted)]">{item.targetRole}</span>
          </span>
          <span className="shrink-0 text-right">
            <span className="block text-xs font-bold text-[var(--theme-text)]">{item.status === "in_progress" ? "In progress" : "Awaiting start"}</span>
            <span className="mt-0.5 block text-xs text-[var(--theme-faint)]">{formatMoment(item.scheduledAt ?? item.expiresAt)}</span>
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
            <span className="block truncate text-xs font-bold text-[var(--theme-heading)]">{item.candidateName}</span>
            <span className="mt-0.5 block truncate text-xs text-[var(--theme-muted)]">{item.assessmentName}</span>
          </span>
          <span className="shrink-0 text-xs font-medium text-[var(--theme-faint)]">{formatRelative(item.createdAt)}</span>
        </Link>
      ))}
    </div>
  );
}

const ACTIVITY_ICON: Record<SessionStatus, "check" | "clock" | "calendar"> = {
  completed: "check",
  expired: "clock",
  in_progress: "clock",
  not_started: "calendar",
};

/**
 * A feed, so the timestamp sits on the same line as the message rather than
 * stacked beneath it — that filled the dead horizontal space at wide widths and
 * lets the eye scan the times down a single edge. Dots reuse the pipeline's
 * state colours so "green" means the same thing on every screen.
 */
function ActivityList({ items }: { items: ActivityItem[] }) {
  /* Two independent lists rather than one row-major grid. The gutter and the
     per-row rules make this read as two stacked lists, so it has to fill that
     way too — `grid-cols-2` fills left-to-right, which parked the second-newest
     update at the top of the *right* column, where nobody scanning a feed
     called "recent" thinks to look. */
  const half = Math.ceil(items.length / 2);
  const columns = [
    { key: "left", rows: items.slice(0, half) },
    { key: "right", rows: items.slice(half) },
  ];
  return (
    <div className="grid gap-x-8 sm:grid-cols-2">
      {columns.map((column) => (
        /* divide-y, not `border-b ... last:border-0`: `last:` matched only the
           final cell of the whole grid, so the bottom-left row kept a rule that
           ran into nothing. Dividing per column also ends each list cleanly. */
        <div className="divide-y divide-[var(--theme-border)]" key={column.key}>
          {column.rows.map((item) => (
            <Link
              className="-mx-2 flex items-center gap-2.5 rounded-[6px] px-2 py-2.5 transition-colors hover:bg-[var(--theme-panel-soft)]"
              href={`/candidates/${item.sessionId}`}
              key={item.id}
            >
              <span
                className="flex size-6 shrink-0 items-center justify-center rounded-full"
                style={{ background: `color-mix(in srgb, ${STATUS_META[item.status].color} 18%, transparent)`, color: STATUS_META[item.status].color }}
              >
                <Icon name={ACTIVITY_ICON[item.status]} size={12} />
              </span>
              {/* Composed from the parts rather than the server's sentence, which
                  repeats "<name> reached the expiry date for <assessment>" on every
                  row and pushes the useful words off the end. */}
              <p className="min-w-0 flex-1 truncate text-sm" title={item.message}>
                <span className="font-bold text-[var(--theme-heading)]">{item.candidateName}</span>
                <span className="text-[var(--theme-muted)]"> · {item.assessmentName}</span>
              </p>
              {/* Text stays in text tokens; the dot carries the colour. The state
                  hues land between 3.5:1 and 5.8:1 on the panel depending on the
                  theme, so colouring the label would fail AA for in_progress on
                  light and not_started on dark. */}
              <span className="shrink-0 text-xs tabular-nums text-[var(--theme-muted)]">
                {STATUS_META[item.status].label}
                <span className="text-[var(--theme-faint)]"> · {formatRelative(item.createdAt)}</span>
              </span>
            </Link>
          ))}
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
