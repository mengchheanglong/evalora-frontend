"use client";

import { useCallback, useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { Icon } from "@/components/icons";
import { ErrorState, PageLoader } from "@/components/ui-states";
import { apiGet, getErrorMessage } from "@/lib/api";

const REFRESH_MS = 10_000;

type ServiceStatus = "operational" | "degraded" | "unavailable";

interface SystemHealth {
  capturedAt: string;
  realtime: {
    connectedSockets: number;
    activeSessionRooms: number;
    connections: number;
    disconnects: number;
    joins: number;
    rejectedJoins: number;
    eventsEmitted: number;
    uptimeSeconds: number;
    joinSuccessRate: number;
  };
  workload: {
    liveSessions: number;
    sessionsToday: number;
    completedToday: number;
    codeSubmissionsToday: number;
    interviewerQuestionsToday: number;
  };
  services: Array<{ key: string; name: string; detail: string; status: ServiceStatus; latencyMs?: number; note?: string }>;
  process: { uptimeSeconds: number; heapUsedMb: number; rssMb: number; nodeVersion: string };
}

const STATUS_STYLE: Record<ServiceStatus, { label: string; chip: string; dot: string }> = {
  operational: { label: "Operational", chip: "bg-emerald-50 text-emerald-700", dot: "bg-emerald-500" },
  degraded: { label: "Degraded", chip: "bg-amber-50 text-amber-700", dot: "bg-amber-500" },
  unavailable: { label: "Unavailable", chip: "bg-rose-50 text-rose-700", dot: "bg-rose-500" },
};

/**
 * Operational dashboard: live WebSocket transport stats, today's workload, and
 * dependency health. Auto-refreshes while the tab is visible.
 */
export default function SystemActivityPage() {
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      setHealth(await apiGet<SystemHealth>("/analytics/system-health"));
      setError("");
    } catch (requestError) {
      setError(getErrorMessage(requestError, "Unable to load system activity."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void load();
    }, REFRESH_MS);
    return () => window.clearInterval(timer);
  }, [load]);

  return (
    <AppShell
      active="system"
      description="Live transport, workload, and dependency health for this deployment."
      title="System Activity"
    >
      {loading ? <PageLoader label="Reading system metrics" /> : null}
      {!loading && error && !health ? <ErrorState message={error} onRetry={() => void load()} /> : null}
      {health ? (
        <div className="space-y-4">
          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Metric
              detail={`${health.realtime.activeSessionRooms} active session room(s)`}
              icon="message"
              label="Live sockets"
              tone="primary"
              value={health.realtime.connectedSockets}
            />
            <Metric
              detail={`${health.workload.sessionsToday} created today`}
              icon="clock"
              label="Sessions in progress"
              tone="primary"
              value={health.workload.liveSessions}
            />
            <Metric
              detail={`${health.realtime.joins} join(s), ${health.realtime.rejectedJoins} rejected`}
              icon="check"
              label="Join success rate"
              tone={health.realtime.joinSuccessRate >= 99 ? "success" : "warning"}
              value={`${health.realtime.joinSuccessRate}%`}
            />
            <Metric
              detail={`${health.realtime.connections} connect(s) · ${health.realtime.disconnects} drop(s)`}
              icon="trend"
              label="Events delivered"
              tone="success"
              value={health.realtime.eventsEmitted}
            />
          </section>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(280px,0.85fr)]">
            <section className="card rounded-xl border-[var(--theme-border)] p-4 shadow-[var(--shadow-card)]">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-bold text-[var(--theme-heading)]">Service health</h2>
                  <p className="mt-0.5 text-xs text-[var(--theme-muted)]">Measured on each refresh — latency is a real round trip.</p>
                </div>
                <span className="text-[10px] text-[var(--theme-faint)]">
                  updated {new Date(health.capturedAt).toLocaleTimeString()}
                </span>
              </div>
              <div className="divide-y divide-[var(--theme-border)]">
                {health.services.map((service) => {
                  const style = STATUS_STYLE[service.status];
                  return (
                    <div className="flex flex-wrap items-center gap-3 py-3" key={service.key}>
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-bold text-[var(--theme-heading)]">{service.name}</p>
                        <p className="mt-0.5 text-[11px] text-[var(--theme-muted)]">{service.note ?? service.detail}</p>
                      </div>
                      {typeof service.latencyMs === "number" ? (
                        <span className="text-[11px] font-bold text-[var(--theme-muted)]">{service.latencyMs} ms</span>
                      ) : null}
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold ${style.chip}`}>
                        <span className={`size-1.5 rounded-full ${style.dot}`} /> {style.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </section>

            <div className="space-y-4">
              <section className="card rounded-xl border-[var(--theme-border)] p-4 shadow-[var(--shadow-card)]">
                <h2 className="text-base font-bold text-[var(--theme-heading)]">Today&apos;s workload</h2>
                <dl className="mt-3 space-y-2 text-xs">
                  <Row label="Assessments started" value={health.workload.sessionsToday} />
                  <Row label="Completed" value={health.workload.completedToday} />
                  <Row label="Code submissions" value={health.workload.codeSubmissionsToday} />
                  <Row label="Interviewer questions" value={health.workload.interviewerQuestionsToday} />
                </dl>
              </section>

              <section className="card rounded-xl border-[var(--theme-border)] p-4 shadow-[var(--shadow-card)]">
                <h2 className="text-base font-bold text-[var(--theme-heading)]">Runtime</h2>
                <dl className="mt-3 space-y-2 text-xs">
                  <Row label="API uptime" value={formatUptime(health.process.uptimeSeconds)} />
                  <Row label="Gateway uptime" value={formatUptime(health.realtime.uptimeSeconds)} />
                  <Row label="Heap used" value={`${health.process.heapUsedMb} MB`} />
                  <Row label="Resident memory" value={`${health.process.rssMb} MB`} />
                  <Row label="Node" value={health.process.nodeVersion} />
                </dl>
              </section>
            </div>
          </div>
        </div>
      ) : null}
    </AppShell>
  );
}

function Metric({
  label,
  value,
  detail,
  icon,
  tone,
}: {
  label: string;
  value: number | string;
  detail: string;
  icon: "message" | "clock" | "check" | "trend";
  tone: "primary" | "success" | "warning";
}) {
  const toneClass =
    tone === "success"
      ? "bg-emerald-50 text-emerald-600"
      : tone === "warning"
        ? "bg-amber-50 text-amber-600"
        : "bg-[var(--color-primary-50)] text-[var(--color-primary-600)]";
  return (
    <article className="card grid grid-cols-[38px_minmax(0,1fr)] items-start gap-3 rounded-xl border-[var(--theme-border)] p-4 shadow-[var(--shadow-card)]">
      <span className={`grid size-9 place-items-center rounded-lg ${toneClass}`}>
        <Icon name={icon} size={17} />
      </span>
      <span className="min-w-0">
        <span className="block text-[11px] font-semibold text-[var(--theme-muted)]">{label}</span>
        <span className="mt-1 block text-xl font-bold leading-none text-[var(--theme-heading)]">{value}</span>
        <span className="mt-1.5 block text-[10px] leading-4 text-[var(--theme-faint)]">{detail}</span>
      </span>
    </article>
  );
}

function Row({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-[var(--theme-border)] pb-2 last:border-0 last:pb-0">
      <dt className="text-[var(--theme-muted)]">{label}</dt>
      <dd className="font-bold text-[var(--theme-heading)]">{value}</dd>
    </div>
  );
}

function formatUptime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3_600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  return `${Math.floor(seconds / 3_600)}h ${Math.floor((seconds % 3_600) / 60)}m`;
}
