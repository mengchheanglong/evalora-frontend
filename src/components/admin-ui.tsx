"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { Icon, type IconName } from "@/components/icons";
import { formatPercentChange, formatRelativeTime, planLabel } from "@/lib/admin";
import type { AdminSortOrder, ServiceHealth, ServiceStatus, SessionStatus, SubscriptionPlan, UserRole } from "@/lib/types";

/**
 * Building blocks shared by the platform console pages under `/admin`.
 * They follow the same rules as the workspace charts: quantities are encoded
 * with length and position, colour marks categories or status only, and every
 * visual has a text fallback so nothing is colour-only.
 */

export type Notice = { tone: "success" | "error"; text: string };

export const STATUS_META: Record<ServiceStatus, { label: string; pill: string; dot: string }> = {
  operational: { label: "Operational", pill: "border-emerald-200 bg-emerald-50 text-emerald-700", dot: "bg-emerald-500" },
  degraded: { label: "Degraded", pill: "border-amber-200 bg-amber-50 text-amber-700", dot: "bg-amber-500" },
  unavailable: { label: "Unavailable", pill: "border-rose-200 bg-rose-50 text-rose-700", dot: "bg-rose-500" },
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
    <section className={`card rounded-[10px] p-5 ${className}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-base font-black text-[var(--theme-heading)]">{title}</h2>
          {description ? <p className="mt-1 text-xs text-[var(--theme-muted)]">{description}</p> : null}
        </div>
        {action}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h3 className="text-xs font-bold uppercase tracking-[0.08em] text-[var(--theme-muted)]">{children}</h3>
      {action}
    </div>
  );
}

/* ---------------------------------------------------------------- metrics */

/**
 * Compact trend for a metric card: no axes, no labels, just the shape of the
 * last 30 days. The numbers it summarises are printed next to it.
 */
export function Sparkline({ values, color = "var(--color-chart-1)", label }: { values: number[]; color?: string; label: string }) {
  const gradientId = useId();
  if (!values.length) return null;
  const width = 120;
  const height = 36;
  const max = Math.max(1, ...values);
  const step = values.length > 1 ? width / (values.length - 1) : 0;
  const points = values.map((value, index) => [index * step, height - 3 - (value / max) * (height - 6)] as const);
  const line = points.map(([x, y], index) => `${index ? "L" : "M"} ${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
  const last = points[points.length - 1];
  const area = `${line} L ${last[0].toFixed(1)} ${height} L 0 ${height} Z`;

  return (
    <svg aria-label={label} className="block h-9 w-[120px] shrink-0" role="img" viewBox={`0 0 ${width} ${height}`}>
      <defs>
        <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.28" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gradientId})`} />
      <path d={line} fill="none" stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
      <circle cx={last[0]} cy={last[1]} fill={color} r="2.5" />
    </svg>
  );
}

/**
 * Period-over-period change. `goodWhen` decides which direction is green: more
 * sessions is good, more spend is neither, so cost cards pass "neutral".
 */
export function DeltaBadge({
  changePct,
  goodWhen = "up",
  suffix = "vs. previous 30 days",
}: {
  changePct: number | null;
  goodWhen?: "up" | "down" | "neutral";
  suffix?: string;
}) {
  if (changePct === null) return <span className="text-xs text-[var(--theme-faint)]">No earlier period to compare</span>;
  const direction = changePct > 0 ? "up" : changePct < 0 ? "down" : "flat";
  const tone =
    direction === "flat" || goodWhen === "neutral"
      ? "text-[var(--theme-muted)]"
      : direction === goodWhen
        ? "text-emerald-700"
        : "text-rose-600";
  const arrow = direction === "up" ? "↑" : direction === "down" ? "↓" : "→";
  return (
    <span className={`inline-flex flex-wrap items-center gap-1 text-xs font-semibold ${tone}`}>
      <span aria-hidden="true">{arrow}</span>
      <span className="tabular-nums">{formatPercentChange(changePct)}</span>
      <span className="font-normal text-[var(--theme-faint)]">{suffix}</span>
    </span>
  );
}

/**
 * KPI card in four layers: label, headline, comparison, trend. The footer
 * carries the breakdown an operator would otherwise have to click for.
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
    <>
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span
            className="flex size-9 shrink-0 items-center justify-center rounded-[8px] border"
            style={{
              color,
              backgroundColor: `color-mix(in srgb, ${color} 12%, transparent)`,
              borderColor: `color-mix(in srgb, ${color} 35%, transparent)`,
            }}
          >
            <Icon name={icon} size={17} />
          </span>
          <p className="truncate text-xs font-bold text-[var(--theme-text)]">{label}</p>
        </div>
        {href ? <Icon className="-rotate-90 shrink-0 text-[var(--theme-faint)]" name="chevron" size={14} /> : null}
      </div>
      <div className="mt-3 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-3xl font-extrabold leading-none tabular-nums text-[var(--theme-heading)]">{value}</p>
          {delta ? <div className="mt-2">{delta}</div> : null}
        </div>
        {sparkline?.length ? <Sparkline color={color} label={sparklineLabel ?? `${label}, last 30 days`} values={sparkline} /> : null}
      </div>
      <p className="mt-3 text-xs leading-4 text-[var(--theme-muted)]">{detail}</p>
    </>
  );
  const className = `card block rounded-[10px] p-4 transition ${href ? "hover:border-[var(--theme-border-strong)] hover:shadow-[var(--theme-shadow)] focus-visible:outline-2 focus-visible:outline-primary" : ""}`;
  return href ? (
    <Link className={className} href={href}>
      {body}
    </Link>
  ) : (
    <article className={className}>{body}</article>
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
    <div className="rounded-[8px] border border-[var(--theme-border)] bg-[var(--theme-panel-tint)] p-3.5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-bold text-[var(--theme-muted)]">{label}</p>
        <span aria-hidden="true" className={`size-2 rounded-full ${STATUS_META[status].dot}`} />
      </div>
      <div className="mt-1.5 flex items-end justify-between gap-2">
        <p className="text-xl font-extrabold leading-none text-[var(--theme-heading)]">{value}</p>
        {trend && trend.length > 1 ? <Sparkline color="var(--color-chart-1)" label={trendLabel ?? `${label} trend`} values={trend} /> : null}
      </div>
      <p className="mt-1.5 text-xs leading-4 text-[var(--theme-muted)]">{detail}</p>
    </div>
  );
}

export type ActivitySeriesOption = { key: string; label: string; values: number[]; color: string };

/**
 * One series at a time, chosen from the tabs above the plot. Bars, not a line:
 * these are daily counts, and a bar's length is the fastest thing to compare.
 */
export function ActivityChart({
  days,
  series,
  activeKey,
  onSelect,
}: {
  days: string[];
  series: ActivitySeriesOption[];
  activeKey: string;
  onSelect: (key: string) => void;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const active = series.find((option) => option.key === activeKey) ?? series[0];
  if (!active || !days.length) return null;

  const width = 800;
  const height = 220;
  const padding = { top: 14, right: 8, bottom: 26, left: 36 };
  const plotW = width - padding.left - padding.right;
  const plotH = height - padding.top - padding.bottom;
  const niceMax = niceCeiling(Math.max(1, ...active.values));
  const slot = plotW / days.length;
  const barW = Math.max(2, slot * 0.62);
  const y = (value: number) => padding.top + plotH - (value / niceMax) * plotH;
  const ticks = Array.from(new Set([0, 0.25, 0.5, 0.75, 1].map((fraction) => Math.round(niceMax * fraction))));
  const total = active.values.reduce((sum, value) => sum + value, 0);
  const peakIndex = active.values.reduce((best, value, index) => (value > active.values[best] ? index : best), 0);
  const labelEvery = days.length > 14 ? 7 : days.length > 7 ? 2 : 1;
  const tooltipLeft = hover === null ? 0 : ((padding.left + (hover + 0.5) * slot) / width) * 100;

  return (
    <div>
      <div aria-label="Activity series" className="flex flex-wrap gap-1.5" role="tablist">
        {series.map((option) => {
          const selected = option.key === active.key;
          return (
            <button
              aria-selected={selected}
              className={`flex h-8 items-center gap-2 rounded-full border px-3 text-xs font-bold transition ${
                selected
                  ? "border-transparent text-white"
                  : "border-[var(--theme-border)] bg-[var(--theme-panel)] text-[var(--theme-muted)] hover:border-[var(--theme-border-strong)] hover:text-[var(--theme-heading)]"
              }`}
              key={option.key}
              onClick={() => onSelect(option.key)}
              role="tab"
              style={selected ? { backgroundColor: option.color } : undefined}
              type="button"
            >
              <span aria-hidden="true" className="size-2 rounded-full" style={{ backgroundColor: selected ? "rgba(255,255,255,0.85)" : option.color }} />
              {option.label}
              <span className="tabular-nums opacity-80">{option.values.reduce((sum, value) => sum + value, 0).toLocaleString()}</span>
            </button>
          );
        })}
      </div>

      <div className="relative mt-4">
        {hover !== null ? (
          <div
            className="pointer-events-none absolute top-0 z-10 -translate-x-1/2 rounded-[6px] border border-[var(--theme-border)] bg-[var(--theme-panel)] px-2.5 py-1.5 text-xs shadow-lg"
            style={{ left: `${tooltipLeft}%` }}
          >
            <span className="font-bold text-[var(--theme-heading)]">{active.values[hover].toLocaleString()}</span>{" "}
            <span className="text-[var(--theme-muted)]">
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
              <line stroke="var(--color-chart-grid)" strokeWidth="1" x1={padding.left} x2={width - padding.right} y1={y(tick)} y2={y(tick)} />
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
                  opacity={hover === null || hovered ? 1 : 0.45}
                  rx="2"
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

      <p className="mt-2 text-xs text-[var(--theme-muted)]">
        {total.toLocaleString()} total · peak {active.values[peakIndex].toLocaleString()} on {formatDayLabel(days[peakIndex])} · {(total / days.length).toFixed(1)} per day on average
      </p>
      {/* The screen-reader alternative to the plot. `sr-only` has to sit on a
          wrapper: CSS treats `height` on a `display: table` box as a minimum,
          so the class cannot collapse a table and it would add its full height
          to the page's scroll area. */}
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

/** Stacked bar of a workspace's sessions by lifecycle state, with the counts printed underneath. */
export function SessionStatusBar({ counts }: { counts: Record<SessionStatus, number> }) {
  const total = SESSION_STATUS_ORDER.reduce((sum, status) => sum + counts[status], 0);
  return (
    <div>
      <div aria-hidden="true" className="flex h-2.5 w-full gap-0.5 overflow-hidden rounded-full bg-[var(--theme-panel-soft)]">
        {total > 0
          ? SESSION_STATUS_ORDER.filter((status) => counts[status] > 0).map((status) => (
              <span key={status} className="h-full rounded-sm" style={{ width: `${(counts[status] / total) * 100}%`, backgroundColor: SESSION_STATUS_META[status].color }} />
            ))
          : null}
      </div>
      <ul className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs sm:grid-cols-4">
        {SESSION_STATUS_ORDER.map((status) => (
          <li className="flex items-center gap-1.5 text-[var(--theme-muted)]" key={status}>
            <span aria-hidden="true" className="size-2 rounded-full" style={{ backgroundColor: SESSION_STATUS_META[status].color }} />
            <span className="tabular-nums font-bold text-[var(--theme-heading)]">{counts[status].toLocaleString()}</span>
            {SESSION_STATUS_META[status].label}
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ----------------------------------------------------------------- status */

export function StatusPill({ status }: { status: ServiceStatus }) {
  return <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-bold ${STATUS_META[status].pill}`}>{STATUS_META[status].label}</span>;
}

export function overallServiceStatus(services: ServiceHealth[]): ServiceStatus {
  if (services.some((service) => service.status === "unavailable")) return "unavailable";
  if (services.some((service) => service.status === "degraded")) return "degraded";
  return "operational";
}

/** Status-page style headline: one sentence that says whether anything is wrong before the list of components. */
export function HealthBanner({ services, children }: { services: ServiceHealth[]; children?: ReactNode }) {
  const overall = overallServiceStatus(services);
  const degraded = services.filter((service) => service.status === "degraded").length;
  const unavailable = services.filter((service) => service.status === "unavailable").length;
  const headline =
    overall === "operational"
      ? "All systems operational"
      : overall === "unavailable"
        ? `${unavailable} ${unavailable === 1 ? "service is" : "services are"} unavailable`
        : `${degraded} ${degraded === 1 ? "service is" : "services are"} running on a fallback`;
  const tone =
    overall === "operational"
      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
      : overall === "unavailable"
        ? "border-rose-200 bg-rose-50 text-rose-800"
        : "border-amber-200 bg-amber-50 text-amber-800";
  return (
    <div className={`flex flex-wrap items-center gap-3 rounded-[8px] border px-4 py-3 ${tone}`} role="status">
      <span aria-hidden="true" className={`size-2.5 rounded-full ${STATUS_META[overall].dot}`} />
      <p className="text-sm font-bold">{headline}</p>
      <div className="ml-auto flex items-center gap-2 text-xs font-medium">{children}</div>
    </div>
  );
}

export function AccountStatusBadge({ suspended, since }: { suspended: boolean; since?: string }) {
  return (
    <span
      className={`inline-flex items-center rounded border px-2 py-0.5 text-xs font-bold ${suspended ? "border-rose-200 bg-rose-50 text-rose-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}
      title={suspended && since ? `Suspended ${formatDate(since)}` : undefined}
    >
      {suspended ? "Suspended" : "Active"}
    </span>
  );
}

export function PlanBadge({ plan }: { plan: SubscriptionPlan }) {
  const tone =
    plan === "enterprise"
      ? "border-violet-200 bg-violet-50 text-violet-700"
      : plan === "pro"
        ? "border-sky-200 bg-sky-50 text-sky-700"
        : "border-[var(--theme-border)] bg-[var(--theme-panel-soft)] text-[var(--theme-text)]";
  return <span className={`inline-flex items-center rounded border px-2 py-0.5 text-xs font-bold ${tone}`}>{planLabel(plan)}</span>;
}

export function RoleBadge({ role, label }: { role: UserRole; label: string }) {
  const tone =
    role === "admin"
      ? "border-amber-200 bg-amber-50 text-amber-700"
      : role === "organization"
        ? "border-violet-100 bg-violet-50 text-violet-700"
        : role === "interviewer"
          ? "border-sky-100 bg-sky-50 text-sky-700"
          : "border-[var(--theme-border)] bg-[var(--theme-panel-soft)] text-[var(--theme-muted)]";
  return <span className={`inline-flex items-center rounded border px-2 py-0.5 text-xs font-bold ${tone}`}>{label}</span>;
}

export function SessionStatusBadge({ status }: { status: SessionStatus }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded border border-[var(--theme-border)] bg-[var(--theme-panel-soft)] px-2 py-0.5 text-xs font-bold text-[var(--theme-text)]">
      <span aria-hidden="true" className="size-1.5 rounded-full" style={{ backgroundColor: SESSION_STATUS_META[status].color }} />
      {SESSION_STATUS_META[status].label}
    </span>
  );
}

/**
 * Items an operator should act on, each a link into the filtered list where
 * the action lives. Rendered only when there is something to act on, so a
 * quiet platform shows one calm line instead of a row of zeros.
 */
export function AttentionStrip({ items }: { items: Array<{ key: string; count: number; label: string; href: string; tone: "danger" | "warning" | "info" }> }) {
  const visible = items.filter((item) => item.count > 0);
  if (!visible.length) {
    return (
      <div className="flex items-center gap-2 rounded-[8px] border border-[var(--theme-border)] bg-[var(--theme-panel)] px-4 py-2.5 text-xs font-semibold text-[var(--theme-muted)]" role="status">
        <Icon className="text-emerald-600" name="check" size={15} />
        Nothing needs attention right now.
      </div>
    );
  }
  const tones = {
    danger: "border-rose-200 bg-rose-50 text-rose-800 hover:bg-rose-100",
    warning: "border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100",
    info: "border-sky-200 bg-sky-50 text-sky-800 hover:bg-sky-100",
  };
  return (
    <div className="flex flex-wrap items-center gap-2" role="region" aria-label="Needs attention">
      <span className="text-xs font-bold uppercase tracking-[0.08em] text-[var(--theme-muted)]">Needs attention</span>
      {visible.map((item) => (
        <Link className={`inline-flex h-8 items-center gap-2 rounded-full border px-3 text-xs font-bold transition ${tones[item.tone]}`} href={item.href} key={item.key}>
          <span className="tabular-nums">{item.count.toLocaleString()}</span>
          {item.label}
          <Icon className="-rotate-90 opacity-70" name="chevron" size={11} />
        </Link>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ inputs */

export function SearchField({ label, placeholder, value, onChange }: { label: string; placeholder: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="group flex h-9 min-w-[220px] flex-1 items-center gap-2 rounded-[7px] border border-[var(--color-primary-300)]/70 bg-[var(--color-primary-50)]/70 px-3 text-[var(--color-primary-700)] transition focus-within:border-[var(--color-primary-500)] focus-within:bg-[var(--theme-panel)] focus-within:ring-4 focus-within:ring-[var(--theme-ring)] sm:max-w-[380px]">
      <span className="sr-only">{label}</span>
      <input
        className="min-w-0 flex-1 border-0 bg-transparent text-xs font-medium text-[var(--theme-text)] outline-none placeholder:text-[var(--theme-muted)]"
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        type="search"
        value={value}
      />
      {value ? (
        <button aria-label="Clear search" className="text-[var(--theme-muted)] hover:text-[var(--theme-heading)]" onClick={() => onChange("")} type="button">
          <Icon name="x" size={13} />
        </button>
      ) : (
        <Icon className="pointer-events-none shrink-0 text-[var(--color-primary-700)]/70 transition group-focus-within:text-[var(--color-primary-700)]" name="search" size={15} />
      )}
    </label>
  );
}

export function FilterSelect({ label, value, onChange, children }: { label: string; value: string; onChange: (value: string) => void; children: ReactNode }) {
  return (
    <label className="flex items-center gap-2 text-xs font-bold text-[var(--theme-muted)]">
      <span>{label}</span>
      <select className="control h-9 min-h-0 w-auto rounded-[7px] px-2 text-xs font-semibold" onChange={(event) => onChange(event.target.value)} value={value}>
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
    <div aria-label={label} className="flex flex-wrap items-center gap-1.5" role="group">
      <span className="mr-1 text-xs font-bold text-[var(--theme-muted)]">{label}</span>
      {options.map((option) => {
        const selected = value === option.value;
        return (
          <button
            aria-pressed={selected}
            className={`h-8 rounded-full border px-3 text-xs font-bold transition ${
              selected
                ? "border-[var(--color-primary-400)] bg-[var(--color-primary-50)] text-[var(--color-primary-700)]"
                : "border-[var(--theme-border)] bg-[var(--theme-panel)] text-[var(--theme-muted)] hover:border-[var(--theme-border-strong)] hover:text-[var(--theme-heading)]"
            }`}
            key={option.value || "all"}
            onClick={() => onChange(option.value)}
            type="button"
          >
            {option.label}
            {typeof option.count === "number" ? <span className="ml-1.5 tabular-nums opacity-70">{option.count.toLocaleString()}</span> : null}
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
        className={`inline-flex items-center gap-1 rounded px-1 py-0.5 text-xs font-bold transition hover:text-[var(--theme-heading)] ${active ? "text-[var(--theme-heading)]" : "text-[var(--theme-muted)]"}`}
        onClick={() => onSort(sortKey)}
        type="button"
      >
        {label}
        <span aria-hidden="true" className={`text-[10px] ${active ? "" : "opacity-30"}`}>
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
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--theme-border)] px-5 py-3 text-xs text-[var(--theme-muted)]">
      <span>{total === 0 ? "No results" : `Showing ${from.toLocaleString()}–${to.toLocaleString()} of ${total.toLocaleString()}`}</span>
      <div className="flex items-center gap-2">
        <button className="button-secondary h-8 min-h-0 rounded-[6px] px-3 text-xs" disabled={disabled || page <= 1} onClick={() => onChange(page - 1)} type="button">Previous</button>
        <span className="font-semibold">Page {page} of {totalPages}</span>
        <button className="button-secondary h-8 min-h-0 rounded-[6px] px-3 text-xs" disabled={disabled || page >= totalPages} onClick={() => onChange(page + 1)} type="button">Next</button>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- loading */

export function SkeletonBlock({ className = "" }: { className?: string }) {
  return <span aria-hidden="true" className={`block animate-pulse rounded bg-[var(--theme-panel-soft)] ${className}`} />;
}

/** Table placeholder with the real column rhythm, so the page does not jump when rows arrive. */
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

/* ------------------------------------------------------------------ drawer */

/**
 * Nonmodal detail panel: it slides over the right edge and leaves the table
 * usable next to it on wide screens, so an operator can keep the list as
 * reference while acting on one row. Escape closes it; on small screens it
 * takes the full width behind a scrim.
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
    <div className="fixed inset-0 z-[55] flex justify-end lg:pointer-events-none">
      <button aria-label="Close details" className="absolute inset-0 bg-neutral-950/40 backdrop-blur-[1px] lg:hidden" onClick={onClose} type="button" />
      <aside
        aria-labelledby={titleId}
        aria-modal="false"
        className="relative flex h-full w-full max-w-[540px] flex-col border-l border-[var(--theme-border)] bg-[var(--theme-panel)] shadow-[-18px_0_50px_rgba(15,23,42,0.18)] lg:pointer-events-auto"
        role="dialog"
      >
        <header className="flex items-start gap-3 border-b border-[var(--theme-border)] px-5 py-4">
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-lg font-black text-[var(--theme-heading)]" id={titleId}>
              {title}
            </h2>
            {subtitle ? <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[var(--theme-muted)]">{subtitle}</div> : null}
          </div>
          <button
            aria-label="Close details"
            className="flex size-9 shrink-0 items-center justify-center rounded-[7px] border border-[var(--theme-border)] text-[var(--theme-muted)] transition hover:bg-[var(--theme-panel-soft)] hover:text-[var(--theme-heading)]"
            onClick={onClose}
            ref={closeRef}
            type="button"
          >
            <Icon name="x" size={16} />
          </button>
        </header>
        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-5 py-5">{children}</div>
        {footer ? <footer className="border-t border-[var(--theme-border)] bg-[var(--theme-panel-tint)] px-5 py-3">{footer}</footer> : null}
      </aside>
    </div>
  );
}

export function DetailList({ items }: { items: Array<{ label: string; value: ReactNode }> }) {
  return (
    <dl className="grid grid-cols-[minmax(0,128px)_1fr] gap-x-4 gap-y-2.5 text-sm">
      {items.map((item) => (
        <div className="contents" key={item.label}>
          <dt className="text-xs font-bold leading-5 text-[var(--theme-muted)]">{item.label}</dt>
          <dd className="min-w-0 leading-5 text-[var(--theme-text)]">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function DetailStat({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
  return (
    <div className="rounded-[8px] border border-[var(--theme-border)] bg-[var(--theme-panel-tint)] px-3 py-2.5">
      <p className="text-xs font-bold text-[var(--theme-muted)]">{label}</p>
      <p className="mt-1 text-lg font-extrabold leading-none tabular-nums text-[var(--theme-heading)]">{value}</p>
      {hint ? <p className="mt-1 text-xs text-[var(--theme-faint)]">{hint}</p> : null}
    </div>
  );
}

export function DrawerSkeleton() {
  return (
    <div aria-busy="true" className="space-y-4" role="status" aria-label="Loading details">
      <SkeletonBlock className="h-4 w-2/3" />
      <SkeletonBlock className="h-3 w-1/2" />
      <div className="grid grid-cols-3 gap-3">
        <SkeletonBlock className="h-16" />
        <SkeletonBlock className="h-16" />
        <SkeletonBlock className="h-16" />
      </div>
      <SkeletonBlock className="h-3 w-5/6" />
      <SkeletonBlock className="h-3 w-4/6" />
      <SkeletonBlock className="h-24" />
    </div>
  );
}

/* ------------------------------------------------------------------- misc */

export function Avatar({ name, className = "size-8 text-xs" }: { name: string; className?: string }) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
  return (
    <span aria-hidden="true" className={`grid shrink-0 place-items-center rounded-full border border-[var(--theme-border)] bg-[var(--theme-panel-soft)] font-black text-[var(--theme-heading)] ${className}`}>
      {initials || "?"}
    </span>
  );
}

export function RelativeTime({ iso, className = "" }: { iso?: string; className?: string }) {
  if (!iso) return <span className={className}>—</span>;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return <span className={className}>—</span>;
  return (
    <time className={className} dateTime={iso} title={date.toLocaleString()}>
      {formatRelativeTime(iso)}
    </time>
  );
}

export function CopyButton({ value, label = "Copy" }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const handle = window.setTimeout(() => setCopied(false), 1_500);
    return () => window.clearTimeout(handle);
  }, [copied]);
  return (
    <button
      aria-label={copied ? "Copied" : `${label} ${value}`}
      className="inline-flex h-6 items-center gap-1 rounded border border-[var(--theme-border)] px-1.5 text-[11px] font-semibold text-[var(--theme-muted)] transition hover:bg-[var(--theme-panel-soft)] hover:text-[var(--theme-heading)]"
      onClick={() => {
        void navigator.clipboard?.writeText(value).then(() => setCopied(true)).catch(() => undefined);
      }}
      title={value}
      type="button"
    >
      <Icon name={copied ? "check" : "copy"} size={11} />
      {copied ? "Copied" : label}
    </button>
  );
}

export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const handle = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(handle);
  }, [value, delayMs]);
  return debounced;
}

/** Seconds since `since`, re-rendered every second while mounted; drives "updated 12s ago" labels. */
export function useSecondsSince(since: number | null): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const handle = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => window.clearInterval(handle);
  }, []);
  return since === null ? 0 : Math.max(0, Math.round((now - since) / 1_000));
}

export function formatDate(iso?: string): string {
  if (!iso) return "—";
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}
