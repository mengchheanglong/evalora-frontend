"use client";

import { useCallback, useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
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

export default function AnalyticsPage() {
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [usage, setUsage] = useState<TemplateUsageItem[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [scoreDistribution, setScoreDistribution] = useState<ScoreDistributionBucket[]>([]);
  const [modulePerformance, setModulePerformance] = useState<ModulePerformance[]>([]);
  const [duration, setDuration] = useState<CompletionDuration | null>(null);
  const [loading, setLoading] = useState(true);
  const [evidenceLoading, setEvidenceLoading] = useState(false);
  const [error, setError] = useState("");
  const [evidenceError, setEvidenceError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [nextSummary, nextUsage] = await Promise.all([
        apiGet<AnalyticsSummary>("/analytics/summary"),
        apiGet<TemplateUsageItem[]>("/analytics/template-usage"),
      ]);
      setSummary(nextSummary);
      setUsage(nextUsage);
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
}) {
  const selectedTemplate = usage.find((item) => item.templateId === selectedTemplateId);
  const reportCount = scoreDistribution.reduce((total, item) => total + item.count, 0);
  const completionPercent = ratePercent(summary.closedCompletionRate);
  const coveragePercent = ratePercent(summary.reportCoverageRate);
  const storyTitle = summary.reportsPending > 0
    ? `${summary.reportsPending} completed ${summary.reportsPending === 1 ? "session still needs" : "sessions still need"} a persisted report.`
    : summary.completedAssessments > 0
      ? "Every completed session has a persisted report."
      : "There are no completed sessions to report yet.";

  return (
    <div className="space-y-6">
      <section className="rounded-[10px] border border-[var(--theme-border)] bg-[var(--theme-panel)] p-4 sm:p-5">
        <p className="text-[10px] font-black uppercase tracking-[0.12em] text-[var(--color-primary-700)]">All-time takeaway</p>
        <h2 className="mt-1 text-[17px] font-extrabold leading-6 text-[var(--theme-heading)]">{storyTitle}</h2>
        <p className="mt-1 text-[12px] leading-5 text-[var(--theme-muted)]">
          {summary.completedAssessments} of {summary.closedAssessments} closed sessions completed, while {summary.reportReadyAssessments} of {summary.completedAssessments} completed sessions have persisted reports.
        </p>
      </section>

      <section>
        <SectionHeading description={`All time · updated ${new Date(summary.asOf).toLocaleString()}`} title="Workflow health" />
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
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
        <div className="mt-5">
          <ChartCard
            caption={`${summary.totalSessions} authorized sessions · current status snapshot`}
            title={`${summary.completedAssessments} of ${summary.totalSessions} sessions are completed`}
          >
            <StatusBars summary={summary} />
          </ChartCard>
        </div>
      </section>

      <section>
        <div className="flex flex-col gap-3 rounded-[10px] border border-[var(--theme-border)] bg-[var(--theme-panel)] p-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.12em] text-[var(--color-primary-700)]">Comparable evidence</p>
            <h2 className="mt-1 text-[15px] font-extrabold text-[var(--theme-heading)]">Compare one exact assessment template</h2>
            <p className="mt-1 text-[11px] leading-4 text-[var(--theme-muted)]">Different template IDs are never mixed. Historical template edits are not versioned yet, so interpret edited templates cautiously.</p>
          </div>
          <label className="min-w-0 sm:w-[320px]">
            <span className="mb-1 block text-[10px] font-bold text-[var(--theme-muted)]">Assessment template</span>
            <select className="control h-10 text-[12px]" disabled={!usage.length} onChange={(event) => onTemplateChange(event.target.value)} value={selectedTemplateId}>
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
  const colors: Record<SessionStatus, string> = {
    completed: "var(--color-chart-1)",
    in_progress: "var(--color-chart-2)",
    not_started: "#f59e0b",
    expired: "var(--theme-faint)",
  };
  const labels: Record<SessionStatus, string> = { completed: "Completed", in_progress: "In progress", not_started: "Not started", expired: "Expired" };
  return (
    <div className="space-y-3">
      {summary.statusBreakdown.map((row) => {
        const percent = summary.totalSessions ? (row.count / summary.totalSessions) * 100 : 0;
        return (
          <div className="grid grid-cols-[92px_1fr_64px] items-center gap-3 text-[11px]" key={row.status}>
            <span className="font-semibold text-[var(--theme-text)]">{labels[row.status]}</span>
            <div className="h-2 overflow-hidden rounded-full bg-[var(--theme-panel-soft)]"><div className="h-full rounded-full" style={{ backgroundColor: colors[row.status], width: `${percent}%` }} /></div>
            <span className="text-right font-bold text-[var(--theme-heading)]">{row.count} · {Math.round(percent)}%</span>
          </div>
        );
      })}
    </div>
  );
}

function ScoreBars({ buckets }: { buckets: ScoreDistributionBucket[] }) {
  if (!buckets.some((item) => item.count > 0)) return <EmptyState description="Scores appear after reports are persisted for this template." title="No score evidence yet" />;
  const max = Math.max(1, ...buckets.map((item) => item.count));
  return <HorizontalBars items={buckets.map((item) => ({ ...item, color: item.noEvidence ? "var(--theme-faint)" : "var(--color-chart-1)" }))} max={max} />;
}

function ModuleBars({ modules }: { modules: ModulePerformance[] }) {
  if (!modules.length) return <EmptyState description="Module comparisons appear after evaluations are persisted for this template." title="No module evidence yet" />;
  return (
    <div className="space-y-3">
      {modules.map((module) => (
        <div key={module.moduleType}>
          <div className="mb-1.5 flex items-center justify-between gap-3 text-[11px]">
            <span className="font-semibold text-[var(--theme-text)]">{module.title}</span>
            <span className="font-bold text-[var(--theme-heading)]">{module.average.toFixed(1)}/5 · n={module.evaluationCount}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-[var(--theme-panel-soft)]"><div className="h-full rounded-full bg-[var(--color-chart-1)]" style={{ width: `${Math.max(0, Math.min(100, module.average * 20))}%` }} /></div>
        </div>
      ))}
    </div>
  );
}

function CountBars({ items }: { items: Array<{ label: string; count: number }> }) {
  if (!items.some((item) => item.count > 0)) return <EmptyState description="Duration needs completed sessions with valid start and completion timestamps." title="No duration evidence yet" />;
  return <HorizontalBars items={items.map((item) => ({ ...item, color: "var(--color-chart-2)" }))} max={Math.max(1, ...items.map((item) => item.count))} />;
}

function HorizontalBars({ items, max }: { items: Array<{ label: string; count: number; color: string }>; max: number }) {
  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div className="grid grid-cols-[minmax(110px,1fr)_2fr_32px] items-center gap-3 text-[11px]" key={item.label}>
          <span className="font-semibold text-[var(--theme-text)]">{item.label}</span>
          <div className="h-2 overflow-hidden rounded-full bg-[var(--theme-panel-soft)]"><div className="h-full rounded-full" style={{ backgroundColor: item.color, width: `${item.count ? (item.count / max) * 100 : 0}%` }} /></div>
          <span className="text-right font-bold text-[var(--theme-heading)]">{item.count}</span>
        </div>
      ))}
    </div>
  );
}

function UsageList({ usage }: { usage: TemplateUsageItem[] }) {
  if (!usage.length) return <EmptyState description="Template assignments will appear here." title="No template usage yet" />;
  const max = Math.max(1, ...usage.map((item) => item.assignments));
  return (
    <div className="space-y-3">
      {usage.map((item) => (
        <div key={item.templateId}>
          <div className="mb-1.5 flex items-center justify-between gap-3 text-[11px]">
            <span className="truncate font-semibold text-[var(--theme-text)]">{item.title}</span>
            <span className="shrink-0 font-bold text-[var(--theme-heading)]">{item.assignments} assigned · {item.completed} completed</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-[var(--theme-panel-soft)]"><div className="h-full rounded-full bg-[var(--color-chart-1)]" style={{ width: `${(item.assignments / max) * 100}%` }} /></div>
        </div>
      ))}
    </div>
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

function usageTitle(usage: TemplateUsageItem[]) {
  if (!usage.length) return "No template assignments yet";
  const total = usage.reduce((sum, item) => sum + item.assignments, 0);
  return `${usage[0].title} accounts for ${usage[0].assignments} of ${total} assignments`;
}