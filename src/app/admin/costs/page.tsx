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
      ) : null}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          color="#f59e0b"
          delta={<DeltaBadge changePct={comparisons.billableTurns.changePct} goodWhen="neutral" suffix="billable turns vs. previous 30 days" />}
          detail={`Since ${formatDate(overview.monthStart)} · ${ai.billableTurns.thisMonth.toLocaleString()} billable turns`}
          icon="sparkle"
          label="Spend, month to date"
          sparkline={activity.billableTurns}
          sparklineLabel="Billable AI turns per day, last 30 days"
          value={formatUsd(ai.estimatedCostUsd.thisMonth)}
        />
        <MetricCard
          color="#8b5cf6"
          detail="Month to date extrapolated linearly over the calendar month."
          icon="trend"
          label="Projected month end"
          value={formatUsd(ai.projectedMonthCostUsd)}
        />
        <MetricCard
          color="#0ea5e9"
          detail={`${providerLabel} · rate from AI_COST_PER_TURN_USD`}
          icon="analytics"
          label="Cost per turn"
          value={formatUsd(ai.costPerTurnUsd)}
        />
        <MetricCard
          color="var(--color-chart-1)"
          detail={`${billableUnits.toLocaleString()} billable ${billableUnits === 1 ? "unit" : "units"} across interviews and drafts`}
          icon="report"
          label="All-time spend"
          value={formatUsd(ai.estimatedCostUsd.allTime)}
        />
      </section>

      <div className="grid gap-5 xl:grid-cols-[1.5fr_1fr]">
        <Panel
          description={`Daily billable turns for ${formatDate(`${activity.days[0]}T00:00:00Z`)} to ${formatDate(`${activity.days[activity.days.length - 1]}T00:00:00Z`)}, UTC. Every turn is charged at ${formatUsd(ai.costPerTurnUsd)}.`}
          title="What we are billed for, last 30 days"
        >
          <ActivityChart
            activeKey="billableTurns"
            days={activity.days}
            onSelect={() => undefined}
            series={[{ key: "billableTurns", label: "Billable AI turns", values: activity.billableTurns, color: "#f59e0b" }]}
          />
        </Panel>

        <Panel description={providerLabel} title="What is driving spend">
          <UsageBreakdown
            rows={[
              { label: "Billable interview turns", month: ai.billableTurns.thisMonth, allTime: ai.billableTurns.allTime, color: "#f59e0b" },
              { label: "Template draft generations", month: ai.draftGenerations.thisMonth, allTime: ai.draftGenerations.allTime, color: "#8b5cf6" },
              { label: "Fallback turns (free)", month: Math.max(0, ai.interviewTurns.thisMonth - ai.billableTurns.thisMonth), allTime: Math.max(0, ai.interviewTurns.allTime - ai.billableTurns.allTime), color: "var(--theme-faint)" },
            ]}
          />
          <p className="mt-4 text-xs leading-5 text-[var(--theme-faint)]">{ai.methodology}</p>
        </Panel>
      </div>

      <Panel
        description={`${organizations.paidSubscriptions.toLocaleString()} active paid ${organizations.paidSubscriptions === 1 ? "subscription" : "subscriptions"} · ${organizations.newThisMonth.toLocaleString()} new this month`}
        title="Subscription plans"
      >
        <div className="grid gap-3 sm:grid-cols-3">
          {ADMIN_PLANS.map((plan) => {
            const count = organizations.byPlan[plan];
            const share = organizations.total ? (count / organizations.total) * 100 : 0;
            return (
              <Link
                className="block rounded-[8px] border border-[var(--theme-border)] p-3 transition hover:border-[var(--theme-border-strong)] hover:bg-[var(--theme-panel-tint)]"
                href={`${ADMIN_HOME}/organizations?plan=${plan}`}
                key={plan}
              >
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
    </div>
  );
}

function UsageBreakdown({ rows }: { rows: Array<{ label: string; month: number; allTime: number; color: string }> }) {
  const monthTotal = rows.reduce((sum, row) => sum + row.month, 0);
  return (
    <div>
      <div aria-hidden="true" className="flex h-2.5 w-full gap-0.5 overflow-hidden rounded-full bg-[var(--theme-panel-soft)]">
        {monthTotal > 0
          ? rows.filter((row) => row.month > 0).map((row) => <span key={row.label} className="h-full rounded-sm" style={{ width: `${(row.month / monthTotal) * 100}%`, backgroundColor: row.color }} />)
          : null}
      </div>
      <dl className="mt-3 space-y-1.5 text-xs">
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

function CostsSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading cost figures" className="space-y-5" role="status">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div className="card rounded-[10px] p-4" key={index}>
            <SkeletonBlock className="h-3 w-24" />
            <SkeletonBlock className="mt-4 h-8 w-20" />
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
          <SkeletonBlock className="h-4 w-40" />
          <SkeletonBlock className="mt-5 h-2.5 w-full" />
          <div className="mt-4 space-y-2">
            {Array.from({ length: 3 }, (_, index) => (
              <SkeletonBlock className="h-4" key={index} />
            ))}
          </div>
        </div>
      </div>
      <div className="card rounded-[10px] p-5">
        <SkeletonBlock className="h-4 w-36" />
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {Array.from({ length: 3 }, (_, index) => (
            <SkeletonBlock className="h-20" key={index} />
          ))}
        </div>
      </div>
    </div>
  );
}
