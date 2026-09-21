"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { AdminShell } from "@/components/admin-shell";
import {
  ActivityChart,
  DeltaBadge,
  MetricCard,
  Panel,
  PlanBadge,
  SkeletonBlock,
  formatDate,
} from "@/components/admin-ui";
import { Icon } from "@/components/icons";
import { ErrorState, InlineAlert } from "@/components/ui-states";
import { ADMIN_PLANS, formatUsd, getAdminOverview } from "@/lib/admin";
import { getErrorMessage } from "@/lib/api";
import { ADMIN_HOME } from "@/lib/auth-routes";
import type { AdminOverview } from "@/lib/types";

/**
 * Money, and only money: what the platform is spending on AI this month, what
 * is driving it, and which plans workspaces sit on. These are month-to-date
 * aggregates, so unlike `/admin/health` this page has nothing to gain from
 * polling; it reads the same `/admin/overview` payload once.
 */
export default function AdminCostsPage() {
  return (
    <AdminShell
      active="costs"
      description="AI spend month to date, what is driving it, and which plans workspaces are on."
      title="Usage & Cost"
    >
      <CostsPanel />
    </AdminShell>
  );
}

function CostsPanel() {
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

  if (loading && !overview) return <CostsSkeleton />;
  if (!overview) return <ErrorState message={error || "Cost figures are unavailable right now."} onRetry={() => void load()} />;

  const { ai, organizations, activity, comparisons } = overview;
  const providerLabel = ai.provider === "deepseek" ? (ai.model ? `Live model · ${ai.model}` : "Live model") : "Fallback only · nothing is billed";
  const billableUnits = ai.billableTurns.allTime + ai.draftGenerations.allTime;

  return (
    <div className="space-y-5">
      {error ? <InlineAlert tone="warning">{error} Showing the last successful snapshot.</InlineAlert> : null}

      {ai.provider === "fallback" ? (
        <InlineAlert tone="info">
          No AI provider is configured, so interviews run on deterministic fallback output and nothing is billed. The figures below show what the
          configured rate would have cost.
        </InlineAlert>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-sky-200/80 bg-sky-50/50 p-4 text-xs dark:border-sky-900/60 dark:bg-sky-950/20">
          <div className="flex items-center gap-3">
            <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-sky-100 text-sky-700 dark:bg-sky-900/50 dark:text-sky-300">
              <Icon name="sparkle" size={18} />
            </div>
            <div>
              <p className="font-bold text-[var(--theme-heading)]">Active AI Provider: DeepSeek V4 Flash ({ai.model ?? "deepseek-chat"})</p>
              <p className="text-[var(--theme-muted)] mt-0.5">
                Production evaluation engine configured at {formatUsd(ai.costPerTurnUsd)} / turn. Fallback runs are tracked at zero charge.
              </p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-300 bg-sky-100/60 px-3 py-1 font-bold text-sky-800 dark:border-sky-700 dark:bg-sky-900/40 dark:text-sky-200 shadow-2xs">
            <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
            Live Provider Connected
          </span>
        </div>
      )}

      {/* KPI Cards */}
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          color="var(--color-chart-2)"
          delta={<DeltaBadge changePct={comparisons.billableTurns.changePct} goodWhen="neutral" suffix="billable turns vs. previous 30 days" />}
          detail={`Since ${formatDate(overview.monthStart)} · ${ai.billableTurns.thisMonth.toLocaleString()} billable turns`}
          icon="sparkle"
          label="Spend, month to date"
          sparkline={activity.billableTurns}
          sparklineLabel="Billable AI turns per day, last 30 days"
          value={formatUsd(ai.estimatedCostUsd.thisMonth)}
        />
        <MetricCard
          color="var(--color-chart-3)"
          detail="Extrapolated linearly over the calendar month."
          icon="trend"
          label="Projected month end"
          value={formatUsd(ai.projectedMonthCostUsd)}
        />
        <MetricCard
          color="var(--color-primary-600)"
          detail={`${providerLabel} · rate from AI_COST_PER_TURN_USD`}
          icon="analytics"
          label="Cost per turn"
          value={formatUsd(ai.costPerTurnUsd)}
        />
        <MetricCard
          color="var(--color-chart-1)"
          detail={`${billableUnits.toLocaleString()} billable ${billableUnits === 1 ? "unit" : "units"} across interviews & drafts`}
          icon="report"
          label="All-time spend"
          value={formatUsd(ai.estimatedCostUsd.allTime)}
        />
      </section>

      {/* Daily Turns Chart & Usage Breakdown */}
      <div className="grid gap-5 xl:grid-cols-[1.5fr_1fr]">
        <Panel
          description={`Daily billable turns for ${formatDate(`${activity.days[0]}T00:00:00Z`)} to ${formatDate(`${activity.days[activity.days.length - 1]}T00:00:00Z`)}, UTC. Every turn is charged at ${formatUsd(ai.costPerTurnUsd)}.`}
          title="What we are billed for, last 30 days"
        >
          <ActivityChart
            activeKey="billableTurns"
            days={activity.days}
            onSelect={() => undefined}
            series={[{ key: "billableTurns", label: "Billable AI turns", values: activity.billableTurns, color: "var(--color-chart-2)" }]}
          />
        </Panel>

        <Panel description={providerLabel} title="What is driving spend">
          <UsageBreakdown
            rows={[
              { label: "Billable interview turns", month: ai.billableTurns.thisMonth, allTime: ai.billableTurns.allTime, color: "var(--color-chart-2)" },
              { label: "Template draft generations", month: ai.draftGenerations.thisMonth, allTime: ai.draftGenerations.allTime, color: "var(--color-chart-3)" },
              { label: "Fallback turns (free)", month: Math.max(0, ai.interviewTurns.thisMonth - ai.billableTurns.thisMonth), allTime: Math.max(0, ai.interviewTurns.allTime - ai.billableTurns.allTime), color: "var(--theme-muted)" },
            ]}
          />
          <div className="mt-4 rounded-xl border border-[var(--theme-border)] bg-[var(--theme-panel-soft)]/40 p-3 text-xs leading-relaxed text-[var(--theme-muted)]">
            <span className="font-bold text-[var(--theme-heading)]">Methodology: </span>
            {ai.methodology}
          </div>
        </Panel>
      </div>

      {/* Subscription Plans Distribution */}
      <Panel
        description={`${organizations.paidSubscriptions.toLocaleString()} active paid ${organizations.paidSubscriptions === 1 ? "subscription" : "subscriptions"} · ${organizations.newThisMonth.toLocaleString()} new this month`}
        title="Subscription plans"
      >
        <div className="grid gap-4 sm:grid-cols-3">
          {ADMIN_PLANS.map((plan) => {
            const count = organizations.byPlan[plan];
            const share = organizations.total ? (count / organizations.total) * 100 : 0;
            return (
              <Link
                className="group block rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-panel)] p-4 sm:p-5 transition hover:border-[var(--theme-border-strong)] hover:shadow-xs"
                href={`${ADMIN_HOME}/organizations?plan=${plan}`}
                key={plan}
              >
                <div className="flex items-center justify-between gap-3">
                  <PlanBadge plan={plan} />
                  <span className="text-xl font-extrabold tabular-nums text-[var(--theme-heading)]">
                    {count.toLocaleString()}
                  </span>
                </div>
                <div className="mt-1 text-xs font-medium text-[var(--theme-muted)]">
                  {count === 1 ? "active workspace" : "active workspaces"}
                </div>
                <div aria-hidden="true" className="mt-3.5 h-2 overflow-hidden rounded-full bg-[var(--theme-panel-soft)]">
                  <div className="h-full rounded-full bg-[var(--color-primary-600)] transition-all duration-500" style={{ width: `${Math.max(share, 3)}%` }} />
                </div>
                <div className="mt-2.5 flex items-center justify-between text-xs">
                  <span className="font-bold text-[var(--theme-text)]">{share.toFixed(1)}% of total</span>
                  <span className="text-[var(--color-primary-600)] dark:text-[var(--color-primary-400)] font-semibold group-hover:underline inline-flex items-center gap-0.5">
                    View list
                    <Icon className="-rotate-90 inline" name="chevron" size={10} />
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </Panel>
    </div>
  );
}

function UsageBreakdown({ rows }: { rows: Array<{ label: string; month: number; allTime: number; color: string }> }) {
  const monthTotal = rows.reduce((sum, row) => sum + row.month, 0);
  return (
    <div className="space-y-4">
      <div aria-hidden="true" className="flex h-3 w-full gap-1 overflow-hidden rounded-full bg-[var(--theme-panel-soft)] p-0.5 border border-[var(--theme-border)]">
        {monthTotal > 0
          ? rows.filter((row) => row.month > 0).map((row) => (
              <span
                key={row.label}
                className="h-full rounded-full transition-all duration-300"
                style={{ width: `${(row.month / monthTotal) * 100}%`, backgroundColor: row.color }}
              />
            ))
          : null}
      </div>
      <dl className="space-y-2 text-xs">
        {rows.map((row) => {
          const pct = monthTotal > 0 ? (row.month / monthTotal) * 100 : 0;
          return (
            <div className="flex items-center gap-2.5 rounded-xl border border-[var(--theme-border)]/60 bg-[var(--theme-panel-soft)]/20 p-2.5" key={row.label}>
              <span aria-hidden="true" className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: row.color }} />
              <dt className="flex-1 font-medium text-[var(--theme-text)]">{row.label}</dt>
              <span className="rounded-md bg-[var(--theme-panel)] px-2 py-0.5 text-xs font-bold tabular-nums text-[var(--theme-muted)] border border-[var(--theme-border)]">
                {pct.toFixed(0)}%
              </span>
              <dd className="tabular-nums font-extrabold text-[var(--theme-heading)]">{row.month.toLocaleString()}</dd>
              <dd className="w-24 text-right tabular-nums text-xs text-[var(--theme-muted)]">({row.allTime.toLocaleString()} total)</dd>
            </div>
          );
        })}
      </dl>
    </div>
  );
}

function CostsSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading cost figures" className="space-y-5" role="status">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div className="rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-panel)] p-5" key={index}>
            <SkeletonBlock className="h-3 w-24" />
            <SkeletonBlock className="mt-4 h-8 w-20" />
            <SkeletonBlock className="mt-3 h-3 w-full" />
          </div>
        ))}
      </div>
      <div className="grid gap-5 xl:grid-cols-[1.5fr_1fr]">
        <div className="rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-panel)] p-6">
          <SkeletonBlock className="h-4 w-48" />
          <SkeletonBlock className="mt-6 h-[220px] w-full" />
        </div>
        <div className="rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-panel)] p-6">
          <SkeletonBlock className="h-4 w-40" />
          <SkeletonBlock className="mt-5 h-3 w-full" />
          <div className="mt-4 space-y-2">
            {Array.from({ length: 3 }, (_, index) => (
              <SkeletonBlock className="h-10 rounded-xl" key={index} />
            ))}
          </div>
        </div>
      </div>
      <div className="rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-panel)] p-6">
        <SkeletonBlock className="h-4 w-36" />
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {Array.from({ length: 3 }, (_, index) => (
            <SkeletonBlock className="h-24 rounded-2xl" key={index} />
          ))}
        </div>
      </div>
    </div>
  );
}
