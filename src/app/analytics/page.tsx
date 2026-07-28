"use client";

import { useCallback, useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { BarBreakdown, DataTable, Histogram, PipelineBar, TrendChart, type TrendPoint } from "@/components/charts";
import { OverviewCard } from "@/components/overview-card";
import { EmptyState, ErrorState, PageLoader } from "@/components/ui-states";
import { apiGet, getErrorMessage } from "@/lib/api";
import type {
  AnalyticsSummary,
  CompletionDuration,
  ModulePerformance,
  ScoreDistributionBucket,
  SessionStatus,
  TemplateUsageItem,
} from "@/lib/types";

/** One validated hue per lifecycle state — see --color-state-* in globals.css. */
const STATUS_META: Record<SessionStatus, { label: string; color: string }> = {
  not_started: { label: "Not started", color: "var(--color-state-not-started)" },
  in_progress: { label: "In progress", color: "var(--color-state-in-progress)" },
  completed: { label: "Completed", color: "var(--color-state-completed)" },
  expired: { label: "Expired", color: "var(--color-state-expired)" },
};

const STATUS_ORDER: SessionStatus[] = ["not_started", "in_progress", "completed", "expired"];

export default function AnalyticsPage() {
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [usage, setUsage] = useState<TemplateUsageItem[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [scoreDistribution, setScoreDistribution] = useState<ScoreDistributionBucket[]>([]);
  const [modulePerformance, setModulePerformance] = useState<ModulePerformance[]>([]);
  const [duration, setDuration] = useState<CompletionDuration | null>(null);
  const [trend, setTrend] = useState<TrendPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [evidenceLoading, setEvidenceLoading] = useState(false);
  const [error, setError] = useState("");
  const [evidenceError, setEvidenceError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [nextSummary, nextUsage, nextTrend] = await Promise.all([
        apiGet<AnalyticsSummary>("/analytics/summary"),
        apiGet<TemplateUsageItem[]>("/analytics/template-usage"),
        apiGet<TrendPoint[]>("/analytics/trend").catch(() => [] as TrendPoint[]),
      ]);
      setSummary(nextSummary);
      setUsage(nextUsage);
      setTrend(nextTrend);
      setSelectedTemplateId((current) => (
        current && nextUsage.some((item) => item.templateId === current)
          ? current
          : nextUsage[0]?.templateId ?? ""
      ));
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    if (!selectedTemplateId) {
      setScoreDistribution([]);
      setModulePerformance([]);
      setDuration(null);
      return;
    }
    let cancelled = false;
    const templateId = encodeURIComponent(selectedTemplateId);
    setEvidenceLoading(true);
    setEvidenceError("");
    void Promise.all([
      apiGet<ScoreDistributionBucket[]>(`/analytics/score-distribution?templateId=${templateId}`),
      apiGet<ModulePerformance[]>(`/analytics/module-performance?templateId=${templateId}`),
      apiGet<CompletionDuration>(`/analytics/completion-duration?templateId=${templateId}`),
    ])
      .then(([nextScores, nextModules, nextDuration]) => {
        if (cancelled) return;
        setScoreDistribution(nextScores);
        setModulePerformance(nextModules);
        setDuration(nextDuration);
      })
      .catch((requestError) => {
        if (!cancelled) setEvidenceError(getErrorMessage(requestError, "Unable to load results for this assessment."));
      })
      .finally(() => {
        if (!cancelled) setEvidenceLoading(false);
      });
    return () => { cancelled = true; };
  }, [selectedTemplateId]);

  return (
    <AppShell
      active="analytics"
      description="How candidates are performing overall. Day-to-day work lives on Overview."
      title="Analytics"
    >
      {loading ? <PageLoader label="Loading analytics" /> : null}
      {!loading && error ? <ErrorState message={error} onRetry={() => void load()} /> : null}
      {!loading && !error && summary ? (
        <AnalyticsContent
          duration={duration}
          evidenceError={evidenceError}
          evidenceLoading={evidenceLoading}
          modulePerformance={modulePerformance}
          onTemplateChange={setSelectedTemplateId}
          scoreDistribution={scoreDistribution}
          selectedTemplateId={selectedTemplateId}
          summary={summary}
          trend={trend}
          usage={usage}
        />
      ) : null}
    </AppShell>
  );
}

function AnalyticsContent({
  summary,
  usage,
  selectedTemplateId,
  onTemplateChange,
  scoreDistribution,
  modulePerformance,
  duration,
  evidenceLoading,
  evidenceError,
  trend,
}: {
  summary: AnalyticsSummary;
  usage: TemplateUsageItem[];
  selectedTemplateId: string;
  onTemplateChange: (value: string) => void;
  scoreDistribution: ScoreDistributionBucket[];
  modulePerformance: ModulePerformance[];
  duration: CompletionDuration | null;
  evidenceLoading: boolean;
  evidenceError: string;
  trend: TrendPoint[];
}) {
  const reportCount = scoreDistribution.reduce((total, item) => total + item.count, 0);
  const completionPercent = ratePercent(summary.closedCompletionRate);
  const coveragePercent = ratePercent(summary.reportCoverageRate);

  return (
    <div className="space-y-6">
      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
          <OverviewCard
            accent="var(--color-chart-1)"
            detail={`${summary.completedAssessments} of ${summary.closedAssessments} candidates finished before their window closed`}
            icon="check"
            label="Candidates who finished"
            progress={completionPercent}
            tone="text-[var(--color-chart-1)]"
            value={completionPercent === null ? "—" : `${Math.round(completionPercent)}%`}
          />
          <OverviewCard
            accent="var(--color-chart-2)"
            detail={`${summary.reportReadyAssessments} of ${summary.completedAssessments} completed assessments have a report`}
            icon="report"
            label="Reports ready"
            progress={coveragePercent}
            tone="text-[var(--color-chart-2)]"
            value={coveragePercent === null ? "—" : `${Math.round(coveragePercent)}%`}
          />
        </div>
        <ChartCard caption="Average score of assessments completed each day" title={trendTitle(trend)}>
          {trend.length > 1 ? (
            <TrendChart points={trend} />
          ) : (
            <EmptyState
              description="A trend needs completed assessments on more than one day."
              title="Not enough history yet"
            />
          )}
        </ChartCard>
      </section>

      <section>
        <ChartCard
          caption="Every assessment you have sent, by where it stands right now"
          title={`${summary.completedAssessments} of ${summary.totalSessions} assessments are complete`}
        >
          <StatusBars summary={summary} />
        </ChartCard>
      </section>

      <section>
        <div className="flex flex-col gap-3 rounded-[10px] border border-[var(--theme-border)] bg-[var(--theme-panel)] p-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-[15px] font-extrabold text-[var(--theme-heading)]">Results by assessment</h2>
            <p className="mt-1 text-[11px] leading-4 text-[var(--theme-muted)]">Candidates are only compared against others who took the same assessment.</p>
          </div>
          <label className="min-w-0 sm:w-[320px]">
            <span className="mb-1 block text-[10px] font-bold text-[var(--theme-muted)]">Assessment template</span>
            <select className="control h-10 text-[12px]" disabled={!usage.length} onChange={(event) => onTemplateChange(event.target.value)} value={selectedTemplateId}>
              {usage.length ? usage.map((item) => <option key={item.templateId} value={item.templateId}>{item.title}</option>) : <option value="">No assigned templates</option>}
            </select>
          </label>
        </div>

        {!usage.length ? (
          <div className="mt-5"><EmptyState description="Assign an assessment to a candidate to start seeing results here." title="No results yet" /></div>
        ) : evidenceLoading ? (
          <PageLoader label="Loading results" />
        ) : evidenceError ? (
          <div className="mt-5"><ErrorState message={evidenceError} /></div>
        ) : (
          <div className="mt-5 grid gap-5 xl:grid-cols-2">
            <ChartCard
              caption={sampleNote(reportCount, "completed assessment")}
              title={scoreTitle(scoreDistribution, reportCount)}
            >
              <ScoreBars buckets={scoreDistribution} />
            </ChartCard>
            <ChartCard
              caption={sampleNote(moduleSampleSize(modulePerformance), "completed assessment")}
              title={moduleTitle(modulePerformance)}
            >
              <ModuleBars modules={modulePerformance} />
            </ChartCard>
            <ChartCard
              caption={sampleNote(duration?.sampleSize ?? 0, "completed assessment")}
              className="xl:col-span-2"
              title={durationTitle(duration)}
            >
              <CountBars items={duration?.buckets ?? []} />
            </ChartCard>
          </div>
        )}
      </section>

      <section>
        <SectionHeading description="How often each assessment is used" title="Assessments in use" />
        <div className="mt-3">
          <ChartCard caption="How often each assessment is sent — not how candidates performed" title={usageTitle(usage)}>
            <UsageList usage={usage} />
          </ChartCard>
        </div>
      </section>
    </div>
  );
}

function SectionHeading({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-2">
      <h2 className="text-[15px] font-extrabold text-[var(--theme-heading)]">{title}</h2>
      <p className="text-[10px] font-medium text-[var(--theme-faint)]">{description}</p>
    </div>
  );
}

function ChartCard({ title, caption, className = "", children }: { title: string; caption: string; className?: string; children: React.ReactNode }) {
  return (
    <article className={`card rounded-[10px] p-4 sm:p-5 ${className}`}>
      <h3 className="text-[14px] font-extrabold leading-5 text-[var(--theme-heading)]">{title}</h3>
      <p className="mt-1 text-[10px] leading-4 text-[var(--theme-muted)]">{caption}</p>
      <div className="mt-4">{children}</div>
    </article>
  );
}

function StatusBars({ summary }: { summary: AnalyticsSummary }) {
  const counts = new Map(summary.statusBreakdown.map((row) => [row.status, row.count]));
  const segments = STATUS_ORDER.map((status) => ({
    label: STATUS_META[status].label,
    value: counts.get(status) ?? 0,
    color: STATUS_META[status].color,
  }));
  if (!summary.totalSessions) return <EmptyState description="Authorize a session to populate this snapshot." title="No sessions yet" />;
  return (
    <>
      <PipelineBar segments={segments} />
      <DataTable caption="Sessions by status" rows={segments.map((segment) => ({ label: segment.label, value: segment.value }))} />
    </>
  );
}

/** Score bins are ordered, so they read as columns left-to-right, not as rows. */
function ScoreBars({ buckets }: { buckets: ScoreDistributionBucket[] }) {
  if (!buckets.some((item) => item.count > 0)) return <EmptyState description="Scores appear after reports are persisted for this template." title="No score evidence yet" />;
  return (
    <>
      <Histogram bins={buckets.map((item) => ({ label: item.label, count: item.count, muted: item.noEvidence }))} />
      <DataTable caption="Reports per score band" rows={buckets.map((item) => ({ label: item.label, value: item.count }))} />
    </>
  );
}

function ModuleBars({ modules }: { modules: ModulePerformance[] }) {
  if (!modules.length) return <EmptyState description="Module scores appear once candidates finish this assessment." title="No module scores yet" />;
  // The evaluation count lives on the card's caption and in each row's tooltip,
  // not stamped onto every label — it is the same number six times over.
  return (
    <BarBreakdown
      data={modules.map((module) => ({
        label: module.title,
        value: module.average,
        display: fmtScore(module.average),
        color: "var(--color-chart-1)",
        hint: `${module.title}: ${fmtScore(module.average)} of 5, from ${module.evaluationCount} assessment(s)`,
      }))}
      showPercent={false}
      total={5}
      valueSuffix="/5"
    />
  );
}

/** Duration buckets are ordered ranges — another histogram, in the second hue. */
function CountBars({ items }: { items: Array<{ label: string; count: number }> }) {
  if (!items.some((item) => item.count > 0)) return <EmptyState description="Duration needs completed sessions with valid start and completion timestamps." title="No duration evidence yet" />;
  return (
    <>
      <Histogram bins={items} color="var(--color-chart-2)" height={120} />
      <DataTable caption="Completed sessions per duration band" rows={items.map((item) => ({ label: item.label, value: item.count }))} />
    </>
  );
}

/**
 * Assignment counts here are small (often 1–2), and templates frequently share
 * a title. Full-width bars made every row look identical, so this is a compact
 * table: the numbers do the work and a short bar carries the relative volume.
 */
function UsageList({ usage }: { usage: TemplateUsageItem[] }) {
  if (!usage.length) return <EmptyState description="Assign a template to a candidate to see it here." title="No templates assigned yet" />;
  const max = Math.max(1, ...usage.map((item) => item.assignments));
  const duplicateTitles = new Set(
    usage.map((item) => item.title).filter((title, index, all) => all.indexOf(title) !== index),
  );
  const seen = new Map<string, number>();

  return (
    <ul className="divide-y divide-[var(--theme-border)]">
      {usage.map((item) => {
        // Same-named templates are indistinguishable otherwise; number them.
        const ordinal = (seen.get(item.title) ?? 0) + 1;
        seen.set(item.title, ordinal);
        const label = duplicateTitles.has(item.title) ? `${item.title} (${ordinal})` : item.title;
        return (
          <li className="flex items-center gap-4 py-2.5 first:pt-0 last:pb-0" key={item.templateId}>
            <span className="min-w-0 flex-1 truncate text-[12px] font-semibold text-[var(--theme-text)]" title={item.title}>
              {label}
            </span>
            <span className="h-1.5 w-16 shrink-0 overflow-hidden rounded-full bg-[var(--theme-panel-soft)] sm:w-24">
              <span
                className="block h-full rounded-full"
                style={{ width: `${(item.assignments / max) * 100}%`, background: "var(--color-chart-1)" }}
              />
            </span>
            <span className="w-28 shrink-0 text-right text-[11px] tabular-nums text-[var(--theme-muted)]">
              <span className="font-bold text-[var(--theme-heading)]">{item.assignments}</span> sent ·{" "}
              <span className="font-bold text-[var(--theme-heading)]">{item.completed}</span> done
            </span>
          </li>
        );
      })}
    </ul>
  );
}

function ratePercent(rate: number | null) { return rate == null ? null : rate * 100; }

function scoreTitle(buckets: ScoreDistributionBucket[], count: number) {
  if (!count) return "No persisted score evidence for this template yet";
  const high = buckets.find((item) => item.label === "4.0-5.0")?.count ?? 0;
  return `${high} of ${count} reports score 4.0 or above`;
}

function moduleTitle(modules: ModulePerformance[]) {
  if (!modules.length) return "No module scores yet";
  const sorted = [...modules].sort((a, b) => b.average - a.average);
  const best = sorted[0];
  const worst = sorted[sorted.length - 1];
  // Naming a "highest" when every module scored the same is a false finding —
  // it reads as a real difference that the numbers do not support.
  if (best.average === worst.average) {
    return modules.length === 1
      ? `${best.title} scored ${fmtScore(best.average)} out of 5`
      : `All ${modules.length} modules scored ${fmtScore(best.average)} out of 5`;
  }
  return `${best.title} scored highest at ${fmtScore(best.average)} out of 5`;
}

function durationTitle(duration: CompletionDuration | null) {
  return duration?.medianMinutes == null
    ? "No completion times recorded yet"
    : `Candidates take ${duration.medianMinutes} minutes on average`;
}

function moduleSampleSize(modules: ModulePerformance[]) {
  return modules.length ? Math.max(...modules.map((module) => module.evaluationCount)) : 0;
}

function fmtScore(value: number) {
  return value.toFixed(1);
}

/** One plain-language sample note per card, instead of "n=" on every row. */
function sampleNote(count: number, noun: string) {
  if (count === 0) return `No ${noun}s yet`;
  const base = `Based on ${count} ${noun}${count === 1 ? "" : "s"}`;
  return count < 5 ? `${base} — too few to draw firm conclusions` : base;
}

function trendTitle(trend: TrendPoint[]) {
  if (trend.length < 2) return "Score trend needs more completed assessments";
  const first = trend[0].score;
  const last = trend[trend.length - 1].score;
  const delta = Math.round(last - first);
  if (delta === 0) return `Average score is flat at ${last} across ${trend.length} days`;
  return `Average score ${delta > 0 ? "rose" : "fell"} ${Math.abs(delta)} points to ${last} over ${trend.length} days`;
}

function usageTitle(usage: TemplateUsageItem[]) {
  if (!usage.length) return "No template assignments yet";
  const total = usage.reduce((sum, item) => sum + item.assignments, 0);
  return `${usage[0].title} accounts for ${usage[0].assignments} of ${total} assignments`;
}
