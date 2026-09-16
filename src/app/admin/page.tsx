"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { AdminShell } from "@/components/admin-shell";
import { Panel, PlanBadge, STATUS_META, StatTile, StatusPill, formatDate } from "@/components/admin-ui";
import { OverviewCard } from "@/components/overview-card";
import { ErrorState, InlineAlert, PageLoader } from "@/components/ui-states";
import { ADMIN_PLANS, formatLatency, formatUptime, formatUsd, getAdminOverview } from "@/lib/admin";
import { getErrorMessage } from "@/lib/api";
import type { AdminOverview, ServiceHealth } from "@/lib/types";

const LEGACY_SECTION_HASHES = new Set(["organizations", "users"]);

export default function AdminOverviewPage() {
  const router = useRouter();

  // The console used to keep its sections in the URL hash (/admin#users).
  // Those sections now have real routes, so forward old links once on arrival.
  useEffect(() => {
    const section = window.location.hash.replace(/^#/, "");
    if (LEGACY_SECTION_HASHES.has(section)) router.replace(`/admin/${section}`);
  }, [router]);

  return (
    <AdminShell active="overview" description="Platform totals, estimated AI spend, and live infrastructure health across every workspace." title="Usage & Cost">
      <OverviewPanel />
    </AdminShell>
  );
}

function OverviewPanel() {
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setOverview(await getAdminOverview());
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading && !overview) return <PageLoader label="Loading platform usage" />;
  if (!overview) return <ErrorState message={error || "Platform usage is unavailable right now."} onRetry={() => void load()} />;

  const { organizations, users, sessions, ai, systemHealth } = overview;
  const providerLabel = ai.provider === "deepseek" ? (ai.model ? `Live model · ${ai.model}` : "Live model") : "Fallback only · nothing billed";

  return (
    <div className="space-y-5">
      {error ? <InlineAlert tone="warning">{error} Showing the last successful snapshot.</InlineAlert> : null}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <OverviewCard
          accent="var(--color-chart-1)"
          detail={`${organizations.active.toLocaleString()} active · ${organizations.suspended.toLocaleString()} suspended · ${organizations.paidSubscriptions.toLocaleString()} paid`}
          icon="globe"
          label="Organizations"
          tone="text-[var(--color-chart-1)]"
          value={organizations.total.toLocaleString()}
        />
        <OverviewCard
          accent="#0ea5e9"
          detail={`${users.byRole.organization.toLocaleString()} owners · ${users.byRole.interviewer.toLocaleString()} interviewers · ${users.byRole.candidate.toLocaleString()} candidates`}
          icon="users"
          label="Users"
          tone="text-sky-600"
          value={users.total.toLocaleString()}
        />
        <OverviewCard
          accent="#8b5cf6"
          detail={`${sessions.completedThisMonth.toLocaleString()} completed · ${sessions.live.toLocaleString()} live now · ${sessions.total.toLocaleString()} all-time`}
          icon="message"
          label="Sessions this month"
          tone="text-violet-600"
          value={sessions.thisMonth.toLocaleString()}
        />
        <OverviewCard
          accent="#f59e0b"
          detail={`${formatUsd(ai.estimatedCostUsd.allTime)} all-time · ${ai.billableTurns.thisMonth.toLocaleString()} billable turns this month`}
          emphasis={ai.provider === "deepseek" ? "default" : "quiet"}
          icon="sparkle"
          label="DeepSeek cost"
          status={ai.provider === "deepseek" ? "estimate" : "fallback"}
          tone="text-amber-600"
          value={formatUsd(ai.estimatedCostUsd.thisMonth)}
        />
      </section>

      <div className="grid gap-5 xl:grid-cols-[1.45fr_1fr]">
        <SystemHealthPanel health={systemHealth} onRefresh={() => void load()} refreshing={loading} />
        <div className="space-y-5">
          <Panel description={providerLabel} title="AI usage">
            <dl className="divide-y divide-[var(--theme-border)] text-sm">
              <UsageRow label="Interview turns" window={ai.interviewTurns} hint="Every assistant turn persisted for candidate interviews" />
              <UsageRow label="Billable turns" window={ai.billableTurns} hint="Turns the configured model actually generated" />
              <UsageRow label="Template draft generations" window={ai.draftGenerations} hint="AI-assisted drafts produced by the model" />
              <div className="flex items-start justify-between gap-4 py-2.5">
                <dt className="text-[var(--theme-muted)]">Cost per turn</dt>
                <dd className="font-bold tabular-nums text-[var(--theme-heading)]">{formatUsd(ai.costPerTurnUsd)}</dd>
              </div>
            </dl>
            <p className="mt-3 text-xs leading-5 text-[var(--theme-faint)]">{ai.methodology} Month figures start {formatDate(overview.monthStart)}.</p>
          </Panel>

          <Panel description={`${organizations.paidSubscriptions.toLocaleString()} active paid subscriptions · ${organizations.newThisMonth.toLocaleString()} new this month`} title="Subscription plans">
            <div className="grid grid-cols-3 gap-3">
              {ADMIN_PLANS.map((plan) => (
                <div className="rounded-[8px] border border-[var(--theme-border)] bg-[var(--theme-panel-tint)] p-3" key={plan}>
                  <PlanBadge plan={plan} />
                  <p className="mt-2 text-2xl font-extrabold leading-none tabular-nums text-[var(--theme-heading)]">{organizations.byPlan[plan].toLocaleString()}</p>
                  <p className="mt-1 text-xs text-[var(--theme-muted)]">{organizations.byPlan[plan] === 1 ? "workspace" : "workspaces"}</p>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}

function UsageRow({ label, hint, window }: { label: string; hint: string; window: { allTime: number; thisMonth: number } }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5">
      <dt>
        <span className="block text-[var(--theme-text)]">{label}</span>
        <span className="block text-xs text-[var(--theme-faint)]">{hint}</span>
      </dt>
      <dd className="text-right">
        <span className="block font-bold tabular-nums text-[var(--theme-heading)]">{window.thisMonth.toLocaleString()}</span>
        <span className="block text-xs tabular-nums text-[var(--theme-muted)]">{window.allTime.toLocaleString()} all-time</span>
      </dd>
    </div>
  );
}

function SystemHealthPanel({ health, onRefresh, refreshing }: { health: AdminOverview["systemHealth"]; onRefresh: () => void; refreshing: boolean }) {
  const database = health.services.find((service) => service.key === "database");
  const livekit = health.services.find((service) => service.key === "livekit");

  return (
    <Panel
      action={
        <button className="button-secondary h-9 min-h-0 rounded-[7px] px-3 text-xs" disabled={refreshing} onClick={onRefresh} type="button">
          {refreshing ? "Measuring…" : "Measure again"}
        </button>
      }
      description={`Measured on request at ${new Date(health.capturedAt).toLocaleTimeString()}. Nothing here is cached.`}
      title="System health"
    >
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile detail={database ? STATUS_META[database.status].label : "Not reported"} label="Database latency" status={database?.status ?? "unavailable"} value={formatLatency(database?.latencyMs)} />
        <StatTile detail={livekit?.note ?? livekit?.detail ?? "Live video and screen share"} label="LiveKit WebRTC" status={livekit?.status ?? "unavailable"} value={livekit ? STATUS_META[livekit.status].label : "Not reported"} />
        <StatTile detail={`Node ${health.process.nodeVersion} · ${health.process.rssMb} MB RSS · ${health.process.heapUsedMb} MB heap`} label="Server uptime" status="operational" value={formatUptime(health.process.uptimeSeconds)} />
        <StatTile detail={`${health.realtime.activeSessionRooms.toLocaleString()} live room(s) · ${health.realtime.joinSuccessRate}% join success`} label="WebSocket connections" status={health.realtime.rejectedJoins > health.realtime.joins ? "degraded" : "operational"} value={health.realtime.connectedSockets.toLocaleString()} />
      </div>

      <ul className="mt-4 divide-y divide-[var(--theme-border)] overflow-hidden rounded-[8px] border border-[var(--theme-border)]">
        {health.services.map((service) => (
          <ServiceRow key={service.key} service={service} />
        ))}
      </ul>

      <dl className="mt-4 grid gap-3 text-xs sm:grid-cols-3">
        <WorkloadStat label="Live sessions" value={health.workload.liveSessions} />
        <WorkloadStat label="Sessions today" value={`${health.workload.sessionsToday} started · ${health.workload.completedToday} completed`} />
        <WorkloadStat label="Code runs today" value={`${health.workload.codeSubmissionsToday} runs · ${health.workload.interviewerQuestionsToday} interviewer questions`} />
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
