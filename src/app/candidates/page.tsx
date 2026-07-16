"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { AppShell } from "@/components/app-shell";
import { Icon, type IconName } from "@/components/icons";
import { EmptyState, ErrorState, PageLoader } from "@/components/ui-states";
import { apiDelete, apiGet, getErrorMessage } from "@/lib/api";
import { candidateAvatarTone, candidateInitials } from "@/lib/candidate-avatars";
import type { InterviewSession, SessionStatus } from "@/lib/types";

export default function CandidatesPage() {
  const [sessions, setSessions] = useState<InterviewSession[]>([]);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | SessionStatus>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
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
    return sessions.filter((session) =>
      (!normalized || [session.candidateName, session.candidateEmail ?? "", session.targetRole ?? "", session.templateTitle ?? ""].some((value) => value.toLowerCase().includes(normalized)))
      && (statusFilter === "all" || session.status === statusFilter)
      && withinDateRange(session.createdAt, fromMs, toMs),
    );
  }, [query, sessions, statusFilter, dateFrom, dateTo]);

  const clearAllFilters = useCallback(() => {
    setStatusFilter("all");
    setDateFrom("");
    setDateTo("");
  }, []);

  return (
    <AppShell
      active="candidates"
      actions={
        <Link className="flex items-center gap-2 px-4 py-2 bg-sky-500 text-white rounded-lg text-sm font-medium hover:bg-sky-600 shadow-sm hidden h-10 sm:inline-flex" href="/assessment/create">
          <Icon name="plus" size={15} /> Invite candidate
        </Link>
      }
      description="View and manage all candidates across your organization."
      title="Candidates"
    >
      {loading ? <PageLoader label="Loading candidates" /> : null}
      {!loading && error ? <ErrorState message={error} onRetry={() => void loadCandidates()} /> : null}
      {!loading && !error ? (
        <div className="space-y-5">
          <CandidateStats sessions={sessions} />
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">
            <section className="card overflow-hidden rounded-[10px]">
              <div className="flex flex-wrap items-center gap-3 border-b border-neutral-200 px-4 py-4 sm:px-5">
                <label className="group flex h-11 min-w-[230px] flex-1 items-center gap-2.5 rounded-[8px] border border-primary-300/70 bg-primary-50/70 px-3.5 text-primary-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.55)] transition focus-within:border-primary-500 focus-within:bg-white focus-within:ring-4 focus-within:ring-primary-500/15 sm:max-w-[340px]">
                  <span className="sr-only">Search candidates</span>
                  <input className="min-w-0 flex-1 border-0 bg-transparent text-[13px] font-medium text-neutral-800 outline-none placeholder:text-neutral-500" onChange={(event) => setQuery(event.target.value)} placeholder="Search candidates..." type="search" value={query} />
                  <Icon className="pointer-events-none relative -top-px shrink-0 text-primary-700/70 transition group-focus-within:text-primary-700" name="search" size={17} />
                </label>
                <label className="ml-auto flex shrink-0 items-center gap-2 text-[12px] font-semibold text-neutral-600">
                  <span className="whitespace-nowrap">Status:</span>
                  <select
                    className="control h-10 w-[140px] rounded-[7px] text-[12px]"
                    onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}
                    value={statusFilter}
                  >
                    <option value="all">All</option>
                    <option value="not_started">Not started</option>
                    <option value="in_progress">In progress</option>
                    <option value="completed">Completed</option>
                    <option value="expired">Expired</option>
                  </select>
                </label>
              </div>
              {visible.length ? (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[1040px] text-left text-[12px]">
                      <thead className="bg-white text-[11px] font-bold text-neutral-500">
                        <tr className="border-b border-neutral-100">
                          <th className="px-3 py-3 pl-4 sm:pl-5">Candidate</th>
                          <th className="px-3 py-3">Position</th>
                          <th className="px-3 py-3">Latest Session</th>
                          <th className="px-3 py-3">Status</th>
                          <th className="px-3 py-3">Overall Score</th>
                          <th className="px-3 py-3">Added On</th>
                          <th className="px-3 py-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-100">
                        {visible.map((session) => (
                          <tr className="transition hover:bg-neutral-50/70" key={session.id}>
                            <td className="px-3 py-4 pl-4 sm:pl-5">
                              <div className="flex items-center gap-3">
                                <span className={`flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br text-[10px] font-black ${candidateAvatarTone(session.candidateName)}`}>
                                  {candidateInitials(session.candidateName)}
                                </span>
                                <Link className="group" href={`/candidates/${session.id}`}>
                                <span>
                                  <span className="block font-bold text-neutral-900 group-hover:text-primary-700">{session.candidateName}</span>
                                  <span className="mt-0.5 block text-[11px] text-neutral-500">{session.candidateEmail ?? "No email"}</span>
                                </span>
                                </Link>
                              </div>
                            </td>
                            <td className="px-3 py-4 font-semibold text-neutral-700">{session.targetRole ?? "Not specified"}</td>
                            <td className="px-3 py-4"><p className="font-semibold text-neutral-800">{session.templateTitle ?? "Assessment"}</p><p className="mt-0.5 text-[10px] text-neutral-400">{formatDate(session.updatedAt ?? session.createdAt)}</p></td>
                            <td className="px-3 py-4"><StatusBadge status={session.status} /></td>
                            <td className="px-3 py-4"><ScoreCircle score={session.overallScore} /></td>
                            <td className="px-3 py-4 font-semibold text-neutral-600">{formatDate(session.createdAt)}</td>
                            <td className="px-3 py-4">
                              <div className="flex justify-end gap-2">
                                <button aria-label={`Delete ${session.candidateName}`} className="flex size-9 items-center justify-center rounded-[7px] border border-neutral-200 text-neutral-500 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-50" disabled={deletingId === session.id} onClick={() => void removeCandidate(session)} type="button">{deletingId === session.id ? <span className="size-3.5 animate-spin rounded-full border-2 border-neutral-300 border-t-rose-500" /> : <Icon name="trash" size={15} />}</button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <Pagination total={visible.length} />
                </>
              ) : <div className="p-5"><EmptyState action={!sessions.length ? <Link className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-sky-500 text-white rounded-lg text-sm font-medium hover:bg-sky-600 shadow-sm transition" href="/assessment/create">Invite first candidate</Link> : undefined} description={sessions.length ? "Try a different search or status filter." : "Candidate records are created automatically when you send an assessment invitation."} icon="users" title={sessions.length ? "No matching candidates" : "No candidates yet"} /></div>}
            </section>

            <FiltersPanel dateFrom={dateFrom} dateTo={dateTo} onClearAll={clearAllFilters} setDateFrom={setDateFrom} setDateTo={setDateTo} setStatusFilter={setStatusFilter} statusFilter={statusFilter} />
          </div>
        </div>
      ) : null}
    </AppShell>
  );
}

function CandidateStats({ sessions }: { sessions: InterviewSession[] }) {
  const uniqueCandidates = new Set(sessions.map((session) => session.candidateId ?? session.candidateEmail ?? session.id)).size;
  const completed = sessions.filter((session) => session.status === "completed").length;
  const inAssessment = sessions.filter((session) => session.status === "in_progress").length;
  const active = sessions.filter((session) => session.status !== "expired").length;
  const withdrawn = sessions.filter((session) => session.status === "expired").length;
  return (
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      <Stat detail="All time" icon="users" label="Total Candidates" tone="violet" value={uniqueCandidates} />
      <Stat detail={`${percent(active, uniqueCandidates)}% of total`} icon="check" label="Active Candidates" tone="emerald" value={active} />
      <Stat detail={`${percent(inAssessment, uniqueCandidates)}% of total`} icon="clock" label="In Assessment" tone="sky" value={inAssessment} />
      <Stat detail={`${percent(completed, uniqueCandidates)}% of total`} icon="check" label="Completed" tone="amber" value={completed} />
      <Stat detail={`${percent(withdrawn, uniqueCandidates)}% of total`} icon="shield" label="Withdrawn / Rejected" tone="rose" value={withdrawn} />
    </section>
  );
}
function Stat({ label, value, detail, icon, tone }: { label: string; value: number; detail: string; icon: IconName; tone: "violet" | "emerald" | "sky" | "amber" | "rose" }) {
  const tones = {
    violet: "bg-violet-100 text-violet-700",
    emerald: "bg-emerald-100 text-emerald-700",
    sky: "bg-sky-100 text-sky-700",
    amber: "bg-amber-100 text-amber-700",
    rose: "bg-rose-100 text-rose-700",
  };
  return (
    <article className="card rounded-[10px] px-4 py-4 shadow-[0_10px_28px_rgba(15,23,42,0.04)]">
      <div className="flex items-start gap-3">
        <span className={`flex size-10 shrink-0 items-center justify-center rounded-[9px] ${tones[tone]}`}><Icon name={icon} size={19} /></span>
        <div>
          <p className="text-[11px] font-bold text-neutral-700">{label}</p>
          <p className="mt-1 text-[24px] font-black leading-none text-neutral-950">{value.toLocaleString()}</p>
          <p className="mt-2 text-[10px] font-semibold text-neutral-500">{detail}</p>
        </div>
      </div>
    </article>
  );
}

function FiltersPanel({ statusFilter, setStatusFilter, dateFrom, dateTo, setDateFrom, setDateTo, onClearAll }: { statusFilter: "all" | SessionStatus; setStatusFilter: (value: "all" | SessionStatus) => void; dateFrom: string; dateTo: string; setDateFrom: (value: string) => void; setDateTo: (value: string) => void; onClearAll: () => void }) {
  return (
    <aside className="card h-fit rounded-[10px] p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-[14px] font-black text-neutral-900"><Icon name="settings" size={16} /> Filters</h2>
        <button className="text-[11px] font-bold text-primary-700 hover:text-primary-600" onClick={onClearAll} type="button">Clear all</button>
      </div>
      <div className="mt-5 space-y-4">
        <FilterSelect label="Status" onChange={(value) => setStatusFilter(value as "all" | SessionStatus)} value={statusFilter}>
          <option value="all">All Statuses</option>
          <option value="not_started">Not Started</option>
          <option value="in_progress">In Assessment</option>
          <option value="completed">Completed</option>
          <option value="expired">Withdrawn / Rejected</option>
        </FilterSelect>
        <FilterSelect label="Position"><option>All Positions</option></FilterSelect>
        <FilterSelect label="Department"><option>All Departments</option></FilterSelect>
        <FilterSelect label="Source"><option>All Sources</option></FilterSelect>
        <div>
          <p className="mb-2 text-[11px] font-bold text-neutral-600">Added Date</p>
          <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2">
            <input aria-label="Added from date" className="control h-10 min-w-0 rounded-[7px] px-2 text-[11px] [color-scheme:light]" max={dateTo || undefined} onChange={(event) => setDateFrom(event.target.value)} type="date" value={dateFrom} />
            <span className="text-neutral-400">-</span>
            <input aria-label="Added to date" className="control h-10 min-w-0 rounded-[7px] px-2 text-[11px] [color-scheme:light]" min={dateFrom || undefined} onChange={(event) => setDateTo(event.target.value)} type="date" value={dateTo} />
          </div>
        </div>
        <div>
          <p className="mb-3 text-[11px] font-bold text-neutral-600">Score Range (%)</p>
          <input aria-label="Score range" className="w-full accent-primary-700" defaultValue={100} max={100} min={0} type="range" />
          <div className="mt-2 flex justify-between text-[11px] font-semibold text-neutral-500"><span className="rounded border border-neutral-200 px-3 py-1">0</span><span className="rounded border border-neutral-200 px-3 py-1">100</span></div>
        </div>
        <button className="button-primary h-11 w-full rounded-[8px] !bg-primary-700 hover:!bg-primary-600" type="button">Apply Filters</button>
      </div>
    </aside>
  );
}

function FilterSelect({ label, children, value, onChange }: { label: string; children: ReactNode; value?: string; onChange?: (value: string) => void }) {
  return (
    <label className="block">
      <span className="mb-2 block text-[11px] font-bold text-neutral-600">{label}</span>
      <select className="control h-10 rounded-[7px] text-[12px]" onChange={(event) => onChange?.(event.target.value)} value={value}>
        {children}
      </select>
    </label>
  );
}

function Pagination({ total }: { total: number }) {
  const shown = Math.min(8, total);
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-neutral-100 px-5 py-4">
      <p className="text-[12px] font-semibold text-neutral-500">Showing {total ? 1 : 0} to {shown} of {total.toLocaleString()} candidates</p>
      <div className="flex items-center gap-2">
        <button aria-label="Previous page" className="flex size-9 items-center justify-center rounded-[8px] border border-neutral-200 bg-white text-neutral-400 transition hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50" disabled type="button">
          <Icon className="rotate-90" name="chevron" size={15} />
        </button>
        <button aria-label="Next page" className="flex size-9 items-center justify-center rounded-[8px] border border-neutral-200 bg-white text-neutral-700 transition hover:border-primary-200 hover:bg-primary-50 hover:text-primary-700" type="button">
          <Icon className="-rotate-90" name="chevron" size={15} />
        </button>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: SessionStatus }) {
  const style = { not_started: "bg-amber-50 text-amber-700", in_progress: "bg-sky-50 text-sky-700", completed: "bg-emerald-50 text-emerald-700", expired: "bg-rose-50 text-rose-700" }[status];
  const label = { not_started: "Not Started", in_progress: "In Assessment", completed: "Completed", expired: "Withdrawn" }[status];
  return <span className={`rounded-[5px] px-2 py-1 text-[10px] font-bold ${style}`}>{label}</span>;
}
function ScoreCircle({ score }: { score?: number }) {
  if (score === undefined) return <span className="text-[16px] font-semibold text-neutral-300">-</span>;
  const value = Math.round(score <= 5 ? score * 20 : score);
  return (
    <span className="grid size-10 place-items-center rounded-full text-[10px] font-black text-emerald-700" style={{ background: `conic-gradient(#34c78a ${value * 3.6}deg, #eef2f7 0deg)` }}>
      <span className="grid size-8 place-items-center rounded-full bg-white">{value}%</span>
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
function formatDate(value?: string) { return value ? new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(new Date(value)) : "-"; }
function percent(value: number, total: number) { return total ? Math.round((value / total) * 1000) / 10 : 0; }
