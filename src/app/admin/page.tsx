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
  HealthBanner,
  MetricCard,
  Panel,
  PlanBadge,
  RelativeTime,
  SkeletonBlock,
  formatDate,
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
  { key: "sessionsCompleted", label: "Sessions completed", color: "#10b981" },
  { key: "newUsers", label: "New accounts", color: "#0ea5e9" },
  { key: "newOrganizations", label: "New workspaces", color: "#8b5cf6" },
  { key: "billableTurns", label: "Billable AI turns", color: "#f59e0b" },
];

/**
 * The console's landing page. It answers "what needs me, what changed, where do
 * I go next" and nothing else: AI spend detail lives on `/admin/costs` and the
 * live service readings live on `/admin/health`. Each headline here links to
 * the page that owns the detail, so this page never has to poll.
 */
export default function AdminOverviewPage() {
  const router = useRouter();

  // The console used to keep its sections in the URL hash (/admin#users).
  // Those sections now have real routes, so forward old links once on arrival.
  useEffect(() => {
    const section = window.location.hash.replace(/^#/, "");
    if (LEGACY_SECTION_HASHES.has(section)) router.replace(`${ADMIN_HOME}/${section}`);
  }, [router]);

  return (
    <AdminShell active="overview" description="What needs attention, what changed in the last 30 days, and where to go next." title="Overview">
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
    <div className="space-y-5">
      {error ? <InlineAlert tone="warning">{error} Showing the last successful snapshot.</InlineAlert> : null}

      <AttentionStrip
        items={[
          { key: "suspended-orgs", count: attention.suspendedOrganizations, label: attention.suspendedOrganizations === 1 ? "suspended workspace" : "suspended workspaces", href: `${ADMIN_HOME}/organizations?status=suspended`, tone: "danger" },
          { key: "suspended-users", count: attention.suspendedUsers, label: attention.suspendedUsers === 1 ? "deactivated account" : "deactivated accounts", href: `${ADMIN_HOME}/users?status=suspended`, tone: "danger" },
          { key: "no-owner", count: attention.workspacesWithoutOwner, label: attention.workspacesWithoutOwner === 1 ? "workspace without an owner" : "workspaces without an owner", href: `${ADMIN_HOME}/organizations?sort=name&order=asc`, tone: "warning" },
          { key: "unverified", count: attention.unverifiedStaff, label: attention.unverifiedStaff === 1 ? "unverified staff account" : "unverified staff accounts", href: `${ADMIN_HOME}/users?role=organization`, tone: "warning" },
          { key: "live", count: attention.liveSessions, label: attention.liveSessions === 1 ? "interview live right now" : "interviews live right now", href: `${ADMIN_HOME}/organizations?sort=sessions&order=desc`, tone: "info" },
        ]}
      />

      {/* Summary only. The per-service readings and their live re-measurement belong to /admin/health. */}
      <HealthBanner services={systemHealth.services}>
        <Link className="inline-flex items-center gap-1 font-bold underline decoration-current/40 underline-offset-2 hover:decoration-current" href={`${ADMIN_HOME}/health`}>
          System health
          <Icon className="-rotate-90" name="chevron" size={13} />
        </Link>
      </HealthBanner>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          color="var(--color-chart-1)"
          delta={<DeltaBadge changePct={comparisons.newOrganizations.changePct} suffix={`new · ${comparisons.newOrganizations.current.toLocaleString()} joined in 30 days`} />}
          detail={`${organizations.active.toLocaleString()} active · ${organizations.suspended.toLocaleString()} suspended · ${organizations.paidSubscriptions.toLocaleString()} on a paid plan`}
          href={`${ADMIN_HOME}/organizations`}
          icon="globe"
          label="Organizations"
          sparkline={activity.newOrganizations}
          sparklineLabel="New workspaces per day, last 30 days"
          value={organizations.total.toLocaleString()}
        />
        <MetricCard
          color="#0ea5e9"
          delta={<DeltaBadge changePct={comparisons.newUsers.changePct} suffix={`new · ${comparisons.newUsers.current.toLocaleString()} joined in 30 days`} />}
          detail={`${users.byRole.organization.toLocaleString()} owners · ${users.byRole.interviewer.toLocaleString()} interviewers · ${users.byRole.candidate.toLocaleString()} candidates · ${users.byRole.admin.toLocaleString()} admins`}
          href={`${ADMIN_HOME}/users`}
          icon="users"
          label="Users"
          sparkline={activity.newUsers}
          sparklineLabel="New accounts per day, last 30 days"
          value={users.total.toLocaleString()}
        />
        <MetricCard
          color="#8b5cf6"
          delta={<DeltaBadge changePct={comparisons.sessionsStarted.changePct} />}
          detail={`${comparisons.sessionsCompleted.current.toLocaleString()} completed in 30 days · ${sessions.live.toLocaleString()} live now · ${sessions.total.toLocaleString()} all-time`}
          icon="message"
          label="Sessions started, 30 days"
          sparkline={activity.sessionsStarted}
          sparklineLabel="Sessions started per day, last 30 days"
          value={comparisons.sessionsStarted.current.toLocaleString()}
        />
        <MetricCard
          color="#f59e0b"
          delta={<DeltaBadge changePct={comparisons.billableTurns.changePct} goodWhen="neutral" suffix="billable turns vs. previous 30 days" />}
          detail={`Projected ${formatUsd(ai.projectedMonthCostUsd)} by month end · ${ai.provider === "deepseek" ? "estimate" : "fallback provider, nothing billed"}`}
          href={`${ADMIN_HOME}/costs`}
          icon="sparkle"
          label="AI spend, month to date"
          sparkline={activity.billableTurns}
          sparklineLabel="Billable AI turns per day, last 30 days"
          value={formatUsd(ai.estimatedCostUsd.thisMonth)}
        />
      </section>

      <div className="grid gap-5 xl:grid-cols-[1.5fr_1fr]">
        <Panel description={`Daily counts for ${formatDate(`${activity.days[0]}T00:00:00Z`)} to ${formatDate(`${activity.days[activity.days.length - 1]}T00:00:00Z`)}, UTC.`} title="Platform activity, last 30 days">
          <ActivityChart
            activeKey={series}
            days={activity.days}
            onSelect={(key) => setSeries(key as SeriesKey)}
            series={SERIES.map((option) => ({ ...option, values: activity[option.key] }))}
          />
        </Panel>

        <Panel
          action={<Link className="text-xs font-bold text-[var(--color-primary-700)] hover:text-[var(--color-primary-600)]" href={`${ADMIN_HOME}/organizations`}>View all</Link>}
          description="Newest workspaces on the platform."
          title="Recently joined"
        >
          {recent.length ? (
            <ul className="divide-y divide-[var(--theme-border)]">
              {recent.map((organization) => (
                <li key={organization.id}>
                  <Link className="flex items-center gap-3 py-2.5 transition hover:bg-[var(--theme-panel-tint)]" href={`${ADMIN_HOME}/organizations?open=${encodeURIComponent(organization.id)}`}>
                    <span className="grid size-9 shrink-0 place-items-center rounded-[8px] border border-[var(--theme-border)] bg-[var(--theme-panel-soft)] text-xs font-black text-[var(--theme-heading)]">
                      {organization.name.slice(0, 2).toUpperCase()}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-bold text-[var(--theme-heading)]">{organization.name}</span>
                      <span className="block truncate text-xs text-[var(--theme-muted)]">{organization.owner?.email ?? "No owner account"} · <RelativeTime iso={organization.createdAt} /></span>
                    </span>
                    {organization.isSuspended ? <AccountStatusBadge suspended /> : <PlanBadge plan={organization.plan} />}
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-[var(--theme-muted)]">No workspaces yet.</p>
          )}
        </Panel>
      </div>
    </div>
  );
}

function OverviewSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading platform overview" className="space-y-5" role="status">
      <SkeletonBlock className="h-10 w-full max-w-[520px]" />
      <SkeletonBlock className="h-12 w-full" />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div className="card rounded-[10px] p-4" key={index}>
            <SkeletonBlock className="h-3 w-24" />
            <SkeletonBlock className="mt-4 h-8 w-20" />
            <SkeletonBlock className="mt-3 h-3 w-32" />
            <SkeletonBlock className="mt-3 h-3 w-full" />
          </div>
        ))}
      </div>
      <div className="grid gap-5 xl:grid-cols-[1.5fr_1fr]">
        <div className="card rounded-[10px] p-5">
          <SkeletonBlock className="h-4 w-48" />
          <SkeletonBlock className="mt-6 h-[220px] w-full" />
        </div>
        <div className="card rounded-[10px] p-5">
          <SkeletonBlock className="h-4 w-32" />
          <div className="mt-4 space-y-3">
            {Array.from({ length: 5 }, (_, index) => (
              <SkeletonBlock className="h-10" key={index} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
