import Link from "next/link";
import type { ReactNode } from "react";
import { Button, ButtonLink } from "@/components/button-link";
import { EvaloraLogo } from "@/components/logo";
import { StatusChip } from "@/components/status-chip";
import { assessmentModules } from "@/lib/mock-data";

type PageProps = {
  params: Promise<{ sessionId: string }>;
};

export default async function AssessmentPage({ params }: PageProps) {
  const { sessionId } = await params;

  return (
    <main className="min-h-screen bg-[#f6f8fb] text-neutral-950">
      <header className="border-b border-neutral-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-5 py-5 sm:px-8">
          <EvaloraLogo href="/" />
          <div className="flex flex-wrap items-center gap-3">
            <StatusChip label="In progress" />
            <span className="rounded-full bg-neutral-100 px-4 py-2 text-sm font-bold text-neutral-700">Session {sessionId}</span>
          </div>
        </div>
      </header>

      <section className="mx-auto grid max-w-7xl gap-6 px-5 py-8 sm:px-8 lg:grid-cols-[300px_1fr]">
        <aside className="card h-fit p-5 lg:sticky lg:top-8">
          <h2 className="text-lg font-black">Assessment progress</h2>
          <p className="mt-2 text-sm leading-6 text-neutral-600">Complete each module in order. Progress is saved as you work.</p>
          <div className="mt-6 space-y-3">
            {assessmentModules.map((module, index) => (
              <a className="flex items-center gap-3 rounded-[8px] bg-neutral-50 p-3" href={`#module-${index + 1}`} key={module.title}>
                <span className={`inline-flex size-9 items-center justify-center rounded-full text-sm font-black ${index < 2 ? "bg-[#2fb2e4] text-white" : "bg-neutral-200 text-neutral-700"}`}>
                  {index + 1}
                </span>
                <span>
                  <span className="block font-bold">{module.title}</span>
                  <span className="block text-xs text-neutral-500">{module.duration}</span>
                </span>
              </a>
            ))}
          </div>
          <div className="mt-6 rounded-[8px] bg-sky-50 p-4 text-sm leading-6 text-blue-800">
            AI feedback supports human review and is not the final hiring decision.
          </div>
        </aside>

        <div className="space-y-6">
          <section className="card p-6">
            <div className="flex flex-wrap items-start justify-between gap-5">
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.2em] text-blue-700">Candidate instructions</p>
                <h1 className="mt-3 text-4xl font-black tracking-normal">Frontend Developer Assessment</h1>
                <p className="mt-4 max-w-3xl text-lg leading-8 text-neutral-700">
                  Answer based on your real experience. Your responses will be reviewed by a human interviewer. You can save progress before moving between modules.
                </p>
              </div>
              <div className="rounded-[8px] bg-neutral-50 p-4 text-right">
                <p className="text-sm font-semibold text-neutral-500">Estimated time</p>
                <p className="mt-1 text-3xl font-black">85 min</p>
              </div>
            </div>
            <div className="mt-6 grid gap-4 md:grid-cols-3">
              {["Not started", "Saving progress", "Submitted/completed"].map((state, index) => (
                <div className="rounded-[8px] bg-neutral-50 p-4" key={state}>
                  <p className="text-sm font-semibold text-neutral-500">State {index + 1}</p>
                  <p className="mt-1 font-black">{state}</p>
                </div>
              ))}
            </div>
          </section>

          <ModuleCard index={1} title="AI Interview" status="Ready">
            <div className="rounded-[8px] border border-sky-200 bg-sky-50 p-4 text-sm leading-6 text-blue-800">
              AI response loading: preparing a role-specific follow-up question. If the service is unavailable, your current answer stays saved.
            </div>
            <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
              <label className="block">
                <span className="font-bold">Prompt</span>
                <textarea className="mt-3 min-h-48 w-full rounded-[8px] border border-neutral-200 bg-white p-4 outline-none focus:border-sky-300" defaultValue="Tell us about a frontend project where you improved reliability or performance. What tradeoffs did you consider?" />
              </label>
              <div className="rounded-[8px] bg-neutral-50 p-4">
                <h3 className="font-black">Interview notes</h3>
                <ul className="mt-4 space-y-3 text-sm leading-6 text-neutral-600">
                  <li>Use specific examples from your work.</li>
                  <li>Explain context, action, and outcome.</li>
                  <li>Do not include confidential employer data.</li>
                </ul>
              </div>
            </div>
          </ModuleCard>

          <ModuleCard index={2} title="Coding Assessment" status="In progress">
            <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
              <div className="space-y-4">
                <div className="rounded-[8px] bg-neutral-50 p-4">
                  <h3 className="font-black">Problem</h3>
                  <p className="mt-3 text-sm leading-6 text-neutral-600">
                    Implement <code className="rounded bg-white px-1 py-0.5">groupBySkill(candidates)</code>. Return an object keyed by skill with candidate names as values.
                  </p>
                </div>
                <div className="rounded-[8px] bg-amber-50 p-4 text-sm leading-6 text-amber-800">
                  Code execution running: sandbox output will appear here. Execution timeout messages should preserve your code.
                </div>
                <div className="rounded-[8px] bg-red-50 p-4 text-sm leading-6 text-red-700">
                  Validation error example: run at least one test before final code submission.
                </div>
              </div>
              <div className="overflow-hidden rounded-[8px] border border-neutral-900 bg-[#0d1220]">
                <div className="flex items-center justify-between border-b border-white/10 px-4 py-3 text-sm text-white">
                  <span className="font-bold">solution.js</span>
                  <Button className="min-h-8 px-3 py-1 text-xs">Run code</Button>
                </div>
                <pre className="min-h-72 overflow-auto p-5 text-sm leading-7 text-slate-100">{`function groupBySkill(candidates) {
  return candidates.reduce((groups, candidate) => {
    for (const skill of candidate.skills) {
      groups[skill] = groups[skill] ?? [];
      groups[skill].push(candidate.name);
    }
    return groups;
  }, {});
}`}</pre>
              </div>
            </div>
          </ModuleCard>

          <ModuleCard index={3} title="Work-Style Assessment" status="Ready">
            <div className="grid gap-4 md:grid-cols-2">
              {["How do you handle unclear requirements?", "Describe a time you changed your approach after feedback."].map((question) => (
                <label className="block rounded-[8px] bg-neutral-50 p-4" key={question}>
                  <span className="font-bold">{question}</span>
                  <textarea className="mt-3 min-h-36 w-full rounded-[8px] border border-neutral-200 bg-white p-4 outline-none focus:border-sky-300" placeholder="Answer based on your real experience." />
                </label>
              ))}
            </div>
          </ModuleCard>

          <ModuleCard index={4} title="Leadership Scenario" status="Upcoming">
            <div className="rounded-[8px] bg-neutral-50 p-5">
              <h3 className="font-black">Scenario</h3>
              <p className="mt-3 leading-7 text-neutral-700">
                A release is at risk because two teams disagree on priority. Explain how you would align the group, protect customer impact, and communicate next steps.
              </p>
              <textarea className="mt-4 min-h-44 w-full rounded-[8px] border border-neutral-200 bg-white p-4 outline-none focus:border-sky-300" placeholder="Write your response here." />
            </div>
          </ModuleCard>

          <section className="card p-6">
            <div className="flex flex-wrap items-start justify-between gap-5">
              <div>
                <h2 className="text-2xl font-black">Final submission</h2>
                <p className="mt-3 max-w-3xl leading-7 text-neutral-700">
                  Review your answers before submitting. After final submission, the report workflow can begin for authorized reviewers.
                </p>
              </div>
              <ButtonLink href={`/reports/${sessionId}`}>Preview report</ButtonLink>
            </div>
            <div className="mt-6 rounded-[8px] border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-800">
              Warning before final submission: make sure every module is complete. This action should be confirmed in production.
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button variant="outline">Save progress</Button>
              <Button>Submit assessment</Button>
              <Link className="inline-flex min-h-10 items-center px-2 text-sm font-bold text-neutral-600" href="/dashboard">
                Exit preview
              </Link>
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}

function ModuleCard({ children, index, status, title }: { children: ReactNode; index: number; status: string; title: string }) {
  return (
    <section className="card p-6" id={`module-${index}`}>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="inline-flex size-11 items-center justify-center rounded-full bg-[#2fb2e4] text-lg font-black text-white">{index}</span>
          <h2 className="text-2xl font-black">{title}</h2>
        </div>
        <StatusChip label={status} />
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  );
}
