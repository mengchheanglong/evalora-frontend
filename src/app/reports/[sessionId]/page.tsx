import Link from "next/link";
import { reportSections } from "@/lib/mock-data";

type PageProps = {
  params: Promise<{ sessionId: string }>;
};

export default async function ReportPage({ params }: PageProps) {
  const { sessionId } = await params;

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-8">
      <section className="mx-auto max-w-5xl space-y-8">
        <header className="card p-6">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-indigo-600">Candidate report</p>
          <h1 className="mt-2 text-4xl font-bold text-slate-950">Structured evaluation summary</h1>
          <p className="mt-3 text-slate-600">Session ID: {sessionId}</p>
          <p className="mt-3 rounded-xl bg-amber-50 p-4 text-sm leading-6 text-amber-800">
            AI feedback is advisory and must be reviewed by a human interviewer. Evalora does not make final hiring decisions.
          </p>
        </header>

        <section className="grid gap-4 md:grid-cols-2">
          {reportSections.map((section) => (
            <article key={section} className="card p-5">
              <h2 className="text-lg font-bold text-slate-950">{section}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Placeholder content for {section.toLowerCase()}. Connect this panel to `/api/reports/:sessionId`.
              </p>
            </article>
          ))}
        </section>

        <Link className="inline-flex rounded-full border border-slate-300 px-5 py-3 font-semibold text-slate-800" href="/dashboard">
          Back to dashboard
        </Link>
      </section>
    </main>
  );
}
