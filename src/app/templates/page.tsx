"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { Icon, type IconName } from "@/components/icons";
import { EmptyState, ErrorState, InlineAlert, PageLoader } from "@/components/ui-states";
import { apiDelete, apiGet, apiPost, getErrorMessage } from "@/lib/api";
import type { AssessmentTemplate, CatalogTemplateSummary, ModuleType, Question, QuestionType } from "@/lib/types";

type MainTab = "library" | "mine";
type PreviewSource = "catalog" | "mine";

const ROLE_FILTERS = [
  { id: "all", label: "All roles" },
  { id: "engineering", label: "Engineering" },
  { id: "product", label: "Product" },
  { id: "data", label: "Data" },
  { id: "leadership", label: "Leadership" },
  { id: "people", label: "People" },
  { id: "customer", label: "Customer" },
] as const;

type RoleFilterId = (typeof ROLE_FILTERS)[number]["id"];

export default function TemplatesPage() {
  const router = useRouter();
  const [mainTab, setMainTab] = useState<MainTab>("library");
  const [catalog, setCatalog] = useState<CatalogTemplateSummary[]>([]);
  const [mine, setMine] = useState<AssessmentTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilterId>("all");
  const [busyId, setBusyId] = useState("");
  const [preview, setPreview] = useState<AssessmentTemplate | null>(null);
  const [previewSource, setPreviewSource] = useState<PreviewSource>("catalog");
  const [previewLoading, setPreviewLoading] = useState(false);
  const [activeModuleId, setActiveModuleId] = useState("");
  const [questionSearch, setQuestionSearch] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [nextCatalog, nextMine] = await Promise.all([
        apiGet<CatalogTemplateSummary[]>("/templates/catalog"),
        apiGet<AssessmentTemplate[]>("/templates"),
      ]);
      setCatalog(nextCatalog);
      setMine(nextMine);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!preview?.modules?.length) {
      setActiveModuleId("");
      return;
    }
    const sorted = [...preview.modules].sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0));
    setActiveModuleId(sorted[0]?.id ?? "");
    setQuestionSearch("");
  }, [preview]);

  const filteredCatalog = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return catalog.filter((item) => {
      if (!matchesRoleFilter(item.roleType, roleFilter)) return false;
      if (!q) return true;
      return (
        item.title.toLowerCase().includes(q) ||
        item.roleType.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q)
      );
    });
  }, [catalog, searchQuery, roleFilter]);

  const filteredMine = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return mine.filter((item) => {
      if (!matchesRoleFilter(item.roleType, roleFilter)) return false;
      if (!q) return true;
      return (
        item.title.toLowerCase().includes(q) ||
        item.roleType.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q)
      );
    });
  }, [mine, searchQuery, roleFilter]);

  const previewQuestionCount = useMemo(() => {
    if (!preview) return 0;
    return (preview.modules ?? []).reduce((total, module) => total + (module.questions?.length ?? 0), 0);
  }, [preview]);

  const sortedModules = useMemo(() => {
    if (!preview?.modules) return [];
    return [...preview.modules].sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0));
  }, [preview]);

  const filteredPreviewModules = useMemo(() => {
    const q = questionSearch.trim().toLowerCase();
    if (!q) return sortedModules;
    return sortedModules
      .map((module) => ({
        ...module,
        questions: (module.questions ?? []).filter(
          (question) =>
            question.questionText.toLowerCase().includes(q) ||
            question.questionType.toLowerCase().includes(q) ||
            module.title.toLowerCase().includes(q),
        ),
      }))
      .filter((module) => (module.questions?.length ?? 0) > 0 || module.title.toLowerCase().includes(q));
  }, [sortedModules, questionSearch]);

  async function useCatalogTemplate(catalogId: string, next: "mine" | "session" | "edit" = "mine") {
    setBusyId(catalogId);
    setNotice("");
    setError("");
    try {
      const cloned = await apiPost<AssessmentTemplate>("/templates/from-catalog", { catalogId });
      setMine((current) => [cloned, ...current.filter((item) => item.id !== cloned.id)]);
      setPreview(null);
      setMainTab("mine");
      if (next === "edit") {
        setNotice(`"${cloned.title}" added. Opening editor…`);
        router.push(`/templates/${encodeURIComponent(cloned.id)}/edit`);
        router.refresh();
        return;
      }
      if (next === "session") {
        setNotice(`"${cloned.title}" added to your workspace. Opening session create…`);
        router.push(`/assessment/create?templateId=${encodeURIComponent(cloned.id)}`);
        router.refresh();
        return;
      }
      setNotice(`"${cloned.title}" is in My templates — open Edit to change questions, or Assign as-is.`);
    } catch (requestError) {
      setError(getErrorMessage(requestError, "Unable to add this template to your workspace."));
    } finally {
      setBusyId("");
    }
  }

  async function openCatalogPreview(catalogId: string) {
    setPreviewSource("catalog");
    setPreview(null);
    setPreviewLoading(true);
    setError("");
    try {
      setPreview(await apiGet<AssessmentTemplate>(`/templates/catalog/${encodeURIComponent(catalogId)}`));
    } catch (requestError) {
      setError(getErrorMessage(requestError, "Unable to load template questions."));
    } finally {
      setPreviewLoading(false);
    }
  }

  async function openMinePreview(templateId: string) {
    setPreviewSource("mine");
    setPreview(null);
    setPreviewLoading(true);
    setError("");
    try {
      const cached = mine.find((item) => item.id === templateId);
      const detail = await apiGet<AssessmentTemplate>(`/templates/${encodeURIComponent(templateId)}`).catch(() => cached ?? null);
      if (!detail) throw new Error("Template not found.");
      setPreview(detail);
    } catch (requestError) {
      setError(getErrorMessage(requestError, "Unable to load template questions."));
    } finally {
      setPreviewLoading(false);
    }
  }

  async function duplicateMine(id: string) {
    setBusyId(id);
    setNotice("");
    try {
      const copy = await apiPost<AssessmentTemplate>(`/templates/${encodeURIComponent(id)}/duplicate`);
      setMine((current) => [copy, ...current]);
      setNotice(`Duplicated as "${copy.title}".`);
    } catch (requestError) {
      setError(getErrorMessage(requestError, "Unable to duplicate template."));
    } finally {
      setBusyId("");
    }
  }

  async function deleteMine(id: string, title: string) {
    if (!window.confirm(`Delete "${title}"? Sessions using it may be affected.`)) return;
    setBusyId(id);
    setNotice("");
    try {
      await apiDelete(`/templates/${encodeURIComponent(id)}`);
      setMine((current) => current.filter((item) => item.id !== id));
      if (preview?.id === id) setPreview(null);
      setNotice("Template deleted.");
    } catch (requestError) {
      setError(getErrorMessage(requestError, "Unable to delete template."));
    } finally {
      setBusyId("");
    }
  }

  if (loading) {
    return (
      <AppShell active="templates" title="Assessment Templates" description="Browse, review questions, and assign assessments.">
        <PageLoader label="Loading templates" />
      </AppShell>
    );
  }

  if (error && !catalog.length && !mine.length) {
    return (
      <AppShell active="templates" title="Assessment Templates" description="Browse, review questions, and assign assessments.">
        <ErrorState message={error} onRetry={() => void load()} />
      </AppShell>
    );
  }

  return (
    <AppShell
      active="templates"
      title="Assessment Templates"
      description="Review every question first, then add a pack to your workspace or assign a candidate."
    >
      <div className="space-y-5">
        {error ? <InlineAlert tone="error">{error}</InlineAlert> : null}
        {notice ? <InlineAlert tone="success">{notice}</InlineAlert> : null}

        {/* How it works */}
        <section className="overflow-hidden rounded-2xl border border-primary-100 bg-gradient-to-br from-primary-50 via-white to-sky-50 p-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-xl">
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-primary-700">How templates work</p>
              <h2 className="mt-1 text-[18px] font-black tracking-tight text-neutral-950">See the questions before you commit</h2>
              <p className="mt-1.5 text-[13px] leading-6 text-neutral-600">
                Open any prebuilt pack, read every question, then copy it to your workspace. Edit questions anytime, or assign candidates without changing anything.
              </p>
            </div>
            <ol className="grid grid-cols-4 gap-2 sm:min-w-[380px]">
              {[
                { step: "1", label: "Review", detail: "All questions" },
                { step: "2", label: "Use", detail: "Copy to workspace" },
                { step: "3", label: "Edit", detail: "Change questions" },
                { step: "4", label: "Assign", detail: "Invite candidate" },
              ].map((item) => (
                <li className="rounded-xl border border-white/80 bg-white/90 px-3 py-2.5 text-center shadow-sm" key={item.step}>
                  <span className="mx-auto flex size-6 items-center justify-center rounded-full bg-primary-500 text-[11px] font-black text-white">
                    {item.step}
                  </span>
                  <p className="mt-1.5 text-[12px] font-black text-neutral-900">{item.label}</p>
                  <p className="text-[10px] font-medium text-neutral-500">{item.detail}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Toolbar */}
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex gap-1 rounded-xl border border-neutral-200 bg-white p-1 shadow-sm">
              <TabButton active={mainTab === "library"} onClick={() => setMainTab("library")}>
                Prebuilt library
                <span className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-black ${mainTab === "library" ? "bg-white/20 text-white" : "bg-neutral-100 text-neutral-600"}`}>
                  {catalog.length}
                </span>
              </TabButton>
              <TabButton active={mainTab === "mine"} onClick={() => setMainTab("mine")}>
                My templates
                <span className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-black ${mainTab === "mine" ? "bg-white/20 text-white" : "bg-neutral-100 text-neutral-600"}`}>
                  {mine.length}
                </span>
              </TabButton>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <label className="relative min-w-[220px] flex-1 sm:max-w-xs">
                <Icon className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" name="search" size={16} />
                <input
                  className="control h-10 w-full rounded-xl border-neutral-200 pl-9 text-[13px] shadow-sm"
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search by title or role…"
                  type="search"
                  value={searchQuery}
                />
              </label>
              <Link className="button-primary h-10 rounded-xl px-4 text-[12px] shadow-sm" href="/templates/create">
                <Icon name="plus" size={15} /> Create from scratch
              </Link>
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {ROLE_FILTERS.map((filter) => {
              const active = roleFilter === filter.id;
              return (
                <button
                  className={`rounded-full px-3 py-1.5 text-[11px] font-bold transition ${
                    active
                      ? "bg-neutral-900 text-white shadow-sm"
                      : "border border-neutral-200 bg-white text-neutral-600 hover:border-neutral-300 hover:bg-neutral-50"
                  }`}
                  key={filter.id}
                  onClick={() => setRoleFilter(filter.id)}
                  type="button"
                >
                  {filter.label}
                </button>
              );
            })}
          </div>
        </div>

        {mainTab === "library" ? (
          filteredCatalog.length === 0 ? (
            <EmptyState description="Try another role filter or search term." title="No prebuilt templates match" />
          ) : (
            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {filteredCatalog.map((item) => {
                const theme = roleTheme(item.roleType);
                return (
                  <article
                    className="group relative flex flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-primary-200 hover:shadow-lg"
                    key={item.id}
                  >
                    <div className={`h-1.5 w-full ${theme.bar}`} />
                    <button className="flex flex-1 flex-col p-5 text-left" disabled={previewLoading} onClick={() => void openCatalogPreview(item.id)} type="button">
                      <div className="flex items-start gap-3">
                        <span className={`flex size-12 shrink-0 items-center justify-center rounded-2xl ${theme.iconBg}`}>
                          <Icon name={theme.icon} size={22} />
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="rounded-full bg-primary-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary-700">Prebuilt</span>
                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${theme.badge}`}>{item.roleType}</span>
                          </div>
                          <h2 className="mt-2 text-[16px] font-black leading-snug text-neutral-950 group-hover:text-primary-800">{item.title}</h2>
                        </div>
                      </div>
                      <p className="mt-3 line-clamp-3 flex-1 text-[12px] leading-5 text-neutral-600">{item.description}</p>
                      <dl className="mt-4 grid grid-cols-3 gap-2">
                        <Stat label="Modules" value={item.moduleCount} />
                        <Stat label="Questions" value={item.questionCount} />
                        <Stat label="Minutes" value={item.timeLimitMin ?? "—"} />
                      </dl>
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {item.moduleTypes.slice(0, 4).map((type) => (
                          <span className="rounded-md bg-neutral-100 px-2 py-0.5 text-[10px] font-bold capitalize text-neutral-600" key={type}>
                            {type.replaceAll("_", " ")}
                          </span>
                        ))}
                        {item.moduleTypes.length > 4 ? (
                          <span className="rounded-md bg-neutral-100 px-2 py-0.5 text-[10px] font-bold text-neutral-500">+{item.moduleTypes.length - 4}</span>
                        ) : null}
                      </div>
                      <p className="mt-4 inline-flex items-center gap-1 text-[12px] font-bold text-primary-700">
                        Review all questions
                        <Icon className="transition group-hover:translate-x-0.5" name="chevron" size={14} />
                      </p>
                    </button>
                    <div className="grid grid-cols-2 gap-2 border-t border-neutral-100 bg-neutral-50/60 p-3">
                      <button
                        className="button-secondary h-10 rounded-xl text-[12px]"
                        disabled={previewLoading || busyId === item.id}
                        onClick={() => void openCatalogPreview(item.id)}
                        type="button"
                      >
                        <Icon name="eye" size={14} /> Review
                      </button>
                      <button
                        className="button-primary h-10 rounded-xl text-[12px]"
                        disabled={busyId === item.id}
                        onClick={() => void useCatalogTemplate(item.id, "mine")}
                        type="button"
                      >
                        {busyId === item.id ? "Adding…" : "Use as-is"}
                      </button>
                    </div>
                  </article>
                );
              })}
            </section>
          )
        ) : filteredMine.length === 0 ? (
          <EmptyState
            action={
              <button className="button-primary" onClick={() => setMainTab("library")} type="button">
                Browse prebuilt library
              </button>
            }
            description="Open a prebuilt pack, review every question, then add it to your workspace."
            title="No workspace templates yet"
          />
        ) : (
          <section className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[920px] text-left text-[12px]">
                <thead className="bg-neutral-50 text-[11px] font-bold uppercase tracking-wide text-neutral-500">
                  <tr className="border-b border-neutral-100">
                    <th className="px-5 py-3.5">Template</th>
                    <th className="px-3 py-3.5">Role</th>
                    <th className="px-3 py-3.5">Modules</th>
                    <th className="px-3 py-3.5">Questions</th>
                    <th className="px-3 py-3.5">Time</th>
                    <th className="px-3 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {filteredMine.map((template) => {
                    const moduleCount = template.modules?.length ?? 0;
                    const questionCount = (template.modules ?? []).reduce((total, module) => total + (module.questions?.length ?? 0), 0);
                    const theme = roleTheme(template.roleType);
                    return (
                      <tr className="transition hover:bg-sky-50/40" key={template.id}>
                        <td className="px-5 py-4">
                          <button className="flex items-start gap-3 text-left" onClick={() => void openMinePreview(template.id)} type="button">
                            <span className={`mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl ${theme.iconBg}`}>
                              <Icon name={theme.icon} size={16} />
                            </span>
                            <span>
                              <span className="block font-bold text-primary-800 hover:underline">{template.title}</span>
                              <span className="mt-0.5 block max-w-md truncate text-[11px] text-neutral-500">
                                {template.description || "Click to review all questions"}
                              </span>
                            </span>
                          </button>
                        </td>
                        <td className="px-3 py-4">
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${theme.badge}`}>{template.roleType}</span>
                        </td>
                        <td className="px-3 py-4 font-bold text-neutral-800">{moduleCount}</td>
                        <td className="px-3 py-4 font-bold text-neutral-800">{questionCount}</td>
                        <td className="px-3 py-4 text-neutral-600">{template.timeLimitMin ? `${template.timeLimitMin} min` : "—"}</td>
                        <td className="px-3 py-4">
                          <div className="flex flex-wrap justify-end gap-2">
                            <button className="button-secondary h-9 rounded-lg px-3 text-[11px]" disabled={previewLoading} onClick={() => void openMinePreview(template.id)} type="button">
                              View
                            </button>
                            <Link className="button-secondary h-9 rounded-lg px-3 text-[11px]" href={`/templates/${encodeURIComponent(template.id)}/edit`}>
                              Edit
                            </Link>
                            <Link className="button-primary h-9 rounded-lg px-3 text-[11px]" href={`/assessment/create?templateId=${encodeURIComponent(template.id)}`}>
                              Assign
                            </Link>
                            <button className="button-secondary h-9 rounded-lg px-3 text-[11px]" disabled={busyId === template.id} onClick={() => void duplicateMine(template.id)} type="button">
                              Duplicate
                            </button>
                            <button
                              className="h-9 rounded-lg border border-rose-200 px-3 text-[11px] font-bold text-rose-600 hover:bg-rose-50"
                              disabled={busyId === template.id}
                              onClick={() => void deleteMine(template.id, template.title)}
                              type="button"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Full question review drawer */}
        {preview || previewLoading ? (
          <div className="fixed inset-0 z-50 flex justify-end bg-neutral-950/45 backdrop-blur-[2px]" onClick={(event) => event.target === event.currentTarget && setPreview(null)} role="presentation">
            <div
              aria-labelledby="template-preview-title"
              aria-modal="true"
              className="flex h-full w-full max-w-4xl flex-col bg-white shadow-2xl animate-in slide-in-from-right"
              role="dialog"
            >
              <header className="shrink-0 border-b border-neutral-100 bg-gradient-to-r from-white to-sky-50/50 px-5 py-4 sm:px-6">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-primary-700">
                      {previewSource === "catalog" ? "Prebuilt catalog · full question bank" : "Workspace template · full question bank"}
                    </p>
                    <h3 className="mt-1 text-[20px] font-black tracking-tight text-neutral-950" id="template-preview-title">
                      {preview?.title ?? "Loading questions…"}
                    </h3>
                    {preview ? (
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-[12px] font-semibold text-neutral-600">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${roleTheme(preview.roleType).badge}`}>{preview.roleType}</span>
                        <span>{preview.timeLimitMin ? `${preview.timeLimitMin} min` : "Flexible time"}</span>
                        <span className="text-neutral-300">·</span>
                        <span>{sortedModules.length} modules</span>
                        <span className="text-neutral-300">·</span>
                        <span>{previewQuestionCount} questions</span>
                      </div>
                    ) : null}
                  </div>
                  <button className="shrink-0 rounded-xl border border-neutral-200 bg-white px-3 py-2 text-[12px] font-bold text-neutral-600 shadow-sm hover:bg-neutral-50" onClick={() => setPreview(null)} type="button">
                    Close
                  </button>
                </div>
                {preview ? (
                  <label className="relative mt-4 block">
                    <Icon className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" name="search" size={15} />
                    <input
                      className="control h-10 w-full rounded-xl border-neutral-200 bg-white pl-9 text-[13px] shadow-sm"
                      onChange={(event) => setQuestionSearch(event.target.value)}
                      placeholder="Filter questions in this template…"
                      type="search"
                      value={questionSearch}
                    />
                  </label>
                ) : null}
              </header>

              <div className="flex min-h-0 flex-1">
                {previewLoading || !preview ? (
                  <div className="flex flex-1 items-center justify-center p-8">
                    <PageLoader label="Loading all questions" />
                  </div>
                ) : (
                  <>
                    <nav className="hidden w-56 shrink-0 overflow-y-auto border-r border-neutral-100 bg-neutral-50/80 p-3 lg:block">
                      <p className="px-2 pb-2 text-[10px] font-bold uppercase tracking-wide text-neutral-400">Modules</p>
                      <ul className="space-y-1">
                        {sortedModules.map((module, index) => {
                          const active = activeModuleId === module.id;
                          return (
                            <li key={module.id}>
                              <button
                                className={`w-full rounded-xl px-2.5 py-2 text-left transition ${
                                  active ? "bg-white shadow-sm ring-1 ring-primary-100" : "hover:bg-white/70"
                                }`}
                                onClick={() => {
                                  setActiveModuleId(module.id);
                                  document.getElementById(`module-${module.id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
                                }}
                                type="button"
                              >
                                <span className="text-[10px] font-bold text-neutral-400">M{index + 1}</span>
                                <span className={`mt-0.5 block text-[12px] font-bold leading-4 ${active ? "text-primary-800" : "text-neutral-800"}`}>
                                  {module.title}
                                </span>
                                <span className="mt-0.5 block text-[10px] font-medium text-neutral-500">{module.questions?.length ?? 0} questions</span>
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    </nav>

                    <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6">
                      {preview.description ? <p className="mb-4 text-[13px] leading-6 text-neutral-600">{preview.description}</p> : null}
                      <div className="mb-5 rounded-xl border border-sky-100 bg-sky-50 px-4 py-3 text-[12px] font-medium leading-5 text-sky-950">
                        Read every question below before adding this pack. Use as-is to create your own copy — the shared catalog never changes.
                      </div>

                      {filteredPreviewModules.length === 0 ? (
                        <EmptyState description="Try a different search term." title="No questions match" />
                      ) : (
                        <div className="space-y-5 pb-8">
                          {filteredPreviewModules.map((module, moduleIndex) => {
                            const questions = module.questions ?? [];
                            const originalIndex = sortedModules.findIndex((item) => item.id === module.id);
                            return (
                              <section className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm" id={`module-${module.id}`} key={module.id}>
                                <header className="flex flex-wrap items-start justify-between gap-2 border-b border-neutral-100 bg-neutral-50/80 px-4 py-3.5">
                                  <div>
                                    <p className="text-[10px] font-bold uppercase tracking-wide text-neutral-400">
                                      Module {(originalIndex >= 0 ? originalIndex : moduleIndex) + 1}
                                    </p>
                                    <h4 className="mt-0.5 text-[15px] font-black text-neutral-950">{module.title}</h4>
                                    {module.description ? <p className="mt-1 max-w-2xl text-[12px] leading-5 text-neutral-500">{module.description}</p> : null}
                                  </div>
                                  <div className="flex flex-wrap gap-1.5">
                                    <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-bold uppercase text-neutral-600 ring-1 ring-neutral-200">
                                      {module.type.replaceAll("_", " ")}
                                    </span>
                                    <span className="rounded-full bg-primary-50 px-2.5 py-1 text-[10px] font-bold text-primary-700 ring-1 ring-primary-100">
                                      {questions.length} Q · weight {module.weight}
                                    </span>
                                  </div>
                                </header>
                                {questions.length === 0 ? (
                                  <p className="px-4 py-5 text-[12px] text-neutral-500">No questions in this module.</p>
                                ) : (
                                  <ol className="divide-y divide-neutral-100">
                                    {questions.map((question, questionIndex) => (
                                      <li className="px-4 py-4 transition hover:bg-sky-50/30" key={question.id}>
                                        <div className="flex items-start gap-3">
                                          <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg bg-neutral-900 text-[11px] font-black text-white">
                                            {questionIndex + 1}
                                          </span>
                                          <div className="min-w-0 flex-1">
                                            <span className="inline-flex rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-indigo-700">
                                              {formatQuestionType(question.questionType)}
                                            </span>
                                            <p className="mt-2 text-[13.5px] font-semibold leading-6 text-neutral-900">{question.questionText}</p>
                                            <QuestionExtras question={question} />
                                          </div>
                                        </div>
                                      </li>
                                    ))}
                                  </ol>
                                )}
                              </section>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>

              {preview ? (
                <footer className="shrink-0 border-t border-neutral-100 bg-white px-5 py-4 sm:px-6">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-[11px] leading-5 text-neutral-500">
                      {previewSource === "catalog"
                        ? "Adding creates your org-owned copy with new IDs. Catalog stays shared and read-only."
                        : "This is your workspace copy. Assign it when you are ready."}
                    </p>
                    <div className="flex flex-wrap justify-end gap-2">
                      <button className="button-secondary h-10 rounded-xl px-4 text-[12px]" onClick={() => setPreview(null)} type="button">
                        Close
                      </button>
                      {previewSource === "catalog" ? (
                        <>
                          <button
                            className="button-secondary h-10 rounded-xl px-4 text-[12px]"
                            disabled={busyId === preview.id}
                            onClick={() => void useCatalogTemplate(preview.id, "session")}
                            type="button"
                          >
                            Use & assign
                          </button>
                          <button
                            className="button-secondary h-10 rounded-xl px-4 text-[12px]"
                            disabled={busyId === preview.id}
                            onClick={() => void useCatalogTemplate(preview.id, "edit")}
                            type="button"
                          >
                            Use & edit questions
                          </button>
                          <button
                            className="button-primary h-10 rounded-xl px-4 text-[12px]"
                            disabled={busyId === preview.id}
                            onClick={() => void useCatalogTemplate(preview.id, "mine")}
                            type="button"
                          >
                            {busyId === preview.id ? "Adding…" : "Use as-is"}
                          </button>
                        </>
                      ) : (
                        <>
                          <Link
                            className="button-secondary h-10 rounded-xl px-4 text-[12px]"
                            href={`/templates/${encodeURIComponent(preview.id)}/edit`}
                            onClick={() => setPreview(null)}
                          >
                            Edit questions
                          </Link>
                          <Link
                            className="button-primary h-10 rounded-xl px-4 text-[12px]"
                            href={`/assessment/create?templateId=${encodeURIComponent(preview.id)}`}
                            onClick={() => setPreview(null)}
                          >
                            Assign candidate
                          </Link>
                        </>
                      )}
                    </div>
                  </div>
                </footer>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </AppShell>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl bg-neutral-50 px-2 py-2 text-center ring-1 ring-neutral-100">
      <dt className="text-[10px] font-semibold text-neutral-500">{label}</dt>
      <dd className="mt-0.5 text-[14px] font-black text-neutral-900">{value}</dd>
    </div>
  );
}

function QuestionExtras({ question }: { question: Question }) {
  const options = formatOptions(question.options);
  const rubric = formatRubric(question.rubric);
  if (!options.length && !rubric.length) return null;

  return (
    <div className="mt-2.5 space-y-2">
      {options.length ? (
        <ul className="space-y-1 rounded-xl border border-neutral-100 bg-neutral-50 px-3 py-2.5">
          {options.map((option, index) => (
            <li className="text-[12px] leading-5 text-neutral-700" key={`${question.id}-opt-${index}`}>
              <span className="mr-1.5 inline-flex size-5 items-center justify-center rounded-md bg-white text-[10px] font-black text-neutral-500 ring-1 ring-neutral-200">
                {String.fromCharCode(65 + index)}
              </span>
              {option}
            </li>
          ))}
        </ul>
      ) : null}
      {rubric.length ? (
        <div className="flex flex-wrap gap-1">
          {rubric.map((cue) => (
            <span className="rounded-md bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-800 ring-1 ring-amber-100" key={cue}>
              {cue}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function matchesRoleFilter(roleType: string, filter: RoleFilterId): boolean {
  if (filter === "all") return true;
  const role = roleType.toLowerCase();
  if (filter === "engineering") return role.includes("software") || role.includes("frontend") || role.includes("engineer") || role.includes("developer");
  if (filter === "product") return role.includes("product");
  if (filter === "data") return role.includes("data") || role.includes("analyst");
  if (filter === "leadership") return role.includes("leader") || role.includes("manager") && !role.includes("product");
  if (filter === "people") return role.includes("hr") || role.includes("people");
  if (filter === "customer") return role.includes("customer") || role.includes("success") || role.includes("support");
  return true;
}

function roleTheme(roleType: string): { icon: IconName; iconBg: string; badge: string; bar: string } {
  const role = roleType.toLowerCase();
  if (role.includes("software") || role.includes("frontend") || role.includes("developer")) {
    return { icon: "code", iconBg: "bg-indigo-100 text-indigo-700", badge: "bg-indigo-50 text-indigo-700", bar: "bg-indigo-500" };
  }
  if (role.includes("product")) {
    return { icon: "sparkle", iconBg: "bg-violet-100 text-violet-700", badge: "bg-violet-50 text-violet-700", bar: "bg-violet-500" };
  }
  if (role.includes("data") || role.includes("analyst")) {
    return { icon: "analytics", iconBg: "bg-teal-100 text-teal-700", badge: "bg-teal-50 text-teal-700", bar: "bg-teal-500" };
  }
  if (role.includes("leader") || role.includes("manager")) {
    return { icon: "crown", iconBg: "bg-blue-100 text-blue-700", badge: "bg-blue-50 text-blue-700", bar: "bg-blue-500" };
  }
  if (role.includes("hr") || role.includes("people")) {
    return { icon: "users", iconBg: "bg-orange-100 text-orange-700", badge: "bg-orange-50 text-orange-700", bar: "bg-orange-500" };
  }
  if (role.includes("customer") || role.includes("success")) {
    return { icon: "message", iconBg: "bg-sky-100 text-sky-700", badge: "bg-sky-50 text-sky-700", bar: "bg-sky-500" };
  }
  return { icon: "clipboard", iconBg: "bg-neutral-100 text-neutral-700", badge: "bg-neutral-100 text-neutral-700", bar: "bg-primary-500" };
}

function formatQuestionType(type: QuestionType | string): string {
  return String(type).replaceAll("_", " ");
}

function formatOptions(options: Question["options"]): string[] {
  if (options == null) return [];
  if (Array.isArray(options)) {
    return options
      .map((item) => {
        if (typeof item === "string" || typeof item === "number") return String(item);
        if (item && typeof item === "object" && !Array.isArray(item)) {
          const record = item as Record<string, unknown>;
          if (typeof record.label === "string") return record.label;
          if (typeof record.text === "string") return record.text;
          if (typeof record.value === "string" || typeof record.value === "number") return String(record.value);
        }
        return "";
      })
      .filter(Boolean);
  }
  if (typeof options === "object") {
    return Object.values(options)
      .map((value) => (typeof value === "string" || typeof value === "number" ? String(value) : ""))
      .filter(Boolean);
  }
  return [];
}

function formatRubric(rubric: Question["rubric"]): string[] {
  if (rubric == null) return [];
  if (Array.isArray(rubric)) {
    return rubric
      .map((item) => {
        if (typeof item === "string") return item;
        if (item && typeof item === "object" && !Array.isArray(item) && typeof (item as { label?: unknown }).label === "string") {
          return String((item as { label: string }).label);
        }
        return "";
      })
      .filter(Boolean);
  }
  if (typeof rubric === "string") return [rubric];
  return [];
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      className={`inline-flex items-center rounded-lg px-3.5 py-2 text-[12px] font-bold transition ${
        active ? "bg-primary-500 text-white shadow-sm" : "text-neutral-600 hover:bg-neutral-50"
      }`}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}
