"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Icon } from "@/components/icons";
import { ErrorState, InlineAlert, PageLoader } from "@/components/ui-states";
import { apiGet, apiPut, getErrorMessage } from "@/lib/api";
import type { AssessmentTemplate, JsonValue, ModuleType, QuestionType } from "@/lib/types";

const MODULE_TYPES: ModuleType[] = [
  "ai_interview",
  "coding",
  "debugging",
  "work_style",
  "behavioral",
  "leadership",
  "communication",
  "problem_solving",
];

const QUESTION_TYPES: QuestionType[] = ["short_answer", "scenario", "roleplay", "mcq", "scale", "coding"];

type EditorQuestion = {
  key: string;
  questionText: string;
  questionType: QuestionType;
  optionsText: string;
  rubricText: string;
};

type EditorModule = {
  key: string;
  type: ModuleType;
  title: string;
  description: string;
  weight: string;
  orderIndex: number;
  questions: EditorQuestion[];
  collapsed: boolean;
};

export default function EditTemplatePage() {
  const params = useParams<{ id: string }>();
  const templateId = decodeURIComponent(params.id ?? "");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (new URLSearchParams(window.location.search).get("created") === "1") {
      setNotice("Template created. You can keep refining modules and questions here.");
    }
  }, []);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [roleType, setRoleType] = useState("");
  const [timeLimitMin, setTimeLimitMin] = useState("60");
  const [modules, setModules] = useState<EditorModule[]>([]);
  const [activeModuleKey, setActiveModuleKey] = useState("");
  const [pendingModuleRemoval, setPendingModuleRemoval] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!templateId) return;
    setLoading(true);
    setError("");
    try {
      const template = await apiGet<AssessmentTemplate>(`/templates/${encodeURIComponent(templateId)}`);
      setTitle(template.title);
      setDescription(template.description ?? "");
      setRoleType(template.roleType);
      setTimeLimitMin(String(template.timeLimitMin ?? 60));
      const nextModules = (template.modules ?? [])
        .slice()
        .sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0))
        .map((module, index) => toEditorModule(module, index));
      setModules(nextModules);
      setActiveModuleKey(nextModules[0]?.key ?? "");
      setDirty(false);
    } catch (requestError) {
      setError(getErrorMessage(requestError, "Unable to load template."));
    } finally {
      setLoading(false);
    }
  }, [templateId]);

  useEffect(() => {
    void load();
  }, [load]);

  const questionCount = useMemo(
    () => modules.reduce((total, module) => total + module.questions.length, 0),
    [modules],
  );

  function markDirty() {
    setDirty(true);
    setNotice("");
  }

  function updateModule(key: string, patch: Partial<EditorModule>) {
    markDirty();
    setModules((current) => current.map((module) => (module.key === key ? { ...module, ...patch } : module)));
  }

  function updateQuestion(moduleKey: string, questionKey: string, patch: Partial<EditorQuestion>) {
    markDirty();
    setModules((current) =>
      current.map((module) => {
        if (module.key !== moduleKey) return module;
        return {
          ...module,
          questions: module.questions.map((question) => (question.key === questionKey ? { ...question, ...patch } : question)),
        };
      }),
    );
  }

  function addModule() {
    markDirty();
    const key = newKey("mod");
    const next: EditorModule = {
      key,
      type: "behavioral",
      title: "New module",
      description: "",
      weight: "1",
      orderIndex: modules.length + 1,
      questions: [emptyQuestion()],
      collapsed: false,
    };
    setModules((current) => [...current, next]);
    setActiveModuleKey(key);
  }

  function removeModule(key: string) {
    markDirty();
    setModules((current) => {
      const next = current.filter((module) => module.key !== key).map((module, index) => ({ ...module, orderIndex: index + 1 }));
      if (activeModuleKey === key) setActiveModuleKey(next[0]?.key ?? "");
      return next;
    });
  }

  function addQuestion(moduleKey: string) {
    markDirty();
    setModules((current) =>
      current.map((module) =>
        module.key === moduleKey
          ? { ...module, collapsed: false, questions: [...module.questions, emptyQuestion()] }
          : module,
      ),
    );
  }

  function removeQuestion(moduleKey: string, questionKey: string) {
    markDirty();
    setModules((current) =>
      current.map((module) => {
        if (module.key !== moduleKey) return module;
        if (module.questions.length <= 1) return module;
        return { ...module, questions: module.questions.filter((question) => question.key !== questionKey) };
      }),
    );
  }

  function moveQuestion(moduleKey: string, questionKey: string, direction: -1 | 1) {
    markDirty();
    setModules((current) =>
      current.map((module) => {
        if (module.key !== moduleKey) return module;
        const index = module.questions.findIndex((question) => question.key === questionKey);
        const target = index + direction;
        if (index < 0 || target < 0 || target >= module.questions.length) return module;
        const questions = [...module.questions];
        const [item] = questions.splice(index, 1);
        questions.splice(target, 0, item);
        return { ...module, questions };
      }),
    );
  }

  async function handleSave() {
    setError("");
    setNotice("");

    if (!title.trim()) {
      setError("Template title is required.");
      return;
    }
    if (!roleType.trim()) {
      setError("Target role is required.");
      return;
    }
    if (!modules.length) {
      setError("Add at least one module with questions.");
      return;
    }
    for (const module of modules) {
      if (!module.title.trim()) {
        setError("Every module needs a title.");
        return;
      }
      if (!module.questions.length) {
        setError(`Module "${module.title}" needs at least one question.`);
        return;
      }
      for (const question of module.questions) {
        if (!question.questionText.trim()) {
          setError(`A question in "${module.title}" is empty.`);
          return;
        }
      }
    }

    setSaving(true);
    try {
      const payload = {
        title: title.trim(),
        description: description.trim(),
        roleType: roleType.trim(),
        timeLimitMin: timeLimitMin ? Number(timeLimitMin) : undefined,
        modules: modules.map((module, index) => ({
          type: module.type,
          title: module.title.trim(),
          description: module.description.trim() || undefined,
          weight: module.weight ? Number(module.weight) : 1,
          orderIndex: index + 1,
          questions: module.questions.map((question) => ({
            questionText: question.questionText.trim(),
            questionType: question.questionType,
            options: parseOptions(question.optionsText, question.questionType),
            rubric: parseRubric(question.rubricText),
          })),
        })),
      };

      await apiPut<AssessmentTemplate>(`/templates/${encodeURIComponent(templateId)}`, payload);
      setDirty(false);
      setNotice("Template saved. Candidates will see the updated questions on new sessions.");
    } catch (requestError) {
      setError(getErrorMessage(requestError, "Unable to save template."));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <AppShell active="templates" title="Edit template" description="Update modules and questions.">
        <PageLoader label="Loading template editor" />
      </AppShell>
    );
  }

  if (error && !title && !modules.length) {
    return (
      <AppShell active="templates" title="Edit template" description="Update modules and questions.">
        <ErrorState message={error} onRetry={() => void load()} />
      </AppShell>
    );
  }

  return (
    <AppShell active="templates" title="" description="" showPageHeader={false}>
      <div className="mx-auto max-w-[1200px] space-y-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-[12px] text-neutral-500">
              <Link className="font-semibold hover:text-neutral-900" href="/templates">
                Templates
              </Link>
              <Icon className="rotate-180 text-neutral-400" name="chevron" size={12} />
              <span className="font-bold text-neutral-900">Edit questions</span>
            </div>
            <h1 className="mt-1 text-[22px] font-black tracking-tight text-neutral-950">Edit assessment template</h1>
            <p className="mt-1 text-[13px] text-neutral-600">
              {modules.length} modules · {questionCount} questions
              {dirty ? " · Unsaved changes" : ""}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link className="button-secondary h-10 rounded-xl px-4 text-[12px]" href="/templates">
              Back
            </Link>
            <Link className="button-secondary h-10 rounded-xl px-4 text-[12px]" href={`/assessment/create?templateId=${encodeURIComponent(templateId)}`}>
              Assign candidate
            </Link>
            <button className="button-primary inline-flex h-10 items-center gap-1.5 rounded-xl px-4 text-[12px]" disabled={saving || !dirty} onClick={() => void handleSave()} type="button">
              {saving ? "Saving…" : dirty ? "Save changes" : <><Icon name="check" size={14} /> Saved</>}
            </button>
          </div>
        </div>

        {error ? <InlineAlert tone="error">{error}</InlineAlert> : null}
        {notice ? <InlineAlert tone="success">{notice}</InlineAlert> : null}

        <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
          <h2 className="text-[13px] font-black uppercase tracking-wide text-neutral-500">Template details</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label="Title" required>
              <input
                className="control h-10 w-full rounded-xl text-[13px]"
                onChange={(event) => {
                  markDirty();
                  setTitle(event.target.value);
                }}
                value={title}
              />
            </Field>
            <Field label="Target role" required>
              <input
                className="control h-10 w-full rounded-xl text-[13px]"
                onChange={(event) => {
                  markDirty();
                  setRoleType(event.target.value);
                }}
                value={roleType}
              />
            </Field>
            <Field label="Time limit (minutes)">
              <input
                className="control h-10 w-full rounded-xl text-[13px]"
                min={1}
                onChange={(event) => {
                  markDirty();
                  setTimeLimitMin(event.target.value);
                }}
                type="number"
                value={timeLimitMin}
              />
            </Field>
            <div className="sm:col-span-2">
              <Field label="Description">
                <textarea
                  className="control min-h-[84px] w-full rounded-xl text-[13px]"
                  onChange={(event) => {
                    markDirty();
                    setDescription(event.target.value);
                  }}
                  value={description}
                />
              </Field>
            </div>
          </div>
        </section>

        <div className="grid gap-4 lg:grid-cols-[220px_1fr]">
          <aside className="h-fit rounded-2xl border border-neutral-200 bg-white p-3 shadow-sm lg:sticky lg:top-4">
            <div className="mb-2 flex items-center justify-between px-1">
              <p className="text-[10px] font-bold uppercase tracking-wide text-neutral-400">Modules</p>
              <button className="text-[11px] font-bold text-primary-700 hover:underline" onClick={addModule} type="button">
                + Add
              </button>
            </div>
            <ul className="space-y-1">
              {modules.map((module, index) => (
                <li key={module.key}>
                  <button
                    className={`w-full rounded-xl px-2.5 py-2 text-left transition ${
                      activeModuleKey === module.key ? "bg-primary-50 ring-1 ring-primary-100" : "hover:bg-neutral-50"
                    }`}
                    onClick={() => {
                      setActiveModuleKey(module.key);
                      document.getElementById(`edit-module-${module.key}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
                    }}
                    type="button"
                  >
                    <span className="text-[10px] font-bold text-neutral-400">M{index + 1}</span>
                    <span className="mt-0.5 block truncate text-[12px] font-bold text-neutral-900">{module.title || "Untitled"}</span>
                    <span className="text-[10px] font-medium text-neutral-500">{module.questions.length} questions</span>
                  </button>
                </li>
              ))}
            </ul>
          </aside>

          <div className="space-y-4">
            {modules.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-neutral-300 bg-neutral-50 p-8 text-center">
                <p className="text-[14px] font-bold text-neutral-800">No modules yet</p>
                <p className="mt-1 text-[12px] text-neutral-500">Add a module to start editing questions.</p>
                <button className="button-primary mt-4 h-10 rounded-xl px-4 text-[12px]" onClick={addModule} type="button">
                  Add first module
                </button>
              </div>
            ) : (
              modules.map((module, moduleIndex) => (
                <section className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm" id={`edit-module-${module.key}`} key={module.key}>
                  <header className="flex flex-wrap items-start justify-between gap-3 border-b border-neutral-100 bg-neutral-50/80 px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-bold uppercase tracking-wide text-neutral-400">Module {moduleIndex + 1}</p>
                      <div className="mt-2 grid gap-2 sm:grid-cols-2">
                        <label className="block text-[11px] font-semibold text-neutral-500">
                          Module title
                          <input
                            className="control mt-1 h-10 rounded-xl text-[13px] font-bold"
                            onChange={(event) => updateModule(module.key, { title: event.target.value })}
                            placeholder="e.g. Coding challenge"
                            value={module.title}
                          />
                        </label>
                        <label className="block text-[11px] font-semibold text-neutral-500">
                          Category <span className="font-normal text-neutral-400">— sets scoring</span>
                          <select
                            className="control mt-1 h-10 rounded-xl text-[13px]"
                            onChange={(event) => updateModule(module.key, { type: event.target.value as ModuleType })}
                            value={module.type}
                          >
                            {MODULE_TYPES.map((type) => (
                              <option key={type} value={type}>
                                {type.replaceAll("_", " ").replace(/\b\w/g, (character) => character.toUpperCase())}
                              </option>
                            ))}
                          </select>
                        </label>
                        <textarea
                          className="control min-h-[44px] rounded-xl text-[13px] leading-5 sm:col-span-2"
                          onChange={(event) => updateModule(module.key, { description: event.target.value })}
                          placeholder="Module description (optional)"
                          rows={2}
                          value={module.description}
                        />
                        <label className="flex items-center gap-2 text-[12px] font-semibold text-neutral-600">
                          Weight
                          <input
                            className="control h-9 w-24 rounded-xl text-[13px]"
                            min={0}
                            onChange={(event) => updateModule(module.key, { weight: event.target.value })}
                            step="0.05"
                            type="number"
                            value={module.weight}
                          />
                        </label>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        className="button-secondary h-9 rounded-lg px-3 text-[11px]"
                        onClick={() => updateModule(module.key, { collapsed: !module.collapsed })}
                        type="button"
                      >
                        {module.collapsed ? "Expand" : "Collapse"}
                      </button>
                      <button className="h-9 rounded-lg border border-rose-200 px-3 text-[11px] font-bold text-rose-600 hover:bg-rose-50" onClick={() => setPendingModuleRemoval(module.key)} type="button">
                        Remove module
                      </button>
                    </div>
                  </header>

                  {!module.collapsed ? (
                    <div className="space-y-3 p-4">
                      {module.questions.map((question, questionIndex) => (
                        <article className="rounded-xl border border-neutral-200 bg-neutral-50/40 p-4" key={question.key}>
                          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                            <p className="text-[12px] font-black text-neutral-800">
                              Question {questionIndex + 1}
                              <span className="ml-2 rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-bold uppercase text-indigo-700">
                                {question.questionType.replaceAll("_", " ")}
                              </span>
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                              <button className="rounded-lg border border-neutral-200 bg-white px-2 py-1 text-[11px] font-bold text-neutral-600 hover:bg-neutral-50" disabled={questionIndex === 0} onClick={() => moveQuestion(module.key, question.key, -1)} type="button">
                                ↑
                              </button>
                              <button className="rounded-lg border border-neutral-200 bg-white px-2 py-1 text-[11px] font-bold text-neutral-600 hover:bg-neutral-50" disabled={questionIndex === module.questions.length - 1} onClick={() => moveQuestion(module.key, question.key, 1)} type="button">
                                ↓
                              </button>
                              <button
                                className="rounded-lg border border-rose-200 bg-white px-2 py-1 text-[11px] font-bold text-rose-600 hover:bg-rose-50"
                                disabled={module.questions.length <= 1}
                                onClick={() => removeQuestion(module.key, question.key)}
                                type="button"
                              >
                                Delete
                              </button>
                            </div>
                          </div>

                          <div className="space-y-3">
                            <Field label="Question text" required>
                              <textarea
                                className="control min-h-[88px] w-full rounded-xl text-[13px] leading-6"
                                onChange={(event) => updateQuestion(module.key, question.key, { questionText: event.target.value })}
                                placeholder="Write the question candidates will see…"
                                value={question.questionText}
                              />
                            </Field>
                            <div className="grid gap-3 sm:grid-cols-2">
                              <Field label="Question type">
                                <select
                                  className="control h-10 w-full rounded-xl text-[13px]"
                                  onChange={(event) => updateQuestion(module.key, question.key, { questionType: event.target.value as QuestionType })}
                                  value={question.questionType}
                                >
                                  {QUESTION_TYPES.map((type) => (
                                    <option key={type} value={type}>
                                      {type.replaceAll("_", " ")}
                                    </option>
                                  ))}
                                </select>
                              </Field>
                              <Field label="Rubric cues (comma-separated)">
                                <input
                                  className="control h-10 w-full rounded-xl text-[13px]"
                                  onChange={(event) => updateQuestion(module.key, question.key, { rubricText: event.target.value })}
                                  placeholder="clarity, ownership, impact"
                                  value={question.rubricText}
                                />
                              </Field>
                            </div>
                            {question.questionType === "mcq" || question.questionType === "scale" ? (
                              <Field label={question.questionType === "mcq" ? "Options (one per line)" : "Scale labels (one per line)"}>
                                <textarea
                                  className="control min-h-[80px] w-full rounded-xl font-mono text-[12px] leading-5"
                                  onChange={(event) => updateQuestion(module.key, question.key, { optionsText: event.target.value })}
                                  placeholder={question.questionType === "mcq" ? "Option A\nOption B\nOption C" : "1 - Strongly disagree\n2\n3\n4\n5 - Strongly agree"}
                                  value={question.optionsText}
                                />
                              </Field>
                            ) : null}
                          </div>
                        </article>
                      ))}

                      <button className="button-secondary h-10 w-full rounded-xl text-[12px]" onClick={() => addQuestion(module.key)} type="button">
                        <Icon name="plus" size={14} /> Add question
                      </button>
                    </div>
                  ) : (
                    <p className="px-4 py-3 text-[12px] text-neutral-500">{module.questions.length} questions collapsed</p>
                  )}
                </section>
              ))
            )}

            <button className="button-secondary h-11 w-full rounded-xl text-[12px]" onClick={addModule} type="button">
              <Icon name="plus" size={15} /> Add module
            </button>
          </div>
        </div>

        <div className="sticky bottom-4 z-10 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-neutral-200 bg-white/95 p-3 shadow-lg backdrop-blur">
          <p className="px-2 text-[12px] font-medium text-neutral-600">
            {dirty ? "You have unsaved edits." : "All changes saved."}
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              className="button-secondary h-10 rounded-xl px-4 text-[12px]"
              disabled={saving}
              onClick={() => {
                if (dirty && !window.confirm("Discard unsaved changes?")) return;
                void load();
              }}
              type="button"
            >
              Reset
            </button>
            <button className="button-primary h-10 rounded-xl px-5 text-[12px]" disabled={saving || !dirty} onClick={() => void handleSave()} type="button">
              {saving ? "Saving…" : "Save template"}
            </button>
          </div>
        </div>
      </div>

      <ConfirmDialog
        confirmLabel="Remove module"
        message={`"${modules.find((module) => module.key === pendingModuleRemoval)?.title || "This module"}" and all of its questions will be removed.`}
        onCancel={() => setPendingModuleRemoval(null)}
        onConfirm={() => {
          if (pendingModuleRemoval) removeModule(pendingModuleRemoval);
          setPendingModuleRemoval(null);
        }}
        open={pendingModuleRemoval !== null}
        title="Remove this module?"
      />
    </AppShell>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-neutral-500">
        {label}
        {required ? <span className="text-rose-500"> *</span> : null}
      </span>
      {children}
    </label>
  );
}

function emptyQuestion(): EditorQuestion {
  return {
    key: newKey("q"),
    questionText: "",
    questionType: "short_answer",
    optionsText: "",
    rubricText: "",
  };
}

function toEditorModule(
  module: {
    id: string;
    type: ModuleType;
    title: string;
    description?: string;
    weight: number;
    orderIndex: number;
    questions?: Array<{ id: string; questionText: string; questionType: QuestionType; options?: JsonValue; rubric?: JsonValue }>;
  },
  index: number,
): EditorModule {
  return {
    key: module.id || newKey(`mod-${index}`),
    type: module.type,
    title: module.title,
    description: module.description ?? "",
    weight: String(module.weight ?? 1),
    orderIndex: module.orderIndex ?? index + 1,
    collapsed: false,
    questions: (module.questions ?? []).map((question) => ({
      key: question.id || newKey("q"),
      questionText: question.questionText,
      questionType: question.questionType,
      optionsText: optionsToText(question.options),
      rubricText: rubricToText(question.rubric),
    })),
  };
}

function optionsToText(options: JsonValue | undefined): string {
  if (options == null) return "";
  if (Array.isArray(options)) {
    return options
      .map((item) => {
        if (typeof item === "string" || typeof item === "number") return String(item);
        if (item && typeof item === "object" && !Array.isArray(item)) {
          const record = item as Record<string, unknown>;
          if (typeof record.label === "string") return record.label;
          if (typeof record.text === "string") return record.text;
        }
        return "";
      })
      .filter(Boolean)
      .join("\n");
  }
  if (typeof options === "string") return options;
  return "";
}

function rubricToText(rubric: JsonValue | undefined): string {
  if (rubric == null) return "";
  if (Array.isArray(rubric)) {
    return rubric
      .map((item) => (typeof item === "string" ? item : ""))
      .filter(Boolean)
      .join(", ");
  }
  if (typeof rubric === "string") return rubric;
  return "";
}

function parseOptions(text: string, questionType: QuestionType): JsonValue | undefined {
  if (questionType !== "mcq" && questionType !== "scale") return undefined;
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  return lines.length ? lines : undefined;
}

function parseRubric(text: string): JsonValue | undefined {
  const parts = text
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  return parts.length ? parts : undefined;
}

function newKey(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
