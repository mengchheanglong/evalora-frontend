import Link from "next/link";
import { assessmentModules } from "@/lib/mock-data";

type PageProps = {
  params: Promise<{ sessionId: string }>;
};

export default async function AssessmentPage({ params }: PageProps) {
  const { sessionId } = await params;

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-8">
      <section className="mx-auto max-w-5xl space-y-8">
        <header className="card p-6">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-indigo-600">Candidate session</p>
          <h1 className="mt-2 text-4xl font-bold text-slate-950">Assessment flow</h1>
          <p className="mt-3 text-slate-600">Session ID: {sessionId}</p>
          <p className="mt-2 text-sm text-slate-500">
            This page is a UX scaffold. Connect it to session, response, AI, and code APIs during implementation.
          </p>
        </header>

        <section className="grid gap-4 md:grid-cols-2">
          {assessmentModules.map((module, index) => (
            <article key={module.title} className="card p-5">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-xl font-bold text-slate-950">{index + 1}. {module.title}</h2>
                <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700">{module.status}</span>
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-600">{module.description}</p>
              <textarea
                className="mt-4 min-h-28 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm"
                placeholder="Candidate response area placeholder"
              />
            </article>
          ))}
        </section>

        <section className="card p-6">
          <h2 className="text-xl font-bold text-slate-950">Submission rules</h2>
          <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-6 text-slate-600">
            <li>Autosave progress before moving between modules.</li>
            <li>Show AI/code loading states and fallback messages.</li>
            <li>Warn candidates before final submission.</li>
            <li>After completion, generate the report for authorized reviewers.</li>
          </ul>
          <Link className="mt-6 inline-flex rounded-full bg-indigo-600 px-5 py-3 font-semibold text-white" href={`/reports/${sessionId}`}>
            Preview report
          </Link>
        </section>
      </section>
    </main>
  );
}
