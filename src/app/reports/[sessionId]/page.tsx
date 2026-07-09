import { AppShell } from "@/components/app-shell";
import { ButtonLink } from "@/components/button-link";
import { Icon } from "@/components/icons";
import { reviewerNotes, reportSections } from "@/lib/mock-data";

type PageProps = {
  params: Promise<{ sessionId: string }>;
};

export default async function ReportPage({ params }: PageProps) {
  const { sessionId } = await params;

  return (
    <AppShell
      active="reports"
      actions={<ButtonLink href={`/assessment/${sessionId}`} variant="outline">Open Session</ButtonLink>}
      description="Evidence-based candidate report for human reviewers. AI feedback is advisory and does not make final hiring decisions."
      title="Candidate report"
    >
      <section className="grid gap-6 xl:grid-cols-[360px_1fr]">
        <aside className="space-y-6">
          <article className="card p-6">
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-blue-700">Session {sessionId}</p>
            <h2 className="mt-3 text-3xl font-black">Daniel Lee</h2>
            <p className="mt-2 text-neutral-600">Frontend Developer Assessment</p>
            <div className="mt-6 rounded-[8px] bg-[#05084f] p-6 text-white">
              <p className="text-sm font-semibold text-slate-200">Overall score</p>
              <p className="mt-2 text-5xl font-black">4.2/5</p>
              <p className="mt-3 text-sm text-slate-300">Completed July 9, 2026</p>
            </div>
          </article>

          <article className="card p-6">
            <h2 className="text-xl font-black">Reviewer notes</h2>
            <ul className="mt-5 space-y-4">
              {reviewerNotes.map((note) => (
                <li className="flex gap-3 text-sm leading-6 text-neutral-700" key={note}>
                  <span className="mt-1 inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-sky-100 text-blue-700">
                    <Icon name="check" size={14} />
                  </span>
                  {note}
                </li>
              ))}
            </ul>
          </article>
        </aside>

        <div className="space-y-6">
          <section className="rounded-[8px] border border-amber-200 bg-amber-50 p-5 text-amber-800">
            <h2 className="font-black">Advisory notice</h2>
            <p className="mt-2 leading-7">
              AI feedback supports review by a human interviewer. Evalora does not make final hiring decisions and does not diagnose personality, medical, or mental-health traits.
            </p>
          </section>

          <section className="grid gap-5 md:grid-cols-2">
            {reportSections.map((section) => (
              <article className="card p-6" key={section.title}>
                <div className="flex items-start justify-between gap-4">
                  <h2 className="text-xl font-black">{section.title}</h2>
                  <span className="rounded-full bg-sky-50 px-3 py-1 text-sm font-black text-blue-700">{section.score}</span>
                </div>
                <p className="mt-4 leading-7 text-neutral-700">{section.body}</p>
              </article>
            ))}
          </section>

          <section className="card p-6">
            <h2 className="text-xl font-black">Evidence from responses</h2>
            <div className="mt-5 grid gap-4 lg:grid-cols-3">
              {[
                "Explained a performance fix using measurement before and after release.",
                "Described collaboration with design and backend partners during ambiguity.",
                "Outlined a leadership escalation path focused on customer impact.",
              ].map((item) => (
                <blockquote className="rounded-[8px] bg-neutral-50 p-4 text-sm leading-6 text-neutral-700" key={item}>
                  "{item}"
                </blockquote>
              ))}
            </div>
          </section>

          <section className="card p-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-black">Human review</h2>
                <p className="mt-2 text-neutral-600">Add context from interviews, work samples, or team-specific criteria before making a hiring decision.</p>
              </div>
              <ButtonLink href="/dashboard">Back to dashboard</ButtonLink>
            </div>
          </section>
        </div>
      </section>
    </AppShell>
  );
}
