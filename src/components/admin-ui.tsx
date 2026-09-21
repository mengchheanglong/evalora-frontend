"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { Icon, type IconName } from "@/components/icons";
import { formatPercentChange, formatRelativeTime, planLabel } from "@/lib/admin";
import type { AdminSortOrder, ServiceHealth, ServiceStatus, SessionStatus, SubscriptionPlan, UserRole } from "@/lib/types";

/**
 * Building blocks shared by the platform console pages under `/admin`.
 * Crafted with shadcn UI and Atlassian Design System standards:
 * - High visual hierarchy: prominent KPI metrics, clean typography, purposeful spacing.
 * - Atlassian-style lozenges: distinct, accessible status and role chips with light/dark fidelity.
 * - Data visualizations: smooth SVG sparklines with gradient area fills and interactive charts.
 * - Responsive data tables: sticky headers, sort chevrons, hover states, and slide-over drawers.
 */

export type Notice = { tone: "success" | "error"; text: string };

export const STATUS_META: Record<ServiceStatus, { label: string; pill: string; dot: string }> = {
  operational: {
    label: "Operational",
    pill: "border-emerald-200/80 bg-emerald-50 text-emerald-700 dark:border-emerald-800/60 dark:bg-emerald-950/40 dark:text-emerald-300",
    dot: "bg-emerald-500",
  },
  degraded: {
    label: "Degraded",
    pill: "border-amber-200/80 bg-amber-50 text-amber-700 dark:border-amber-800/60 dark:bg-amber-950/40 dark:text-amber-300",
    dot: "bg-amber-500",
  },
  unavailable: {
    label: "Unavailable",
    pill: "border-rose-200/80 bg-rose-50 text-rose-700 dark:border-rose-800/60 dark:bg-rose-950/40 dark:text-rose-300",
    dot: "bg-rose-500",
  },
};

export const SESSION_STATUS_META: Record<SessionStatus, { label: string; color: string }> = {
  not_started: { label: "Not started", color: "var(--color-state-not-started)" },
  in_progress: { label: "In progress", color: "var(--color-state-in-progress)" },
  completed: { label: "Completed", color: "var(--color-state-completed)" },
  expired: { label: "Expired", color: "var(--color-state-expired)" },
};

const SESSION_STATUS_ORDER: SessionStatus[] = ["not_started", "in_progress", "completed", "expired"];

/* ------------------------------------------------------------------ layout */

export function Panel({
  title,
  description,
  action,
  children,
  className = "",
}: {
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-panel)] p-5 sm:p-6 shadow-xs transition duration-200 hover:shadow-sm ${className}`}>
      <div className="flex flex-wrap items-start justify-between gap-3 pb-4 border-b border-[var(--theme-border)]/70">
        <div className="min-w-0">
          <h2 className="text-base sm:text-lg font-extrabold tracking-tight text-[var(--theme-heading)]">{title}</h2>
          {description ? <p className="mt-1 text-xs leading-relaxed text-[var(--theme-muted)]">{description}</p> : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--theme-muted)]">{children}</h3>
      {action}
    </div>
  );
}

/* ---------------------------------------------------------------- metrics */

/**
 * Compact trend for a metric card: smooth curve with gradient fill and endpoint dot.
 */
export function Sparkline({ values, color = "var(--color-chart-1)", label }: { values: number[]; color?: string; label: string }) {
  const gradientId = useId();
  if (!values.length) return null;
  const width = 124;
  const height = 38;
  const max = Math.max(1, ...values);
  const step = values.length > 1 ? width / (values.length - 1) : 0;
  const points = values.map((value, index) => [index * step, height - 4 - (value / max) * (height - 8)] as const);
  const line = points.map(([x, y], index) => `${index ? "L" : "M"} ${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
  const last = points[points.length - 1];
  const area = `${line} L ${last[0].toFixed(1)} ${height} L 0 ${height} Z`;

  return (
    <svg aria-label={label} className="block h-9 w-[124px] shrink-0 overflow-visible" role="img" viewBox={`0 0 ${width} ${height}`}>
      <defs>
        <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.28" />
          <stop offset="100%" stopColor={color} stopOpacity="0.0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gradientId})`} />
      <path d={line} fill="none" stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" />
      <circle cx={last[0]} cy={last[1]} fill={color} r="3" />
      <circle cx={last[0]} cy={last[1]} fill={color} opacity="0.3" r="6" />
    </svg>
  );
}

/**
 * Period-over-period change lozenge (Atlassian / shadcn style).
 */
export function DeltaBadge({
  changePct,
  goodWhen = "up",
  suffix = "vs. prev 30d",
}: {
  changePct: number | null;
  goodWhen?: "up" | "down" | "neutral";
  suffix?: string;
}) {
  if (changePct === null) return <span className="text-xs text-[var(--theme-faint)]">No prior baseline</span>;
  const direction = changePct > 0 ? "up" : changePct < 0 ? "down" : "flat";
  const isNeutral = direction === "flat" || (goodWhen as string) === "neutral";
  const isPositive = !isNeutral && (direction as string) === (goodWhen as string);
  const isNegative = !isNeutral && (direction as string) !== (goodWhen as string);

  const tone = isPositive
    ? "border-emerald-200/80 bg-emerald-50 text-emerald-700 dark:border-emerald-800/60 dark:bg-emerald-950/40 dark:text-emerald-400"
    : isNegative
      ? "border-rose-200/80 bg-rose-50 text-rose-700 dark:border-rose-800/60 dark:bg-rose-950/40 dark:text-rose-400"
      : "border-[var(--theme-border)] bg-[var(--theme-panel-soft)] text-[var(--theme-muted)]";

  const arrow = direction === "up" ? "↑" : direction === "down" ? "↓" : "→";

  return (
    <span className="inline-flex flex-wrap items-center gap-1.5 text-xs">
      <span className={`inline-flex items-center gap-0.5 rounded-full border px-2 py-0.5 font-bold tabular-nums shadow-2xs ${tone}`}>
        <span aria-hidden="true">{arrow}</span>
        <span>{formatPercentChange(changePct)}</span>
      </span>
      {suffix ? <span className="text-[var(--theme-muted)] font-medium truncate">{suffix}</span> : null}
    </span>
  );
}

/**
 * Primary KPI Metric card in shadcn / Tremor style:
 * Top: Subdued label + Refined Icon box
 * Middle: Large KPI stat value + Smooth Sparkline
 * Delta: Trend pill with comparison period
 * Bottom: Micro-detail breakdown
 */
export function MetricCard({
  label,
  value,
  detail,
  icon,
  color,
  sparkline,
  sparklineLabel,
  delta,
  href,
}: {
  label: string;
  value: ReactNode;
  detail: ReactNode;
  icon: IconName;
  color: string;
  sparkline?: number[];
  sparklineLabel?: string;
  delta?: ReactNode;
  href?: string;
}) {
  const body = (
    <div className="flex flex-col h-full justify-between">
      {/* Top Header */}
      <div>
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-bold uppercase tracking-wider text-[var(--theme-muted)] truncate">{label}</p>
          <div className="flex items-center gap-1.5">
            <span
              className="flex size-9 shrink-0 items-center justify-center rounded-xl border transition shadow-2xs"
              style={{
                color,
                backgroundColor: `color-mix(in srgb, ${color} 10%, var(--theme-panel-soft))`,
                borderColor: `color-mix(in srgb, ${color} 22%, var(--theme-border))`,
              }}
            >
              <Icon name={icon} size={17} />
            </span>
            {href ? (
              <Icon
                className="-rotate-90 shrink-0 text-[var(--theme-faint)] transition group-hover:text-[var(--theme-heading)] group-hover:translate-x-0.5"
                name="chevron"
                size={14}
              />
            ) : null}
          </div>
        </div>

        {/* Value + Sparkline */}
        <div className="mt-3.5 flex items-baseline justify-between gap-3">
          <div className="min-w-0">
            <p className="text-2xl sm:text-3xl font-extrabold tracking-tight tabular-nums text-[var(--theme-heading)]">{value}</p>
          </div>
          {sparkline?.length ? (
            <div className="shrink-0">
              <Sparkline color={color} label={sparklineLabel ?? `${label}, last 30 days`} values={sparkline} />
            </div>
          ) : null}
        </div>

        {delta ? <div className="mt-2.5">{delta}</div> : null}
      </div>

      {/* Footer Detail */}
      <div className="mt-4 pt-3 border-t border-[var(--theme-border)]/70 text-xs text-[var(--theme-muted)] leading-relaxed">
        {detail}
      </div>
    </div>
  );

  const containerClasses =
    "group relative block rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-panel)] p-5 sm:p-6 shadow-xs transition duration-200 hover:border-[var(--theme-border-strong)] hover:shadow-md";

  return href ? (
    <Link className={containerClasses} href={href}>
      {body}
    </Link>
  ) : (
    <article className={containerClasses}>{body}</article>
  );
}

export function StatTile({
  label,
  value,
  detail,
  status,
  trend,
  trendLabel,
}: {
  label: string;
  value: ReactNode;
  detail: string;
  status: ServiceStatus;
  trend?: number[];
  trendLabel?: string;
}) {
  return (
    <div className="rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-panel)] p-5 shadow-xs transition duration-200 hover:border-[var(--theme-border-strong)] hover:shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-bold uppercase tracking-wider text-[var(--theme-muted)]">{label}</p>
        <span className="flex items-center gap-1.5 text-xs font-semibold">
          <span aria-hidden="true" className={`size-2 rounded-full ${STATUS_META[status].dot}`} />
          <span className="text-xs font-bold text-[var(--theme-muted)]">{STATUS_META[status].label}</span>
        </span>
      </div>
      <div className="mt-2.5 flex items-baseline justify-between gap-2">
        <p className="text-xl sm:text-2xl font-extrabold tracking-tight text-[var(--theme-heading)] tabular-nums">{value}</p>
        {trend && trend.length > 1 ? <Sparkline color="var(--color-chart-1)" label={trendLabel ?? `${label} trend`} values={trend} /> : null}
      </div>
      <p className="mt-2 text-xs leading-relaxed text-[var(--theme-muted)]">{detail}</p>
    </div>
  );
}

export type ActivitySeriesOption = { key: string; label: string; values: number[]; color: string };

/**
 * ActivityChart with modern segmented control, SVG bar chart, and summary ribbon.
 */
export function ActivityChart({
  days,
  series,
  activeKey,
  onSelect,
}: {
  days: string[];
  series: ActivitySeriesOption[];
  activeKey?: string;
  onSelect: (key: string) => void;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const active = series.find((s) => s.key === activeKey) ?? series[0];
  if (!active || !days.length) return null;

  const width = 800;
  const height = 230;
  const padding = { top: 18, right: 12, bottom: 28, left: 36 };
  const plotW = width - padding.left - padding.right;
  const plotH = height - padding.top - padding.bottom;
  const niceMax = niceCeiling(Math.max(1, ...active.values));
  const slot = plotW / days.length;
  const barW = Math.max(3, slot * 0.64);
  const y = (value: number) => padding.top + plotH - (value / niceMax) * plotH;
  const ticks = Array.from(new Set([0, 0.25, 0.5, 0.75, 1].map((fraction) => Math.round(niceMax * fraction))));
  const total = active.values.reduce((sum, value) => sum + value, 0);
  const peakIndex = active.values.reduce((best, value, index) => (value > active.values[best] ? index : best), 0);
  const labelEvery = days.length > 14 ? 7 : days.length > 7 ? 2 : 1;
  const tooltipLeft = hover === null ? 0 : ((padding.left + (hover + 0.5) * slot) / width) * 100;

  return (
    <div>
      {/* Segmented Control Bar */}
      <div aria-label="Activity series" className="inline-flex flex-wrap gap-1 rounded-xl border border-[var(--theme-border)] bg-[var(--theme-panel-soft)] p-1 shadow-2xs" role="tablist">
        {series.map((option) => {
          const selected = option.key === active.key;
          return (
            <button
              aria-selected={selected}
              className={`flex h-8 items-center gap-2 rounded-lg px-3 text-xs font-semibold transition ${
                selected
                  ? "bg-[var(--theme-panel)] text-[var(--theme-heading)] shadow-xs border border-[var(--theme-border)]"
                  : "text-[var(--theme-muted)] hover:text-[var(--theme-heading)] hover:bg-[var(--theme-panel)]/50"
              }`}
              key={option.key}
              onClick={() => onSelect(option.key)}
              role="tab"
              type="button"
            >
              <span aria-hidden="true" className="size-2 rounded-full shadow-2xs" style={{ backgroundColor: option.color }} />
              <span>{option.label}</span>
              <span className="rounded-md bg-[var(--theme-panel-tint)] px-1.5 py-0.5 text-xs tabular-nums font-bold text-[var(--theme-muted)]">
                {option.values.reduce((sum, value) => sum + value, 0).toLocaleString()}
              </span>
            </button>
          );
        })}
      </div>

      <div className="relative mt-5">
        {hover !== null ? (
          <div
            className="pointer-events-none absolute top-1 z-10 -translate-x-1/2 rounded-xl border border-[var(--theme-border)] bg-[var(--theme-panel)] px-3 py-1.5 text-xs shadow-lg transition-all"
            style={{ left: `${tooltipLeft}%` }}
          >
            <span className="font-extrabold text-[var(--theme-heading)] tabular-nums">{active.values[hover].toLocaleString()}</span>{" "}
            <span className="text-[var(--theme-muted)] font-medium">
              {active.label.toLowerCase()} on {formatDayLabel(days[hover])}
            </span>
          </div>
        ) : null}

        <svg
          aria-label={`${active.label} per day, last ${days.length} days`}
          className="block h-auto w-full"
          onMouseLeave={() => setHover(null)}
          role="img"
          viewBox={`0 0 ${width} ${height}`}
        >
          {ticks.map((tick) => (
            <g key={tick}>
              <line stroke="var(--color-chart-grid)" strokeDasharray="3 3" strokeWidth="1" x1={padding.left} x2={width - padding.right} y1={y(tick)} y2={y(tick)} />
              <text fill="var(--theme-faint)" fontSize="11" textAnchor="end" x={padding.left - 8} y={y(tick) + 4}>
                {tick.toLocaleString()}
              </text>
            </g>
          ))}
          {days.map((day, index) => {
            const value = active.values[index] ?? 0;
            const x = padding.left + index * slot + (slot - barW) / 2;
            const barTop = value > 0 ? Math.min(y(value), padding.top + plotH - 2) : padding.top + plotH;
            const hovered = hover === index;
            return (
              <g key={day}>
                <rect
                  fill={active.color}
                  height={padding.top + plotH - barTop}
                  opacity={hover === null || hovered ? 1 : 0.35}
                  rx="3.5"
                  width={barW}
                  x={x}
                  y={barTop}
                />
                {index % labelEvery === 0 || index === days.length - 1 ? (
                  <text fill="var(--theme-faint)" fontSize="11" textAnchor="middle" x={x + barW / 2} y={height - 8}>
                    {formatDayLabel(day)}
                  </text>
                ) : null}
                <rect fill="transparent" height={plotH} onMouseEnter={() => setHover(index)} width={slot} x={padding.left + index * slot} y={padding.top} />
              </g>
            );
          })}
        </svg>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-[var(--theme-muted)] pt-3 border-t border-[var(--theme-border)]/70">
        <span className="font-medium">
          <span className="font-bold text-[var(--theme-heading)]">{total.toLocaleString()}</span> total
        </span>
        <span>•</span>
        <span className="font-medium">
          Peak of <span className="font-bold text-[var(--theme-heading)]">{active.values[peakIndex].toLocaleString()}</span> on {formatDayLabel(days[peakIndex])}
        </span>
        <span>•</span>
        <span className="font-medium">
          <span className="font-bold text-[var(--theme-heading)]">{(total / days.length).toFixed(1)}</span> / day avg
        </span>
      </div>

      <div className="sr-only">
        <table>
          <caption>{active.label} per day</caption>
          <tbody>
            {days.map((day, index) => (
              <tr key={day}>
                <th scope="row">{day}</th>
                <td>{active.values[index]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function niceCeiling(value: number): number {
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const normalized = value / magnitude;
  const step = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return Math.max(4, step * magnitude);
}

function formatDayLabel(iso: string): string {
  const date = new Date(`${iso}T00:00:00Z`);
  return Number.isNaN(date.getTime()) ? iso : date.toLocaleDateString(undefined, { month: "short", day: "numeric", timeZone: "UTC" });
}

/** Stacked bar of a workspace's sessions by lifecycle state */
export function SessionStatusBar({ counts }: { counts: Record<SessionStatus, number> }) {
  const total = SESSION_STATUS_ORDER.reduce((sum, status) => sum + counts[status], 0);
  return (
    <div>
      <div aria-hidden="true" className="flex h-2.5 w-full gap-1 overflow-hidden rounded-full bg-[var(--theme-panel-soft)]">
        {total > 0
          ? SESSION_STATUS_ORDER.filter((status) => counts[status] > 0).map((status) => (
              <span key={status} className="h-full rounded-full" style={{ width: `${(counts[status] / total) * 100}%`, backgroundColor: SESSION_STATUS_META[status].color }} />
            ))
          : null}
      </div>
      <ul className="mt-3.5 grid grid-cols-2 gap-x-4 gap-y-2 text-xs sm:grid-cols-4">
        {SESSION_STATUS_ORDER.map((status) => (
          <li className="flex items-center gap-2 text-[var(--theme-muted)]" key={status}>
            <span aria-hidden="true" className="size-2 rounded-full" style={{ backgroundColor: SESSION_STATUS_META[status].color }} />
            <span className="tabular-nums font-bold text-[var(--theme-heading)]">{counts[status].toLocaleString()}</span>
            <span>{SESSION_STATUS_META[status].label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ----------------------------------------------------------------- status */

export function StatusPill({ status }: { status: ServiceStatus }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-bold shadow-2xs ${STATUS_META[status].pill}`}>
      <span className={`size-1.5 rounded-full ${STATUS_META[status].dot}`} />
      {STATUS_META[status].label}
    </span>
  );
}

export function overallServiceStatus(services: ServiceHealth[]): ServiceStatus {
  if (services.some((service) => service.status === "unavailable")) return "unavailable";
  if (services.some((service) => service.status === "degraded")) return "degraded";
  return "operational";
}

/** Status-page style headline */
export function HealthBanner({ services, children }: { services: ServiceHealth[]; children?: ReactNode }) {
  const overall = overallServiceStatus(services);
  const degraded = services.filter((service) => service.status === "degraded").length;
  const unavailable = services.filter((service) => service.status === "unavailable").length;
  const headline =
    overall === "operational"
      ? "All systems operational"
      : overall === "unavailable"
        ? `${unavailable} ${unavailable === 1 ? "service is" : "services are"} unavailable`
        : `${degraded} ${degraded === 1 ? "service is" : "services are"} running on fallback`;

  const tone =
    overall === "operational"
      ? "border-emerald-200/80 bg-emerald-50/70 text-emerald-800 dark:border-emerald-800/60 dark:bg-emerald-950/40 dark:text-emerald-300"
      : overall === "unavailable"
        ? "border-rose-200/80 bg-rose-50/70 text-rose-800 dark:border-rose-800/60 dark:bg-rose-950/40 dark:text-rose-300"
        : "border-amber-200/80 bg-amber-50/70 text-amber-800 dark:border-amber-800/60 dark:bg-amber-950/40 dark:text-amber-300";

  return (
    <div className={`flex flex-wrap items-center justify-between gap-3 rounded-2xl border px-4 py-3 shadow-xs ${tone}`} role="status">
      <div className="flex items-center gap-2.5">
        <span aria-hidden="true" className={`size-2.5 rounded-full ${STATUS_META[overall].dot} animate-pulse`} />
        <p className="text-xs font-bold tracking-wide">{headline}</p>
      </div>
      <div className="flex items-center gap-3 text-xs font-semibold">{children}</div>
    </div>
  );
}

export function AccountStatusBadge({ suspended, since }: { suspended: boolean; since?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-0.5 text-xs font-bold tracking-wide shadow-2xs ${
        suspended
          ? "border-rose-200/80 bg-rose-50 text-rose-700 dark:border-rose-800/60 dark:bg-rose-950/40 dark:text-rose-300"
          : "border-emerald-200/80 bg-emerald-50 text-emerald-700 dark:border-emerald-800/60 dark:bg-emerald-950/40 dark:text-emerald-300"
      }`}
      title={suspended && since ? `Suspended ${formatDate(since)}` : undefined}
    >
      <span className={`size-1.5 rounded-full ${suspended ? "bg-rose-500" : "bg-emerald-500"}`} />
      {suspended ? "Suspended" : "Active"}
    </span>
  );
}

export function PlanBadge({ plan }: { plan: SubscriptionPlan }) {
  const tone =
    plan === "enterprise"
      ? "border-purple-200/80 bg-purple-50 text-purple-700 dark:border-purple-800/60 dark:bg-purple-950/40 dark:text-purple-300"
      : plan === "pro"
        ? "border-sky-200/80 bg-sky-50 text-sky-700 dark:border-sky-800/60 dark:bg-sky-950/40 dark:text-sky-300"
        : "border-[var(--theme-border)] bg-[var(--theme-panel-soft)] text-[var(--theme-text)]";
  return <span className={`inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-bold tracking-wide shadow-2xs ${tone}`}>{planLabel(plan)}</span>;
}

export function RoleBadge({ role, label }: { role: UserRole; label: string }) {
  const tone =
    role === "admin"
      ? "border-amber-200/80 bg-amber-50 text-amber-800 dark:border-amber-800/60 dark:bg-amber-950/40 dark:text-amber-300"
      : role === "organization"
        ? "border-violet-200/80 bg-violet-50 text-violet-700 dark:border-violet-800/60 dark:bg-violet-950/40 dark:text-violet-300"
        : role === "interviewer"
          ? "border-sky-200/80 bg-sky-50 text-sky-700 dark:border-sky-800/60 dark:bg-sky-950/40 dark:text-sky-300"
          : "border-[var(--theme-border)] bg-[var(--theme-panel-soft)] text-[var(--theme-muted)]";
  return <span className={`inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-bold tracking-wide shadow-2xs ${tone}`}>{label}</span>;
}

export function SessionStatusBadge({ status }: { status: SessionStatus }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md border border-[var(--theme-border)] bg-[var(--theme-panel-soft)] px-2.5 py-0.5 text-xs font-bold text-[var(--theme-text)] shadow-2xs">
      <span aria-hidden="true" className="size-1.5 rounded-full" style={{ backgroundColor: SESSION_STATUS_META[status].color }} />
      {SESSION_STATUS_META[status].label}
    </span>
  );
}

/**
 * Items an operator should act on (Atlassian Triage Lozenge style).
 */
export function AttentionStrip({
  items,
  systemStatus,
}: {
  items: Array<{ key: string; count: number; label: string; href: string; tone: "danger" | "warning" | "info" }>;
  systemStatus?: { label: string; href: string; status: ServiceStatus };
}) {
  const visible = items.filter((item) => item.count > 0);
  const statusElement = systemStatus ? (
    <Link
      className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--theme-border)] bg-[var(--theme-panel-soft)] px-3 py-1.5 text-xs font-bold text-[var(--theme-text)] transition hover:bg-[var(--theme-panel-tint)] hover:border-[var(--theme-border-strong)] shadow-2xs"
      href={systemStatus.href}
    >
      <span aria-hidden="true" className={`size-2 rounded-full ${STATUS_META[systemStatus.status].dot}`} />
      <span>{systemStatus.label}</span>
      <Icon className="-rotate-90 opacity-60" name="chevron" size={11} />
    </Link>
  ) : null;

  if (!visible.length) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-200/80 bg-emerald-50/50 px-4 py-3 text-xs font-semibold text-emerald-800 dark:border-emerald-800/60 dark:bg-emerald-950/30 dark:text-emerald-300" role="status">
        <div className="flex items-center gap-2.5">
          <Icon className="text-emerald-600 dark:text-emerald-400 shrink-0" name="check" size={16} />
          <span>All systems healthy · No immediate actions required across workspaces.</span>
        </div>
        {statusElement}
      </div>
    );
  }

  const tones = {
    danger: "border-rose-200 bg-rose-50 text-rose-800 hover:bg-rose-100 dark:border-rose-800/60 dark:bg-rose-950/40 dark:text-rose-300",
    warning: "border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100 dark:border-amber-800/60 dark:bg-amber-950/40 dark:text-amber-300",
    info: "border-sky-200 bg-sky-50 text-sky-800 hover:bg-sky-100 dark:border-sky-800/60 dark:bg-sky-950/40 dark:text-sky-300",
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-panel)] p-3.5 shadow-xs" role="region" aria-label="Needs attention">
      <div className="flex flex-wrap items-center gap-2.5">
        <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[var(--theme-muted)] px-1">
          <span className="size-2 rounded-full bg-amber-500 animate-pulse" />
          Needs Attention:
        </span>
        {visible.map((item) => (
          <Link className={`inline-flex h-7 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-semibold transition ${tones[item.tone]}`} href={item.href} key={item.key}>
            <span className="tabular-nums font-extrabold">{item.count.toLocaleString()}</span>
            <span>{item.label}</span>
            <Icon className="-rotate-90 opacity-60" name="chevron" size={10} />
          </Link>
        ))}
      </div>
      {statusElement}
    </div>
  );
}

/* ------------------------------------------------------------------ inputs */

export function SearchField({ label, placeholder, value, onChange }: { label: string; placeholder: string; value: string; onChange: (value: string) => void }) {
  return (
    <div className="relative flex-1 min-w-[220px] sm:max-w-[340px]">
      <span className="sr-only">{label}</span>
      <Icon className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--theme-muted)]" name="search" size={14} />
      <input
        className="h-9 w-full rounded-xl border border-[var(--theme-border)] bg-[var(--theme-panel)] pl-8 pr-8 text-xs font-medium text-[var(--theme-text)] outline-none placeholder:text-[var(--theme-muted)] transition hover:border-[var(--theme-border-strong)] focus:border-[var(--color-primary-500)] focus:ring-2 focus:ring-[var(--theme-ring)]"
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        type="search"
        value={value}
      />
      {value ? (
        <button
          aria-label="Clear search"
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--theme-muted)] hover:text-[var(--theme-heading)]"
          onClick={() => onChange("")}
          type="button"
        >
          <Icon name="x" size={13} />
        </button>
      ) : null}
    </div>
  );
}

export function FilterSelect({ label, value, onChange, children }: { label: string; value: string; onChange: (value: string) => void; children: ReactNode }) {
  return (
    <label className="flex items-center gap-1.5 text-xs font-semibold text-[var(--theme-muted)]">
      <span>{label}:</span>
      <select
        className="h-9 rounded-xl border border-[var(--theme-border)] bg-[var(--theme-panel)] px-2.5 text-xs font-medium text-[var(--theme-text)] outline-none transition hover:border-[var(--theme-border-strong)] focus:border-[var(--color-primary-500)] focus:ring-2 focus:ring-[var(--theme-ring)] cursor-pointer"
        onChange={(event) => onChange(event.target.value)}
        value={value}
      >
        {children}
      </select>
    </label>
  );
}

export function FilterChips({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: Array<{ value: string; label: string; count?: number }>;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div aria-label={label} className="inline-flex flex-wrap items-center gap-1 rounded-xl border border-[var(--theme-border)] bg-[var(--theme-panel-soft)] p-1 shadow-2xs" role="group">
      <span className="sr-only">{label}</span>
      {options.map((option) => {
        const selected = value === option.value;
        return (
          <button
            aria-pressed={selected}
            className={`h-7 rounded-lg px-2.5 text-xs font-semibold transition ${
              selected
                ? "bg-[var(--theme-panel)] text-[var(--theme-heading)] shadow-xs border border-[var(--theme-border)]"
                : "text-[var(--theme-muted)] hover:text-[var(--theme-heading)] hover:bg-[var(--theme-panel)]/40"
            }`}
            key={option.value || "all"}
            onClick={() => onChange(option.value)}
            type="button"
          >
            {option.label}
            {typeof option.count === "number" ? (
              <span className="ml-1.5 rounded-md bg-[var(--theme-panel-tint)] px-1.5 py-0.5 text-xs tabular-nums font-bold text-[var(--theme-muted)]">
                {option.count.toLocaleString()}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

export function SortableHeader<K extends string>({
  label,
  sortKey,
  sort,
  order,
  onSort,
  align = "left",
  className = "",
}: {
  label: string;
  sortKey: K;
  sort: K | "";
  order: AdminSortOrder;
  onSort: (key: K) => void;
  align?: "left" | "right";
  className?: string;
}) {
  const active = sort === sortKey;
  return (
    <th aria-sort={active ? (order === "asc" ? "ascending" : "descending") : "none"} className={`${align === "right" ? "text-right" : "text-left"} ${className}`} scope="col">
      <button
        className={`inline-flex items-center gap-1.5 rounded-lg px-1.5 py-1 text-xs font-bold transition-all active:scale-95 hover:text-[var(--theme-heading)] ${active ? "text-[var(--theme-heading)] font-extrabold" : "text-[var(--theme-muted)]"}`}
        onClick={() => onSort(sortKey)}
        type="button"
      >
        <span>{label}</span>
        <span aria-hidden="true" className={`text-xs transition ${active ? "text-[var(--color-primary-600)] opacity-100" : "opacity-30"}`}>
          {active && order === "asc" ? "▲" : "▼"}
        </span>
      </button>
    </th>
  );
}

export function Pagination({ page, totalPages, total, pageSize, onChange, disabled }: { page: number; totalPages: number; total: number; pageSize: number; onChange: (page: number) => void; disabled: boolean }) {
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--theme-border)] px-5 py-3.5 text-xs text-[var(--theme-muted)]">
      <span>{total === 0 ? "No results" : `Showing ${from.toLocaleString()}–${to.toLocaleString()} of ${total.toLocaleString()}`}</span>
      <div className="flex items-center gap-2">
        <button
          className="flex h-8 items-center gap-1 rounded-xl border border-[var(--theme-border)] bg-[var(--theme-panel)] px-3 text-xs font-semibold text-[var(--theme-text)] transition-all hover:bg-[var(--theme-panel-soft)] active:scale-95 disabled:active:scale-100 disabled:opacity-50 disabled:cursor-not-allowed shadow-2xs"
          disabled={disabled || page <= 1}
          onClick={() => onChange(page - 1)}
          type="button"
        >
          Previous
        </button>
        <span className="font-semibold text-[var(--theme-heading)] px-2">Page {page} of {totalPages || 1}</span>
        <button
          className="flex h-8 items-center gap-1 rounded-xl border border-[var(--theme-border)] bg-[var(--theme-panel)] px-3 text-xs font-semibold text-[var(--theme-text)] transition-all hover:bg-[var(--theme-panel-soft)] active:scale-95 disabled:active:scale-100 disabled:opacity-50 disabled:cursor-not-allowed shadow-2xs"
          disabled={disabled || page >= totalPages}
          onClick={() => onChange(page + 1)}
          type="button"
        >
          Next
        </button>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- loading */

export function SkeletonBlock({ className = "" }: { className?: string }) {
  return <span aria-hidden="true" className={`block animate-pulse rounded-xl bg-[var(--theme-panel-soft)] ${className}`} />;
}

/** Table placeholder with the real column rhythm */
export function SkeletonRows({ rows = 6, label = "Loading" }: { rows?: number; label?: string }) {
  const widths = ["w-40", "w-52", "w-16", "w-10", "w-10", "w-20", "w-14"];
  return (
    <div aria-busy="true" aria-label={label} className="divide-y divide-[var(--theme-border)]" role="status">
      {Array.from({ length: rows }, (_, row) => (
        <div className="flex items-center gap-6 px-5 py-4" key={row}>
          {widths.map((width, column) => (
            <SkeletonBlock className={`h-3 ${width} ${column > 2 ? "hidden md:block" : ""}`} key={column} />
          ))}
        </div>
      ))}
    </div>
  );
}

export function DrawerSkeleton() {
  return (
    <div className="space-y-6">
      <SkeletonBlock className="h-6 w-48" />
      <div className="grid grid-cols-2 gap-3">
        <SkeletonBlock className="h-16 rounded-xl" />
        <SkeletonBlock className="h-16 rounded-xl" />
      </div>
      <SkeletonBlock className="h-32 rounded-xl" />
    </div>
  );
}

/* ------------------------------------------------------------------ drawer */

/**
 * Slide-over sheet for detail inspection
 */
export function Drawer({
  open,
  title,
  subtitle,
  onClose,
  children,
  footer,
}: {
  open: boolean;
  title: ReactNode;
  subtitle?: ReactNode;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    closeRef.current?.focus();
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[55] flex justify-end">
      <button aria-label="Close details" className="absolute inset-0 bg-slate-950/40 backdrop-blur-xs transition-opacity" onClick={onClose} type="button" />
      <aside
        aria-labelledby={titleId}
        aria-modal="false"
        className="relative flex h-full w-full max-w-[580px] flex-col border-l border-[var(--theme-border)] bg-[var(--theme-panel)] shadow-2xl transition-transform animate-in slide-in-from-right duration-200"
        role="dialog"
      >
        <header className="flex items-start gap-3 border-b border-[var(--theme-border)] px-6 py-5 bg-[var(--theme-panel-soft)]/60">
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-lg font-extrabold tracking-tight text-[var(--theme-heading)]" id={titleId}>
              {title}
            </h2>
            {subtitle ? <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-[var(--theme-muted)]">{subtitle}</div> : null}
          </div>
          <button
            aria-label="Close details"
            className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-[var(--theme-border)] bg-[var(--theme-panel)] text-[var(--theme-muted)] transition-all hover:bg-[var(--theme-panel-soft)] hover:text-[var(--theme-heading)] shadow-2xs active:scale-95"
            onClick={onClose}
            ref={closeRef}
            type="button"
          >
            <Icon name="x" size={15} />
          </button>
        </header>
        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto p-6">{children}</div>
        {footer ? <footer className="border-t border-[var(--theme-border)] bg-[var(--theme-panel-tint)] px-6 py-4">{footer}</footer> : null}
      </aside>
    </div>
  );
}

export function DetailList({ items }: { items: Array<{ label: string; value: ReactNode }> }) {
  return (
    <dl className="grid grid-cols-[minmax(0,128px)_1fr] gap-x-4 gap-y-3 text-sm">
      {items.map((item) => (
        <div className="contents" key={item.label}>
          <dt className="text-xs font-semibold leading-5 text-[var(--theme-muted)]">{item.label}</dt>
          <dd className="min-w-0 leading-5 text-[var(--theme-text)] font-medium">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function DetailStat({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
  return (
    <div className="rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-panel-tint)] px-4 py-3.5 shadow-2xs">
      <p className="text-xs font-bold uppercase tracking-wider text-[var(--theme-muted)]">{label}</p>
      <p className="mt-1 text-xl font-extrabold leading-none tabular-nums text-[var(--theme-heading)]">{value}</p>
      {hint ? <p className="mt-1.5 text-xs text-[var(--theme-faint)]">{hint}</p> : null}
    </div>
  );
}

export function Avatar({ name, photo, size = 32 }: { name: string; photo?: string | null; size?: number }) {
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  return (
    <span
      className="flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-[var(--theme-border)] bg-[var(--theme-panel-soft)] text-xs font-bold text-[var(--theme-heading)] shadow-2xs"
      style={{ width: size, height: size }}
    >
      {photo ? <img alt="" className="size-full object-cover" src={photo} /> : <span>{initials}</span>}
    </span>
  );
}

export function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore
    }
  }

  return (
    <button
      className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--theme-border)] bg-[var(--theme-panel)] px-2.5 py-1 text-xs font-semibold text-[var(--theme-muted)] transition-all hover:bg-[var(--theme-panel-soft)] hover:text-[var(--theme-heading)] shadow-2xs active:scale-95"
      onClick={copy}
      title="Copy to clipboard"
      type="button"
    >
      <Icon name={copied ? "check" : "copy"} size={13} />
      <span>{copied ? "Copied" : label}</span>
    </button>
  );
}

export function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function RelativeTime({ iso }: { iso: string }) {
  const [now, setNow] = useState<number>(() => Date.now());

  useEffect(() => {
    const handle = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(handle);
  }, []);

  return (
    <time dateTime={iso} title={formatDate(iso)}>
      {formatRelativeTime(iso, now)}
    </time>
  );
}

export function useSecondsSince(timestamp: number | null): number {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    if (!timestamp) return;
    setSeconds(Math.max(0, Math.floor((Date.now() - timestamp) / 1000)));
    const handle = window.setInterval(() => {
      setSeconds(Math.max(0, Math.floor((Date.now() - timestamp) / 1000)));
    }, 1000);
    return () => window.clearInterval(handle);
  }, [timestamp]);

  return seconds;
}

export function useDebouncedValue<T>(value: T, delayMs = 300): T {
  const [debounced, setDebounced] = useState<T>(value);

  useEffect(() => {
    const handle = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(handle);
  }, [value, delayMs]);

  return debounced;
}
