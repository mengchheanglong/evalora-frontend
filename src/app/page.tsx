import Link from "next/link";
import { assessmentModules } from "@/lib/mock-data";

const roles = ["Candidate", "Interviewer", "Organization", "Administrator"];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-slate-50">
      <section className="mx-auto flex max-w-6xl flex-col gap-10 px-6 py-10">
        <nav className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-indigo-600">Evalora</p>
            <h1 className="text-2xl font-bold text-slate-950">AI Candidate Assessment</h1>
          </div>
          <div className="flex gap-3 text-sm font-medium">
            <Link className="rounded-full border border-slate-300 px-4 py-2 text-slate-700" href="/login">
              Login
            </Link>
            <Link className="rounded-full bg-indigo-600 px-4 py-2 text-white" href="/dashboard">
              Dashboard
            </Link>
          </div>
        </nav>

        <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
          <div className="space-y-6">
            <div className="inline-flex rounded-full bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-700">
              Technical + behavioral assessment in one flow
            </div>
            <h2 className="max-w-3xl text-5xl font-bold leading-tight text-slate-950">
              Evaluate candidates with structured AI interviews, coding tasks, rubrics, and reports.
            </h2>
            <p className="max-w-2xl text-lg leading-8 text-slate-600">
              Evalora helps teams create assessment templates, run candidate sessions, collect evidence,
              and generate reviewer-friendly reports. AI feedback is advisory and always reviewable by humans.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link className="rounded-full bg-slate-950 px-5 py-3 font-semibold text-white" href="/assessment/demo-session">
                Preview candidate flow
              </Link>
              <Link className="rounded-full border border-slate-300 px-5 py-3 font-semibold text-slate-800" href="/reports/demo-session">
                View sample report
              </Link>
            </div>
          </div>

          <div className="card p-6">
            <p className="mb-4 text-sm font-semibold uppercase tracking-[0.25em] text-slate-500">Supported users</p>
            <div className="grid gap-3">
              {roles.map((role) => (
                <div key={role} className="rounded-xl bg-slate-100 px-4 py-3 font-semibold text-slate-800">
                  {role}
                </div>
              ))}
            </div>
          </div>
        </div>

        <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {assessmentModules.map((module) => (
            <article key={module.title} className="card p-5">
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-indigo-600">{module.status}</p>
              <h3 className="mt-3 text-lg font-bold text-slate-950">{module.title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{module.description}</p>
            </article>
          ))}
        </section>
      </section>
    </main>
  );
}
