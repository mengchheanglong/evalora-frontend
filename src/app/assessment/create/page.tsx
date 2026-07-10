"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { AppShell } from "@/components/app-shell";
import { Icon } from "@/components/icons";
import { ErrorState, InlineAlert, PageLoader } from "@/components/ui-states";
import { apiGet, apiPost, getErrorMessage } from "@/lib/api";
import type { AssessmentTemplate, InterviewSession } from "@/lib/types";

export default function CreateSessionPage() {
  const [templates, setTemplates] = useState<AssessmentTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [createdSession, setCreatedSession] = useState<InterviewSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    apiGet<AssessmentTemplate[]>("/templates")
      .then((items) => {
        if (cancelled) return;
        setTemplates(items);
        const requested = new URLSearchParams(window.location.search).get("templateId");
        setSelectedTemplateId(items.some((item) => item.id === requested) ? requested! : items[0]?.id ?? "");
      })
      .catch((requestError) => { if (!cancelled) setError(getErrorMessage(requestError)); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const selectedTemplate = useMemo(() => templates.find((template) => template.id === selectedTemplateId), [selectedTemplateId, templates]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setError("");
    setSubmitting(true);
    try {
      const expiresOn = String(form.get("expiresOn") ?? "");
      const session = await apiPost<InterviewSession>("/sessions", {
        candidateName: String(form.get("candidateName") ?? ""),
        candidateEmail: String(form.get("candidateEmail") ?? ""),
        templateId: String(form.get("templateId") ?? ""),
        expiresAt: expiresOn ? new Date(`${expiresOn}T23:59:59.999Z`).toISOString() : undefined,
      });
      setCreatedSession(session);
    } catch (requestError) {
      setError(getErrorMessage(requestError, "Unable to create the invitation."));
    } finally {
      setSubmitting(false);
    }
  }

  async function copyInvite() {
    if (!createdSession) return;
    await navigator.clipboard.writeText(inviteUrl(createdSession.accessCode));
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <AppShell active="session" breadcrumbs={[{ label: "Sessions", href: "/assessment" }, { label: "New invitation" }]} description="Assign one assessment to one candidate through a private, expiring access link." title="Create interview session">
      {loading ? <PageLoader label="Loading assessment templates" /> : null}
      {!loading && error && !templates.length ? <ErrorState message={error} /> : null}
      {!loading && !error && !templates.length ? <ErrorState message="Create an assessment template before inviting a candidate." /> : null}
      {!loading && templates.length && !createdSession ? (
        <form className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]" onSubmit={handleSubmit}>
          <div className="space-y-5">
            {error ? <InlineAlert tone="error">{error}</InlineAlert> : null}
            <section className="card p-5 sm:p-6">
              <div className="mb-5"><h2 className="text-[15px] font-bold text-neutral-950">Candidate</h2><p className="mt-1 text-[12px] text-neutral-500">The email identifies an invite-only candidate record and cannot be used to sign in.</p></div>
              <div className="grid gap-4 sm:grid-cols-2"><Field autoComplete="name" label="Full name" name="candidateName" placeholder="Dara Candidate" /><Field autoComplete="email" label="Email address" name="candidateEmail" placeholder="dara@example.com" type="email" /></div>
            </section>

            <section className="card p-5 sm:p-6">
              <div className="mb-5"><h2 className="text-[15px] font-bold text-neutral-950">Assignment</h2><p className="mt-1 text-[12px] text-neutral-500">Candidates can open, save, and submit only this assigned assessment.</p></div>
              <div className="grid gap-4 sm:grid-cols-[1.4fr_0.6fr]">
                <label className="block"><span className="text-[12px] font-bold text-neutral-800">Assessment template</span><select className="control mt-2 h-11" name="templateId" onChange={(event) => setSelectedTemplateId(event.target.value)} required value={selectedTemplateId}>{templates.map((template) => <option key={template.id} value={template.id}>{template.title}</option>)}</select></label>
                <label className="block"><span className="text-[12px] font-bold text-neutral-800">Link expires</span><input className="control mt-2 h-11" defaultValue={defaultExpiry()} min={today()} name="expiresOn" required type="date" /></label>
              </div>
            </section>

            <section className="rounded-[8px] border border-amber-200 bg-amber-50 px-4 py-3"><p className="flex items-center gap-2 text-[12px] font-bold text-amber-950"><Icon name="lock" size={15} /> Private candidate access</p><p className="mt-1.5 text-[11px] leading-5 text-amber-900/80">The access code stops working after completion or expiry. Authorized reviewers retain responses, evaluations, and reports.</p></section>
          </div>

          <aside className="space-y-4 xl:sticky xl:top-[92px] xl:self-start">
            <section className="card p-5"><h2 className="text-[14px] font-bold text-neutral-950">Assessment preview</h2>{selectedTemplate ? <><p className="mt-4 text-[13px] font-bold text-neutral-900">{selectedTemplate.title}</p><p className="mt-1 text-[11px] leading-5 text-neutral-500">{selectedTemplate.description}</p><dl className="mt-4 space-y-3 border-t border-neutral-100 pt-4 text-[12px]"><SummaryRow label="Target role" value={selectedTemplate.roleType} /><SummaryRow label="Time limit" value={selectedTemplate.timeLimitMin ? `${selectedTemplate.timeLimitMin} min` : "Flexible"} /><SummaryRow label="Modules" value={String(selectedTemplate.modules.length)} /><SummaryRow label="Questions" value={String(selectedTemplate.modules.reduce((total, module) => total + (module.questions?.length ?? 0), 0))} /></dl><div className="mt-4 flex flex-wrap gap-1.5">{selectedTemplate.modules.map((module) => <span className="rounded-[4px] bg-neutral-100 px-2 py-1 text-[10px] font-semibold text-neutral-600" key={module.id}>{module.title}</span>)}</div></> : null}</section>
            <div className="grid grid-cols-2 gap-2"><Link className="button-secondary" href="/assessment">Cancel</Link><button className="button-primary" disabled={submitting} type="submit">{submitting ? "Creating" : "Create invite"}</button></div>
          </aside>
        </form>
      ) : null}
      {createdSession ? (
        <section className="mx-auto max-w-[720px] card overflow-hidden">
          <div className="border-b border-emerald-100 bg-emerald-50 px-6 py-7 text-center"><span className="mx-auto flex size-11 items-center justify-center rounded-full bg-emerald-600 text-white"><Icon name="check" size={21} /></span><h2 className="mt-4 text-xl font-black text-emerald-950">Invitation ready</h2><p className="mt-2 text-sm text-emerald-900/70">Share the private link directly with {createdSession.candidateName}.</p></div>
          <div className="p-6 sm:p-8"><label className="block"><span className="text-[11px] font-bold uppercase text-neutral-500">Candidate access link</span><span className="mt-2 flex gap-2"><input className="control h-11 flex-1 font-mono text-[11px]" readOnly value={inviteUrl(createdSession.accessCode)} /><button className="button-secondary shrink-0" onClick={() => void copyInvite()} type="button"><Icon name="file" size={14} />{copied ? "Copied" : "Copy"}</button></span></label><dl className="mt-6 grid gap-4 border-t border-neutral-100 pt-6 text-[12px] sm:grid-cols-3"><SummaryRow label="Access code" value={createdSession.accessCode} /><SummaryRow label="Status" value="Not started" /><SummaryRow label="Expires" value={createdSession.expiresAt ? new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(new Date(createdSession.expiresAt)) : "No expiry"} /></dl><div className="mt-7 flex flex-wrap justify-end gap-2"><Link className="button-secondary" href="/assessment">Back to sessions</Link><Link className="button-primary" href={`/assessment/${encodeURIComponent(createdSession.accessCode)}`}>Preview candidate view</Link></div></div>
        </section>
      ) : null}
    </AppShell>
  );
}

function Field({ label, name, placeholder, type = "text", autoComplete }: { label: string; name: string; placeholder: string; type?: string; autoComplete: string }) { return <label className="block"><span className="text-[12px] font-bold text-neutral-800">{label}</span><input autoComplete={autoComplete} className="control mt-2 h-11" name={name} placeholder={placeholder} required type={type} /></label>; }
function SummaryRow({ label, value }: { label: string; value: string }) { return <div className="flex items-center justify-between gap-4"><dt className="text-neutral-500">{label}</dt><dd className="text-right font-bold text-neutral-900">{value}</dd></div>; }
function inviteUrl(accessCode: string) { return `${window.location.origin}/assessment/${encodeURIComponent(accessCode)}`; }
function dateOffset(days: number) { const date = new Date(); date.setDate(date.getDate() + days); return date.toISOString().slice(0, 10); }
function defaultExpiry() { return dateOffset(7); }
function today() { return dateOffset(0); }
