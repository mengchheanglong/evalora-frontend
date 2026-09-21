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
import { Icon } from "@/components/icons";
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
        <span className="tabular-nums text-xs font-semibold text-[var(--theme-muted)]">
          {refreshing ? (
            <span className="inline-flex items-center gap-1.5 text-[var(--color-primary-600)] dark:text-[var(--color-primary-400)]">
              <Icon className="animate-spin" name="spinner" size={13} />
              Measuring…
            </span>
          ) : (
            `Measured ${secondsAgo}s ago`
          )}
        </span>
        <button
          aria-pressed={autoRefresh}
          className={`h-8 rounded-xl border px-3 text-xs font-bold transition shadow-2xs ${
            autoRefresh
              ? "border-[var(--color-primary-400)] bg-[var(--color-primary-50)] text-[var(--color-primary-700)] dark:border-[var(--color-primary-800)] dark:bg-[var(--color-primary-950)]/40 dark:text-[var(--color-primary-300)]"
              : "border-[var(--theme-border)] bg-[var(--theme-panel)] text-[var(--theme-muted)] hover:bg-[var(--theme-panel-soft)]"
          }`}
          onClick={toggleAutoRefresh}
          title={autoRefresh ? "Auto-refresh every 30 seconds is on" : "Auto-refresh is off"}
          type="button"
        >
          Auto-refresh {autoRefresh ? "ON" : "OFF"}
        </button>
        <button
          className="flex h-8 min-w-[124px] items-center justify-center gap-1.5 rounded-xl border border-[var(--theme-border)] bg-[var(--theme-panel)] px-3 text-xs font-bold text-[var(--theme-heading)] transition hover:bg-[var(--theme-panel-soft)] disabled:opacity-50 disabled:cursor-not-allowed shadow-2xs"
          disabled={refreshing}
          onClick={() => void load("refresh")}
          type="button"
        >
          <Icon className={refreshing ? "animate-spin" : ""} name={refreshing ? "spinner" : "refresh"} size={13} />
          <span>{refreshing ? "Measuring…" : "Measure now"}</span>
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
          detail={livekit?.note ?? livekit?.detail ?? "Live video & audio mesh network"}
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
        <Panel description="Each platform dependency and its operational readiness." title="Components & Services">
          <ul className="divide-y divide-[var(--theme-border)]/70 overflow-hidden rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-panel)] shadow-2xs">
            {health.services.map((service) => (
              <ServiceRow key={service.key} service={service} />
            ))}
          </ul>
        </Panel>

        <Panel description="Assessment work the platform has handled today, UTC." title="Workload & Volume">
          <dl className="space-y-2.5 text-xs">
            <WorkloadStat label="Active live sessions" value={health.workload.liveSessions.toLocaleString()} />
            <WorkloadStat label="Sessions today" value={`${health.workload.sessionsToday.toLocaleString()} started · ${health.workload.completedToday.toLocaleString()} finished`} />
            <WorkloadStat label="Code runs today" value={health.workload.codeSubmissionsToday.toLocaleString()} />
            <WorkloadStat label="Interviewer follow-ups" value={health.workload.interviewerQuestionsToday.toLocaleString()} />
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
    <li className="flex flex-wrap items-center gap-3 bg-[var(--theme-panel)] px-4 py-3.5 transition hover:bg-[var(--theme-panel-soft)]/50">
      <span aria-hidden="true" className={`size-2.5 shrink-0 rounded-full ${STATUS_META[service.status].dot} ${service.status !== "operational" ? "animate-pulse" : ""}`} />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-[var(--theme-heading)]">{service.name}</p>
        <p className="text-xs text-[var(--theme-muted)] mt-0.5">{service.note ?? service.detail}</p>
      </div>
      {typeof service.latencyMs === "number" && service.key !== "realtime" ? (
        <span className="rounded-lg border border-[var(--theme-border)] bg-[var(--theme-panel-soft)] px-2.5 py-1 text-xs font-mono font-bold tabular-nums text-[var(--theme-text)]">
          {formatLatency(service.latencyMs)}
        </span>
      ) : null}
      <StatusPill status={service.status} />
    </li>
  );
}

function WorkloadStat({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-[var(--theme-border)]/70 bg-[var(--theme-panel-soft)]/30 px-4 py-3 transition hover:bg-[var(--theme-panel-soft)]/60">
      <dt className="font-bold text-[var(--theme-muted)]">{label}</dt>
      <dd className="text-right font-semibold tabular-nums text-[var(--theme-heading)]">{value}</dd>
    </div>
  );
}

function HealthSkeleton() {
  return (
    <div aria-busy="true" aria-label="Measuring system health" className="space-y-5" role="status">
      <SkeletonBlock className="h-14 w-full rounded-2xl" />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <SkeletonBlock className="h-28 rounded-2xl" key={index} />
        ))}
      </div>
      <div className="grid gap-5 xl:grid-cols-[1.5fr_1fr]">
        <div className="rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-panel)] p-6">
          <SkeletonBlock className="h-4 w-32" />
          <div className="mt-4 space-y-2">
            {Array.from({ length: 6 }, (_, index) => (
              <SkeletonBlock className="h-12 rounded-xl" key={index} />
            ))}
          </div>
        </div>
        <div className="rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-panel)] p-6">
          <SkeletonBlock className="h-4 w-28" />
          <div className="mt-4 space-y-2.5">
            {Array.from({ length: 5 }, (_, index) => (
              <SkeletonBlock className="h-11 rounded-xl" key={index} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
