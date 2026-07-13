"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { Icon, type IconName } from "@/components/icons";
import { InlineAlert } from "@/components/ui-states";
import { apiPost, getErrorMessage } from "@/lib/api";
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

const STARTER_MODULES: Array<{ type: ModuleType; title: string; description: string; icon: IconName }> = [
  { type: "behavioral", title: "Behavioral", description: "Past evidence and STAR-style ownership.", icon: "users" },
  { type: "coding", title: "Coding", description: "Practical coding tasks and edge cases.", icon: "code" },
  { type: "communication", title: "Communication", description: "Writing, roleplay, and clarity.", icon: "message" },
  { type: "leadership", title: "Leadership", description: "Decision-making and team scenarios.", icon: "crown" },
  { type: "problem_solving", title: "Problem Solving", description: "Ambiguous cases and judgment.", icon: "sparkle" },
  { type: "ai_interview", title: "AI Interview", description: "Open-ended adaptive prompts.", icon: "sparkle" },
  { type: "work_style", title: "Work Style", description: "Preferences and operating rhythm.", icon: "clipboard" },
  { type: "debugging", title: "Debugging", description: "Root-cause analysis scenarios.", icon: "code" },
];

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
  questions: EditorQuestion[];
  collapsed: boolean;
};

type Step = 1 | 2 | 3;

export default function CreateTemplatePage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Basics
  const [title, setTitle] = useState("");
  const [roleType, setRoleType] = useState("");
  const [description, setDescription] = useState("");
  const [timeLimitMin, setTimeLimitMin] = useState("60");
  const [passScore, setPassScore] = useState("3.5");
  const [experienceLevel, setExperienceLevel] = useState("Mid (2–5 years)");

  // Modules
  const [modules, setModules] = useState<EditorModule[]>([]);
  const [activeModuleKey, setActiveModuleKey] = useState("");

  const questionCount = useMemo(
    () => modules.reduce((total, module) => total + module.questions.length, 0),
    [modules],
  );

  function updateModule(key: string, patch: Partial<EditorModule>) {
    setModules((current) => current.map((module) => (module.key === key ? { ...module, ...patch } : module)));
  }

  function updateQuestion(moduleKey: string, questionKey: string, patch: Partial<EditorQuestion>) {
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

  function addModule(seed?: { type: ModuleType; title: string; description: string }) {
    const key = newKey("mod");
    const next: EditorModule = {
      key,
      type: seed?.type ?? "behavioral",
      title: seed?.title ?? "New module",
      description: seed?.description ?? "",
      weight: "1",
      questions: [emptyQuestion(seed?.type === "coding" ? "coding" : seed?.type === "work_style" ? "scale" : "short_answer")],
      collapsed: false,
    };
    setModules((current) => [...current, next]);
    setActiveModuleKey(key);
  }

  function removeModule(key: string) {
    if (!window.confirm("Remove this module and its questions?")) return;
    setModules((current) => {
      const next = current.filter((module) => module.key !== key);
      if (activeModuleKey === key) setActiveModuleKey(next[0]?.key ?? "");
      return next;
    });
  }

  function addQuestion(moduleKey: string) {
    setModules((current) =>
      current.map((module) =>
        module.key === moduleKey ? { ...module, collapsed: false, questions: [...module.questions, emptyQuestion()] } : module,
      ),
    );
  }

  function removeQuestion(moduleKey: string, questionKey: string) {
    setModules((current) =>
      current.map((module) => {
        if (module.key !== moduleKey) return module;
        if (module.questions.length <= 1) return module;
        return { ...module, questions: module.questions.filter((question) => question.key !== questionKey) };
      }),
    );
  }

  function moveQuestion(moduleKey: string, questionKey: string, direction: -1 | 1) {
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

  function validateBasics(): string | null {
    if (!title.trim()) return "Template name is required.";
    if (!roleType.trim()) return "Target role is required.";
    return null;
  }

  function validateModules(): string | null {
    if (!modules.length) return "Add at least one module with questions.";
    for (const module of modules) {
      if (!module.title.trim()) return "Every module needs a title.";
      if (!module.questions.length) return `Module "${module.title}" needs at least one question.`;
      for (const question of module.questions) {
        if (!question.questionText.trim()) return `A question in "${module.title}" is empty.`;
      }
    }
    return null;
  }

  function goToStep(next: Step) {
    setError("");
    if (next > 1) {
      const basicsError = validateBasics();
      if (basicsError) {
        setError(basicsError);
        setStep(1);
        return;
      }
    }
    if (next > 2) {
      const modulesError = validateModules();
      if (modulesError) {
        setError(modulesError);
        setStep(2);
        return;
      }
    }
    if (next === 2 && modules.length === 0) {
      addModule({ type: "behavioral", title: "Behavioral", description: "Past evidence and ownership." });
    }
    setStep(next);
  }

  async function handleCreate() {
    const basicsError = validateBasics();
    if (basicsError) {
      setError(basicsError);
      setStep(1);
      return;
    }
    const modulesError = validateModules();
    if (modulesError) {
      setError(modulesError);
      setStep(2);
      return;
    }

    setError("");
    setSubmitting(true);
    try {
      const fullDescription = [description.trim(), experienceLevel ? `Experience level: ${experienceLevel}` : ""]
        .filter(Boolean)
        .join("\n\n");

      const payload = {
        title: title.trim(),
        description: fullDescription,
        roleType: roleType.trim(),
        timeLimitMin: timeLimitMin ? Number(timeLimitMin) : undefined,
        scoringRules: {
          passScore: passScore ? Number(passScore) : 3.5,
          scale: "1-5",
          advisoryOnly: true,
          createdFrom: "blank-workspace",
        },
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

      const created = await apiPost<AssessmentTemplate>("/templates", payload);
      router.push(`/templates/${encodeURIComponent(created.id)}/edit?created=1`);
      router.refresh();
    } catch (requestError) {
      setError(getErrorMessage(requestError, "Unable to create template."));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AppShell active="templates" title="" description="" showPageHeader={false}>
      <div className="mx-auto max-w-[1200px] space-y-5">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-[12px] text-neutral-500">
              <Link className="font-semibold hover:text-neutral-900" href="/templates">
                Templates
              </Link>
              <Icon className="rotate-180 text-neutral-400" name="chevron" size={12} />
              <span className="font-bold text-neutral-900">Create from scratch</span>
            </div>
            <h1 className="mt-1 text-[22px] font-black tracking-tight text-neutral-950">Blank template workspace</h1>
            <p className="mt-1 text-[13px] text-neutral-600">
              Define the assessment, build modules and questions, then save to your workspace.
            </p>
          </div>
          <Link className="button-secondary h-10 rounded-xl px-4 text-[12px]" href="/templates">
            Cancel
          </Link>
        </div>

        {/* Stepper */}
        <nav className="rounded-2xl border border-neutral-200 bg-white p-2 shadow-sm">
          <ol className="grid gap-2 sm:grid-cols-3">
            <StepTab active={step === 1} done={step > 1} number={1} onClick={() => goToStep(1)} title="Basics" subtitle="Name, role, settings" />
            <StepTab active={step === 2} done={step > 2} number={2} onClick={() => goToStep(2)} title="Modules & questions" subtitle="Build the assessment" />
            <StepTab active={step === 3} done={false} number={3} onClick={() => goToStep(3)} title="Review & create" subtitle="Confirm and save" />
          </ol>
        </nav>

        {error ? <InlineAlert tone="error">{error}</InlineAlert> : null}

        <div className="grid gap-5 lg:grid-cols-[1fr_280px]">
          <div className="min-w-0 space-y-4">
            {step === 1 ? (
              <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm sm:p-6">
                <h2 className="text-[15px] font-black text-neutral-950">Template basics</h2>
                <p className="mt-1 text-[12px] text-neutral-500">Start with who this assessment is for and how long it should take.</p>

                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <Field label="Template name" required>
                    <input
                      className="control h-11 w-full rounded-xl text-[13px]"
                      onChange={(event) => setTitle(event.target.value)}
                      placeholder="e.g. Backend Engineer Screen"
                      value={title}
                    />
                  </Field>
                  <Field label="Target role" required>
                    <input
                      className="control h-11 w-full rounded-xl text-[13px]"
                      onChange={(event) => setRoleType(event.target.value)}
                      placeholder="e.g. Backend Engineer"
                      value={roleType}
                    />
                  </Field>
                  <Field label="Experience level">
                    <select className="control h-11 w-full rounded-xl text-[13px]" onChange={(event) => setExperienceLevel(event.target.value)} value={experienceLevel}>
                      <option>Junior (0–2 years)</option>
                      <option>Mid (2–5 years)</option>
                      <option>Senior (5+ years)</option>
                      <option>Lead / Staff</option>
                      <option>Any level</option>
                    </select>
                  </Field>
                  <Field label="Time limit (minutes)">
                    <input
                      className="control h-11 w-full rounded-xl text-[13px]"
                      min={5}
                      onChange={(event) => setTimeLimitMin(event.target.value)}
                      type="number"
                      value={timeLimitMin}
                    />
                  </Field>
                  <Field label="Pass score (1–5 scale)">
                    <input
                      className="control h-11 w-full rounded-xl text-[13px]"
                      max={5}
                      min={1}
                      onChange={(event) => setPassScore(event.target.value)}
                      step="0.1"
                      type="number"
                      value={passScore}
                    />
                  </Field>
                  <div className="sm:col-span-2">
                    <Field label="Description">
                      <textarea
                        className="control min-h-[100px] w-full rounded-xl text-[13px] leading-6"
                        onChange={(event) => setDescription(event.target.value)}
                        placeholder="What does this assessment measure? Who is it for?"
                        value={description}
                      />
                    </Field>
                  </div>
                </div>

                <div className="mt-6 flex flex-wrap justify-end gap-2">
                  <button className="button-primary h-11 rounded-xl px-5 text-[13px]" onClick={() => goToStep(2)} type="button">
                    Continue to modules <Icon className="-rotate-90" name="chevron" size={14} />
                  </button>
                </div>
              </section>
            ) : null}

            {step === 2 ? (
              <div className="space-y-4">
                <section className="rounded-2xl border border-primary-100 bg-gradient-to-br from-primary-50 via-white to-sky-50 p-4 shadow-sm">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-primary-700">Quick-add modules</p>
                  <p className="mt-1 text-[12px] text-neutral-600">Click a starter to add a module with one blank question — then edit the text.</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {STARTER_MODULES.map((starter) => (
                      <button
                        className="inline-flex items-center gap-1.5 rounded-full border border-white bg-white px-3 py-1.5 text-[11px] font-bold text-neutral-700 shadow-sm ring-1 ring-neutral-100 transition hover:border-primary-200 hover:text-primary-800"
                        key={starter.type + starter.title}
                        onClick={() => addModule(starter)}
                        type="button"
                      >
                        <Icon name={starter.icon} size={13} />
                        {starter.title}
                      </button>
                    ))}
                  </div>
                </section>

                <div className="grid gap-4 lg:grid-cols-[200px_1fr]">
                  <aside className="h-fit rounded-2xl border border-neutral-200 bg-white p-3 shadow-sm lg:sticky lg:top-4">
                    <div className="mb-2 flex items-center justify-between px-1">
                      <p className="text-[10px] font-bold uppercase tracking-wide text-neutral-400">Modules</p>
                      <button className="text-[11px] font-bold text-primary-700 hover:underline" onClick={() => addModule()} type="button">
                        + Add
                      </button>
                    </div>
                    {modules.length === 0 ? (
                      <p className="px-2 py-3 text-[11px] text-neutral-500">No modules yet. Use quick-add above.</p>
                    ) : (
                      <ul className="space-y-1">
                        {modules.map((module, index) => (
                          <li key={module.key}>
                            <button
                              className={`w-full rounded-xl px-2.5 py-2 text-left transition ${
                                activeModuleKey === module.key ? "bg-primary-50 ring-1 ring-primary-100" : "hover:bg-neutral-50"
                              }`}
                              onClick={() => {
                                setActiveModuleKey(module.key);
                                document.getElementById(`create-module-${module.key}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
                              }}
                              type="button"
                            >
                              <span className="text-[10px] font-bold text-neutral-400">M{index + 1}</span>
                              <span className="mt-0.5 block truncate text-[12px] font-bold text-neutral-900">{module.title || "Untitled"}</span>
                              <span className="text-[10px] text-neutral-500">{module.questions.length} questions</span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </aside>

                  <div className="space-y-4">
                    {modules.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-neutral-300 bg-white p-10 text-center shadow-sm">
                        <span className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-primary-50 text-primary-700">
                          <Icon name="plus" size={22} />
                        </span>
                        <p className="mt-3 text-[15px] font-black text-neutral-900">Build your first module</p>
                        <p className="mx-auto mt-1 max-w-sm text-[12px] text-neutral-500">
                          Add modules from the quick-start chips, then write the questions candidates will answer.
                        </p>
                        <button className="button-primary mt-4 h-10 rounded-xl px-4 text-[12px]" onClick={() => addModule()} type="button">
                          Add blank module
                        </button>
                      </div>
                    ) : (
                      modules.map((module, moduleIndex) => (
                        <ModuleEditorCard
                          key={module.key}
                          module={module}
                          moduleIndex={moduleIndex}
                          onAddQuestion={() => addQuestion(module.key)}
                          onMoveQuestion={(questionKey, direction) => moveQuestion(module.key, questionKey, direction)}
                          onRemove={() => removeModule(module.key)}
                          onRemoveQuestion={(questionKey) => removeQuestion(module.key, questionKey)}
                          onUpdate={(patch) => updateModule(module.key, patch)}
                          onUpdateQuestion={(questionKey, patch) => updateQuestion(module.key, questionKey, patch)}
                        />
                      ))
                    )}

                    {modules.length > 0 ? (
                      <button className="button-secondary h-11 w-full rounded-xl text-[12px]" onClick={() => addModule()} type="button">
                        <Icon name="plus" size={15} /> Add another module
                      </button>
                    ) : null}
                  </div>
                </div>

                <div className="flex flex-wrap justify-between gap-2">
                  <button className="button-secondary h-11 rounded-xl px-4 text-[13px]" onClick={() => setStep(1)} type="button">
                    Back to basics
                  </button>
                  <button className="button-primary h-11 rounded-xl px-5 text-[13px]" onClick={() => goToStep(3)} type="button">
                    Review template <Icon className="-rotate-90" name="chevron" size={14} />
                  </button>
                </div>
              </div>
            ) : null}

            {step === 3 ? (
              <section className="space-y-4">
                <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm sm:p-6">
                  <h2 className="text-[15px] font-black text-neutral-950">Review before creating</h2>
                  <p className="mt-1 text-[12px] text-neutral-500">Double-check details and questions. You can still edit after saving.</p>

                  <dl className="mt-5 grid gap-3 sm:grid-cols-2">
                    <ReviewItem label="Title" value={title} />
                    <ReviewItem label="Role" value={roleType} />
                    <ReviewItem label="Experience" value={experienceLevel} />
                    <ReviewItem label="Time limit" value={timeLimitMin ? `${timeLimitMin} min` : "—"} />
                    <ReviewItem label="Pass score" value={passScore || "—"} />
                    <ReviewItem label="Modules" value={`${modules.length} modules · ${questionCount} questions`} />
                    <div className="sm:col-span-2">
                      <ReviewItem label="Description" value={description || "—"} />
                    </div>
                  </dl>
                </div>

                {modules.map((module, moduleIndex) => (
                  <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm" key={module.key}>
                    <div className="border-b border-neutral-100 bg-neutral-50/80 px-4 py-3">
                      <p className="text-[10px] font-bold uppercase text-neutral-400">Module {moduleIndex + 1}</p>
                      <h3 className="text-[14px] font-black text-neutral-900">{module.title}</h3>
                      <p className="mt-0.5 text-[11px] font-semibold capitalize text-neutral-500">
                        {module.type.replaceAll("_", " ")} · weight {module.weight} · {module.questions.length} questions
                      </p>
                    </div>
                    <ol className="divide-y divide-neutral-100">
                      {module.questions.map((question, questionIndex) => (
                        <li className="px-4 py-3" key={question.key}>
                          <p className="text-[10px] font-bold uppercase text-indigo-600">{question.questionType.replaceAll("_", " ")}</p>
                          <p className="mt-1 text-[13px] font-semibold leading-6 text-neutral-900">
                            {questionIndex + 1}. {question.questionText}
                          </p>
                        </li>
                      ))}
                    </ol>
                  </div>
                ))}

                <div className="flex flex-wrap justify-between gap-2">
                  <button className="button-secondary h-11 rounded-xl px-4 text-[13px]" onClick={() => setStep(2)} type="button">
                    Back to edit questions
                  </button>
                  <button className="button-primary h-11 rounded-xl px-5 text-[13px]" disabled={submitting} onClick={() => void handleCreate()} type="button">
                    {submitting ? "Creating…" : "Create template"}
                  </button>
                </div>
              </section>
            ) : null}
          </div>

          {/* Live summary sidebar */}
          <aside className="space-y-4 lg:sticky lg:top-4 lg:self-start">
            <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
              <p className="text-[11px] font-bold uppercase tracking-wide text-neutral-400">Live summary</p>
              <div className="mt-3 flex items-start gap-3">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary-50 text-primary-700">
                  <Icon name="clipboard" size={20} />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-[14px] font-black text-neutral-950">{title.trim() || "Untitled template"}</p>
                  <p className="mt-0.5 text-[12px] font-semibold text-primary-700">{roleType.trim() || "No role yet"}</p>
                </div>
              </div>
              <dl className="mt-4 space-y-2.5 border-t border-neutral-100 pt-4 text-[12px]">
                <SummaryRow label="Step" value={`${step} of 3`} />
                <SummaryRow label="Time" value={timeLimitMin ? `${timeLimitMin} min` : "—"} />
                <SummaryRow label="Pass score" value={passScore || "—"} />
                <SummaryRow label="Experience" value={experienceLevel} />
                <SummaryRow label="Modules" value={String(modules.length)} />
                <SummaryRow label="Questions" value={String(questionCount)} />
              </dl>
            </div>

            <div className="rounded-2xl border border-sky-100 bg-sky-50 p-5">
              <p className="text-[13px] font-black text-neutral-900">From-scratch tips</p>
              <ul className="mt-3 space-y-2.5 text-[12px] leading-5 text-neutral-600">
                <li className="flex gap-2">
                  <Icon className="mt-0.5 shrink-0 text-sky-600" name="check" size={14} />
                  Keep 1–2 practical modules if the screen is short.
                </li>
                <li className="flex gap-2">
                  <Icon className="mt-0.5 shrink-0 text-sky-600" name="check" size={14} />
                  Write questions the candidate will actually see — avoid internal notes as question text.
                </li>
                <li className="flex gap-2">
                  <Icon className="mt-0.5 shrink-0 text-sky-600" name="check" size={14} />
                  You can edit everything after creating.
                </li>
              </ul>
              <Link className="mt-4 inline-flex text-[12px] font-bold text-primary-700 hover:underline" href="/templates">
                Or start from a prebuilt pack →
              </Link>
            </div>
          </aside>
        </div>
      </div>
    </AppShell>
  );
}

function ModuleEditorCard({
  module,
  moduleIndex,
  onUpdate,
  onRemove,
  onAddQuestion,
  onRemoveQuestion,
  onUpdateQuestion,
  onMoveQuestion,
}: {
  module: EditorModule;
  moduleIndex: number;
  onUpdate: (patch: Partial<EditorModule>) => void;
  onRemove: () => void;
  onAddQuestion: () => void;
  onRemoveQuestion: (questionKey: string) => void;
  onUpdateQuestion: (questionKey: string, patch: Partial<EditorQuestion>) => void;
  onMoveQuestion: (questionKey: string, direction: -1 | 1) => void;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm" id={`create-module-${module.key}`}>
      <header className="border-b border-neutral-100 bg-neutral-50/80 px-4 py-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-neutral-400">Module {moduleIndex + 1}</p>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              <input
                className="control h-10 rounded-xl text-[13px] font-bold"
                onChange={(event) => onUpdate({ title: event.target.value })}
                placeholder="Module title"
                value={module.title}
              />
              <select
                className="control h-10 rounded-xl text-[13px]"
                onChange={(event) => onUpdate({ type: event.target.value as ModuleType })}
                value={module.type}
              >
                {MODULE_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type.replaceAll("_", " ")}
                  </option>
                ))}
              </select>
              <input
                className="control h-10 rounded-xl text-[13px] sm:col-span-2"
                onChange={(event) => onUpdate({ description: event.target.value })}
                placeholder="Module description (optional)"
                value={module.description}
              />
              <label className="flex items-center gap-2 text-[12px] font-semibold text-neutral-600">
                Weight
                <input
                  className="control h-9 w-24 rounded-xl text-[13px]"
                  min={0}
                  onChange={(event) => onUpdate({ weight: event.target.value })}
                  step="0.05"
                  type="number"
                  value={module.weight}
                />
              </label>
            </div>
          </div>
          <div className="flex gap-2">
            <button className="button-secondary h-9 rounded-lg px-3 text-[11px]" onClick={() => onUpdate({ collapsed: !module.collapsed })} type="button">
              {module.collapsed ? "Expand" : "Collapse"}
            </button>
            <button className="h-9 rounded-lg border border-rose-200 px-3 text-[11px] font-bold text-rose-600 hover:bg-rose-50" onClick={onRemove} type="button">
              Remove
            </button>
          </div>
        </div>
      </header>

      {!module.collapsed ? (
        <div className="space-y-3 p-4">
          {module.questions.map((question, questionIndex) => (
            <article className="rounded-xl border border-neutral-200 bg-neutral-50/40 p-4" key={question.key}>
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <p className="text-[12px] font-black text-neutral-800">Question {questionIndex + 1}</p>
                <div className="flex flex-wrap gap-1.5">
                  <button className="rounded-lg border border-neutral-200 bg-white px-2 py-1 text-[11px] font-bold text-neutral-600" disabled={questionIndex === 0} onClick={() => onMoveQuestion(question.key, -1)} type="button">
                    ↑
                  </button>
                  <button className="rounded-lg border border-neutral-200 bg-white px-2 py-1 text-[11px] font-bold text-neutral-600" disabled={questionIndex === module.questions.length - 1} onClick={() => onMoveQuestion(question.key, 1)} type="button">
                    ↓
                  </button>
                  <button className="rounded-lg border border-rose-200 bg-white px-2 py-1 text-[11px] font-bold text-rose-600" disabled={module.questions.length <= 1} onClick={() => onRemoveQuestion(question.key)} type="button">
                    Delete
                  </button>
                </div>
              </div>
              <div className="space-y-3">
                <Field label="Question text" required>
                  <textarea
                    className="control min-h-[88px] w-full rounded-xl text-[13px] leading-6"
                    onChange={(event) => onUpdateQuestion(question.key, { questionText: event.target.value })}
                    placeholder="Write the question candidates will see…"
                    value={question.questionText}
                  />
                </Field>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Type">
                    <select
                      className="control h-10 w-full rounded-xl text-[13px]"
                      onChange={(event) => onUpdateQuestion(question.key, { questionType: event.target.value as QuestionType })}
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
                      onChange={(event) => onUpdateQuestion(question.key, { rubricText: event.target.value })}
                      placeholder="clarity, ownership, impact"
                      value={question.rubricText}
                    />
                  </Field>
                </div>
                {question.questionType === "mcq" || question.questionType === "scale" ? (
                  <Field label={question.questionType === "mcq" ? "Options (one per line)" : "Scale labels (one per line)"}>
                    <textarea
                      className="control min-h-[72px] w-full rounded-xl font-mono text-[12px]"
                      onChange={(event) => onUpdateQuestion(question.key, { optionsText: event.target.value })}
                      placeholder={question.questionType === "mcq" ? "Option A\nOption B" : "1 - Strongly disagree\n...\n5 - Strongly agree"}
                      value={question.optionsText}
                    />
                  </Field>
                ) : null}
              </div>
            </article>
          ))}
          <button className="button-secondary h-10 w-full rounded-xl text-[12px]" onClick={onAddQuestion} type="button">
            <Icon name="plus" size={14} /> Add question
          </button>
        </div>
      ) : (
        <p className="px-4 py-3 text-[12px] text-neutral-500">{module.questions.length} questions collapsed</p>
      )}
    </section>
  );
}

function StepTab({
  number,
  title,
  subtitle,
  active,
  done,
  onClick,
}: {
  number: number;
  title: string;
  subtitle: string;
  active: boolean;
  done: boolean;
  onClick: () => void;
}) {
  return (
    <li>
      <button
        className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition ${
          active ? "bg-primary-500 text-white shadow-sm" : done ? "bg-primary-50 text-primary-900" : "bg-neutral-50 text-neutral-600 hover:bg-neutral-100"
        }`}
        onClick={onClick}
        type="button"
      >
        <span
          className={`flex size-8 shrink-0 items-center justify-center rounded-full text-[12px] font-black ${
            active ? "bg-white text-primary-700" : done ? "bg-primary-500 text-white" : "bg-white text-neutral-500 ring-1 ring-neutral-200"
          }`}
        >
          {done && !active ? "✓" : number}
        </span>
        <span>
          <span className="block text-[12px] font-black">{title}</span>
          <span className={`block text-[10px] font-medium ${active ? "text-white/80" : "text-neutral-500"}`}>{subtitle}</span>
        </span>
      </button>
    </li>
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

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-neutral-500">{label}</dt>
      <dd className="truncate font-bold text-neutral-900">{value}</dd>
    </div>
  );
}

function ReviewItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-neutral-50 px-3 py-2.5 ring-1 ring-neutral-100">
      <dt className="text-[10px] font-bold uppercase tracking-wide text-neutral-400">{label}</dt>
      <dd className="mt-1 whitespace-pre-wrap text-[13px] font-semibold text-neutral-900">{value}</dd>
    </div>
  );
}

function emptyQuestion(type: QuestionType = "short_answer"): EditorQuestion {
  return {
    key: newKey("q"),
    questionText: "",
    questionType: type,
    optionsText: type === "scale" ? "1 - Strongly disagree\n2\n3\n4\n5 - Strongly agree" : "",
    rubricText: "",
  };
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
