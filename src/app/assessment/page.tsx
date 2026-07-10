"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { Icon } from "@/components/icons";
import { EmptyState, ErrorState, InlineAlert, PageLoader } from "@/components/ui-states";
import { apiGet, getErrorMessage } from "@/lib/api";
import type { InterviewSession, SessionStatus } from "@/lib/types";

export default function SessionsPage() {
  const [sessions, setSessions] = useState<InterviewSession[]>([]);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | SessionStatus>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState<string | null>(null);

  const loadSessions = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setSessions(await apiGet<InterviewSession[]>("/sessions"));
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadSessions(); }, [loadSessions]);

  const visible = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return sessions.filter((session) => {
      const matchesQuery = !normalized || [session.candidateName, session.candidateEmail ?? "", session.templateTitle ?? "", session.accessCode].some((value) => value.toLowerCase().includes(normalized));
      return matchesQuery && (statusFilter === "all" || session.status === statusFilter);
    });
  }, [query, sessions, statusFilter]);

  async function copyInvite(session: InterviewSession) {
    const url = `${window.location.origin}/assessment/${encodeURIComponent(session.accessCode)}`;
    await navigator.clipboard.writeText(url);
    setCopied(session.id);
    window.setTimeout(() => setCopied((current) => current === session.id ? null : current), 1800);
  }

  return (
    <AppShell active="session" actions={<Link className="button-primary hidden h-10 sm:inline-flex" href="/assessment/create"><Icon name="plus" size={15} /> New session</Link>} description="Create private candidate invitations, monitor progress, and open completed evidence for review." title="Interview sessions">
      {loading ? <PageLoader label="Loading interview sessions" /> : null}
      {!loading && error ? <ErrorState message={error} onRetry={() => void loadSessions()} /> : null}
      {!loading && !error ? (
        <div className="space-y-5">
          {copied ? <InlineAlert tone="success">Private invitation link copied.</InlineAlert> : null}
          <SessionStats sessions={sessions} />
          <section className="card overflow-hidden">
            <div className="flex flex-wrap items-center gap-3 border-b border-neutral-200 px-4 py-4 sm:px-5">
              <label className="relative min-w-[230px] flex-1 sm:max-w-[360px]"><span className="sr-only">Search sessions</span><Icon className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" name="search" size={15} /><input className="control h-10 pl-9" onChange={(event) => setQuery(event.target.value)} placeholder="Search candidate, template, or code" type="search" value={query} /></label>
              <label className="ml-auto flex items-center gap-2 text-[12px] font-semibold text-neutral-600">Status<select className="control h-10 min-w-[150px]" onChange={(event) => setStatusFilter(event.target.value as "all" | SessionStatus)} value={statusFilter}><option value="all">All statuses</option><option value="not_started">Not started</option><option value="in_progress">In progress</option><option value="completed">Completed</option><option value="expired">Expired</option></select></label>
            </div>

            {visible.length ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[940px] text-left text-[12px]">
                  <thead className="bg-neutral-50 text-[11px] font-semibold text-neutral-500"><tr><th className="px-5 py-3">Candidate</th><th className="px-4 py-3">Assessment</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Access</th><th className="px-4 py-3">Expiry</th><th className="px-5 py-3 text-right">Actions</th></tr></thead>
                  <tbody className="divide-y divide-neutral-100">
                    {visible.map((session) => (
                      <tr className="transition hover:bg-neutral-50/70" key={session.id}>
                        <td className="px-5 py-4"><Link className="group flex items-center gap-3" href={`/candidates/${session.id}`}><span className="flex size-9 items-center justify-center rounded-[6px] bg-neutral-900 text-[10px] font-black text-white">{initials(session.candidateName)}</span><span><span className="block font-bold text-neutral-950 group-hover:text-[#087aa4]">{session.candidateName}</span><span className="mt-0.5 block text-[11px] text-neutral-500">{session.candidateEmail ?? "No email"}</span></span></Link></td>
                        <td className="px-4 py-4"><p className="font-semibold text-neutral-800">{session.templateTitle ?? "Assessment"}</p><p className="mt-0.5 text-[11px] text-neutral-500">{session.targetRole ?? "Role not set"}</p></td>
                        <td className="px-4 py-4"><StatusBadge status={session.status} /></td>
                        <td className="px-4 py-4"><p className="font-mono text-[11px] font-bold text-neutral-800">{session.accessCode}</p><p className="mt-0.5 text-[10px] text-neutral-400">Private candidate code</p></td>
                        <td className="px-4 py-4 text-neutral-600">{formatDate(session.expiresAt)}</td>
                        <td className="px-5 py-4"><div className="flex justify-end gap-2">{session.status !== "completed" && session.status !== "expired" ? <button className="button-secondary min-h-8 px-3 text-[11px]" onClick={() => void copyInvite(session)} type="button"><Icon name="file" size={13} /> {copied === session.id ? "Copied" : "Copy invite"}</button> : null}{session.reportReady ? <Link className="button-secondary min-h-8 px-3 text-[11px]" href={`/reports/${session.id}`}>Report</Link> : <Link className="button-secondary min-h-8 px-3 text-[11px]" href={`/candidates/${session.id}`}>Details</Link>}</div></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : <div className="p-5"><EmptyState action={!sessions.length ? <Link className="button-primary" href="/assessment/create">Create first session</Link> : undefined} description={sessions.length ? "Try a different search or status filter." : "Choose a template and invite your first candidate."} icon="message" title={sessions.length ? "No matching sessions" : "No interview sessions"} /></div>}
          </section>
        </div>
      ) : null}
    </AppShell>
  );
}

function SessionStats({ sessions }: { sessions: InterviewSession[] }) {
  const counts = { not_started: 0, in_progress: 0, completed: 0, expired: 0 };
  for (const session of sessions) counts[session.status] += 1;
  return <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><Stat label="Not started" value={counts.not_started} tone="bg-amber-400" /><Stat label="In progress" value={counts.in_progress} tone="bg-sky-500" /><Stat label="Completed" value={counts.completed} tone="bg-emerald-500" /><Stat label="Expired" value={counts.expired} tone="bg-neutral-400" /></section>;
}

function Stat({ label, value, tone }: { label: string; value: number; tone: string }) { return <article className="card flex items-center justify-between px-5 py-4"><div><p className="text-[11px] font-semibold text-neutral-500">{label}</p><p className="mt-2 text-2xl font-black text-neutral-950">{value}</p></div><span className={`size-2.5 rounded-full ${tone}`} /></article>; }
function StatusBadge({ status }: { status: SessionStatus }) { const styles = { not_started: "bg-amber-50 text-amber-800", in_progress: "bg-sky-50 text-sky-800", completed: "bg-emerald-50 text-emerald-800", expired: "bg-neutral-100 text-neutral-600" }[status]; return <span className={`inline-flex rounded-[5px] px-2 py-1 text-[10px] font-bold ${styles}`}>{status.replaceAll("_", " ")}</span>; }
function initials(name: string) { return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "EV"; }
function formatDate(value?: string) { return value ? new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(new Date(value)) : "No expiry"; }
