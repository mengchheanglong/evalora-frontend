"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Icon, type IconName } from "@/components/icons";
import { InlineAlert } from "@/components/ui-states";
import { apiPost, getErrorMessage } from "@/lib/api";
import type { AssessmentTemplate, JsonValue, ModuleType, QuestionType } from "@/lib/types";

const MODULE_TYPES: ModuleType[] = [
  "ai_interview", "coding", "debugging", "work_style", "behavioral", "leadership", "communication", "problem_solving",
];

const QUESTION_TYPES: QuestionType[] = ["short_answer", "scenario", "roleplay", "mcq", "scale", "coding"];

const STARTER_MODULES: Array<{ type: ModuleType; title: string; description: string; icon: IconName }> = [
  { type: "behavioral", title: "Behavioral", description: "Past evidence and STAR-style ownership.", icon: "users" },
  { type: "coding", title: "Coding", description: "Practical coding tasks and edge cases.", icon: "code" },
  { type: "communication", title: "Communication", description: "Writing, roleplay, and clarity.", icon: "message" },
  { type: "leadership", title: "Leadership", description: "Decision-making and team scenarios.", icon: "crown" },
  { type: "problem_solving", title: "Problem Solving", description: "Ambiguous cases and judgment.", icon: "sparkle" },
  { type: "ai_interview", title: "AI Interview", description: "Open-ended adaptive prompts.", icon: "message" },
  { type: "work_style", title: "Work Style", description: "Preferences and operating rhythm.", icon: "clipboard" },
  { type: "debugging", title: "Debugging", description: "Root-cause analysis scenarios.", icon: "search" },
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
  const [pendingModuleRemoval, setPendingModuleRemoval] = useState<string | null>(null);

  const questionCount = useMemo(() => modules.reduce((total, module) => total + module.questions.length, 0), [modules]);

  function updateModule(key: string, patch: Partial<EditorModule>) {
    setModules((current) => current.map((module) => (module.key === key ? { ...module, ...patch } : module)));
  }

  function updateQuestion(moduleKey: string, questionKey: string, patch: Partial<EditorQuestion>) {
    setModules((current) =>
      current.map((module) => {
        if (module.key !== moduleKey) return module;
        return { ...module, questions: module.questions.map((q) => (q.key === questionKey ? { ...q, ...patch } : q)) };
      })
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
    setModules((current) => {
      const next = current.filter((module) => module.key !== key);
      if (activeModuleKey === key) setActiveModuleKey(next[0]?.key ?? "");
      return next;
    });
  }

  function addQuestion(moduleKey: string) {
    setModules((current) =>
      current.map((module) => (module.key === moduleKey ? { ...module, collapsed: false, questions: [...module.questions, emptyQuestion()] } : module))
    );
  }

  function removeQuestion(moduleKey: string, questionKey: string) {
    setModules((current) =>
      current.map((module) => {
        if (module.key !== moduleKey) return module;
        if (module.questions.length <= 1) return module;
        return { ...module, questions: module.questions.filter((q) => q.key !== questionKey) };
      })
    );
  }

  function moveQuestion(moduleKey: string, questionKey: string, direction: -1 | 1) {
    setModules((current) =>
      current.map((module) => {
        if (module.key !== moduleKey) return module;
        const index = module.questions.findIndex((q) => q.key === questionKey);
        const target = index + direction;
        if (index < 0 || target < 0 || target >= module.questions.length) return module;
        const questions = [...module.questions];
        const [item] = questions.splice(index, 1);
        questions.splice(target, 0, item);
        return { ...module, questions };
      })
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
      const fullDescription = [description.trim(), experienceLevel ? `Experience level: ${experienceLevel}` : ""].filter(Boolean).join("\n\n");

      const payload = {
        title: title.trim(),
        description: fullDescription,
        roleType: roleType.trim(),
        timeLimitMin: timeLimitMin ? Number(timeLimitMin) : undefined,
        scoringRules: { passScore: passScore ? Number(passScore) : 3.5, scale: "1-5", advisoryOnly: true, createdFrom: "blank-workspace" },
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
      <div className="mx-auto max-w-7xl space-y-8 p-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Link className="font-semibold hover:text-gray-900" href="/templates">Templates</Link>
              <Icon className="rotate-180 text-gray-400" name="chevron" size={12} />
              <span className="font-semibold text-gray-900">Create from scratch</span>
            </div>
            <h1 className="mt-2 text-3xl font-bold text-gray-900">Create Assessment Template</h1>
            <p className="mt-1 text-gray-500">Define the assessment, build modules and questions, then save to your workspace.</p>
          </div>
          <Link className="inline-flex h-10 items-center rounded-lg border border-gray-200 bg-white px-4 text-sm font-medium text-gray-700 hover:bg-gray-50" href="/templates">
            Cancel
          </Link>
        </div>

        {/* Stepper */}
        <div className="rounded-xl border border-gray-200 bg-white p-2">
          <ol className="grid grid-cols-3 gap-2">
            <StepButton active={step === 1} done={step > 1} number={1} onClick={() => goToStep(1)} subtitle="Name, role, settings" title="Basics" />
            <StepButton active={step === 2} done={step > 2} number={2} onClick={() => goToStep(2)} subtitle="Build the assessment" title="Modules & Questions" />
            <StepButton active={step === 3} done={false} number={3} onClick={() => goToStep(3)} subtitle="Confirm and save" title="Review & Create" />
          </ol>
        </div>

        {error && <InlineAlert tone="error">{error}</InlineAlert>}

        <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
          {/* Main Content */}
          <div className="min-w-0 space-y-6">
         {/* Step 1: Basics */}
{step === 1 && (
  <div className="space-y-6">
    <SectionCard title="Template Information" description="Start with who this assessment is for and how long it should take.">
      <div className="grid gap-6 sm:grid-cols-2">
        <Field label="Template name" required>
          <input 
            className="block w-full rounded-lg border border-gray-300 bg-sky-50 px-3 py-2.5 text-sm outline-none transition focus:border-sky-500 focus:ring-1 focus:ring-sky-500 focus:bg-white" 
            onChange={(e) => setTitle(e.target.value)} 
            placeholder="e.g. Backend Engineer Screen" 
            value={title} 
          />
        </Field>
        <Field label="Target role" required>
          <input 
            className="block w-full rounded-lg border border-gray-300 bg-sky-50 px-3 py-2.5 text-sm outline-none transition focus:border-sky-500 focus:ring-1 focus:ring-sky-500 focus:bg-white" 
            onChange={(e) => setRoleType(e.target.value)} 
            placeholder="e.g. Backend Engineer" 
            value={roleType} 
          />
        </Field>
        <Field label="Experience level">
          <select 
            className="block w-full rounded-lg border border-gray-300 bg-sky-50 px-3 py-2.5 text-sm outline-none transition focus:border-sky-500 focus:ring-1 focus:ring-sky-500 focus:bg-white" 
            onChange={(e) => setExperienceLevel(e.target.value)} 
            value={experienceLevel}
          >
            <option>Junior (0–2 years)</option>
            <option>Mid (2–5 years)</option>
            <option>Senior (5+ years)</option>
            <option>Lead / Staff</option>
            <option>Any level</option>
          </select>
        </Field>
        <Field label="Time limit (minutes)">
          <input 
            className="block w-full rounded-lg border border-gray-300 bg-sky-50 px-3 py-2.5 text-sm outline-none transition focus:border-sky-500 focus:ring-1 focus:ring-sky-500 focus:bg-white" 
            min={5} 
            onChange={(e) => setTimeLimitMin(e.target.value)} 
            type="number" 
            value={timeLimitMin} 
          />
        </Field>
        
        <div className="sm:col-span-2">
          <Field label="Pass score (1–5 scale)">
            <input 
              className="block w-full rounded-lg border border-gray-300 bg-sky-50 px-3 py-2.5 text-sm outline-none transition focus:border-sky-500 focus:ring-1 focus:ring-sky-500 focus:bg-white" 
              max={5} 
              min={1} 
              onChange={(e) => setPassScore(e.target.value)} 
              step="0.1" 
              type="number" 
              value={passScore} 
            />
          </Field>
        </div>
        
        <div className="sm:col-span-2">
          <Field label="Description">
            <textarea 
              className="block w-full rounded-lg border border-gray-300 bg-sky-50 px-3 py-2.5 text-sm leading-6 outline-none transition focus:border-sky-500 focus:ring-1 focus:ring-sky-500 focus:bg-white" 
              onChange={(e) => setDescription(e.target.value)} 
              placeholder="What does this assessment measure? Who is it for?" 
              rows={3} 
              value={description} 
            />
          </Field>
        </div>
      </div>
    </SectionCard>
    <div className="flex justify-end">
      <button 
  className="inline-flex h-10 items-center gap-2 rounded-lg bg-sky-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-600 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2" 
  onClick={() => goToStep(2)} 
  type="button"
>
  Continue to modules <Icon className="-rotate-90" name="chevron" size={14} />
</button>
    </div>
  </div>
)}

            {/* Step 2: Modules */}
            {step === 2 && (
              <div className="space-y-6">
                <SectionCard title="Quick-add modules" description="Click a starter to add a module with one blank question.">
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    {STARTER_MODULES.map((starter) => (
                      <button key={starter.type} className="starter-card" onClick={() => addModule(starter)} type="button">
                        <div className={`flex size-10 items-center justify-center rounded-lg ${getModuleColor(starter.type)}`}>
                          <Icon name={starter.icon} size={18} />
                        </div>
                        <div className="text-left">
                          <p className="text-sm font-semibold text-gray-900">{starter.title}</p>
                          <p className="text-xs text-gray-500">{starter.description}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </SectionCard>

                <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
                  {/* Module List Sidebar */}
                  <aside className="rounded-xl border border-gray-200 bg-white p-3">
                    <div className="mb-3 flex items-center justify-between px-2">
                      <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Modules</p>
                      <button className="text-xs font-semibold text-sky-600 hover:underline" onClick={() => addModule()} type="button">+ Add</button>
                    </div>
                    {modules.length === 0 ? (
                      <p className="px-2 py-6 text-center text-sm text-gray-500">No modules yet</p>
                    ) : (
                      <ul className="space-y-1">
                        {modules.map((module, index) => (
                          <li key={module.key}>
                            <button
                              className={`w-full rounded-lg px-3 py-2.5 text-left transition ${activeModuleKey === module.key ? "bg-sky-50 ring-1 ring-sky-200" : "hover:bg-gray-50"}`}
                              onClick={() => { setActiveModuleKey(module.key); document.getElementById(`module-${module.key}`)?.scrollIntoView({ behavior: "smooth" }); }}
                              type="button"
                            >
                              <div className="flex items-center gap-2">
                                <span className="flex size-6 items-center justify-center rounded bg-gray-100 text-[10px] font-bold text-gray-600">M{index + 1}</span>
                                <span className="flex-1 truncate text-sm font-semibold text-gray-900">{module.title || "Untitled"}</span>
                              </div>
                              <p className="mt-1 text-[10px] text-gray-500">{module.questions.length} questions</p>
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </aside>

                  {/* Module Editor */}
                  <div className="space-y-4">
                    {modules.length === 0 ? (
                      <EmptyState onClick={() => addModule()} />
                    ) : (
                      modules.map((module, index) => (
                        <ModuleCard
                          key={module.key}
                          index={index}
                          module={module}
                          onAdd={() => addQuestion(module.key)}
                          onMove={(qk, d) => moveQuestion(module.key, qk, d)}
                          onRemove={() => setPendingModuleRemoval(module.key)}
                          onRemoveQuestion={(qk) => removeQuestion(module.key, qk)}
                          onUpdate={(patch) => updateModule(module.key, patch)}
                          onUpdateQuestion={(qk, patch) => updateQuestion(module.key, qk, patch)}
                        />
                      ))
                    )}
                    {modules.length > 0 && (
                      <button className="button-secondary w-full" onClick={() => addModule()} type="button">
                        <Icon name="plus" size={16} /> Add another module
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex justify-between">
                  <button className="button-secondary" onClick={() => setStep(1)} type="button">Back to basics</button>
                  <button className="button-primary inline-flex items-center gap-2" onClick={() => goToStep(3)} type="button">
                    Review template <Icon className="-rotate-90" name="chevron" size={14} />
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Review */}
            {step === 3 && (
              <div className="space-y-6">
                <SectionCard title="Review before creating" description="Double-check details and questions. You can edit everything after saving.">
                  <dl className="grid gap-4 sm:grid-cols-2">
                    <ReviewItem label="Title" value={title} />
                    <ReviewItem label="Role" value={roleType} />
                    <ReviewItem label="Experience" value={experienceLevel} />
                    <ReviewItem label="Time limit" value={timeLimitMin ? `${timeLimitMin} min` : "—"} />
                    <ReviewItem label="Pass score" value={passScore || "—"} />
                    <ReviewItem label="Structure" value={`${modules.length} modules · ${questionCount} questions`} />
                    <div className="sm:col-span-2">
                      <ReviewItem label="Description" value={description || "—"} />
                    </div>
                  </dl>
                </SectionCard>

                {modules.map((module, index) => (
                  <div className="overflow-hidden rounded-xl border border-gray-200 bg-white" key={module.key}>
                    <div className="border-b border-gray-100 bg-gray-50 px-6 py-4">
                      <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Module {index + 1}</p>
                      <h3 className="mt-1 text-lg font-bold text-gray-900">{module.title}</h3>
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-gray-500">
                        <span className="rounded-full bg-white px-2.5 py-0.5 text-xs font-medium ring-1 ring-gray-200">{module.type.replaceAll("_", " ")}</span>
                        <span>Weight: {module.weight}</span>
                        <span>·</span>
                        <span>{module.questions.length} questions</span>
                      </div>
                    </div>
                    <ol className="divide-y divide-gray-100">
                      {module.questions.map((question, qIndex) => (
                        <li className="px-6 py-4" key={question.key}>
                          <div className="mb-2 flex items-center gap-2">
                            <span className="flex size-6 items-center justify-center rounded bg-gray-900 text-[10px] font-bold text-white">{qIndex + 1}</span>
                            <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600">{question.questionType.replaceAll("_", " ")}</span>
                          </div>
                          <p className="text-sm font-semibold leading-6 text-gray-900">{question.questionText}</p>
                        </li>
                      ))}
                    </ol>
                  </div>
                ))}

                <div className="flex justify-between">
                  <button className="button-secondary" onClick={() => setStep(2)} type="button">Back to edit</button>
                  <button className="button-primary inline-flex items-center gap-2" disabled={submitting} onClick={() => void handleCreate()} type="button">
                    {submitting ? "Creating..." : "Create template"}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6 lg:sticky lg:top-6 lg:self-start">
            <div className="rounded-xl border border-gray-200 bg-white p-6">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Live Summary</p>
              <div className="mt-4 flex items-start gap-3">
                <div className="flex size-10 items-center justify-center rounded-lg bg-sky-50 text-sky-600">
                  <Icon name="clipboard" size={18} />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-gray-900">{title.trim() || "Untitled template"}</p>
                  <p className="text-xs text-sky-600">{roleType.trim() || "No role yet"}</p>
                </div>
              </div>
              <dl className="mt-5 space-y-3 border-t border-gray-100 pt-4 text-sm">
                <SummaryRow label="Current step" value={`${step} of 3`} />
                <SummaryRow label="Time limit" value={timeLimitMin ? `${timeLimitMin} min` : "—"} />
                <SummaryRow label="Pass score" value={passScore || "—"} />
                <SummaryRow label="Modules" value={String(modules.length)} />
                <SummaryRow label="Questions" value={String(questionCount)} />
              </dl>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-6">
              <p className="text-sm font-bold text-gray-900">Tips</p>
              <ul className="mt-3 space-y-3 text-sm text-gray-600">
                <li className="flex gap-2"><Icon className="mt-0.5 shrink-0 text-sky-600" name="check" size={14} /> Keep 1–2 practical modules for short screens</li>
                <li className="flex gap-2"><Icon className="mt-0.5 shrink-0 text-sky-600" name="check" size={14} /> Write questions candidates will actually see</li>
                <li className="flex gap-2"><Icon className="mt-0.5 shrink-0 text-sky-600" name="check" size={14} /> You can edit everything after creating</li>
              </ul>
              <Link className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-sky-700 hover:underline" href="/templates">
                Or start from prebuilt <Icon className="-rotate-90" name="chevron" size={12} />
              </Link>
            </div>
          </div>
        </div>
      </div>

      <ConfirmDialog
        confirmLabel="Remove module"
        message={`"${modules.find((module) => module.key === pendingModuleRemoval)?.title || "This module"}" and all of its questions will be removed from the template.`}
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

// Helper Components
function SectionCard({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6">
      <div className="mb-6">
        <h2 className="text-lg font-bold text-gray-900">{title}</h2>
        {description && <p className="mt-1 text-sm text-gray-500">{description}</p>}
      </div>
      {children}
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-semibold uppercase tracking-wider text-gray-500">
        {label}{required && <span className="text-rose-500"> *</span>}
      </span>
      {children}
    </label>
  );
}

function StepButton({ number, title, subtitle, active, done, onClick }: { number: number; title: string; subtitle: string; active: boolean; done: boolean; onClick: () => void }) {
  return (
    <button className={`flex items-center gap-3 rounded-lg px-4 py-3 text-left transition ${active ? "bg-sky-500 text-white" : done ? "bg-sky-50 text-sky-900" : "hover:bg-gray-50"}`} onClick={onClick} type="button">
      <span className={`flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${active ? "bg-white text-sky-600" : done ? "bg-sky-500 text-white" : "bg-white text-gray-500 ring-1 ring-gray-200"}`}>
        {done && !active ? "✓" : number}
      </span>
      <div>
        <p className={`text-sm font-bold ${active ? "text-white" : "text-gray-900"}`}>{title}</p>
        <p className={`text-xs ${active ? "text-white/80" : "text-gray-500"}`}>{subtitle}</p>
      </div>
    </button>
  );
}

function ModuleCard({ module, index, onUpdate, onRemove, onAdd, onUpdateQuestion, onRemoveQuestion, onMove }: {
  module: EditorModule; index: number; onUpdate: (patch: Partial<EditorModule>) => void; onRemove: () => void;
  onAdd: () => void; onUpdateQuestion: (qk: string, patch: Partial<EditorQuestion>) => void;
  onRemoveQuestion: (qk: string) => void; onMove: (qk: string, d: -1 | 1) => void;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white" id={`module-${module.key}`}>
      <div className="border-b border-gray-100 bg-gray-50 px-6 py-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Module {index + 1}</span>
              <span className="rounded-full bg-white px-2 py-0.5 text-xs font-medium text-gray-600 ring-1 ring-gray-200">{module.type.replaceAll("_", " ")}</span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-xs font-semibold text-gray-600">
                Module title
                <input className="input-field mt-1 font-semibold" onChange={(e) => onUpdate({ title: e.target.value })} placeholder="e.g. Coding challenge" value={module.title} />
              </label>
              <label className="block text-xs font-semibold text-gray-600">
                Category <span className="font-normal text-gray-400">— sets how this module is scored</span>
                <select className="input-field mt-1 bg-white" onChange={(e) => onUpdate({ type: e.target.value as ModuleType })} value={module.type}>
                  {MODULE_TYPES.map((t) => <option key={t} value={t}>{t.replaceAll("_", " ")}</option>)}
                </select>
              </label>
              <input className="input-field sm:col-span-2" onChange={(e) => onUpdate({ description: e.target.value })} placeholder="Module description (optional)" value={module.description} />
              <label className="flex items-center gap-2 text-sm font-medium text-gray-600 sm:col-span-2">
                Weight
                <input className="input-field w-24" min={0} onChange={(e) => onUpdate({ weight: e.target.value })} step="0.05" type="number" value={module.weight} />
              </label>
            </div>
          </div>
          <div className="flex shrink-0 gap-2">
            <button className="button-secondary h-9" onClick={() => onUpdate({ collapsed: !module.collapsed })} type="button">{module.collapsed ? "Expand" : "Collapse"}</button>
            <button className="inline-flex h-9 items-center rounded-lg border border-rose-200 bg-white px-3 text-xs font-semibold text-rose-600 hover:bg-rose-50" onClick={onRemove} type="button">Remove</button>
          </div>
        </div>
      </div>
      {!module.collapsed && (
        <div className="space-y-4 p-6">
          {module.questions.map((question, qIndex) => (
            <div className="rounded-xl border border-gray-200 bg-gray-50/50 p-4" key={question.key}>
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="flex size-6 items-center justify-center rounded bg-gray-900 text-[10px] font-bold text-white">{qIndex + 1}</span>
                  <p className="text-sm font-semibold text-gray-700">Question</p>
                </div>
                <div className="flex gap-1.5">
                  <button className="inline-flex size-8 items-center justify-center rounded-lg border border-gray-200 bg-white text-xs font-bold text-gray-600 hover:bg-gray-50 disabled:opacity-50" disabled={qIndex === 0} onClick={() => onMove(question.key, -1)} type="button">↑</button>
                  <button className="inline-flex size-8 items-center justify-center rounded-lg border border-gray-200 bg-white text-xs font-bold text-gray-600 hover:bg-gray-50 disabled:opacity-50" disabled={qIndex === module.questions.length - 1} onClick={() => onMove(question.key, 1)} type="button">↓</button>
                  <button className="inline-flex h-8 items-center rounded-lg border border-rose-200 bg-white px-2.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-50" disabled={module.questions.length <= 1} onClick={() => onRemoveQuestion(question.key)} type="button">Delete</button>
                </div>
              </div>
              <div className="space-y-4">
                <Field label="Question text" required>
                  <textarea className="input-field min-h-[80px]" onChange={(e) => onUpdateQuestion(question.key, { questionText: e.target.value })} placeholder="Write the question candidates will see…" rows={3} value={question.questionText} />
                </Field>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Question type">
                    <select className="input-field bg-white" onChange={(e) => onUpdateQuestion(question.key, { questionType: e.target.value as QuestionType })} value={question.questionType}>
                      {QUESTION_TYPES.map((t) => <option key={t} value={t}>{t.replaceAll("_", " ")}</option>)}
                    </select>
                  </Field>
                  <Field label="Rubric cues (comma-separated)">
                    <input className="input-field" onChange={(e) => onUpdateQuestion(question.key, { rubricText: e.target.value })} placeholder="clarity, ownership, impact" value={question.rubricText} />
                  </Field>
                </div>
                {(question.questionType === "mcq" || question.questionType === "scale") && (
                  <Field label={question.questionType === "mcq" ? "Options (one per line)" : "Scale labels (one per line)"}>
                    <textarea className="input-field min-h-[80px] font-mono text-xs" onChange={(e) => onUpdateQuestion(question.key, { optionsText: e.target.value })} placeholder={question.questionType === "mcq" ? "Option A\nOption B" : "1 - Strongly disagree\n...\n5 - Strongly agree"} rows={4} value={question.optionsText} />
                  </Field>
                )}
              </div>
            </div>
          ))}
          <button className="button-secondary w-full" onClick={onAdd} type="button"><Icon name="plus" size={14} /> Add question</button>
        </div>
      )}
      {module.collapsed && <div className="border-t border-gray-100 bg-gray-50/50 px-6 py-3 text-sm text-gray-500">{module.questions.length} question{module.questions.length !== 1 ? "s" : ""} collapsed</div>}
    </div>
  );
}

function EmptyState({ onClick }: { onClick: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200 bg-white p-12 text-center">
      <div className="flex size-14 items-center justify-center rounded-full bg-sky-50 text-sky-600">
        <Icon name="plus" size={24} />
      </div>
      <p className="mt-4 text-lg font-bold text-gray-900">Build your first module</p>
      <p className="mx-auto mt-1 max-w-sm text-sm text-gray-500">Add modules from the quick-start cards above, then write the questions candidates will answer.</p>
      <button className="button-primary mt-6" onClick={onClick} type="button">Add blank module</button>
    </div>
  );
}

function ReviewItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-gray-50 px-4 py-3">
      <dt className="text-xs font-semibold uppercase tracking-wider text-gray-400">{label}</dt>
      <dd className="mt-1 whitespace-pre-wrap text-sm font-semibold text-gray-900">{value}</dd>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-gray-500">{label}</dt>
      <dd className="font-semibold text-gray-900">{value}</dd>
    </div>
  );
}

// Utilities
function getModuleColor(type: ModuleType): string {
  const colors: Record<ModuleType, string> = {
    behavioral: "bg-orange-100 text-orange-600", coding: "bg-indigo-100 text-indigo-600", communication: "bg-sky-100 text-sky-600",
    leadership: "bg-blue-100 text-blue-600", problem_solving: "bg-purple-100 text-purple-600", ai_interview: "bg-emerald-100 text-emerald-600",
    work_style: "bg-gray-100 text-gray-600", debugging: "bg-teal-100 text-teal-600",
  };
  return colors[type] || "bg-gray-100 text-gray-600";
}

function emptyQuestion(type: QuestionType = "short_answer"): EditorQuestion {
  return { key: newKey("q"), questionText: "", questionType: type, optionsText: type === "scale" ? "1 - Strongly disagree\n2\n3\n4\n5 - Strongly agree" : "", rubricText: "" };
}

function parseOptions(text: string, questionType: QuestionType): JsonValue | undefined {
  if (questionType !== "mcq" && questionType !== "scale") return undefined;
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  return lines.length ? lines : undefined;
}

function parseRubric(text: string): JsonValue | undefined {
  const parts = text.split(",").map((p) => p.trim()).filter(Boolean);
  return parts.length ? parts : undefined;
}

function newKey(prefix: string) { return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`; }
