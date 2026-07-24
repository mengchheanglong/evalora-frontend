"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { FilterPanelFrame, FilterSelectField, FilterToggleButton } from "@/components/filter-controls";
import { Icon, type IconName } from "@/components/icons";
import { EmptyState, ErrorState, PageLoader } from "@/components/ui-states";
import { apiDelete, apiGet, getErrorMessage } from "@/lib/api";
import { candidateAvatarTone, candidateInitials } from "@/lib/candidate-avatars";
import type { InterviewSession, SessionStatus } from "@/lib/types";

const CANDIDATES_PER_PAGE = 8;

export default function CandidatesPage() {
  const [sessions, setSessions] = useState<InterviewSession[]>([]);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | SessionStatus>("all");
  const [positionFilter, setPositionFilter] = useState("all");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [scoreMin, setScoreMin] = useState("");
  const [scoreMax, setScoreMax] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [pagination, setPagination] = useState({ filterKey: "", page: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadCandidates = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setSessions(await apiGet<InterviewSession[]>("/sessions"));
      setQuery(new URLSearchParams(window.location.search).get("q") ?? "");
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadCandidates(); }, [loadCandidates]);

  const positions = useMemo(
    () => uniqueValues(sessions.map((session) => session.targetRole)),
    [sessions],
  );
  const departments = useMemo(
    () => uniqueValues(sessions.map((session) => session.department)),
    [sessions],
  );

  const removeCandidate = useCallback(async (session: InterviewSession) => {
    if (!window.confirm(`Delete ${session.candidateName}'s assessment record? This permanently removes the session, saved responses, and any report.`)) return;
    setDeletingId(session.id);
    setError("");
    try {
      await apiDelete(`/sessions/${session.id}`);
      setSessions((current) => current.filter((item) => item.id !== session.id));
    } catch (requestError) {
      setError(getErrorMessage(requestError, "Could not delete this candidate. Please try again."));
    } finally {
      setDeletingId(null);
    }
  }, []);

  const visible = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const fromMs = dateFrom ? new Date(`${dateFrom}T00:00:00`).getTime() : null;
    const toMs = dateTo ? new Date(`${dateTo}T23:59:59.999`).getTime() : null;
    const minimumScore = scoreMin === "" ? null : Number(scoreMin);
    const maximumScore = scoreMax === "" ? null : Number(scoreMax);
    return sessions.filter((session) => {
      const score = normalizedScore(session.overallScore);
      return (!normalized || [session.candidateName, session.candidateEmail ?? "", session.targetRole ?? "", session.templateTitle ?? ""].some((value) => value.toLowerCase().includes(normalized)))
        && (statusFilter === "all" || session.status === statusFilter)
        && (positionFilter === "all" || session.targetRole === positionFilter)
        && (departmentFilter === "all" || session.department === departmentFilter)
        && withinDateRange(session.createdAt, fromMs, toMs)
        && (minimumScore === null || (score !== null && score >= minimumScore))
        && (maximumScore === null || (score !== null && score <= maximumScore));
    });
  }, [query, sessions, statusFilter, positionFilter, departmentFilter, dateFrom, dateTo, scoreMin, scoreMax]);

  const activeFilterCount = [
    statusFilter !== "all",
    positionFilter !== "all",
    departmentFilter !== "all",
    dateFrom !== "",
    dateTo !== "",
    scoreMin !== "",
    scoreMax !== "",
  ].filter(Boolean).length;
  const filterKey = [query, statusFilter, positionFilter, departmentFilter, dateFrom, dateTo, scoreMin, scoreMax].join("\u0000");
  const pageCount = Math.max(1, Math.ceil(visible.length / CANDIDATES_PER_PAGE));
  const currentPage = pagination.filterKey === filterKey ? Math.min(pagination.page, pageCount) : 1;
  const paginatedCandidates = visible.slice((currentPage - 1) * CANDIDATES_PER_PAGE, currentPage * CANDIDATES_PER_PAGE);

  const clearAllFilters = useCallback(() => {
    setStatusFilter("all");
    setPositionFilter("all");
    setDepartmentFilter("all");
    setDateFrom("");
    setDateTo("");
    setScoreMin("");
    setScoreMax("");
    setPagination({ filterKey: "", page: 1 });
  }, []);

  return (
    <AppShell
      active="candidates"
      actions={
        <Link 
           className="flex h-10 items-center justify-center gap-1 rounded-lg border border-[var(--color-primary-500)] bg-[var(--color-primary-500)] px-5 text-[var(--text-caption)] font-bold text-[var(--theme-panel)] shadow-sm transition hover:border-[var(--color-primary-600)] hover:bg-[var(--color-primary-600)] focus:outline-none focus:ring-2 focus:ring-[var(--theme-ring)]"
          href="/assessment/create"
        >
          <Icon name="plus" size={15} /> Invite candidate
        </Link>
      }
      description="View and manage all candidates across your organization."
      title="Candidates"
    >
      {loading ? <PageLoader label="Loading candidates" /> : null}
      {!loading && error ? <ErrorState message={error} onRetry={() => void loadCandidates()} /> : null}
      {!loading && !error ? (
        <div className="space-y-4">
          <CandidateStats sessions={sessions} />
          <section className="card overflow-hidden rounded-xl border-[var(--theme-border)] shadow-[var(--shadow-card)]">
              <div className="flex flex-wrap items-center gap-3 border-b border-[var(--theme-border)] px-4 py-2.5 sm:px-5">
                <label className="group flex h-9 min-w-[220px] flex-1 items-center gap-2 rounded-[7px] border border-[var(--color-primary-300)]/70 bg-[var(--color-primary-50)]/70 px-3 text-[var(--color-primary-700)] shadow-[inset_0_1px_0_rgba(255,255,255,0.55)] transition focus-within:border-[var(--color-primary-500)] focus-within:bg-[var(--theme-panel)] focus-within:ring-4 focus-within:ring-[var(--theme-ring)] sm:max-w-[360px]">
                  <span className="sr-only">Search candidates</span>
                  <input className="min-w-0 flex-1 border-0 bg-transparent text-xs font-medium text-[var(--theme-text)] outline-none placeholder:text-[var(--theme-muted)]" onChange={(event) => setQuery(event.target.value)} placeholder="Search candidates..." type="search" value={query} />
                  <Icon className="pointer-events-none relative -top-px shrink-0 text-[var(--color-primary-700)]/70 transition group-focus-within:text-[var(--color-primary-700)]" name="search" size={15} />
                </label>
                <span className="ml-auto hidden text-[11px] font-semibold text-[var(--theme-faint)] sm:inline">
                  {visible.length} {visible.length === 1 ? "candidate" : "candidates"}
                </span>
                <FilterToggleButton activeCount={activeFilterCount} controls="candidate-filters" onToggle={() => setFiltersOpen((open) => !open)} open={filtersOpen} subject="candidate" />
              </div>
              <div hidden={!filtersOpen} id="candidate-filters">
                  <FiltersPanel
                    dateFrom={dateFrom}
                    dateTo={dateTo}
                    departmentFilter={departmentFilter}
                    departments={departments}
                    onClearAll={clearAllFilters}
                    positionFilter={positionFilter}
                    positions={positions}
                    scoreMax={scoreMax}
                    scoreMin={scoreMin}
                    setDateFrom={setDateFrom}
                    setDateTo={setDateTo}
                    setDepartmentFilter={setDepartmentFilter}
                    setPositionFilter={setPositionFilter}
                    setScoreMax={setScoreMax}
                    setScoreMin={setScoreMin}
                    setStatusFilter={setStatusFilter}
                    statusFilter={statusFilter}
                  />
              </div>
              {visible.length ? (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[860px] text-left text-xs">
                      <thead className="bg-[var(--theme-panel-soft)] text-[10px] font-semibold uppercase tracking-wide text-[var(--theme-faint)]">
                        <tr className="border-b border-[var(--theme-border)]">
                          <th className="px-3 py-2.5 pl-4 sm:pl-5">Candidate</th>
                          <th className="px-3 py-2.5">Position</th>
                          <th className="px-3 py-2.5">Latest Session</th>
                          <th className="px-3 py-2.5">Status</th>
                          <th className="px-3 py-2.5">Overall Score</th>
                          <th className="px-3 py-2.5">Added On</th>
                          <th className="px-3 py-2.5 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--theme-border)]">
                        {paginatedCandidates.map((session) => (
                          <tr className="transition hover:bg-[var(--theme-panel-soft)]/70" key={session.id}>
                            <td className="px-3 py-2.5 pl-4 sm:pl-5">
                              <div className="flex items-center gap-2.5">
                                <span className={`flex size-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-linear-to-br text-[10px] font-bold ${candidateAvatarTone(session.candidateName)}`}>
                                  {candidateInitials(session.candidateName)}
                                </span>
                                <Link className="group" href={`/candidates/${session.id}`}>
                                <span>
                                  <span className="block text-xs font-semibold text-[var(--theme-heading)] group-hover:text-[var(--color-primary-700)]">{session.candidateName}</span>
                                  <span className="mt-0.5 block text-[11px] text-[var(--theme-muted)]">{session.candidateEmail ?? "No email"}</span>
                                </span>
                                </Link>
                              </div>
                            </td>
                            <td className="px-3 py-2.5 font-medium text-[var(--theme-text)]">{session.targetRole ?? "Not specified"}</td>
                            <td className="px-3 py-2.5"><p className="font-medium text-[var(--theme-text)]">{session.templateTitle ?? "Assessment"}</p><p className="mt-0.5 text-[11px] text-[var(--theme-faint)]">{formatDate(session.updatedAt ?? session.createdAt)}</p></td>
                            <td className="px-3 py-2.5"><StatusBadge status={session.status} /></td>
                            <td className="px-3 py-2.5"><ScoreCircle score={session.overallScore} /></td>
                            <td className="px-3 py-2.5 text-[11px] font-medium text-[var(--theme-muted)]">{formatDate(session.createdAt)}</td>
                            <td className="px-3 py-2.5">
                              <div className="flex justify-end gap-2">
                                <button aria-label={`Delete ${session.candidateName}`} className="flex size-7 items-center justify-center rounded-[6px] border border-[var(--theme-border)] text-[var(--theme-faint)] transition hover:border-[var(--theme-border-strong)] hover:bg-[var(--theme-panel-soft)] hover:text-[var(--theme-muted)] disabled:cursor-not-allowed disabled:opacity-50" disabled={deletingId === session.id} onClick={() => void removeCandidate(session)} type="button">{deletingId === session.id ? <span className="size-3 animate-spin rounded-full border-2 border-[var(--theme-border)] border-t-[var(--color-primary-500)]" /> : <Icon name="trash" size={13} />}</button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <Pagination
                    onPageChange={(page) => setPagination({ filterKey, page })}
                    page={currentPage}
                    pageSize={CANDIDATES_PER_PAGE}
                    total={visible.length}
                  />
                </>
              ) : <div className="p-5"><EmptyState action={!sessions.length ? <Link className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-[var(--color-primary-500)] text-[var(--theme-panel)] rounded-lg text-[var(--text-caption)] font-medium hover:bg-[var(--color-primary-600)] shadow-sm transition" href="/assessment/create">Invite first candidate</Link> : undefined} description={sessions.length ? "Try a different search or status filter." : "Candidate records are created automatically when you send an assessment invitation."} icon="users" title={sessions.length ? "No matching candidates" : "No candidates yet"} /></div>}
          </section>
        </div>
      ) : null}
    </AppShell>
  );
}

function CandidateStats({ sessions }: { sessions: InterviewSession[] }) {
  const totalCandidates = sessions.length;
  const completed = sessions.filter((session) => session.status === "completed").length;
  const inAssessment = sessions.filter((session) => session.status === "in_progress").length;
  const withdrawn = sessions.filter((session) => session.status === "expired").length;
  return (
    <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <Stat detail="All time" icon="users" label="Total Candidates" progress={100} tone="text-[var(--color-chart-1)]" accent="var(--color-chart-1)" value={totalCandidates} />
      <Stat detail={`${percent(inAssessment, totalCandidates)}% of total`} icon="clock" label="In Assessment" progress={percent(inAssessment, totalCandidates)} tone="text-amber-500" accent="#f59e0b" value={inAssessment} />
      <Stat detail={`${percent(completed, totalCandidates)}% of total`} icon="check" label="Completed" progress={percent(completed, totalCandidates)} tone="text-emerald-500" accent="#10b981" value={completed} />
      <Stat detail={`${percent(withdrawn, totalCandidates)}% of total`} icon="shield" label="Withdrawn / Rejected" progress={percent(withdrawn, totalCandidates)} tone="text-[var(--theme-muted)]" accent="var(--theme-muted)" value={withdrawn} />
    </section>
  );
}
function Stat({ label, value, detail, progress, icon, tone, accent }: {
  label: string; value: number; detail: string; progress: number; icon: IconName; tone: string; accent: string;
}) {
  const clampedProgress = Math.max(0, Math.min(100, progress));

  return (
    <article className="group rounded-xl border border-[var(--theme-border)] bg-[var(--theme-panel)] p-4 shadow-[var(--theme-shadow)] transition hover:-translate-y-0.5 hover:border-[var(--theme-border-strong)] hover:shadow-[0_12px_32px_rgba(15,23,42,0.12)]">
      <div className="flex items-start gap-3">
        <span
          className={`flex size-10 shrink-0 items-center justify-center rounded-[9px] border ${tone}`}
          style={{ backgroundColor: `color-mix(in srgb, ${accent} 12%, transparent)`, borderColor: `color-mix(in srgb, ${accent} 35%, transparent)` }}
        >
          <Icon name={icon} size={20} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[11px] font-bold text-[var(--theme-text)]">{label}</p>
          <p className="mt-1 text-xl font-extrabold leading-none text-[var(--theme-heading)]">{value.toLocaleString()}</p>
          <p className="mt-1.5 text-[10px] font-medium text-[var(--theme-muted)]">{detail}</p>
        </div>
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[var(--theme-panel-soft)]">
        <div className="h-full rounded-full" style={{ width: `${clampedProgress}%`, backgroundColor: accent }} />
      </div>
    </article>
  );
}

type FiltersPanelProps = {
  statusFilter: "all" | SessionStatus;
  setStatusFilter: (value: "all" | SessionStatus) => void;
  positionFilter: string;
  setPositionFilter: (value: string) => void;
  positions: string[];
  departmentFilter: string;
  setDepartmentFilter: (value: string) => void;
  departments: string[];
  dateFrom: string;
  dateTo: string;
  setDateFrom: (value: string) => void;
  setDateTo: (value: string) => void;
  scoreMin: string;
  scoreMax: string;
  setScoreMin: (value: string) => void;
  setScoreMax: (value: string) => void;
  onClearAll: () => void;
};

function FiltersPanel({
  statusFilter,
  setStatusFilter,
  positionFilter,
  setPositionFilter,
  positions,
  departmentFilter,
  setDepartmentFilter,
  departments,
  dateFrom,
  dateTo,
  setDateFrom,
  setDateTo,
  scoreMin,
  scoreMax,
  setScoreMin,
  setScoreMax,
  onClearAll,
}: FiltersPanelProps) {
  return (
    <FilterPanelFrame description="Results update as you make a selection." onClear={onClearAll} title="Filter candidates">
        <FilterSelectField label="Status" onChange={(value) => setStatusFilter(value as "all" | SessionStatus)} value={statusFilter}>
          <option value="all">All Statuses</option>
          <option value="not_started">Not Started</option>
          <option value="in_progress">In Assessment</option>
          <option value="completed">Completed</option>
          <option value="expired">Withdrawn / Rejected</option>
        </FilterSelectField>
        <FilterSelectField label="Position" onChange={setPositionFilter} value={positionFilter}>
          <option value="all">All Positions</option>
          {positions.map((position) => <option key={position} value={position}>{position}</option>)}
        </FilterSelectField>
        <FilterSelectField label="Department" onChange={setDepartmentFilter} value={departmentFilter}>
          <option value="all">All Departments</option>
          {departments.map((department) => <option key={department} value={department}>{department}</option>)}
        </FilterSelectField>
        <div className="rounded-[7px] border border-[var(--theme-border)] bg-[var(--theme-panel)] p-2.5">
          <p className="mb-1.5 text-[10px] font-bold text-[var(--theme-muted)]">Score range</p>
          <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2">
            <input aria-label="Minimum score" className="control h-8 min-w-0 rounded-[6px] px-2 text-[11px]" max={scoreMax || 100} min={0} onChange={(event) => setScoreMin(event.target.value)} placeholder="Min" type="number" value={scoreMin} />
            <span className="text-[var(--theme-faint)]">-</span>
            <input aria-label="Maximum score" className="control h-8 min-w-0 rounded-[6px] px-2 text-[11px]" max={100} min={scoreMin || 0} onChange={(event) => setScoreMax(event.target.value)} placeholder="Max" type="number" value={scoreMax} />
          </div>
        </div>
        <div className="rounded-[7px] border border-[var(--theme-border)] bg-[var(--theme-panel)] p-2.5 md:col-span-2 xl:col-span-2">
          <p className="mb-1.5 text-[10px] font-bold text-[var(--theme-muted)]">Added date</p>
          <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2">
            <input aria-label="Added from date" className="control h-8 min-w-0 rounded-[6px] px-2 text-[11px] [color-scheme:light]" max={dateTo || undefined} onChange={(event) => setDateFrom(event.target.value)} type="date" value={dateFrom} />
            <span className="text-[var(--theme-faint)]">-</span>
            <input aria-label="Added to date" className="control h-8 min-w-0 rounded-[6px] px-2 text-[11px] [color-scheme:light]" min={dateFrom || undefined} onChange={(event) => setDateTo(event.target.value)} type="date" value={dateTo} />
          </div>
        </div>
    </FilterPanelFrame>
  );
}

function Pagination({ total, page, pageSize, onPageChange }: { total: number; page: number; pageSize: number; onPageChange: (page: number) => void }) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const first = total ? (page - 1) * pageSize + 1 : 0;
  const last = Math.min(page * pageSize, total);
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--theme-border)] px-5 py-2.5">
      <p className="text-[11px] font-semibold text-[var(--theme-muted)]">Showing {first} to {last} of {total.toLocaleString()} candidates</p>
      <div className="flex items-center gap-2">
        <span className="mr-1 text-[10px] font-semibold text-[var(--theme-faint)]">{page} / {pageCount}</span>
        <button aria-label="Previous page" className="flex size-7 items-center justify-center rounded-[7px] border border-[var(--theme-border)] bg-[var(--theme-panel)] text-[var(--theme-text)] transition hover:bg-[var(--theme-panel-soft)] disabled:cursor-not-allowed disabled:opacity-50" disabled={page <= 1} onClick={() => onPageChange(page - 1)} type="button">
          <Icon className="rotate-90" name="chevron" size={13} />
        </button>
        <button aria-label="Next page" className="flex size-7 items-center justify-center rounded-[7px] border border-[var(--theme-border)] bg-[var(--theme-panel)] text-[var(--theme-text)] transition hover:border-[var(--theme-border-strong)] hover:bg-[var(--theme-panel-soft)] hover:text-[var(--color-primary-700)] disabled:cursor-not-allowed disabled:opacity-50" disabled={page >= pageCount} onClick={() => onPageChange(page + 1)} type="button">
          <Icon className="-rotate-90" name="chevron" size={13} />
        </button>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: SessionStatus }) {
  const style = { not_started: "bg-[var(--theme-panel-soft)] text-[var(--theme-muted)]", in_progress: "bg-[var(--theme-active)] text-[var(--theme-active-text)]", completed: "bg-[var(--color-primary-50)] text-[var(--color-primary-700)]", expired: "bg-[var(--theme-panel-soft)] text-[var(--theme-faint)]" }[status];
  const label = { not_started: "Not Started", in_progress: "In Assessment", completed: "Completed", expired: "Withdrawn" }[status];
  return <span className={`rounded-[5px] px-2 py-1 text-[10px] font-semibold ${style}`}>{label}</span>;
}
function ScoreCircle({ score }: { score?: number }) {
  if (score === undefined) return <span className="text-[var(--text-caption)] font-semibold text-[var(--theme-faint)]">-</span>;
  const value = Math.round(score <= 5 ? score * 20 : score);
  return (
    <span className="grid size-8 place-items-center rounded-full text-[10px] font-bold text-[var(--color-primary-700)]" style={{ background: `conic-gradient(var(--color-primary-500) ${value * 3.6}deg, var(--theme-panel-soft) 0deg)` }}>
      <span className="grid size-6 place-items-center rounded-full bg-[var(--theme-panel)]">{value}%</span>
    </span>
  );
}
function withinDateRange(value: string | undefined, fromMs: number | null, toMs: number | null) {
  if (fromMs === null && toMs === null) return true;
  if (!value) return false;
  const time = new Date(value).getTime();
  if (Number.isNaN(time)) return false;
  if (fromMs !== null && time < fromMs) return false;
  if (toMs !== null && time > toMs) return false;
  return true;
}
function normalizedScore(score: number | undefined) {
  if (score === undefined) return null;
  return Math.round(score <= 5 ? score * 20 : score);
}
function uniqueValues(values: Array<string | undefined>) {
  return [...new Set(values.filter((value): value is string => Boolean(value?.trim())).map((value) => value.trim()))].sort((a, b) => a.localeCompare(b));
}
function formatDate(value?: string) { return value ? new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(new Date(value)) : "-"; }
function percent(value: number, total: number) { return total ? Math.round((value / total) * 1000) / 10 : 0; }
