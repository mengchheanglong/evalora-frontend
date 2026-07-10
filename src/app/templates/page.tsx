"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { Icon } from "@/components/icons";
import { EmptyState, ErrorState, InlineAlert, PageLoader } from "@/components/ui-states";
import { apiDelete, apiGet, getErrorMessage } from "@/lib/api";
import type { AssessmentTemplate, ModuleType } from "@/lib/types";

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<AssessmentTemplate[]>([]);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | ModuleType>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [deleting, setDeleting] = useState<string | null>(null);

  const loadTemplates = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setTemplates(await apiGet<AssessmentTemplate[]>("/templates"));
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadTemplates(); }, [loadTemplates]);

  const visibleTemplates = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return templates.filter((template) => {
      const matchesQuery = !normalizedQuery || [template.title, template.roleType, template.description].some((value) => value.toLowerCase().includes(normalizedQuery));
      const matchesFilter = filter === "all" || template.modules.some((module) => module.type === filter);
      return matchesQuery && matchesFilter;
    });
  }, [filter, query, templates]);

  async function deleteTemplate(template: AssessmentTemplate) {
    if (!window.confirm(`Delete "${template.title}"? Existing sessions will remain protected, but this template cannot be restored.`)) return;
    setDeleting(template.id);
    setNotice("");
    try {
      await apiDelete<{ id: string; deleted: true }>(`/templates/${template.id}`);
      setTemplates((current) => current.filter((item) => item.id !== template.id));
      setNotice("Template deleted.");
    } catch (requestError) {
      setError(getErrorMessage(requestError, "Unable to delete this template."));
    } finally {
      setDeleting(null);
    }
  }

  return (
    <AppShell
      active="templates"
      actions={<Link className="button-primary hidden h-10 sm:inline-flex" href="/templates/create"><Icon name="plus" size={15} /> New template</Link>}
      description="Build reusable, role-specific assessment structures and keep every scoring rubric explicit."
      title="Templates"
    >
      {loading ? <PageLoader label="Loading templates" /> : null}
      {!loading && error && !templates.length ? <ErrorState message={error} onRetry={() => void loadTemplates()} /> : null}
      {!loading && (!error || templates.length) ? (
        <div className="space-y-5">
          {error ? <InlineAlert tone="error">{error}</InlineAlert> : null}
          {notice ? <InlineAlert tone="success">{notice}</InlineAlert> : null}
          <TemplateStats templates={templates} />

          <section className="card overflow-hidden">
            <div className="flex flex-wrap items-center gap-3 border-b border-neutral-200 px-4 py-4 sm:px-5">
              <label className="relative min-w-[240px] flex-1 sm:max-w-[360px]">
                <span className="sr-only">Search templates</span>
                <Icon className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" name="search" size={15} />
                <input className="control h-10 pl-9" onChange={(event) => setQuery(event.target.value)} placeholder="Search by title or role" type="search" value={query} />
              </label>
              <label className="ml-auto flex items-center gap-2 text-[12px] font-semibold text-neutral-600">
                Module
                <select className="control h-10 min-w-[160px]" onChange={(event) => setFilter(event.target.value as "all" | ModuleType)} value={filter}>
                  <option value="all">All modules</option>
                  <option value="ai_interview">AI interview</option>
                  <option value="coding">Coding</option>
                  <option value="behavioral">Behavioral</option>
                  <option value="leadership">Leadership</option>
                  <option value="communication">Communication</option>
                </select>
              </label>
            </div>

            {visibleTemplates.length ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[880px] text-left text-[12px]">
                  <thead className="bg-neutral-50 text-[11px] font-semibold text-neutral-500">
                    <tr><th className="px-5 py-3">Template</th><th className="px-4 py-3">Target role</th><th className="px-4 py-3">Structure</th><th className="px-4 py-3">Time limit</th><th className="px-4 py-3">Modules</th><th className="px-5 py-3 text-right">Actions</th></tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {visibleTemplates.map((template) => (
                      <tr className="align-top transition hover:bg-neutral-50/70" key={template.id}>
                        <td className="px-5 py-4"><div className="flex gap-3"><span className="flex size-9 shrink-0 items-center justify-center rounded-[6px] bg-sky-50 text-sky-700"><Icon name={template.modules.some((module) => module.type === "coding") ? "code" : "clipboard"} size={16} /></span><div><p className="font-bold text-neutral-950">{template.title}</p><p className="mt-1 max-w-[320px] line-clamp-2 text-[11px] leading-4 text-neutral-500">{template.description || "No description"}</p></div></div></td>
                        <td className="px-4 py-4 font-semibold text-neutral-700">{template.roleType}</td>
                        <td className="px-4 py-4 text-neutral-600">{questionCount(template)} questions</td>
                        <td className="px-4 py-4 text-neutral-600">{template.timeLimitMin ? `${template.timeLimitMin} min` : "Flexible"}</td>
                        <td className="px-4 py-4"><div className="flex max-w-[260px] flex-wrap gap-1.5">{template.modules.slice(0, 3).map((module) => <span className="rounded-[4px] bg-neutral-100 px-2 py-1 text-[10px] font-semibold text-neutral-600" key={module.id}>{moduleLabel(module.type)}</span>)}{template.modules.length > 3 ? <span className="rounded-[4px] bg-neutral-100 px-2 py-1 text-[10px] font-semibold text-neutral-500">+{template.modules.length - 3}</span> : null}</div></td>
                        <td className="px-5 py-4 text-right"><div className="flex justify-end gap-2"><Link className="button-secondary min-h-8 px-3 text-[11px]" href={`/assessment/create?templateId=${encodeURIComponent(template.id)}`}>Assign</Link><button aria-label={`Delete ${template.title}`} className="flex size-8 items-center justify-center rounded-[5px] border border-neutral-200 text-red-500 transition hover:border-red-200 hover:bg-red-50" disabled={deleting === template.id} onClick={() => void deleteTemplate(template)} type="button"><Icon name="more" size={15} /></button></div></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-5"><EmptyState action={!templates.length ? <Link className="button-primary" href="/templates/create">Create template</Link> : undefined} description={templates.length ? "Try a different search or module filter." : "Create a role-specific assessment before inviting candidates."} icon="clipboard" title={templates.length ? "No matching templates" : "No templates yet"} /></div>
            )}
          </section>
        </div>
      ) : null}
    </AppShell>
  );
}

function TemplateStats({ templates }: { templates: AssessmentTemplate[] }) {
  const totalModules = templates.reduce((total, template) => total + template.modules.length, 0);
  const totalQuestions = templates.reduce((total, template) => total + questionCount(template), 0);
  const codingReady = templates.filter((template) => template.modules.some((module) => module.type === "coding")).length;
  return (
    <section className="grid gap-3 sm:grid-cols-3">
      <Stat label="Templates" value={templates.length} detail="Reusable assessments" />
      <Stat label="Modules" value={totalModules} detail="Across all templates" />
      <Stat label="Question bank" value={totalQuestions} detail={`${codingReady} coding-enabled templates`} />
    </section>
  );
}

function Stat({ label, value, detail }: { label: string; value: number; detail: string }) {
  return <article className="card px-5 py-4"><p className="text-[11px] font-semibold text-neutral-500">{label}</p><div className="mt-2 flex items-end justify-between gap-3"><p className="text-2xl font-black text-neutral-950">{value}</p><p className="pb-0.5 text-[10px] text-neutral-500">{detail}</p></div></article>;
}

function questionCount(template: AssessmentTemplate) { return template.modules.reduce((total, module) => total + (module.questions?.length ?? 0), 0); }
function moduleLabel(type: ModuleType) { return type.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase()); }
