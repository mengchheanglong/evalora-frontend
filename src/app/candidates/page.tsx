"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { Icon } from "@/components/icons";
import { EmptyState, ErrorState, PageLoader } from "@/components/ui-states";
import { apiGet, getErrorMessage } from "@/lib/api";
import type { InterviewSession, SessionStatus } from "@/lib/types";

export default function CandidatesPage() {
  const [sessions, setSessions] = useState<InterviewSession[]>([]);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | SessionStatus>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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

  const visible = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return sessions.filter((session) => (!normalized || [session.candidateName, session.candidateEmail ?? "", session.targetRole ?? "", session.templateTitle ?? ""].some((value) => value.toLowerCase().includes(normalized))) && (statusFilter === "all" || session.status === statusFilter));
  }, [query, sessions, statusFilter]);

  return (
    <AppShell active="candidates" actions={<Link className="button-primary hidden h-10 sm:inline-flex" href="/assessment/create"><Icon name="plusUser" size={15} /> Invite candidate</Link>} description="Review each assigned candidate in context, from invitation through evidence-backed report." title="Candidates">
      {loading ? <PageLoader label="Loading candidates" /> : null}
      {!loading && error ? <ErrorState message={error} onRetry={() => void loadCandidates()} /> : null}
      {!loading && !error ? (
        <div className="space-y-5">
          <CandidateStats sessions={sessions} />
          <section className="card overflow-hidden">
            <div className="flex flex-wrap items-center gap-3 border-b border-neutral-200 px-4 py-4 sm:px-5">
              <label className="relative min-w-[240px] flex-1 sm:max-w-[380px]"><span className="sr-only">Search candidates</span><Icon className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" name="search" size={15} /><input className="control h-10 pl-9" onChange={(event) => setQuery(event.target.value)} placeholder="Search name, email, or role" type="search" value={query} /></label>
              <label className="ml-auto flex items-center gap-2 text-[12px] font-semibold text-neutral-600">Status<select className="control h-10 min-w-[150px]" onChange={(event) => setStatusFilter(event.target.value as "all" | SessionStatus)} value={statusFilter}><option value="all">All statuses</option><option value="not_started">Not started</option><option value="in_progress">In progress</option><option value="completed">Completed</option><option value="expired">Expired</option></select></label>
            </div>
            {visible.length ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px] text-left text-[12px]">
                  <thead className="bg-neutral-50 text-[11px] font-semibold text-neutral-500"><tr><th className="px-5 py-3">Candidate</th><th className="px-4 py-3">Target role</th><th className="px-4 py-3">Assessment</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Advisory score</th><th className="px-5 py-3 text-right">Review</th></tr></thead>
                  <tbody className="divide-y divide-neutral-100">
                    {visible.map((session) => (
                      <tr className="transition hover:bg-neutral-50/70" key={session.id}>
                        <td className="px-5 py-4"><Link className="group flex items-center gap-3" href={`/candidates/${session.id}`}><span className="flex size-9 shrink-0 items-center justify-center rounded-[6px] bg-[#171b24] text-[10px] font-black text-white">{initials(session.candidateName)}</span><span><span className="block font-bold text-neutral-950 group-hover:text-[#087aa4]">{session.candidateName}</span><span className="mt-0.5 block text-[11px] text-neutral-500">{session.candidateEmail ?? "No email"}</span></span></Link></td>
                        <td className="px-4 py-4 font-semibold text-neutral-700">{session.targetRole ?? "Not specified"}</td>
                        <td className="px-4 py-4"><p className="font-semibold text-neutral-800">{session.templateTitle ?? "Assessment"}</p><p className="mt-0.5 text-[10px] text-neutral-400">Updated {formatDate(session.updatedAt ?? session.createdAt)}</p></td>
                        <td className="px-4 py-4"><StatusBadge status={session.status} /></td>
                        <td className="px-4 py-4">{session.overallScore === undefined ? <span className="text-neutral-400">Pending</span> : <span className="inline-flex rounded-[5px] bg-sky-50 px-2 py-1 font-bold text-sky-800">{session.overallScore.toFixed(1)}/5</span>}</td>
                        <td className="px-5 py-4 text-right"><Link className="button-secondary min-h-8 px-3 text-[11px]" href={session.reportReady ? `/reports/${session.id}` : `/candidates/${session.id}`}>{session.reportReady ? "Open report" : "Open profile"}</Link></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : <div className="p-5"><EmptyState action={!sessions.length ? <Link className="button-primary" href="/assessment/create">Invite first candidate</Link> : undefined} description={sessions.length ? "Try a different search or status filter." : "Candidate records are created automatically when you send an assessment invitation."} icon="users" title={sessions.length ? "No matching candidates" : "No candidates yet"} /></div>}
          </section>
        </div>
      ) : null}
    </AppShell>
  );
}

function CandidateStats({ sessions }: { sessions: InterviewSession[] }) {
  const uniqueCandidates = new Set(sessions.map((session) => session.candidateId ?? session.candidateEmail ?? session.id)).size;
  const completed = sessions.filter((session) => session.status === "completed").length;
  const active = sessions.filter((session) => session.status === "in_progress").length;
  const reports = sessions.filter((session) => session.reportReady).length;
  return <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><Stat detail="Unique invite records" label="Candidates" value={uniqueCandidates} /><Stat detail="Active assessments" label="In progress" value={active} /><Stat detail="Submitted sessions" label="Completed" value={completed} /><Stat detail="Ready for reviewers" label="Reports" value={reports} /></section>;
}
function Stat({ label, value, detail }: { label: string; value: number; detail: string }) { return <article className="card px-5 py-4"><p className="text-[11px] font-semibold text-neutral-500">{label}</p><div className="mt-2 flex items-end justify-between gap-3"><p className="text-2xl font-black text-neutral-950">{value}</p><p className="pb-0.5 text-[10px] text-neutral-500">{detail}</p></div></article>; }
function StatusBadge({ status }: { status: SessionStatus }) { const style = { not_started: "bg-amber-50 text-amber-800", in_progress: "bg-sky-50 text-sky-800", completed: "bg-emerald-50 text-emerald-800", expired: "bg-neutral-100 text-neutral-600" }[status]; return <span className={`rounded-[5px] px-2 py-1 text-[10px] font-bold ${style}`}>{status.replaceAll("_", " ")}</span>; }
function initials(name: string) { return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "EV"; }
function formatDate(value?: string) { return value ? new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(new Date(value)) : "-"; }
