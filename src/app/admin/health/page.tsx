"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { AdminShell } from "@/components/admin-shell";
import {
  HealthBanner,
  Panel,
  STATUS_META,
  SkeletonBlock,
  StatTile,
  StatusPill,
  useSecondsSince,
} from "@/components/admin-ui";
import { ErrorState, InlineAlert } from "@/components/ui-states";
import { formatLatency, formatUptime, getAdminOverview } from "@/lib/admin";
import { getErrorMessage } from "@/lib/api";
import type { AdminOverview, ServiceHealth } from "@/lib/types";

const AUTO_REFRESH_MS = 30_000;
const AUTO_REFRESH_KEY = "evalora-admin-autorefresh";
const LATENCY_HISTORY = 20;

/**
 * The only console page that polls. Every reading here is measured when the
 * request arrives rather than cached, so it re-measures on a timer while the
 * tab is visible and keeps a short client-side latency history to show the
 * shape of recent samples. Cost and directory pages read the same payload but
 * hold monthly aggregates, so they load once.
 */
export default function AdminHealthPage() {
  return (
    <AdminShell
      active="health"
      description="Live service readings for the platform. Every value is measured when this page asks for it; nothing here is cached."
      title="System health"
    >
      <HealthPanel />
    </AdminShell>
  );
}

function HealthPanel() {
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [loadedAt, setLoadedAt] = useState<number | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [latencyHistory, setLatencyHistory] = useState<number[]>([]);
  const inFlight = useRef(false);
  const secondsAgo = useSecondsSince(loadedAt);

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
      const next = await getAdminOverview();
      setOverview(next);
      setLoadedAt(Date.now());
      const latency = next.systemHealth.services.find((service) => service.key === "database")?.latencyMs;
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

  // Nothing runs in a background tab: the interval checks visibility, and
  // returning to the tab triggers a fresh measurement immediately.
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

  if (loading && !overview) return <HealthSkeleton />;
  if (!overview) return <ErrorState message={error || "System health is unavailable right now."} onRetry={() => void load("initial")} />;

  const health = overview.systemHealth;
  const database = health.services.find((service) => service.key === "database");
  const livekit = health.services.find((service) => service.key === "livekit");

  return (
    <div className="space-y-5">
      {error ? <InlineAlert tone="warning">{error} Showing the last successful measurement.</InlineAlert> : null}

      <HealthBanner services={health.services}>
        <span className="tabular-nums text-[var(--theme-muted)]">{refreshing ? "Measuring…" : `Measured ${secondsAgo}s ago`}</span>
        <button
          aria-pressed={autoRefresh}
          className={`h-7 rounded-full border px-2.5 text-[11px] font-bold transition ${autoRefresh ? "border-[var(--color-primary-400)] bg-[var(--color-primary-50)] text-[var(--color-primary-700)]" : "border-[var(--theme-border)] bg-[var(--theme-panel)] text-[var(--theme-muted)]"}`}
          onClick={toggleAutoRefresh}
          title={autoRefresh ? "Auto-refresh every 30 seconds is on" : "Auto-refresh is off"}
          type="button"
        >
          Auto {autoRefresh ? "on" : "off"}
        </button>
        <button className="button-secondary h-7 min-h-0 rounded-full px-2.5 text-[11px]" disabled={refreshing} onClick={() => void load("refresh")} type="button">
          Measure now
        </button>
      </HealthBanner>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          detail={database ? `${STATUS_META[database.status].label}${latencyHistory.length > 1 ? ` · ${latencyHistory.length} recent samples` : ""}` : "Not reported"}
          label="Database latency"
          status={database?.status ?? "unavailable"}
          trend={latencyHistory}
          trendLabel="Database round-trip over recent measurements"
          value={formatLatency(database?.latencyMs)}
        />
        <StatTile
          detail={livekit?.note ?? livekit?.detail ?? "Live video and screen share"}
          label="LiveKit WebRTC"
          status={livekit?.status ?? "unavailable"}
          value={livekit ? STATUS_META[livekit.status].label : "Not reported"}
        />
        <StatTile
          detail={`Node ${health.process.nodeVersion} · ${health.process.rssMb} MB RSS · ${health.process.heapUsedMb} MB heap`}
          label="API uptime"
          status="operational"
          value={formatUptime(health.process.uptimeSeconds)}
        />
        <StatTile
          detail={`${health.realtime.activeSessionRooms.toLocaleString()} live ${health.realtime.activeSessionRooms === 1 ? "room" : "rooms"} · ${health.realtime.joinSuccessRate}% join success`}
          label="WebSocket connections"
          status={health.realtime.rejectedJoins > health.realtime.joins ? "degraded" : "operational"}
          value={health.realtime.connectedSockets.toLocaleString()}
        />
      </section>

      <div className="grid gap-5 xl:grid-cols-[1.5fr_1fr]">
        <Panel description="Each dependency the API needs, and what happens when it is missing." title="Components">
          <ul className="divide-y divide-[var(--theme-border)] overflow-hidden rounded-[8px] border border-[var(--theme-border)]">
            {health.services.map((service) => (
              <ServiceRow key={service.key} service={service} />
            ))}
          </ul>
        </Panel>

        <Panel description="Assessment work the platform has handled today, UTC." title="Workload">
          <dl className="space-y-3 text-xs">
            <WorkloadStat label="Live sessions" value={health.workload.liveSessions.toLocaleString()} />
            <WorkloadStat label="Sessions today" value={`${health.workload.sessionsToday.toLocaleString()} started · ${health.workload.completedToday.toLocaleString()} completed`} />
            <WorkloadStat label="Code runs today" value={health.workload.codeSubmissionsToday.toLocaleString()} />
            <WorkloadStat label="Interviewer follow-ups today" value={health.workload.interviewerQuestionsToday.toLocaleString()} />
            <WorkloadStat
              label="Realtime joins"
              value={`${health.realtime.joins.toLocaleString()} accepted · ${health.realtime.rejectedJoins.toLocaleString()} rejected`}
            />
          </dl>
        </Panel>
      </div>
    </div>
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
    <div className="flex items-center justify-between gap-3 rounded-[8px] border border-[var(--theme-border)] px-3 py-2.5">
      <dt className="font-bold text-[var(--theme-muted)]">{label}</dt>
      <dd className="text-right font-semibold tabular-nums text-[var(--theme-heading)]">{value}</dd>
    </div>
  );
}

function HealthSkeleton() {
  return (
    <div aria-busy="true" aria-label="Measuring system health" className="space-y-5" role="status">
      <SkeletonBlock className="h-12 w-full" />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <SkeletonBlock className="h-24" key={index} />
        ))}
      </div>
      <div className="grid gap-5 xl:grid-cols-[1.5fr_1fr]">
        <div className="card rounded-[10px] p-5">
          <SkeletonBlock className="h-4 w-32" />
          <div className="mt-4 space-y-2">
            {Array.from({ length: 6 }, (_, index) => (
              <SkeletonBlock className="h-12" key={index} />
            ))}
          </div>
        </div>
        <div className="card rounded-[10px] p-5">
          <SkeletonBlock className="h-4 w-28" />
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
