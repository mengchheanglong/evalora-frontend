"use client";

import { useId, useState } from "react";

/**
 * Dependency-free chart primitives (inline SVG).
 *
 * Conventions applied throughout, so charts read the same everywhere:
 *  - 2px strokes, >=8px hit targets, 4px rounded data-ends anchored to the baseline
 *  - a 2px surface gap between adjacent fills
 *  - recessive grid/axes; values and labels wear text tokens, never the series colour
 *  - every plot ships a hover layer, and every chart has a table fallback so the
 *    data is never colour-only
 */

const AXIS = "var(--color-chart-axis)";
const GRID = "var(--color-chart-grid)";

// ---------------------------------------------------------------- trend line

export interface TrendPoint {
  date: string;
  score: number;
}

/**
 * Single-series change-over-time. One series needs no legend box — the title
 * names it. Crosshair + tooltip follow the nearest point.
 */
export function TrendChart({
  points,
  height = 200,
  color = "var(--color-chart-1)",
  valueSuffix = "%",
}: {
  points: TrendPoint[];
  height?: number;
  color?: string;
  valueSuffix?: string;
}) {
  const gradientId = useId();
  const [hover, setHover] = useState<number | null>(null);

  if (!points.length) return null;

  // A wide viewBox keeps the plot from ballooning vertically when the panel is
  // full-width — the SVG scales by aspect ratio, so aspect *is* the height cap.
  const width = 800;
  const padding = { top: 12, right: 12, bottom: 24, left: 34 };
  const plotW = width - padding.left - padding.right;
  const plotH = height - padding.top - padding.bottom;

  const max = Math.max(100, ...points.map((p) => p.score));
  const min = 0;
  const x = (i: number) => padding.left + (points.length === 1 ? plotW / 2 : (i / (points.length - 1)) * plotW);
  const y = (value: number) => padding.top + plotH - ((value - min) / (max - min || 1)) * plotH;

  const line = points.map((p, i) => `${i === 0 ? "M" : "L"} ${x(i).toFixed(1)} ${y(p.score).toFixed(1)}`).join(" ");
  const area = points.length > 1
    ? `${line} L ${x(points.length - 1).toFixed(1)} ${padding.top + plotH} L ${x(0).toFixed(1)} ${padding.top + plotH} Z`
    : "";
  const ticks = [0, 25, 50, 75, 100].filter((t) => t <= max);
  const active = hover === null ? null : points[hover];

  return (
    <figure className="m-0">
      <div className="relative">
        <svg
          className="w-full"
          onMouseLeave={() => setHover(null)}
          role="img"
          viewBox={`0 0 ${width} ${height}`}
          aria-label={`Average score over ${points.length} day(s)`}
        >
          <defs>
            <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.18" />
              <stop offset="100%" stopColor={color} stopOpacity="0" />
            </linearGradient>
          </defs>

          {ticks.map((tick) => (
            <g key={tick}>
              <line stroke={GRID} strokeWidth="1" x1={padding.left} x2={width - padding.right} y1={y(tick)} y2={y(tick)} />
              <text className="fill-[var(--theme-faint)]" fontSize="12" textAnchor="end" x={padding.left - 6} y={y(tick) + 4}>
                {tick}
              </text>
            </g>
          ))}

          {area ? <path d={area} fill={`url(#${gradientId})`} /> : null}
          <path d={line} fill="none" stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />

          {/* A marker per point once the series is short enough to read. */}
          {points.length <= 24
            ? points.map((point, index) => (
                <circle
                  cx={x(index)}
                  cy={y(point.score)}
                  fill="var(--theme-panel)"
                  key={point.date}
                  r={hover === index ? 5 : 3.5}
                  stroke={color}
                  strokeWidth="2"
                />
              ))
            : null}

          {active ? (
            <line stroke={AXIS} strokeDasharray="3 3" strokeWidth="1" x1={x(hover!)} x2={x(hover!)} y1={padding.top} y2={padding.top + plotH} />
          ) : null}

          {/* Invisible hit bands — targets stay bigger than the marks. */}
          {points.map((point, index) => (
            <rect
              fill="transparent"
              height={plotH}
              key={`hit-${point.date}`}
              onMouseEnter={() => setHover(index)}
              width={Math.max(12, plotW / points.length)}
              x={x(index) - Math.max(12, plotW / points.length) / 2}
              y={padding.top}
            />
          ))}
        </svg>

        {active ? (
          <div
            className="pointer-events-none absolute -translate-x-1/2 -translate-y-full rounded-lg border border-[var(--theme-border)] bg-[var(--theme-panel)] px-2.5 py-1.5 text-xs shadow-lg"
            style={{ left: `${(x(hover!) / width) * 100}%`, top: `${(y(active.score) / height) * 100}%` }}
          >
            <span className="block font-bold text-[var(--theme-heading)]">{active.score}{valueSuffix}</span>
            <span className="block text-xs text-[var(--theme-muted)]">{formatDay(active.date)}</span>
          </div>
        ) : null}
      </div>

      <figcaption className="mt-1 flex justify-between text-xs text-[var(--theme-faint)]">
        <span>{formatDay(points[0].date)}</span>
        <span>{formatDay(points[points.length - 1].date)}</span>
      </figcaption>
    </figure>
  );
}

// ------------------------------------------------------------- bar breakdown

export interface BarDatum {
  label: string;
  value: number;
  color?: string;
  hint?: string;
  /** Shown instead of `value` — keeps trailing zeros ("1.0", not "1"). */
  display?: string;
}

/**
 * Horizontal magnitude comparison. Labels are always visible, so identity never
 * depends on colour.
 */
export function BarBreakdown({
  data,
  total,
  valueSuffix = "",
  showPercent = true,
}: {
  data: BarDatum[];
  total?: number;
  valueSuffix?: string;
  /** Off for rating scales, where "4.2/5" and "84%" say the same thing twice. */
  showPercent?: boolean;
}) {
  const [hover, setHover] = useState<string | null>(null);
  const max = total ?? Math.max(1, ...data.map((d) => d.value));

  return (
    <div className="space-y-2">
      {data.map((row) => {
        const pct = max ? Math.round((row.value / max) * 100) : 0;
        return (
          // Label, bar and value share one line, and the bar column is capped.
          // Stacked full-width tracks turned a 1.0/5 into a sliver adrift in
          // 1000px of empty rail on wide cards.
          <div
            className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 text-xs sm:grid-cols-[minmax(0,1fr)_minmax(120px,280px)_auto]"
            key={row.label}
            onMouseEnter={() => setHover(row.label)}
            onMouseLeave={() => setHover(null)}
            title={row.hint ?? `${row.label}: ${row.display ?? row.value}${valueSuffix}`}
          >
            <span className="truncate font-semibold text-[var(--theme-text)]">{row.label}</span>
            <div className="order-last col-span-2 h-2 overflow-hidden rounded-full bg-[var(--theme-panel-soft)] sm:order-none sm:col-span-1">
              <div
                className="h-full rounded-full transition-[width,opacity] duration-300"
                style={{
                  width: `${Math.max(row.value > 0 ? 3 : 0, pct)}%`,
                  background: row.color ?? "var(--color-chart-1)",
                  opacity: hover && hover !== row.label ? 0.55 : 1,
                }}
              />
            </div>
            <span className="shrink-0 text-right font-bold tabular-nums text-[var(--theme-heading)]">
              {row.display ?? row.value}{valueSuffix}
              {total && showPercent ? <span className="ml-1 font-semibold text-[var(--theme-faint)]">{pct}%</span> : null}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ----------------------------------------------------------------- histogram

/**
 * Distribution over ordered bins. Columns, not rows — the bin order is
 * meaningful, and left-to-right reads as the scale it came from.
 */
export function Histogram({
  bins,
  height = 148,
  color = "var(--color-chart-1)",
  emptyColor = "var(--color-status-neutral)",
}: {
  bins: Array<{ label: string; count: number; muted?: boolean }>;
  height?: number;
  color?: string;
  emptyColor?: string;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(1, ...bins.map((bin) => bin.count));

  return (
    <div>
      <div className="flex items-end gap-0.5" style={{ height }}>
        {bins.map((bin, index) => {
          const ratio = bin.count / max;
          return (
            <div
              className="group relative flex h-full min-w-0 flex-1 flex-col justify-end"
              key={bin.label}
              onMouseEnter={() => setHover(index)}
              onMouseLeave={() => setHover(null)}
            >
              <span
                className={`mb-1 block text-center text-xs font-bold tabular-nums transition-opacity ${
                  hover === index || bin.count === max ? "opacity-100" : "opacity-0"
                } text-[var(--theme-heading)]`}
              >
                {bin.count}
              </span>
              {/* 4px rounded top, square base — the column stays anchored to the
                  axis. Capped width keeps the mark thin instead of a slab. */}
              <div
                className="mx-auto w-full max-w-[64px] rounded-t-[4px] transition-[height,opacity] duration-300"
                style={{
                  height: `${Math.max(bin.count > 0 ? 4 : 2, ratio * 100)}%`,
                  background: bin.muted || bin.count === 0 ? emptyColor : color,
                  opacity: hover !== null && hover !== index ? 0.55 : 1,
                }}
              />
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex gap-0.5 border-t border-[var(--color-chart-axis)] pt-2">
        {bins.map((bin) => (
          <span className="min-w-0 flex-1 truncate text-center text-xs text-[var(--theme-muted)]" key={bin.label} title={bin.label}>
            {bin.label}
          </span>
        ))}
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ pipeline

/**
 * Session pipeline as a single stacked bar. Segments carry a 2px surface gap so
 * adjacent fills stay separable, and each is labelled beneath.
 */
export function PipelineBar({ segments }: { segments: BarDatum[] }) {
  const total = segments.reduce((sum, segment) => sum + segment.value, 0);
  if (!total) return null;

  return (
    <div>
      <div className="flex h-3 gap-0.5 overflow-hidden rounded-full">
        {segments
          .filter((segment) => segment.value > 0)
          .map((segment) => (
            <div
              className="h-full first:rounded-l-full last:rounded-r-full"
              key={segment.label}
              style={{ width: `${(segment.value / total) * 100}%`, background: segment.color ?? "var(--color-chart-1)" }}
              title={`${segment.label}: ${segment.value}`}
            />
          ))}
      </div>
      <ul className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-4">
        {segments.map((segment) => (
          <li className="flex items-center gap-2" key={segment.label}>
            <span className="size-2 shrink-0 rounded-full" style={{ background: segment.color ?? "var(--color-chart-1)" }} />
            <span className="min-w-0">
              <span className="block truncate text-xs font-semibold text-[var(--theme-muted)]">{segment.label}</span>
              <span className="block text-sm font-bold tabular-nums leading-tight text-[var(--theme-heading)]">{segment.value}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ------------------------------------------------------------------ hero KPI

export function HeroStat({
  value,
  label,
  detail,
  trend,
}: {
  value: string | number;
  label: string;
  detail?: string;
  trend?: { direction: "up" | "down" | "flat"; text: string };
}) {
  const trendTone =
    trend?.direction === "up"
      ? "text-[var(--color-status-good)]"
      : trend?.direction === "down"
        ? "text-[var(--color-status-critical)]"
        : "text-[var(--theme-muted)]";
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--theme-muted)]">{label}</p>
      <p className="mt-1 text-4xl font-bold leading-none tabular-nums text-[var(--theme-heading)]">{value}</p>
      {detail ? <p className="mt-2 text-xs leading-4 text-[var(--theme-faint)]">{detail}</p> : null}
      {trend ? <p className={`mt-1 text-xs font-semibold ${trendTone}`}>{trend.text}</p> : null}
    </div>
  );
}

/** Accessible fallback: the same numbers as text, for CVD/print/screen readers. */
export function DataTable({ caption, rows }: { caption: string; rows: Array<{ label: string; value: string | number }> }) {
  return (
    <details className="mt-3">
      <summary className="cursor-pointer text-xs font-semibold text-[var(--theme-faint)] hover:text-[var(--theme-muted)]">
        View as table
      </summary>
      <table className="mt-2 w-full text-xs">
        <caption className="sr-only">{caption}</caption>
        <tbody>
          {rows.map((row) => (
            <tr className="border-b border-[var(--theme-border)] last:border-0" key={row.label}>
              <th className="py-1.5 text-left font-medium text-[var(--theme-muted)]" scope="row">{row.label}</th>
              <td className="py-1.5 text-right font-bold tabular-nums text-[var(--theme-heading)]">{row.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </details>
  );
}

function formatDay(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(date);
}
