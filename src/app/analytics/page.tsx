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
        if (!cancelled) setEvidenceError(getErrorMessage(requestError, "Unable to load comparable assessment evidence."));
      })
      .finally(() => {
        if (!cancelled) setEvidenceLoading(false);
      });
    return () => { cancelled = true; };
  }, [selectedTemplateId]);

  return (
    <AppShell
      active="analytics"
      description="Aggregate outcomes and comparable assessment evidence. Operational work remains on Overview."
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
  const selectedTemplate = usage.find((item) => item.templateId === selectedTemplateId);
  const reportCount = scoreDistribution.reduce((total, item) => total + item.count, 0);
  const completionPercent = ratePercent(summary.closedCompletionRate);
  const coveragePercent = ratePercent(summary.reportCoverageRate);

  return (
    <div className="space-y-6">
      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
          <OverviewCard
            accent="var(--color-chart-1)"
            detail={`${summary.completedAssessments} completed of ${summary.closedAssessments} completed + expired sessions`}
            icon="check"
            label="Closed-session completion"
            progress={completionPercent}
            tone="text-[var(--color-chart-1)]"
            value={completionPercent === null ? "—" : `${Math.round(completionPercent)}%`}
          />
          <OverviewCard
            accent="var(--color-chart-2)"
            detail={`${summary.reportReadyAssessments} reports across ${summary.completedAssessments} completed sessions`}
            icon="report"
            label="Report coverage"
            progress={coveragePercent}
            tone="text-[var(--color-chart-2)]"
            value={coveragePercent === null ? "—" : `${Math.round(coveragePercent)}%`}
          />
        </div>
        <ChartCard caption="Average overall score of reports persisted that day" title={trendTitle(trend)}>
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
          caption={`${summary.totalSessions} authorized sessions · current status snapshot`}
          title={`${summary.completedAssessments} of ${summary.totalSessions} sessions are completed`}
        >
          <StatusBars summary={summary} />
        </ChartCard>
      </section>

      <section>
        <div className="flex flex-col gap-3 rounded-[10px] border border-[var(--theme-border)] bg-[var(--theme-panel)] p-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.12em] text-[var(--color-primary-700)]">Comparable evidence</p>
            <h2 className="mt-1 text-base font-extrabold text-[var(--theme-heading)]">Compare one exact assessment template</h2>
            <p className="mt-1 text-xs text-[var(--theme-muted)]">Different template IDs are never mixed. Historical template edits are not versioned yet, so interpret edited templates cautiously.</p>
          </div>
          <label className="min-w-0 sm:w-[320px]">
            <span className="mb-1 block text-xs font-bold text-[var(--theme-muted)]">Assessment template</span>
            <select className="control h-10 text-sm" disabled={!usage.length} onChange={(event) => onTemplateChange(event.target.value)} value={selectedTemplateId}>
              {usage.length ? usage.map((item) => <option key={item.templateId} value={item.templateId}>{item.title}</option>) : <option value="">No assigned templates</option>}
            </select>
          </label>
        </div>

        {!usage.length ? (
          <div className="mt-5"><EmptyState description="Assign an assessment template to begin building comparable evidence." title="No template usage yet" /></div>
        ) : evidenceLoading ? (
          <PageLoader label="Loading comparable evidence" />
        ) : evidenceError ? (
          <div className="mt-5"><ErrorState message={evidenceError} /></div>
        ) : (
          <div className="mt-5 grid gap-5 xl:grid-cols-2">
            <ChartCard
              caption={`${selectedTemplate?.title ?? "Selected template"} · all time · n=${reportCount} reports${reportCount > 0 && reportCount < 5 ? " · small sample" : ""}`}
              title={scoreTitle(scoreDistribution, reportCount)}
            >
              <ScoreBars buckets={scoreDistribution} />
            </ChartCard>
            <ChartCard
              caption="Persisted evaluations only; each row shows its evidence count"
              title={moduleTitle(modulePerformance)}
            >
              <ModuleBars modules={modulePerformance} />
            </ChartCard>
            <ChartCard
              caption="Completed sessions with valid start and completion timestamps"
              className="xl:col-span-2"
              title={durationTitle(duration)}
            >
              <CountBars items={duration?.buckets ?? []} />
            </ChartCard>
          </div>
        )}
      </section>

      <section>
        <SectionHeading description="All authorized assignments" title="Usage context" />
        <div className="mt-3">
          <ChartCard caption="Assignment volume is context, not candidate performance" title={usageTitle(usage)}>
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
      <h2 className="text-base font-extrabold text-[var(--theme-heading)]">{title}</h2>
      <p className="text-xs font-medium text-[var(--theme-faint)]">{description}</p>
    </div>
  );
}

function ChartCard({ title, caption, className = "", children }: { title: string; caption: string; className?: string; children: React.ReactNode }) {
  return (
    <article className={`card rounded-[10px] p-4 sm:p-5 ${className}`}>
      <h3 className="text-sm font-extrabold text-[var(--theme-heading)]">{title}</h3>
      <p className="mt-1 text-xs text-[var(--theme-muted)]">{caption}</p>
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
  if (!modules.length) return <EmptyState description="Module comparisons appear after evaluations are persisted for this template." title="No module evidence yet" />;
  return (
    <BarBreakdown
      data={modules.map((module) => ({
        label: `${module.title} · n=${module.evaluationCount}`,
        value: Number(module.average.toFixed(1)),
        color: "var(--color-chart-1)",
        hint: `${module.title}: ${module.average.toFixed(1)} of 5 across ${module.evaluationCount} evaluation(s)`,
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

function UsageList({ usage }: { usage: TemplateUsageItem[] }) {
  if (!usage.length) return <EmptyState description="Template assignments will appear here." title="No template usage yet" />;
  return (
    <BarBreakdown
      data={usage.map((item) => ({
        label: item.title,
        value: item.assignments,
        color: "var(--color-chart-1)",
        hint: `${item.title}: ${item.assignments} assigned, ${item.completed} completed`,
      }))}
    />
  );
}

function ratePercent(rate: number | null) { return rate == null ? null : rate * 100; }

function scoreTitle(buckets: ScoreDistributionBucket[], count: number) {
  if (!count) return "No persisted score evidence for this template yet";
  const high = buckets.find((item) => item.label === "4.0-5.0")?.count ?? 0;
  return `${high} of ${count} reports score 4.0 or above`;
}

function moduleTitle(modules: ModulePerformance[]) {
  if (!modules.length) return "No persisted module evidence for this template yet";
  const highest = [...modules].sort((a, b) => b.average - a.average)[0];
  return `${highest.title} is highest at ${highest.average.toFixed(1)}/5 (n=${highest.evaluationCount})`;
}

function durationTitle(duration: CompletionDuration | null) {
  return duration?.medianMinutes == null
    ? "No valid completion-duration evidence yet"
    : `Median completion is ${duration.medianMinutes} minutes (n=${duration.sampleSize})`;
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
