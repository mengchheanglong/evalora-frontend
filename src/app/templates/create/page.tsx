"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, type FormEvent } from "react";
import { AppShell } from "@/components/app-shell";
import { Icon, type IconName } from "@/components/icons";
import { InlineAlert } from "@/components/ui-states";
import { apiPost, getErrorMessage } from "@/lib/api";
import type { AssessmentTemplate, ModuleType, QuestionType } from "@/lib/types";

type ModuleDraft = {
  type: ModuleType;
  title: string;
  description: string;
  icon: IconName;
  questionType: QuestionType;
  questions: string[];
};

const moduleCatalog: Array<Omit<ModuleDraft, "questions">> = [
  { type: "ai_interview", title: "AI interview", description: "Structured role questions with evidence-based follow-up review.", icon: "message", questionType: "scenario" },
  { type: "coding", title: "Coding assessment", description: "Sandboxed JavaScript challenges with hidden test cases.", icon: "code", questionType: "coding" },
  { type: "debugging", title: "Debugging", description: "Root-cause analysis and prevention reasoning.", icon: "search", questionType: "short_answer" },
  { type: "behavioral", title: "Behavioral", description: "Past-experience prompts focused on observable actions.", icon: "users", questionType: "scenario" },
  { type: "work_style", title: "Work style", description: "Supportive work-preference insights without diagnostic claims.", icon: "clipboard", questionType: "scale" },
  { type: "leadership", title: "Leadership", description: "Decision-making, accountability, and team support scenarios.", icon: "crown", questionType: "scenario" },
  { type: "communication", title: "Communication", description: "Professional clarity, empathy, and solution orientation.", icon: "paperPlane", questionType: "roleplay" },
];

export default function CreateTemplatePage() {
  const router = useRouter();
  const [modules, setModules] = useState<ModuleDraft[]>(() => [createModule("ai_interview"), createModule("behavioral"), createModule("leadership")]);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const questionTotal = useMemo(() => modules.reduce((total, module) => total + module.questions.filter((question) => question.trim()).length, 0), [modules]);

  function toggleModule(type: ModuleType) {
    setModules((current) => current.some((module) => module.type === type) ? current.filter((module) => module.type !== type) : [...current, createModule(type)]);
  }

  function updateQuestion(type: ModuleType, index: number, value: string) {
    setModules((current) => current.map((module) => module.type === type ? { ...module, questions: module.questions.map((question, questionIndex) => questionIndex === index ? value : question) } : module));
  }

  function addQuestion(type: ModuleType) {
    setModules((current) => current.map((module) => module.type === type ? { ...module, questions: [...module.questions, ""] } : module));
  }

  function removeQuestion(type: ModuleType, index: number) {
    setModules((current) => current.map((module) => module.type === type ? { ...module, questions: module.questions.filter((_, questionIndex) => questionIndex !== index) } : module));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!modules.length) {
      setError("Select at least one assessment module.");
      return;
    }
    const form = new FormData(event.currentTarget);
    const populatedModules = modules.map((module, index) => ({
      type: module.type,
      title: module.title,
      description: module.description,
      weight: module.type === "coding" ? 1.5 : 1,
      orderIndex: index + 1,
      settings: { recommendedMinutes: Math.max(8, Math.round(Number(form.get("timeLimitMin")) / modules.length)) },
      questions: module.type === "coding" ? [] : module.questions.filter((question) => question.trim()).map((questionText) => ({ questionText: questionText.trim(), questionType: module.questionType, rubric: defaultRubric(module.type) })),
    }));
    if (!populatedModules.some((module) => module.type === "coding") && populatedModules.every((module) => !module.questions.length)) {
      setError("Add at least one question to the template.");
      return;
    }

    setError("");
    setSubmitting(true);
    try {
      await apiPost<AssessmentTemplate>("/templates", {
        title: String(form.get("title") ?? ""),
        roleType: String(form.get("roleType") ?? ""),
        description: String(form.get("description") ?? ""),
        timeLimitMin: Number(form.get("timeLimitMin")),
        scoringRules: { passScore: Number(form.get("passScore")), scale: "1-5", advisoryOnly: true },
        modules: populatedModules,
      });
      router.push("/templates");
      router.refresh();
    } catch (requestError) {
      setError(getErrorMessage(requestError, "Unable to create this template."));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AppShell active="templates" breadcrumbs={[{ label: "Templates", href: "/templates" }, { label: "New template" }]} description="Define the assessment structure, time expectations, and evidence prompts candidates will receive." title="Create template">
      <form className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_300px]" onSubmit={handleSubmit}>
        <div className="space-y-5">
          {error ? <InlineAlert tone="error">{error}</InlineAlert> : null}
          <section className="card p-5 sm:p-6">
            <div className="mb-5"><h2 className="text-[15px] font-bold text-neutral-950">Template details</h2><p className="mt-1 text-[12px] text-neutral-500">Use a specific role name so invitations and reports remain easy to scan.</p></div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Template name" name="title" placeholder="Software Engineer Assessment" />
              <Field label="Target role" name="roleType" placeholder="Software Engineer" />
              <label className="block sm:col-span-2"><span className="text-[12px] font-bold text-neutral-800">Description</span><textarea className="control mt-2 min-h-[92px]" name="description" placeholder="What this assessment evaluates and when to use it." /></label>
              <Field defaultValue="75" label="Time limit (minutes)" min="10" name="timeLimitMin" type="number" />
              <Field defaultValue="3.5" label="Review threshold (1-5)" max="5" min="1" name="passScore" step="0.1" type="number" />
            </div>
          </section>

          <section className="card overflow-hidden">
            <div className="border-b border-neutral-200 px-5 py-4 sm:px-6"><h2 className="text-[15px] font-bold text-neutral-950">Assessment modules</h2><p className="mt-1 text-[12px] text-neutral-500">Select only modules that produce useful evidence for this role.</p></div>
            <div className="grid gap-px bg-neutral-200 sm:grid-cols-2 xl:grid-cols-3">
              {moduleCatalog.map((module) => {
                const selected = modules.some((item) => item.type === module.type);
                return (
                  <label className={`flex cursor-pointer gap-3 bg-white p-4 transition hover:bg-neutral-50 ${selected ? "shadow-[inset_3px_0_0_#2fb2e4]" : ""}`} key={module.type}>
                    <input checked={selected} className="mt-1 size-4 accent-[#159ac8]" onChange={() => toggleModule(module.type)} type="checkbox" />
                    <span><span className="flex items-center gap-2 text-[12px] font-bold text-neutral-900"><Icon className="text-neutral-500" name={module.icon} size={15} />{module.title}</span><span className="mt-1.5 block text-[11px] leading-4 text-neutral-500">{module.description}</span></span>
                  </label>
                );
              })}
            </div>
          </section>

          {modules.filter((module) => module.type !== "coding").map((module) => (
            <section className="card overflow-hidden" key={module.type}>
              <div className="flex items-center justify-between gap-3 border-b border-neutral-200 px-5 py-4 sm:px-6"><div className="flex items-center gap-3"><span className="flex size-8 items-center justify-center rounded-[6px] bg-sky-50 text-sky-700"><Icon name={module.icon} size={15} /></span><div><h2 className="text-[14px] font-bold text-neutral-950">{module.title} questions</h2><p className="mt-0.5 text-[11px] text-neutral-500">Responses are evaluated against module-specific rubrics.</p></div></div><button className="button-secondary min-h-8 px-3 text-[11px]" onClick={() => addQuestion(module.type)} type="button"><Icon name="plus" size={13} /> Add question</button></div>
              <div className="divide-y divide-neutral-100 px-5 sm:px-6">
                {module.questions.map((question, index) => (
                  <div className="flex gap-3 py-4" key={`${module.type}-${index}`}><span className="flex size-7 shrink-0 items-center justify-center rounded-[5px] bg-neutral-100 text-[11px] font-bold text-neutral-600">{index + 1}</span><textarea aria-label={`${module.title} question ${index + 1}`} className="control min-h-[72px] flex-1" onChange={(event) => updateQuestion(module.type, index, event.target.value)} placeholder="Write a clear, evidence-oriented prompt" required value={question} />{module.questions.length > 1 ? <button aria-label="Remove question" className="flex size-8 shrink-0 items-center justify-center rounded-[5px] text-red-500 hover:bg-red-50" onClick={() => removeQuestion(module.type, index)} type="button"><Icon name="more" size={15} /></button> : null}</div>
                ))}
              </div>
            </section>
          ))}
        </div>

        <aside className="space-y-4 xl:sticky xl:top-[92px] xl:self-start">
          <section className="card p-5"><h2 className="text-[14px] font-bold text-neutral-950">Template summary</h2><dl className="mt-4 space-y-3 text-[12px]"><SummaryRow label="Modules" value={String(modules.length)} /><SummaryRow label="Custom questions" value={String(questionTotal)} /><SummaryRow label="Coding sandbox" value={modules.some((module) => module.type === "coding") ? "Included" : "Not included"} /></dl></section>
          <section className="rounded-[8px] border border-sky-100 bg-sky-50 p-4"><p className="flex items-center gap-2 text-[12px] font-bold text-sky-950"><Icon name="shield" size={15} /> Advisory scoring</p><p className="mt-2 text-[11px] leading-5 text-sky-900/75">Thresholds help reviewers prioritize evidence. They do not automatically hire or reject candidates.</p></section>
          <div className="grid grid-cols-2 gap-2"><Link className="button-secondary" href="/templates">Cancel</Link><button className="button-primary" disabled={submitting} type="submit">{submitting ? "Creating" : "Create"}</button></div>
        </aside>
      </form>
    </AppShell>
  );
}

function createModule(type: ModuleType): ModuleDraft {
  const source = moduleCatalog.find((module) => module.type === type);
  if (!source) throw new Error(`Unknown module type: ${type}`);
  return { ...source, questions: [defaultQuestion(type)] };
}

function defaultQuestion(type: ModuleType): string {
  const questions: Partial<Record<ModuleType, string>> = {
    ai_interview: "Tell us about a project relevant to this role. What was your responsibility, what trade-offs did you make, and what changed because of your work?",
    behavioral: "Describe a time you received difficult feedback. How did you respond, and what did you do differently afterward?",
    work_style: "How strongly do you prefer to clarify ownership before beginning a cross-functional task?",
    leadership: "A critical deadline is at risk and two teammates disagree on the plan. How would you move the team forward?",
    communication: "A client is frustrated by a delayed delivery. Write the response you would send and the next action you would take.",
    debugging: "Describe how you would isolate a regression that appears only in production and how you would verify the fix.",
    problem_solving: "Break down an ambiguous operational problem and explain how you would validate the most likely solution.",
  };
  return questions[type] ?? "";
}

function defaultRubric(type: ModuleType): string[] {
  const rubrics: Partial<Record<ModuleType, string[]>> = {
    ai_interview: ["clarity", "role relevance", "problem solving", "evidence", "reflection"],
    behavioral: ["collaboration", "ownership", "adaptability", "self-awareness", "professional judgment"],
    work_style: ["collaboration", "ownership", "adaptability", "learning", "professional judgment"],
    leadership: ["decision making", "conflict handling", "accountability", "communication", "team support"],
    communication: ["clarity", "empathy", "professionalism", "solution orientation", "follow-up"],
    debugging: ["root cause analysis", "validation", "prevention", "clarity"],
    problem_solving: ["structured approach", "trade-offs", "validation", "impact"],
  };
  return rubrics[type] ?? ["clarity", "evidence", "reasoning"];
}

function Field({ label, name, placeholder, type = "text", defaultValue, min, max, step }: { label: string; name: string; placeholder?: string; type?: string; defaultValue?: string; min?: string; max?: string; step?: string }) {
  return <label className="block"><span className="text-[12px] font-bold text-neutral-800">{label}</span><input className="control mt-2 h-11" defaultValue={defaultValue} max={max} min={min} name={name} placeholder={placeholder} required step={step} type={type} /></label>;
}

function SummaryRow({ label, value }: { label: string; value: string }) { return <div className="flex items-center justify-between gap-3"><dt className="text-neutral-500">{label}</dt><dd className="font-bold text-neutral-900">{value}</dd></div>; }
