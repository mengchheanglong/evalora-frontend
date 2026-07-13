"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { Icon, type IconName } from "@/components/icons";
import { EmptyState, ErrorState, InlineAlert, PageLoader } from "@/components/ui-states";
import { apiDelete, apiGet, apiPost, getErrorMessage } from "@/lib/api";
import type { AssessmentTemplate, CatalogTemplateSummary, Question, QuestionType } from "@/lib/types";

// ==========================================
// Types & Constants
// ==========================================
type MainTab = "library" | "mine";
type PreviewSource = "catalog" | "mine";
type TemplateStatus = "Active" | "Draft" | "Archived";
type TemplateCategory = "Technical" | "Behavioral" | "Leadership" | "Communication" | "General";

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

interface TemplateRow {
  id: string;
  title: string;
  description: string;
  category: TemplateCategory;
  targetRoles: string;
  modulesCount: number;
  questionsCount: number;
  lastUpdate: string;
  updatedBy: string;
  status: TemplateStatus;
  icon: IconName;
  iconColor: string;
}

// ==========================================
// Helper Functions
// ==========================================
function mapTemplateToRow(template: AssessmentTemplate): TemplateRow {
  const questionsCount = template.modules.reduce((acc, m) => acc + (m.questions?.length || 0), 0);
  
  let category: TemplateCategory = "General";
  const roleLower = template.roleType.toLowerCase();
  if (roleLower.includes("developer") || roleLower.includes("engineer") || roleLower.includes("data") || roleLower.includes("technical")) category = "Technical";
  else if (roleLower.includes("behavioral")) category = "Behavioral";
  else if (roleLower.includes("lead") || roleLower.includes("manager")) category = "Leadership";
  else if (roleLower.includes("communication")) category = "Communication";

  let icon: IconName = "clipboard";
  let iconColor = "bg-gray-100 text-gray-600";
  const firstModuleType = template.modules[0]?.type;
  
  if (firstModuleType === "coding" || firstModuleType === "debugging") { icon = "code"; iconColor = "bg-indigo-100 text-indigo-600"; }
  else if (firstModuleType === "behavioral") { icon = "users"; iconColor = "bg-orange-100 text-orange-600"; }
  else if (firstModuleType === "leadership") { icon = "crown"; iconColor = "bg-blue-100 text-blue-600"; }
  else if (firstModuleType === "communication") { icon = "message"; iconColor = "bg-sky-100 text-sky-600"; }
  else if (firstModuleType === "ai_interview") { icon = "message"; iconColor = "bg-purple-100 text-purple-600"; }

  const metadata = template as AssessmentTemplate & { updatedAt?: string; createdByName?: string };
  const lastUpdate = metadata.updatedAt ? new Date(metadata.updatedAt).toLocaleDateString() : "N/A";
  const updatedBy = metadata.createdByName || "System";

  return {
    id: template.id,
    title: template.title,
    description: template.description,
    category,
    targetRoles: template.roleType,
    modulesCount: template.modules.length,
    questionsCount,
    lastUpdate,
    updatedBy,
    status: "Active",
    icon,
    iconColor,
  };
}

function roleTheme(roleType: string): { icon: IconName; iconBg: string; badge: string; bar: string } {
  const role = roleType.toLowerCase();
  if (role.includes("software") || role.includes("frontend") || role.includes("developer") || role.includes("engineer")) {
    return { icon: "code", iconBg: "bg-indigo-100 text-indigo-700", badge: "bg-indigo-50 text-indigo-700", bar: "bg-indigo-500" };
  }
  if (role.includes("product")) {
    return { icon: "clipboard", iconBg: "bg-violet-100 text-violet-700", badge: "bg-violet-50 text-violet-700", bar: "bg-violet-500" };
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
  return { icon: "clipboard", iconBg: "bg-gray-100 text-gray-700", badge: "bg-gray-50 text-gray-700", bar: "bg-gray-500" };
}

function matchesRoleFilter(roleType: string, filter: RoleFilterId): boolean {
  if (filter === "all") return true;
  const role = roleType.toLowerCase();
  if (filter === "engineering") return role.includes("software") || role.includes("frontend") || role.includes("engineer") || role.includes("developer");
  if (filter === "product") return role.includes("product");
  if (filter === "data") return role.includes("data") || role.includes("analyst");
  if (filter === "leadership") return role.includes("leader") || role.includes("manager");
  if (filter === "people") return role.includes("hr") || role.includes("people");
  if (filter === "customer") return role.includes("customer") || role.includes("success") || role.includes("support");
  return true;
}

function formatQuestionType(type: QuestionType | string): string {
  return String(type).replaceAll("_", " ");
}

function formatOptions(options: Question["options"]): string[] {
  if (options == null) return [];
  if (Array.isArray(options)) {
    return options.map((item) => {
      if (typeof item === "string" || typeof item === "number") return String(item);
      if (item && typeof item === "object" && !Array.isArray(item)) {
        const record = item as Record<string, unknown>;
        if (typeof record.label === "string") return record.label;
        if (typeof record.text === "string") return record.text;
        if (typeof record.value === "string" || typeof record.value === "number") return String(record.value);
      }
      return "";
    }).filter(Boolean);
  }
  if (typeof options === "object") {
    return Object.values(options).map((value) => (typeof value === "string" || typeof value === "number" ? String(value) : "")).filter(Boolean);
  }
  return [];
}

function formatRubric(rubric: Question["rubric"]): string[] {
  if (rubric == null) return [];
  if (Array.isArray(rubric)) {
    return rubric.map((item) => {
      if (typeof item === "string") return item;
      if (item && typeof item === "object" && !Array.isArray(item) && typeof (item as { label?: unknown }).label === "string") {
        return String((item as { label: string }).label);
      }
      return "";
    }).filter(Boolean);
  }
  if (typeof rubric === "string") return [rubric];
  return [];
}

// ==========================================
// Main Component
// ==========================================
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
  
  // Preview State
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

  useEffect(() => { void load(); }, [load]);

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
      return item.title.toLowerCase().includes(q) || item.roleType.toLowerCase().includes(q) || item.description.toLowerCase().includes(q);
    });
  }, [catalog, searchQuery, roleFilter]);

  const filteredMine = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return mine.filter((item) => {
      if (!matchesRoleFilter(item.roleType, roleFilter)) return false;
      if (!q) return true;
      return item.title.toLowerCase().includes(q) || item.roleType.toLowerCase().includes(q) || item.description.toLowerCase().includes(q);
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
          (question) => question.questionText.toLowerCase().includes(q) || question.questionType.toLowerCase().includes(q) || module.title.toLowerCase().includes(q)
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
      setNotice(`"${cloned.title}" is in My templates.`);
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

  if (loading) return <AppShell active="templates" title="Assessment Templates" description=""><PageLoader label="Loading templates" /></AppShell>;
  if (error && !catalog.length && !mine.length) return <AppShell active="templates" title="Assessment Templates" description=""><ErrorState message={error} onRetry={() => void load()} /></AppShell>;

  return (
    <AppShell active="templates" title="Assessment Templates" description="Review every question first, then add a pack to your workspace or assign a candidate.">
      <div className="space-y-6">
        {error && <InlineAlert tone="error">{error}</InlineAlert>}
        {notice && <InlineAlert tone="success">{notice}</InlineAlert>}

        {/* Clean Header & Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex rounded-lg bg-gray-100 p-1 w-fit">
            <TabButton active={mainTab === "library"} onClick={() => setMainTab("library")}>Prebuilt Library ({catalog.length})</TabButton>
            <TabButton active={mainTab === "mine"} onClick={() => setMainTab("mine")}>My Templates ({mine.length})</TabButton>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="relative">
              <Icon className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" name="search" size={16} />
              <input
                className="h-10 w-full sm:w-64 rounded-lg border border-gray-200 bg-white pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-sky-500"
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search templates..."
                type="search"
                value={searchQuery}
              />
            </div>
            <Link href="/templates/create" className="flex items-center gap-2 h-10 px-4 bg-sky-500 text-white rounded-lg text-sm font-medium hover:bg-sky-600 shadow-sm transition-colors">
              <Icon name="plus" size={16} /> New Template
            </Link>
          </div>
        </div>

        {/* Role Filters */}
        <div className="flex flex-wrap gap-2">
          {ROLE_FILTERS.map((filter) => (
            <button
              key={filter.id}
              onClick={() => setRoleFilter(filter.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                roleFilter === filter.id
                  ? "bg-gray-900 text-white shadow-sm"
                  : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>

        {/* Content Area */}
        {mainTab === "library" ? (
          filteredCatalog.length === 0 ? (
            <EmptyState description="Try another role filter or search term." title="No prebuilt templates match" icon="clipboard" />
          ) : (
            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {filteredCatalog.map((item) => {
                const theme = roleTheme(item.roleType);
                return (
                  <article key={item.id} className="group flex flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm hover:shadow-md transition-shadow">
                    <div className={`h-1.5 w-full ${theme.bar}`} />
                    <button 
                      className="flex flex-1 flex-col p-5 text-left" 
                      disabled={previewLoading} 
                      onClick={() => void openCatalogPreview(item.id)}
                    >
                      <div className="flex items-start gap-3">
                        <span className={`flex size-12 shrink-0 items-center justify-center rounded-xl ${theme.iconBg}`}>
                          <Icon name={theme.icon} size={22} />
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-1.5 mb-2">
                            <span className="rounded-full bg-sky-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-sky-700">Prebuilt</span>
                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${theme.badge}`}>{item.roleType}</span>
                          </div>
                          <h3 className="text-base font-bold text-gray-900 group-hover:text-sky-600 transition-colors line-clamp-1">{item.title}</h3>
                        </div>
                      </div>
                      <p className="mt-3 line-clamp-2 flex-1 text-xs leading-5 text-gray-500">{item.description}</p>
                      <dl className="mt-4 grid grid-cols-3 gap-2">
                        <Stat label="Modules" value={item.moduleCount} />
                        <Stat label="Questions" value={item.questionCount} />
                        <Stat label="Minutes" value={item.timeLimitMin ?? "—"} />
                      </dl>
                    </button>
                    <div className="grid grid-cols-2 gap-2 border-t border-gray-100 bg-gray-50 p-3">
                      <button
                        className="flex items-center justify-center gap-1.5 h-9 rounded-lg border border-gray-200 bg-white text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                        disabled={previewLoading || busyId === item.id}
                        onClick={() => void openCatalogPreview(item.id)}
                      >
                        <Icon name="eye" size={14} /> Review
                      </button>
                      <button
                        className="flex items-center justify-center gap-1.5 h-9 rounded-lg bg-sky-500 text-xs font-semibold text-white hover:bg-sky-600 transition-colors"
                        disabled={busyId === item.id}
                        onClick={() => void useCatalogTemplate(item.id, "mine")}
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
            action={<button className="button-primary" onClick={() => setMainTab("library")}>Browse prebuilt library</button>}
            description="Open a prebuilt pack, review every question, then add it to your workspace."
            title="No workspace templates yet"
            icon="clipboard"
          />
        ) : (
          <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1000px] text-left text-sm">
                <thead className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  <tr>
                    <th className="px-5 py-3.5">Template</th>
                    <th className="px-4 py-3.5">Category</th>
                    <th className="px-4 py-3.5">Target Role</th>
                    <th className="px-4 py-3.5">Modules</th>
                    <th className="px-4 py-3.5">Questions</th>
                    <th className="px-4 py-3.5">Last Updated</th>
                    <th className="px-4 py-3.5">Status</th>
                    <th className="px-5 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredMine.map(mapTemplateToRow).map((template) => (
                    <tr key={template.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <span className={`flex size-10 shrink-0 items-center justify-center rounded-lg ${template.iconColor}`}>
                            <Icon name={template.icon} size={20} />
                          </span>
                          <div>
                            <p className="font-bold text-gray-900">{template.title}</p>
                            <p className="text-xs text-gray-500 mt-0.5 max-w-[250px] truncate">{template.description}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium border bg-indigo-50 text-indigo-700 border-indigo-100">
                          {template.category}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-700">{template.targetRoles}</td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-1.5 text-gray-700">
                          <Icon name="clipboard" size={14} className="text-gray-400" />
                          <span className="font-medium">{template.modulesCount}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-1.5 text-gray-700">
                          <Icon name="file" size={14} className="text-gray-400" />
                          <span className="font-medium">{template.questionsCount}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-xs text-gray-500">
                        <p>{template.lastUpdate}</p>
                        <p className="text-gray-400">by {template.updatedBy}</p>
                      </td>
                      <td className="px-4 py-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold border ${
                          template.status === "Active" ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-gray-50 text-gray-600 border-gray-100"
                        }`}>
                          {template.status}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <ActionButton icon="eye" label="Review" onClick={() => void openMinePreview(template.id)} />
                          <ActionButton icon="code" label="Edit" href={`/templates/${template.id}/edit`} />
                          <ActionButton icon="file" label="Duplicate" onClick={() => void duplicateMine(template.id)} disabled={busyId === template.id} />
                          <ActionButton icon="more" label="Delete" onClick={() => void deleteMine(template.id, template.title)} disabled={busyId === template.id} danger />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Preview Drawer */}
        {preview || previewLoading ? (
          <div className="fixed inset-0 z-50 flex justify-end bg-gray-950/45 backdrop-blur-sm" onClick={(e) => e.target === e.currentTarget && setPreview(null)}>
            <div className="flex h-full w-full max-w-4xl flex-col bg-white shadow-2xl animate-in slide-in-from-right duration-300">
              <header className="shrink-0 border-b border-gray-100 bg-gray-50 px-6 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-sky-600">
                      {previewSource === "catalog" ? "Prebuilt Catalog" : "Workspace Template"}
                    </p>
                    <h3 className="mt-1 text-xl font-bold text-gray-900">{preview?.title ?? "Loading questions…"}</h3>
                    {preview && (
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs font-medium text-gray-600">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${roleTheme(preview.roleType).badge}`}>{preview.roleType}</span>
                        <span>{preview.timeLimitMin ? `${preview.timeLimitMin} min` : "Flexible time"}</span>
                        <span className="text-gray-300">•</span>
                        <span>{sortedModules.length} modules</span>
                        <span className="text-gray-300">•</span>
                        <span>{previewQuestionCount} questions</span>
                      </div>
                    )}
                  </div>
                  <button className="shrink-0 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-600 shadow-sm hover:bg-gray-50" onClick={() => setPreview(null)}>
                    Close
                  </button>
                </div>
                {preview && (
                  <div className="relative mt-4">
                    <Icon className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" name="search" size={15} />
                    <input
                      className="h-10 w-full rounded-lg border border-gray-200 bg-white pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-sky-500"
                      onChange={(e) => setQuestionSearch(e.target.value)}
                      placeholder="Filter questions in this template…"
                      type="search"
                      value={questionSearch}
                    />
                  </div>
                )}
              </header>

              <div className="flex min-h-0 flex-1">
                {previewLoading || !preview ? (
                  <div className="flex flex-1 items-center justify-center p-8"><PageLoader label="Loading all questions" /></div>
                ) : (
                  <>
                    <nav className="hidden w-60 shrink-0 overflow-y-auto border-r border-gray-100 bg-gray-50 p-4 lg:block">
                      <p className="px-2 pb-2 text-[10px] font-bold uppercase tracking-widest text-gray-400">Modules</p>
                      <ul className="space-y-1">
                        {sortedModules.map((module, index) => {
                          const active = activeModuleId === module.id;
                          return (
                            <li key={module.id}>
                              <button
                                className={`w-full rounded-lg px-3 py-2.5 text-left transition ${active ? "bg-white shadow-sm ring-1 ring-sky-200" : "hover:bg-white/70"}`}
                                onClick={() => {
                                  setActiveModuleId(module.id);
                                  document.getElementById(`module-${module.id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
                                }}
                              >
                                <span className="text-[10px] font-bold text-gray-400">M{index + 1}</span>
                                <span className={`mt-0.5 block text-xs font-bold leading-4 ${active ? "text-sky-700" : "text-gray-800"}`}>{module.title}</span>
                                <span className="mt-0.5 block text-[10px] font-medium text-gray-500">{module.questions?.length ?? 0} questions</span>
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    </nav>

                    <div className="min-h-0 flex-1 overflow-y-auto p-6">
                      {preview.description && <p className="mb-6 text-sm leading-6 text-gray-600">{preview.description}</p>}
                      <div className="mb-6 rounded-lg border border-sky-100 bg-sky-50 px-4 py-3 text-xs font-medium leading-5 text-sky-900">
                        Read every question below before adding this pack. Using it creates your own editable copy.
                      </div>

                      {filteredPreviewModules.length === 0 ? (
                        <EmptyState description="Try a different search term." title="No questions match" icon="search" />
                      ) : (
                        <div className="space-y-6 pb-8">
                          {filteredPreviewModules.map((module, moduleIndex) => {
                            const questions = module.questions ?? [];
                            const originalIndex = sortedModules.findIndex((item) => item.id === module.id);
                            return (
                              <section key={module.id} id={`module-${module.id}`} className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                                <header className="flex flex-wrap items-start justify-between gap-2 border-b border-gray-100 bg-gray-50 px-5 py-4">
                                  <div>
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Module {(originalIndex >= 0 ? originalIndex : moduleIndex) + 1}</p>
                                    <h4 className="mt-0.5 text-sm font-bold text-gray-900">{module.title}</h4>
                                    {module.description && <p className="mt-1 max-w-2xl text-xs leading-5 text-gray-500">{module.description}</p>}
                                  </div>
                                  <div className="flex flex-wrap gap-1.5">
                                    <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-bold uppercase text-gray-600 ring-1 ring-gray-200">
                                      {module.type.replaceAll("_", " ")}
                                    </span>
                                    <span className="rounded-full bg-sky-50 px-2.5 py-1 text-[10px] font-bold text-sky-700 ring-1 ring-sky-100">
                                      {questions.length} Q · weight {module.weight}
                                    </span>
                                  </div>
                                </header>
                                {questions.length === 0 ? (
                                  <p className="px-5 py-6 text-xs text-gray-500">No questions in this module.</p>
                                ) : (
                                  <ol className="divide-y divide-gray-100">
                                    {questions.map((question, questionIndex) => (
                                      <li key={question.id} className="px-5 py-4 transition hover:bg-sky-50/30">
                                        <div className="flex items-start gap-3">
                                          <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg bg-gray-900 text-[11px] font-black text-white">
                                            {questionIndex + 1}
                                          </span>
                                          <div className="min-w-0 flex-1">
                                            <span className="inline-flex rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-indigo-700">
                                              {formatQuestionType(question.questionType)}
                                            </span>
                                            <p className="mt-2 text-sm font-semibold leading-6 text-gray-900">{question.questionText}</p>
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

              {preview && (
                <footer className="shrink-0 border-t border-gray-100 bg-white px-6 py-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-xs leading-5 text-gray-500">
                      {previewSource === "catalog" ? "Adding creates your org-owned copy. Catalog stays shared and read-only." : "This is your workspace copy. Assign it when ready."}
                    </p>
                    <div className="flex flex-wrap justify-end gap-2">
                      <button className="h-10 rounded-lg border border-gray-200 bg-white px-4 text-xs font-semibold text-gray-700 hover:bg-gray-50" onClick={() => setPreview(null)}>
                        Close
                      </button>
                      {previewSource === "catalog" ? (
                        <>
                          <button className="h-10 rounded-lg border border-gray-200 bg-white px-4 text-xs font-semibold text-gray-700 hover:bg-gray-50" disabled={busyId === preview.id} onClick={() => void useCatalogTemplate(preview.id, "session")}>
                            Use & assign
                          </button>
                          <button className="h-10 rounded-lg border border-gray-200 bg-white px-4 text-xs font-semibold text-gray-700 hover:bg-gray-50" disabled={busyId === preview.id} onClick={() => void useCatalogTemplate(preview.id, "edit")}>
                            Use & edit
                          </button>
                          <button className="h-10 rounded-lg bg-sky-500 px-4 text-xs font-semibold text-white hover:bg-sky-600" disabled={busyId === preview.id} onClick={() => void useCatalogTemplate(preview.id, "mine")}>
                            {busyId === preview.id ? "Adding…" : "Use as-is"}
                          </button>
                        </>
                      ) : (
                        <>
                          <Link className="h-10 rounded-lg border border-gray-200 bg-white px-4 text-xs font-semibold text-gray-700 hover:bg-gray-50 flex items-center" href={`/templates/${encodeURIComponent(preview.id)}/edit`} onClick={() => setPreview(null)}>
                            Edit questions
                          </Link>
                          <Link className="h-10 rounded-lg bg-sky-500 px-4 text-xs font-semibold text-white hover:bg-sky-600 flex items-center" href={`/assessment/create?templateId=${encodeURIComponent(preview.id)}`} onClick={() => setPreview(null)}>
                            Assign candidate
                          </Link>
                        </>
                      )}
                    </div>
                  </div>
                </footer>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </AppShell>
  );
}

// ==========================================
// Sub-Components
// ==========================================
function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg bg-gray-50 px-2 py-2 text-center ring-1 ring-gray-100">
      <dt className="text-[10px] font-semibold text-gray-500">{label}</dt>
      <dd className="mt-0.5 text-sm font-bold text-gray-900">{value}</dd>
    </div>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      className={`inline-flex items-center rounded-md px-4 py-2 text-xs font-bold transition ${
        active ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
      }`}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function ActionButton({ icon, label, onClick, href, disabled, danger }: { 
  icon: IconName; label: string; onClick?: () => void; href?: string; disabled?: boolean; danger?: boolean;
}) {
  const baseClasses = "p-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed";
  const colorClasses = danger ? "text-gray-400 hover:text-red-600 hover:bg-red-50" : "text-gray-400 hover:text-sky-600 hover:bg-sky-50";

  if (href) {
    return (
      <Link href={href} className={`${baseClasses} ${colorClasses}`} title={label}>
        <Icon name={icon} size={16} />
      </Link>
    );
  }
  return (
    <button onClick={onClick} disabled={disabled} className={`${baseClasses} ${colorClasses}`} title={label} type="button">
      <Icon name={icon} size={16} />
    </button>
  );
}

function QuestionExtras({ question }: { question: Question }) {
  const options = formatOptions(question.options);
  const rubric = formatRubric(question.rubric);
  if (!options.length && !rubric.length) return null;

  return (
    <div className="mt-3 space-y-3">
      {options.length > 0 && (
        <ul className="space-y-1.5 rounded-lg border border-gray-100 bg-gray-50 px-3 py-2.5">
          {options.map((option, index) => (
            <li key={`${question.id}-opt-${index}`} className="flex items-start gap-2 text-xs leading-5 text-gray-700">
              <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded bg-white text-[10px] font-black text-gray-500 ring-1 ring-gray-200">
                {String.fromCharCode(65 + index)}
              </span>
              <span>{option}</span>
            </li>
          ))}
        </ul>
      )}
      {rubric.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {rubric.map((cue) => (
            <span key={cue} className="rounded-md bg-amber-50 px-2 py-1 text-[10px] font-bold text-amber-800 ring-1 ring-amber-100">
              {cue}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}