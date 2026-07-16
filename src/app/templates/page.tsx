"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
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
  let iconColor = "tpl-icon tpl-icon-neutral";
  const firstModuleType = template.modules[0]?.type;
  
  if (firstModuleType === "coding" || firstModuleType === "debugging") { icon = "code"; iconColor = "tpl-icon tpl-icon-indigo"; }
  else if (firstModuleType === "behavioral") { icon = "users"; iconColor = "tpl-icon tpl-icon-orange"; }
  else if (firstModuleType === "leadership") { icon = "crown"; iconColor = "tpl-icon tpl-icon-blue"; }
  else if (firstModuleType === "communication") { icon = "message"; iconColor = "tpl-icon tpl-icon-sky"; }
  else if (firstModuleType === "ai_interview") { icon = "message"; iconColor = "tpl-icon tpl-icon-violet"; }

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
    return { icon: "code", iconBg: "tpl-icon tpl-icon-indigo", badge: "tpl-chip tpl-chip-indigo", bar: "bg-indigo-500" };
  }
  if (role.includes("product")) {
    return { icon: "clipboard", iconBg: "tpl-icon tpl-icon-violet", badge: "tpl-chip tpl-chip-violet", bar: "bg-violet-500" };
  }
  if (role.includes("data") || role.includes("analyst")) {
    return { icon: "analytics", iconBg: "tpl-icon tpl-icon-teal", badge: "tpl-chip tpl-chip-teal", bar: "bg-teal-500" };
  }
  if (role.includes("leader") || role.includes("manager")) {
    return { icon: "crown", iconBg: "tpl-icon tpl-icon-blue", badge: "tpl-chip tpl-chip-blue", bar: "bg-blue-500" };
  }
  if (role.includes("hr") || role.includes("people")) {
    return { icon: "users", iconBg: "tpl-icon tpl-icon-orange", badge: "tpl-chip tpl-chip-orange", bar: "bg-orange-500" };
  }
  if (role.includes("customer") || role.includes("success")) {
    return { icon: "message", iconBg: "tpl-icon tpl-icon-sky", badge: "tpl-chip tpl-chip-sky", bar: "bg-sky-500" };
  }
  return { icon: "clipboard", iconBg: "tpl-icon tpl-icon-neutral", badge: "tpl-chip tpl-chip-neutral", bar: "bg-gray-500" };
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
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [mounted, setMounted] = useState(false);
  
  // Preview State
  const [preview, setPreview] = useState<AssessmentTemplate | null>(null);
  const [previewSource, setPreviewSource] = useState<PreviewSource>("catalog");
  const [previewLoading, setPreviewLoading] = useState(false);
  const [activeModuleId, setActiveModuleId] = useState("");
  const [questionSearch, setQuestionSearch] = useState("");

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!deleteTarget) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !deleting) {
        setDeleteTarget(null);
        setDeleteError("");
      }
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [deleteTarget, deleting]);

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

  function requestDeleteMine(id: string, title: string) {
    setError("");
    setNotice("");
    setDeleteError("");
    setDeleteTarget({ id, title });
  }

  function closeDeleteModal() {
    if (deleting) return;
    setDeleteTarget(null);
    setDeleteError("");
  }

  async function confirmDeleteMine() {
    if (!deleteTarget) return;
    const { id, title } = deleteTarget;
    setDeleting(true);
    setBusyId(id);
    setDeleteError("");
    setNotice("");
    setError("");
    try {
      await apiDelete(`/templates/${encodeURIComponent(id)}`);
      setMine((current) => current.filter((item) => item.id !== id));
      if (preview?.id === id) setPreview(null);
      setDeleteTarget(null);
      setNotice(`“${title}” was deleted from your workspace.`);
    } catch (requestError) {
      setDeleteError(getErrorMessage(requestError, "Unable to delete template."));
    } finally {
      setDeleting(false);
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
          <div className="flex rounded-lg bg-gray-100 p-1 w-fit" style={{ backgroundColor: 'var(--theme-panel-soft)', borderColor: 'var(--theme-border)' }}>
            <TabButton active={mainTab === "library"} onClick={() => setMainTab("library")}>Prebuilt Library ({catalog.length})</TabButton>
            <TabButton active={mainTab === "mine"} onClick={() => setMainTab("mine")}>My Templates ({mine.length})</TabButton>
          </div>
          
          <div className="flex items-center gap-3">
            <label
              className="group flex h-10 w-full items-center gap-2.5 rounded-lg border px-3 text-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.55)] transition focus-within:ring-4 focus-within:ring-primary-500/15 sm:w-64"
              style={{
                backgroundColor: "var(--theme-panel)",
                borderColor: "var(--theme-border)",
                color: "var(--theme-text)",
              }}
            >
              <span className="sr-only">Search templates</span>
              <Icon className="pointer-events-none relative -top-px shrink-0 text-primary-700/65 transition group-focus-within:text-primary-700" name="search" size={17} />
              <input
                className="min-w-0 flex-1 border-0 bg-transparent text-sm font-medium leading-none outline-none placeholder:text-gray-500"
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search templates..."
                type="search"
                value={searchQuery}
              />
            </label>
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
              style={roleFilter === filter.id ? {
                backgroundColor: 'var(--theme-heading)',
                color: 'var(--theme-panel)',
              } : {
                backgroundColor: 'var(--theme-panel)',
                borderColor: 'var(--theme-border)',
                color: 'var(--theme-text)',
              }}
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
                  <article key={item.id} className="group flex flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm hover:shadow-md transition-shadow" style={{
                    backgroundColor: 'var(--theme-panel)',
                    borderColor: 'var(--theme-border)',
                  }}>
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
                            <span className="tpl-chip tpl-chip-sky rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide">Prebuilt</span>
                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${theme.badge}`}>{item.roleType}</span>
                          </div>
                          <h3 className="text-base font-bold text-gray-900 group-hover:text-sky-600 transition-colors line-clamp-1" style={{
                            color: 'var(--theme-heading)',
                          }}>{item.title}</h3>
                        </div>
                      </div>
                      <p className="mt-3 line-clamp-2 flex-1 text-xs leading-5 text-gray-500" style={{
                        color: 'var(--theme-muted)',
                      }}>{item.description}</p>
                      <dl className="mt-4 grid grid-cols-3 gap-2">
                        <Stat label="Modules" value={item.moduleCount} />
                        <Stat label="Questions" value={item.questionCount} />
                        <Stat label="Minutes" value={item.timeLimitMin ?? "—"} />
                      </dl>
                    </button>
                    <div className="grid grid-cols-2 gap-2 border-t border-gray-100 bg-gray-50 p-3" style={{
                      borderColor: 'var(--theme-border)',
                      backgroundColor: 'var(--theme-panel-soft)',
                    }}>
                      <button
                        className="flex items-center justify-center gap-1.5 h-9 rounded-lg border border-gray-200 bg-white text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                        style={{
                          backgroundColor: 'var(--theme-panel)',
                          borderColor: 'var(--theme-border)',
                          color: 'var(--theme-text)',
                        }}
                        disabled={previewLoading || busyId === item.id}
                        onClick={() => void openCatalogPreview(item.id)}
                      >
                        <Icon name="eye" size={14} /> Review
                      </button>
                      <button
                        className="flex items-center justify-center gap-1.5 h-8 sm:h-9 rounded-lg bg-sky-500 text-xs sm:text-sm font-semibold text-white hover:bg-sky-600 transition-colors px-3 sm:px-4 w-full sm:w-auto disabled:opacity-70 disabled:cursor-not-allowed"
                        disabled={busyId === item.id}
                        onClick={() => void useCatalogTemplate(item.id, "mine")}
                      >
                        {busyId === item.id ? (
                          <>
                            <span className="inline-block animate-spin text-xs">⚙</span>
                            Adding…
                          </>
                        ) : (
                          "Use as-is"
                        )}
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
          <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm" style={{
            backgroundColor: 'var(--theme-panel)',
            borderColor: 'var(--theme-border)',
          }}>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1000px] text-left text-sm">
                <thead className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wider" style={{
                  backgroundColor: 'var(--theme-panel-soft)',
                  color: 'var(--theme-muted)',
                }}>
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
                <tbody className="divide-y divide-gray-100" style={{
                  borderColor: 'var(--theme-border)',
                }}>
                  {filteredMine.map(mapTemplateToRow).map((template) => (
                    <tr key={template.id} className="hover:bg-gray-50 transition-colors" style={{
                      borderColor: 'var(--theme-border)',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'var(--theme-panel-soft)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }}>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <span className={`flex size-10 shrink-0 items-center justify-center rounded-lg ${template.iconColor}`}>
                            <Icon name={template.icon} size={20} />
                          </span>
                          <div>
                            <p className="font-bold text-gray-900" style={{
                              color: 'var(--theme-heading)',
                            }}>{template.title}</p>
                            <p className="text-xs text-gray-500 mt-0.5 max-w-[250px] truncate" style={{
                              color: 'var(--theme-muted)',
                            }}>{template.description}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span className="tpl-chip tpl-chip-indigo inline-flex items-center rounded-md px-2.5 py-1 text-xs font-medium">
                          {template.category}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-700" style={{
                        color: 'var(--theme-text)',
                      }}>{template.targetRoles}</td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-1.5 text-gray-700" style={{
                          color: 'var(--theme-text)',
                        }}>
                          <Icon name="clipboard" size={14} className="text-gray-400" style={{
                            color: 'var(--theme-faint)',
                          }} />
                          <span className="font-medium">{template.modulesCount}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-1.5 text-gray-700" style={{
                          color: 'var(--theme-text)',
                        }}>
                          <Icon name="file" size={14} className="text-gray-400" style={{
                            color: 'var(--theme-faint)',
                          }} />
                          <span className="font-medium">{template.questionsCount}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-xs text-gray-500" style={{
                        color: 'var(--theme-muted)',
                      }}>
                        <p>{template.lastUpdate}</p>
                        <p style={{
                          color: 'var(--theme-faint)',
                        }}>by {template.updatedBy}</p>
                      </td>
                      <td className="px-4 py-4">
                        <span className={`inline-flex items-center rounded-md px-2.5 py-1 text-xs font-semibold ${
                          template.status === "Active" ? "tpl-chip tpl-chip-emerald" : "tpl-chip tpl-chip-neutral"
                        }`}>
                          {template.status}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <ActionButton icon="eye" label="Review" onClick={() => void openMinePreview(template.id)} />
                          <ActionButton icon="code" label="Edit" href={`/templates/${template.id}/edit`} />
                          <ActionButton icon="file" label="Duplicate" onClick={() => void duplicateMine(template.id)} disabled={busyId === template.id} />
                          <ActionButton icon="trash" label="Delete" onClick={() => requestDeleteMine(template.id, template.title)} disabled={busyId === template.id || deleting} danger />
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
            <div className="flex h-full w-full max-w-4xl flex-col bg-white shadow-2xl animate-in slide-in-from-right duration-300" style={{
              backgroundColor: 'var(--theme-panel)',
            }}>
              <header className="shrink-0 border-b border-gray-100 bg-gray-50 px-6 py-4" style={{
                backgroundColor: 'var(--theme-panel-soft)',
                borderColor: 'var(--theme-border)',
              }}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-sky-600">
                      {previewSource === "catalog" ? "Prebuilt Catalog" : "Workspace Template"}
                    </p>
                    <h3 className="mt-1 text-xl font-bold text-gray-900" style={{
                      color: 'var(--theme-heading)',
                    }}>{preview?.title ?? "Loading questions…"}</h3>
                    {preview && (
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs font-medium text-gray-600" style={{
                        color: 'var(--theme-text)',
                      }}>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${roleTheme(preview.roleType).badge}`}>{preview.roleType}</span>
                        <span>{preview.timeLimitMin ? `${preview.timeLimitMin} min` : "Flexible time"}</span>
                        <span style={{
                          color: 'var(--theme-faint)',
                        }}>•</span>
                        <span>{sortedModules.length} modules</span>
                        <span style={{
                          color: 'var(--theme-faint)',
                        }}>•</span>
                        <span>{previewQuestionCount} questions</span>
                      </div>
                    )}
                  </div>
                  <button className="shrink-0 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-600 shadow-sm hover:bg-gray-50" style={{
                    borderColor: 'var(--theme-border)',
                    backgroundColor: 'var(--theme-panel)',
                    color: 'var(--theme-text)',
                  }} onClick={() => setPreview(null)}>
                    Close
                  </button>
                </div>
                {preview && (
                  <div className="relative mt-4">
                    <Icon className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" name="search" size={15} style={{
                      color: 'var(--theme-faint)',
                    }} />
                    <input
                      className="h-10 w-full rounded-lg border border-gray-200 bg-white pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-sky-500"
                      style={{
                        backgroundColor: 'var(--theme-panel)',
                        borderColor: 'var(--theme-border)',
                        color: 'var(--theme-text)',
                      }}
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
                    <nav className="hidden w-60 shrink-0 overflow-y-auto border-r border-gray-100 bg-gray-50 p-4 lg:block" style={{
                      backgroundColor: 'var(--theme-panel-soft)',
                      borderColor: 'var(--theme-border)',
                    }}>
                      <p className="px-2 pb-2 text-[10px] font-bold uppercase tracking-widest text-gray-400" style={{
                        color: 'var(--theme-faint)',
                      }}>Modules</p>
                      <ul className="space-y-1">
                        {sortedModules.map((module, index) => {
                          const active = activeModuleId === module.id;
                          return (
                            <li key={module.id}>
                              <button
                                className={`tpl-module-nav w-full rounded-lg px-3 py-2.5 text-left transition ${active ? "tpl-module-nav-active" : ""}`}
                                onClick={() => {
                                  setActiveModuleId(module.id);
                                  document.getElementById(`module-${module.id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
                                }}
                              >
                                <span className="text-[10px] font-bold" style={{ color: "var(--theme-faint)" }}>M{index + 1}</span>
                                <span
                                  className="mt-0.5 block text-xs font-bold leading-4"
                                  style={{ color: active ? "var(--theme-active-text)" : "var(--theme-heading)" }}
                                >
                                  {module.title}
                                </span>
                                <span className="mt-0.5 block text-[10px] font-medium" style={{ color: "var(--theme-muted)" }}>
                                  {module.questions?.length ?? 0} questions
                                </span>
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    </nav>

                    <div className="min-h-0 flex-1 overflow-y-auto p-6" style={{
                      backgroundColor: 'var(--theme-panel)',
                      color: 'var(--theme-text)',
                    }}>
                      {preview.description && <p className="mb-6 text-sm leading-6 text-gray-600" style={{
                        color: 'var(--theme-muted)',
                      }}>{preview.description}</p>}
                      <div className="tpl-callout mb-6 rounded-lg px-4 py-3 text-xs font-medium leading-5">
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
                              <section key={module.id} id={`module-${module.id}`} className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm" style={{
                                backgroundColor: 'var(--theme-panel)',
                                borderColor: 'var(--theme-border)',
                              }}>
                                <header className="flex flex-wrap items-start justify-between gap-2 border-b border-gray-100 bg-gray-50 px-5 py-4" style={{
                                  backgroundColor: 'var(--theme-panel-soft)',
                                  borderColor: 'var(--theme-border)',
                                }}>
                                  <div>
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400" style={{
                                      color: 'var(--theme-faint)',
                                    }}>Module {(originalIndex >= 0 ? originalIndex : moduleIndex) + 1}</p>
                                    <h4 className="mt-0.5 text-sm font-bold text-gray-900" style={{
                                      color: 'var(--theme-heading)',
                                    }}>{module.title}</h4>
                                    {module.description && <p className="mt-1 max-w-2xl text-xs leading-5 text-gray-500" style={{
                                      color: 'var(--theme-muted)',
                                    }}>{module.description}</p>}
                                  </div>
                                  <div className="flex flex-wrap gap-1.5">
                                    <span className="tpl-chip tpl-chip-neutral rounded-full px-2.5 py-1 text-[10px] font-bold uppercase">
                                      {module.type.replaceAll("_", " ")}
                                    </span>
                                    <span className="tpl-chip tpl-chip-sky rounded-full px-2.5 py-1 text-[10px] font-bold">
                                      {questions.length} Q · weight {module.weight}
                                    </span>
                                  </div>
                                </header>
                                {questions.length === 0 ? (
                                  <p className="px-5 py-6 text-xs text-gray-500" style={{
                                    color: 'var(--theme-muted)',
                                  }}>No questions in this module.</p>
                                ) : (
                                  <ol className="divide-y divide-gray-100" style={{
                                    borderColor: 'var(--theme-border)',
                                  }}>
                                    {questions.map((question, questionIndex) => (
                                      <li key={question.id} className="tpl-question-row px-5 py-4 transition" style={{
                                        borderColor: 'var(--theme-border)',
                                      }}>
                                        <div className="flex items-start gap-3">
                                          <span className="tpl-q-index mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg text-[11px] font-black">
                                            {questionIndex + 1}
                                          </span>
                                          <div className="min-w-0 flex-1">
                                            <span className="tpl-chip tpl-chip-indigo inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide">
                                              {formatQuestionType(question.questionType)}
                                            </span>
                                            <p className="mt-2 text-sm font-semibold leading-6" style={{
                                              color: 'var(--theme-heading)',
                                            }}>{question.questionText}</p>
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
                <footer className="tpl-drawer-footer shrink-0 border-t px-6 py-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-xs leading-5" style={{ color: "var(--theme-muted)" }}>
                      {previewSource === "catalog" ? "Adding creates your org-owned copy. Catalog stays shared and read-only." : "This is your workspace copy. Assign it when ready."}
                    </p>
                    <div className="flex flex-wrap justify-end gap-2">
                      <button className="tpl-btn-secondary h-10 rounded-lg px-4 text-xs font-semibold" onClick={() => setPreview(null)} type="button">
                        Close
                      </button>
                      {previewSource === "catalog" ? (
                        <>
                          <button className="tpl-btn-secondary h-10 rounded-lg px-4 text-xs font-semibold" disabled={busyId === preview.id} onClick={() => void useCatalogTemplate(preview.id, "session")} type="button">
                            Use & assign
                          </button>
                          <button className="tpl-btn-secondary h-10 rounded-lg px-4 text-xs font-semibold" disabled={busyId === preview.id} onClick={() => void useCatalogTemplate(preview.id, "edit")} type="button">
                            Use & edit
                          </button>
                          <button className="h-9 sm:h-10 rounded-lg bg-sky-500 px-3 sm:px-4 text-xs sm:text-sm font-semibold text-white hover:bg-sky-600 transition-colors disabled:opacity-70 disabled:cursor-not-allowed" disabled={busyId === preview.id} onClick={() => void useCatalogTemplate(preview.id, "mine")} type="button">
                            {busyId === preview.id ? (
                              <>
                                <span className="inline-block animate-spin text-xs">⚙</span>
                                {" "}Adding…
                              </>
                            ) : (
                              "Use as-is"
                            )}
                          </button>
                        </>
                      ) : (
                        <>
                          <Link className="tpl-btn-secondary flex h-10 items-center rounded-lg px-4 text-xs font-semibold" href={`/templates/${encodeURIComponent(preview.id)}/edit`} onClick={() => setPreview(null)}>
                            Edit questions
                          </Link>
                          <Link className="flex h-10 items-center rounded-lg bg-sky-500 px-4 text-xs font-semibold text-white hover:bg-sky-600" href={`/assessment/create?templateId=${encodeURIComponent(preview.id)}`} onClick={() => setPreview(null)}>
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

        {mounted && deleteTarget
          ? createPortal(
              <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
                <button
                  aria-label="Close delete dialog"
                  className="absolute inset-0 bg-neutral-950/35 backdrop-blur-[2px]"
                  disabled={deleting}
                  onClick={closeDeleteModal}
                  type="button"
                />
                <div
                  aria-describedby="delete-template-description"
                  aria-labelledby="delete-template-title"
                  aria-modal="true"
                  className="card relative z-10 w-full max-w-[420px] p-5 shadow-[0_18px_50px_rgba(15,23,42,0.16)] sm:p-6"
                  role="dialog"
                >
                  <div className="flex items-start gap-3">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-[8px] bg-red-50 text-red-600 ring-1 ring-red-100">
                      <Icon name="trash" size={18} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-[10px] font-bold uppercase text-[#087aa4]">My templates</p>
                          <h3 className="mt-1 text-[18px] font-extrabold leading-6 text-[#151922]" id="delete-template-title">
                            Delete template?
                          </h3>
                        </div>
                        <button
                          aria-label="Close"
                          className="flex size-8 shrink-0 items-center justify-center rounded-[6px] border border-neutral-200 bg-white text-neutral-500 transition hover:bg-neutral-50 hover:text-neutral-800 disabled:opacity-50"
                          disabled={deleting}
                          onClick={closeDeleteModal}
                          type="button"
                        >
                          <Icon name="x" size={14} />
                        </button>
                      </div>
                      <p className="mt-2 text-[13px] leading-5 text-neutral-600" id="delete-template-description">
                        This removes the template and its modules from your workspace. This cannot be undone.
                      </p>
                    </div>
                  </div>

                  <div className="soft-card mt-4 border border-neutral-200 px-3.5 py-3">
                    <p className="text-[10px] font-bold uppercase text-neutral-400">Template</p>
                    <p className="mt-1 truncate text-[13px] font-bold text-neutral-900">{deleteTarget.title}</p>
                  </div>

                  <div className="mt-3 rounded-[6px] border border-amber-200 bg-amber-50 px-3.5 py-3 text-[12px] leading-5 text-amber-900">
                    Templates linked to interview sessions cannot be deleted until those sessions are removed.
                  </div>

                  {deleteError ? (
                    <div className="mt-3">
                      <InlineAlert tone="error">{deleteError}</InlineAlert>
                    </div>
                  ) : null}

                  <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                    <button
                      className="button-secondary h-10 rounded-[6px] px-4 text-[12px] font-bold disabled:opacity-50"
                      disabled={deleting}
                      onClick={closeDeleteModal}
                      type="button"
                    >
                      Cancel
                    </button>
                    <button
                      className="inline-flex h-10 items-center justify-center gap-2 rounded-[6px] bg-red-600 px-4 text-[12px] font-bold text-white transition hover:bg-red-700 disabled:opacity-60"
                      disabled={deleting}
                      onClick={() => void confirmDeleteMine()}
                      type="button"
                    >
                      {deleting ? <span className="size-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" /> : <Icon name="trash" size={14} />}
                      {deleting ? "Deleting…" : "Delete template"}
                    </button>
                  </div>
                </div>
              </div>,
              document.body,
            )
          : null}
      </div>
    </AppShell>
  );
}

// ==========================================
// Sub-Components
// ==========================================
function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div
      className="rounded-lg px-2 py-2 text-center"
      style={{
        backgroundColor: "var(--theme-panel-soft)",
        boxShadow: "inset 0 0 0 1px var(--theme-border)",
      }}
    >
      <dt className="text-[10px] font-semibold" style={{ color: "var(--theme-muted)" }}>{label}</dt>
      <dd className="mt-0.5 text-sm font-bold" style={{ color: "var(--theme-heading)" }}>{value}</dd>
    </div>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      className="inline-flex items-center rounded-md px-4 py-2 text-xs font-bold transition"
      onClick={onClick}
      style={
        active
          ? {
              backgroundColor: "var(--theme-panel)",
              color: "var(--theme-heading)",
              boxShadow: "0 1px 2px rgba(0,0,0,0.08)",
            }
          : {
              backgroundColor: "transparent",
              color: "var(--theme-muted)",
            }
      }
      type="button"
    >
      {children}
    </button>
  );
}

function ActionButton({ icon, label, onClick, href, disabled, danger }: {
  icon: IconName; label: string; onClick?: () => void; href?: string; disabled?: boolean; danger?: boolean;
}) {
  const baseClasses = "tpl-action p-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed";
  const colorClasses = danger ? "tpl-action-danger" : "tpl-action-default";

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
        <ul
          className="space-y-1.5 rounded-lg border px-3 py-2.5"
          style={{
            borderColor: "var(--theme-border)",
            backgroundColor: "var(--theme-panel-soft)",
            color: "var(--theme-text)",
          }}
        >
          {options.map((option, index) => (
            <li key={`${question.id}-opt-${index}`} className="flex items-start gap-2 text-xs leading-5">
              <span
                className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded text-[10px] font-black"
                style={{
                  backgroundColor: "var(--theme-panel)",
                  color: "var(--theme-muted)",
                  boxShadow: "inset 0 0 0 1px var(--theme-border)",
                }}
              >
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
            <span key={cue} className="tpl-chip tpl-chip-amber rounded-md px-2 py-1 text-[10px] font-bold">
              {cue}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
