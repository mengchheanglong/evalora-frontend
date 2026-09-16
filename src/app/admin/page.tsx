"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
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
  STATUS_META,
  SkeletonBlock,
  StatTile,
  StatusPill,
  formatDate,
  useSecondsSince,
} from "@/components/admin-ui";
import { ErrorState, InlineAlert } from "@/components/ui-states";
import { ADMIN_PLANS, formatLatency, formatUptime, formatUsd, getAdminOverview, listAdminOrganizations } from "@/lib/admin";
import { getErrorMessage } from "@/lib/api";
import { ADMIN_HOME } from "@/lib/auth-routes";
import type { AdminOrganization, AdminOverview, ServiceHealth } from "@/lib/types";

const LEGACY_SECTION_HASHES = new Set(["organizations", "users"]);
const AUTO_REFRESH_MS = 30_000;
const AUTO_REFRESH_KEY = "evalora-admin-autorefresh";
const LATENCY_HISTORY = 20;

type SeriesKey = "sessionsStarted" | "sessionsCompleted" | "newUsers" | "newOrganizations" | "billableTurns";

const SERIES: Array<{ key: SeriesKey; label: string; color: string }> = [
  { key: "sessionsStarted", label: "Sessions started", color: "var(--color-chart-1)" },
  { key: "sessionsCompleted", label: "Sessions completed", color: "#10b981" },
  { key: "newUsers", label: "New accounts", color: "#0ea5e9" },
  { key: "newOrganizations", label: "New workspaces", color: "#8b5cf6" },
  { key: "billableTurns", label: "Billable AI turns", color: "#f59e0b" },
];

export default function AdminOverviewPage() {
  const router = useRouter();

  // The console used to keep its sections in the URL hash (/admin#users).
  // Those sections now have real routes, so forward old links once on arrival.
  useEffect(() => {
    const section = window.location.hash.replace(/^#/, "");
    if (LEGACY_SECTION_HASHES.has(section)) router.replace(`${ADMIN_HOME}/${section}`);
  }, [router]);

  return (
    <AdminShell active="overview" description="What changed in the last 30 days, what needs attention, and whether the platform is healthy right now." title="Usage & Cost">
      <OverviewPanel />
    </AdminShell>
  );
}

function OverviewPanel() {
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [recent, setRecent] = useState<AdminOrganization[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [loadedAt, setLoadedAt] = useState<number | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [latencyHistory, setLatencyHistory] = useState<number[]>([]);
  const [series, setSeries] = useState<SeriesKey>("sessionsStarted");
  const inFlight = useRef(false);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(AUTO_REFRESH_KEY);
      if (stored === "off") setAutoRefresh(false);
    } catch {
      // storage unavailable: keep the default
    }
  }, []);

  const load = useCallback(async (mode: "initial" | "refresh" = "refresh") => {
    if (inFlight.current) return;
    inFlight.current = true;
    if (mode === "initial") setLoading(true);
    else setRefreshing(true);
    setError("");
    try {
      const [nextOverview, recentPage] = await Promise.all([
        getAdminOverview(),
        listAdminOrganizations({ sort: "createdAt", order: "desc", pageSize: 5 }).catch(() => null),
      ]);
      setOverview(nextOverview);
      if (recentPage) setRecent(recentPage.items);
      setLoadedAt(Date.now());
      const latency = nextOverview.systemHealth.services.find((service) => service.key === "database")?.latencyMs;
      if (typeof latency === "number") setLatencyHistory((history) => [...history, latency].slice(-LATENCY_HISTORY));
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      inFlight.current = false;
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load("initial");
  }, [load]);

  // Health is measured on request, so the panel re-measures itself while the
  // tab is visible; nothing runs in a background tab.
  useEffect(() => {
    if (!autoRefresh) return;
    const tick = () => {
      if (document.visibilityState === "visible") void load("refresh");
    };
    const handle = window.setInterval(tick, AUTO_REFRESH_MS);
    document.addEventListener("visibilitychange", tick);
    return () => {
      window.clearInterval(handle);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [autoRefresh, load]);

  function toggleAutoRefresh() {
    setAutoRefresh((current) => {
      const next = !current;
      try {
        window.localStorage.setItem(AUTO_REFRESH_KEY, next ? "on" : "off");
      } catch {
        // ignore
      }
      return next;
    });
  }

  if (loading && !overview) return <OverviewSkeleton />;
  if (!overview) return <ErrorState message={error || "Platform usage is unavailable right now."} onRetry={() => void load("initial")} />;

  const { organizations, users, sessions, ai, activity, comparisons, attention, systemHealth } = overview;
  const providerLabel = ai.provider === "deepseek" ? (ai.model ? `Live model · ${ai.model}` : "Live model") : "Fallback only · nothing is billed";

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
          detail={`Projected ${formatUsd(ai.projectedMonthCostUsd)} by month end · ${formatUsd(ai.estimatedCostUsd.allTime)} all-time · ${ai.provider === "deepseek" ? "estimate" : "fallback provider, nothing billed"}`}
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

        <SystemHealthPanel
          autoRefresh={autoRefresh}
          health={systemHealth}
          latencyHistory={latencyHistory}
          loadedAt={loadedAt}
          onRefresh={() => void load("refresh")}
          onToggleAutoRefresh={toggleAutoRefresh}
          refreshing={refreshing}
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-3">
        <Panel description={providerLabel} title="AI cost">
          <div className="grid grid-cols-2 gap-3">
            <CostStat label="Month to date" value={formatUsd(ai.estimatedCostUsd.thisMonth)} hint={`since ${formatDate(overview.monthStart)}`} />
            <CostStat label="Projected month end" value={formatUsd(ai.projectedMonthCostUsd)} hint="linear from days elapsed" />
            <CostStat label="Cost per turn" value={formatUsd(ai.costPerTurnUsd)} hint="AI_COST_PER_TURN_USD" />
            <CostStat label="All-time" value={formatUsd(ai.estimatedCostUsd.allTime)} hint={`${(ai.billableTurns.allTime + ai.draftGenerations.allTime).toLocaleString()} billable units`} />
          </div>
          <UsageBreakdown
            rows={[
              { label: "Billable interview turns", month: ai.billableTurns.thisMonth, allTime: ai.billableTurns.allTime, color: "#f59e0b" },
              { label: "Template draft generations", month: ai.draftGenerations.thisMonth, allTime: ai.draftGenerations.allTime, color: "#8b5cf6" },
              { label: "Fallback turns (free)", month: Math.max(0, ai.interviewTurns.thisMonth - ai.billableTurns.thisMonth), allTime: Math.max(0, ai.interviewTurns.allTime - ai.billableTurns.allTime), color: "var(--theme-faint)" },
            ]}
          />
          <p className="mt-3 text-xs leading-5 text-[var(--theme-faint)]">{ai.methodology}</p>
        </Panel>

        <Panel description={`${organizations.paidSubscriptions.toLocaleString()} active paid subscriptions · ${organizations.newThisMonth.toLocaleString()} new this month`} title="Subscription plans">
          <div className="space-y-3">
            {ADMIN_PLANS.map((plan) => {
              const count = organizations.byPlan[plan];
              const share = organizations.total ? (count / organizations.total) * 100 : 0;
              return (
                <Link className="block rounded-[8px] border border-[var(--theme-border)] p-3 transition hover:border-[var(--theme-border-strong)] hover:bg-[var(--theme-panel-tint)]" href={`${ADMIN_HOME}/organizations?plan=${plan}`} key={plan}>
                  <div className="flex items-center justify-between gap-3">
                    <PlanBadge plan={plan} />
                    <span className="text-sm font-extrabold tabular-nums text-[var(--theme-heading)]">
                      {count.toLocaleString()} <span className="text-xs font-semibold text-[var(--theme-muted)]">{count === 1 ? "workspace" : "workspaces"}</span>
                    </span>
                  </div>
                  <div aria-hidden="true" className="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--theme-panel-soft)]">
                    <div className="h-full rounded-full bg-[var(--color-chart-1)]" style={{ width: `${share}%` }} />
                  </div>
                  <p className="mt-1 text-xs text-[var(--theme-faint)]">{share.toFixed(0)}% of all workspaces</p>
                </Link>
              );
            })}
          </div>
        </Panel>

        <Panel action={<Link className="text-xs font-bold text-[var(--color-primary-700)] hover:text-[var(--color-primary-600)]" href={`${ADMIN_HOME}/organizations`}>View all</Link>} description="Newest workspaces on the platform." title="Recently joined">
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

function CostStat({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-[8px] border border-[var(--theme-border)] bg-[var(--theme-panel-tint)] px-3 py-2.5">
      <p className="text-xs font-bold text-[var(--theme-muted)]">{label}</p>
      <p className="mt-1 text-lg font-extrabold leading-none tabular-nums text-[var(--theme-heading)]">{value}</p>
      <p className="mt-1 truncate text-[11px] text-[var(--theme-faint)]">{hint}</p>
    </div>
  );
}

function UsageBreakdown({ rows }: { rows: Array<{ label: string; month: number; allTime: number; color: string }> }) {
  const monthTotal = rows.reduce((sum, row) => sum + row.month, 0);
  return (
    <div className="mt-4">
      <div aria-hidden="true" className="flex h-2.5 w-full gap-0.5 overflow-hidden rounded-full bg-[var(--theme-panel-soft)]">
        {monthTotal > 0
          ? rows.filter((row) => row.month > 0).map((row) => <span key={row.label} className="h-full rounded-sm" style={{ width: `${(row.month / monthTotal) * 100}%`, backgroundColor: row.color }} />)
          : null}
      </div>
      <dl className="mt-2 space-y-1.5 text-xs">
        {rows.map((row) => (
          <div className="flex items-center gap-2" key={row.label}>
            <span aria-hidden="true" className="size-2 shrink-0 rounded-full" style={{ backgroundColor: row.color }} />
            <dt className="flex-1 text-[var(--theme-muted)]">{row.label}</dt>
            <dd className="tabular-nums font-bold text-[var(--theme-heading)]">{row.month.toLocaleString()}</dd>
            <dd className="w-20 text-right tabular-nums text-[var(--theme-faint)]">{row.allTime.toLocaleString()} all-time</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function SystemHealthPanel({
  health,
  latencyHistory,
  loadedAt,
  refreshing,
  autoRefresh,
  onRefresh,
  onToggleAutoRefresh,
}: {
  health: AdminOverview["systemHealth"];
  latencyHistory: number[];
  loadedAt: number | null;
  refreshing: boolean;
  autoRefresh: boolean;
  onRefresh: () => void;
  onToggleAutoRefresh: () => void;
}) {
  const database = health.services.find((service) => service.key === "database");
  const livekit = health.services.find((service) => service.key === "livekit");
  const secondsAgo = useSecondsSince(loadedAt);

  return (
    <Panel description="Every value is measured when the page asks for it; nothing here is cached." title="System health">
      <HealthBanner services={health.services}>
        <span className="tabular-nums text-[var(--theme-muted)]">{refreshing ? "Measuring…" : `Measured ${secondsAgo}s ago`}</span>
        <button
          aria-pressed={autoRefresh}
          className={`h-7 rounded-full border px-2.5 text-[11px] font-bold transition ${autoRefresh ? "border-[var(--color-primary-400)] bg-[var(--color-primary-50)] text-[var(--color-primary-700)]" : "border-[var(--theme-border)] bg-[var(--theme-panel)] text-[var(--theme-muted)]"}`}
          onClick={onToggleAutoRefresh}
          title={autoRefresh ? "Auto-refresh every 30 seconds is on" : "Auto-refresh is off"}
          type="button"
        >
          Auto {autoRefresh ? "on" : "off"}
        </button>
        <button className="button-secondary h-7 min-h-0 rounded-full px-2.5 text-[11px]" disabled={refreshing} onClick={onRefresh} type="button">
          Measure now
        </button>
      </HealthBanner>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <StatTile
          detail={database ? `${STATUS_META[database.status].label}${latencyHistory.length > 1 ? ` · ${latencyHistory.length} recent samples` : ""}` : "Not reported"}
          label="Database latency"
          status={database?.status ?? "unavailable"}
          trend={latencyHistory}
          trendLabel="Database round-trip over recent measurements"
          value={formatLatency(database?.latencyMs)}
        />
        <StatTile detail={livekit?.note ?? livekit?.detail ?? "Live video and screen share"} label="LiveKit WebRTC" status={livekit?.status ?? "unavailable"} value={livekit ? STATUS_META[livekit.status].label : "Not reported"} />
        <StatTile detail={`Node ${health.process.nodeVersion} · ${health.process.rssMb} MB RSS · ${health.process.heapUsedMb} MB heap`} label="API uptime" status="operational" value={formatUptime(health.process.uptimeSeconds)} />
        <StatTile
          detail={`${health.realtime.activeSessionRooms.toLocaleString()} live ${health.realtime.activeSessionRooms === 1 ? "room" : "rooms"} · ${health.realtime.joinSuccessRate}% join success`}
          label="WebSocket connections"
          status={health.realtime.rejectedJoins > health.realtime.joins ? "degraded" : "operational"}
          value={health.realtime.connectedSockets.toLocaleString()}
        />
      </div>

      <ul className="mt-4 divide-y divide-[var(--theme-border)] overflow-hidden rounded-[8px] border border-[var(--theme-border)]">
        {health.services.map((service) => (
          <ServiceRow key={service.key} service={service} />
        ))}
      </ul>

      <dl className="mt-4 grid gap-3 text-xs sm:grid-cols-3">
        <WorkloadStat label="Live sessions" value={health.workload.liveSessions.toLocaleString()} />
        <WorkloadStat label="Today" value={`${health.workload.sessionsToday} started · ${health.workload.completedToday} completed`} />
        <WorkloadStat label="Code and follow-ups" value={`${health.workload.codeSubmissionsToday} runs · ${health.workload.interviewerQuestionsToday} questions`} />
      </dl>
    </Panel>
  );
}

function ServiceRow({ service }: { service: ServiceHealth }) {
  return (
    <li className="flex flex-wrap items-center gap-3 bg-[var(--theme-panel)] px-4 py-3">
      <span aria-hidden="true" className={`size-2.5 shrink-0 rounded-full ${STATUS_META[service.status].dot}`} />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-[var(--theme-heading)]">{service.name}</p>
        <p className="text-xs text-[var(--theme-muted)]">{service.note ?? service.detail}</p>
      </div>
      {typeof service.latencyMs === "number" && service.key !== "realtime" ? (
        <span className="text-xs tabular-nums text-[var(--theme-muted)]">{formatLatency(service.latencyMs)}</span>
      ) : null}
      <StatusPill status={service.status} />
    </li>
  );
}

function WorkloadStat({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-[8px] border border-[var(--theme-border)] px-3 py-2.5">
      <dt className="font-bold text-[var(--theme-muted)]">{label}</dt>
      <dd className="mt-0.5 font-semibold text-[var(--theme-heading)]">{value}</dd>
    </div>
  );
}

function OverviewSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading platform usage" className="space-y-5" role="status">
      <SkeletonBlock className="h-10 w-full max-w-[520px]" />
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
          <SkeletonBlock className="mt-4 h-10 w-full" />
          <div className="mt-4 grid grid-cols-2 gap-3">
            <SkeletonBlock className="h-20" />
            <SkeletonBlock className="h-20" />
            <SkeletonBlock className="h-20" />
            <SkeletonBlock className="h-20" />
          </div>
        </div>
      </div>
    </div>
  );
}
