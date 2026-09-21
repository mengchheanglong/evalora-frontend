"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { AdminShell } from "@/components/admin-shell";
import {
  AccountStatusBadge,
  ActivityChart,
  AttentionStrip,
  DeltaBadge,
  MetricCard,
  Panel,
  PlanBadge,
  RelativeTime,
  SkeletonBlock,
  formatDate,
  overallServiceStatus,
} from "@/components/admin-ui";
import { Icon } from "@/components/icons";
import { ErrorState, InlineAlert } from "@/components/ui-states";
import { formatUsd, getAdminOverview, listAdminOrganizations } from "@/lib/admin";
import { getErrorMessage } from "@/lib/api";
import { ADMIN_HOME } from "@/lib/auth-routes";
import type { AdminOrganization, AdminOverview } from "@/lib/types";

const LEGACY_SECTION_HASHES = new Set(["organizations", "users"]);
const RECENT_LIMIT = 5;

type SeriesKey = "sessionsStarted" | "sessionsCompleted" | "newUsers" | "newOrganizations" | "billableTurns";

const SERIES: Array<{ key: SeriesKey; label: string; color: string }> = [
  { key: "sessionsStarted", label: "Sessions started", color: "var(--color-chart-1)" },
  { key: "sessionsCompleted", label: "Sessions completed", color: "var(--color-status-good)" },
  { key: "newUsers", label: "New accounts", color: "var(--color-primary-600)" },
  { key: "newOrganizations", label: "New workspaces", color: "var(--color-chart-3)" },
  { key: "billableTurns", label: "Billable AI turns", color: "var(--color-chart-2)" },
];

/**
 * The console's landing page. Designed with shadcn UI and Atlassian Design principles:
 * - High-impact KPI metric cards with sparkline gradients.
 * - Mission-control Attention triage strip with direct filter links.
 * - Interactive 30-day activity bar chart with multi-series switching.
 * - Recently joined workspaces directory with direct detail drawer access.
 */
export default function AdminOverviewPage() {
  const router = useRouter();

  useEffect(() => {
    const section = window.location.hash.replace(/^#/, "");
    if (LEGACY_SECTION_HASHES.has(section)) router.replace(`${ADMIN_HOME}/${section}`);
  }, [router]);

  return (
    <AdminShell
      active="overview"
      description="What needs attention, 30-day activity trends across workspaces, and live platform operations."
      title="Platform Overview"
    >
      <OverviewPanel />
    </AdminShell>
  );
}

function OverviewPanel() {
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [recent, setRecent] = useState<AdminOrganization[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [series, setSeries] = useState<SeriesKey>("sessionsStarted");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [nextOverview, recentPage] = await Promise.all([
        getAdminOverview(),
        listAdminOrganizations({ sort: "createdAt", order: "desc", pageSize: RECENT_LIMIT }).catch(() => null),
      ]);
      setOverview(nextOverview);
      if (recentPage) setRecent(recentPage.items);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading && !overview) return <OverviewSkeleton />;
  if (!overview) return <ErrorState message={error || "Platform usage is unavailable right now."} onRetry={() => void load()} />;

  const { organizations, users, sessions, ai, activity, comparisons, attention, systemHealth } = overview;

  return (
    <div className="space-y-6">
      {error ? <InlineAlert tone="warning">{error} Showing the last successful snapshot.</InlineAlert> : null}

      {/* Needs Attention Triage & Operational Health Strip */}
      <AttentionStrip
        items={[
          {
            key: "suspended-orgs",
            count: attention.suspendedOrganizations,
            label: attention.suspendedOrganizations === 1 ? "suspended workspace" : "suspended workspaces",
            href: `${ADMIN_HOME}/organizations?status=suspended`,
            tone: "danger",
          },
          {
            key: "suspended-users",
            count: attention.suspendedUsers,
            label: attention.suspendedUsers === 1 ? "deactivated account" : "deactivated accounts",
            href: `${ADMIN_HOME}/users?status=suspended`,
            tone: "danger",
          },
          {
            key: "no-owner",
            count: attention.workspacesWithoutOwner,
            label: attention.workspacesWithoutOwner === 1 ? "workspace without an owner" : "workspaces without an owner",
            href: `${ADMIN_HOME}/organizations?sort=name&order=asc`,
            tone: "warning",
          },
          {
            key: "unverified",
            count: attention.unverifiedStaff,
            label: attention.unverifiedStaff === 1 ? "unverified staff account" : "unverified staff accounts",
            href: `${ADMIN_HOME}/users?role=organization`,
            tone: "warning",
          },
          {
            key: "live",
            count: attention.liveSessions,
            label: attention.liveSessions === 1 ? "interview live right now" : "interviews live right now",
            href: `${ADMIN_HOME}/organizations?sort=sessions&order=desc`,
            tone: "info",
          },
        ]}
        systemStatus={{
          label: overallServiceStatus(systemHealth.services) === "operational" ? "All Systems Operational" : "Service Issue Detected",
          href: `${ADMIN_HOME}/health`,
          status: overallServiceStatus(systemHealth.services),
        }}
      />

      {/* Primary KPI Metrics Grid */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          color="var(--color-chart-1)"
          delta={<DeltaBadge changePct={comparisons.newOrganizations.changePct} suffix={`new · ${comparisons.newOrganizations.current.toLocaleString()} joined in 30d`} />}
          detail={`${organizations.active.toLocaleString()} active · ${organizations.suspended.toLocaleString()} suspended · ${organizations.paidSubscriptions.toLocaleString()} on a paid plan`}
          href={`${ADMIN_HOME}/organizations`}
          icon="globe"
          label="Total Workspaces"
          sparkline={activity.newOrganizations}
          sparklineLabel="New workspaces per day, last 30 days"
          value={organizations.total.toLocaleString()}
        />
        <MetricCard
          color="var(--color-primary-600)"
          delta={<DeltaBadge changePct={comparisons.newUsers.changePct} suffix={`new · ${comparisons.newUsers.current.toLocaleString()} joined in 30d`} />}
          detail={`${users.byRole.organization.toLocaleString()} owners · ${users.byRole.interviewer.toLocaleString()} interviewers · ${users.byRole.candidate.toLocaleString()} candidates`}
          href={`${ADMIN_HOME}/users`}
          icon="users"
          label="Total Users"
          sparkline={activity.newUsers}
          sparklineLabel="New accounts per day, last 30 days"
          value={users.total.toLocaleString()}
        />
        <MetricCard
          color="var(--color-chart-3)"
          delta={<DeltaBadge changePct={comparisons.sessionsStarted.changePct} />}
          detail={`${comparisons.sessionsCompleted.current.toLocaleString()} completed in 30d · ${sessions.live.toLocaleString()} live now · ${sessions.total.toLocaleString()} all-time`}
          icon="message"
          label="Sessions Started (30d)"
          sparkline={activity.sessionsStarted}
          sparklineLabel="Sessions started per day, last 30 days"
          value={comparisons.sessionsStarted.current.toLocaleString()}
        />
        <MetricCard
          color="var(--color-chart-2)"
          delta={<DeltaBadge changePct={comparisons.billableTurns.changePct} goodWhen="neutral" suffix="billable turns vs. prev 30d" />}
          detail={`Projected ${formatUsd(ai.projectedMonthCostUsd)} by month end · ${ai.provider === "deepseek" ? "estimate" : "fallback"}`}
          href={`${ADMIN_HOME}/costs`}
          icon="sparkle"
          label="AI Spend (MTD)"
          sparkline={activity.billableTurns}
          sparklineLabel="Billable AI turns per day, last 30 days"
          value={formatUsd(ai.estimatedCostUsd.thisMonth)}
        />
      </section>

      {/* Main Charts & Directory Breakdown */}
      <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <Panel
          description={`Daily counts from ${formatDate(`${activity.days[0]}T00:00:00Z`)} to ${formatDate(`${activity.days[activity.days.length - 1]}T00:00:00Z`)} (UTC).`}
          title="Platform Activity Trends (30 Days)"
        >
          <ActivityChart
            activeKey={series}
            days={activity.days}
            onSelect={(key) => setSeries(key as SeriesKey)}
            series={SERIES.map((option) => ({ ...option, values: activity[option.key] }))}
          />
        </Panel>

        <Panel
          action={
            <Link className="inline-flex items-center gap-1 text-xs font-bold text-[var(--color-primary-700)] dark:text-[var(--color-primary-300)] hover:underline" href={`${ADMIN_HOME}/organizations`}>
              <span>View all workspaces</span>
              <Icon className="-rotate-90" name="chevron" size={12} />
            </Link>
          }
          description="Newest organizations joining the platform."
          title="Recently Joined Workspaces"
        >
          {recent.length ? (
            <ul className="divide-y divide-[var(--theme-border)]/70">
              {recent.map((organization) => (
                <li key={organization.id}>
                  <Link
                    className="group flex items-center gap-3 py-3 transition hover:bg-[var(--theme-panel-tint)] -mx-2 px-2 rounded-xl"
                    href={`${ADMIN_HOME}/organizations?open=${encodeURIComponent(organization.id)}`}
                  >
                    <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-[var(--theme-border)] bg-[var(--theme-panel-soft)] text-xs font-extrabold text-[var(--theme-heading)] shadow-2xs group-hover:border-[var(--color-primary-400)] transition">
                      {organization.name.slice(0, 2).toUpperCase()}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-bold text-[var(--theme-heading)] group-hover:text-[var(--color-primary-600)] transition">
                        {organization.name}
                      </span>
                      <span className="block truncate text-xs text-[var(--theme-muted)]">
                        {organization.owner?.email ?? "No owner account"} · <RelativeTime iso={organization.createdAt} />
                      </span>
                    </span>
                    <div className="flex items-center gap-2 shrink-0">
                      {organization.isSuspended ? <AccountStatusBadge suspended /> : <PlanBadge plan={organization.plan} />}
                      <Icon className="-rotate-90 text-[var(--theme-faint)] group-hover:text-[var(--theme-heading)] group-hover:translate-x-0.5 transition" name="chevron" size={13} />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <div className="py-8 text-center text-xs text-[var(--theme-muted)]">
              No workspaces registered yet.
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}

function OverviewSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading platform overview" className="space-y-6" role="status">
      <SkeletonBlock className="h-12 w-full" />
      <SkeletonBlock className="h-12 w-full" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div className="rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-panel)] p-6 space-y-3" key={index}>
            <SkeletonBlock className="h-4 w-28" />
            <SkeletonBlock className="h-8 w-24" />
            <SkeletonBlock className="h-3 w-32" />
            <SkeletonBlock className="h-3 w-full" />
          </div>
        ))}
      </div>
      <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <div className="rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-panel)] p-6 space-y-4">
          <SkeletonBlock className="h-5 w-56" />
          <SkeletonBlock className="h-[220px] w-full" />
        </div>
        <div className="rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-panel)] p-6 space-y-4">
          <SkeletonBlock className="h-5 w-40" />
          <div className="space-y-3">
            {Array.from({ length: 5 }, (_, index) => (
              <SkeletonBlock className="h-12 w-full" key={index} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
