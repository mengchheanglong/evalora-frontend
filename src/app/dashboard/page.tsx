import Link from "next/link";
import { dashboardStats } from "@/lib/mock-data";

const recentActivity = [
  "Software Engineer Assessment completed by candidate A.",
  "Project Manager template updated.",
  "Coding assessment submission received.",
  "Candidate report generated for demo session.",
];

export default function DashboardPage() {
  return (
    <main className="min-h-screen bg-slate-50 px-6 py-8">
      <section className="mx-auto max-w-6xl space-y-8">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-indigo-600">Organization dashboard</p>
            <h1 className="text-4xl font-bold text-slate-950">Assessment overview</h1>
          </div>
          <Link className="rounded-full bg-slate-950 px-5 py-3 font-semibold text-white" href="/assessment/demo-session">
            Open candidate preview
          </Link>
        </header>

        <section className="grid gap-4 md:grid-cols-4">
          {dashboardStats.map((stat) => (
            <article key={stat.label} className="card p-5">
              <p className="text-sm text-slate-500">{stat.label}</p>
              <p className="mt-2 text-3xl font-bold text-slate-950">{stat.value}</p>
            </article>
          ))}
        </section>

        <section className="grid gap-6 lg:grid-cols-[0.7fr_0.3fr]">
          <article className="card p-6">
            <h2 className="text-xl font-bold text-slate-950">Module performance</h2>
            <div className="mt-6 space-y-4">
              {["Technical", "Communication", "Leadership", "Work style"].map((item, index) => (
                <div key={item}>
                  <div className="mb-2 flex justify-between text-sm font-semibold text-slate-700">
                    <span>{item}</span>
                    <span>{82 - index * 7}%</span>
                  </div>
                  <div className="h-3 rounded-full bg-slate-200">
                    <div className="h-3 rounded-full bg-indigo-600" style={{ width: `${82 - index * 7}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </article>

          <article className="card p-6">
            <h2 className="text-xl font-bold text-slate-950">Recent activity</h2>
            <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-600">
              {recentActivity.map((item) => (
                <li key={item} className="rounded-xl bg-slate-100 p-3">{item}</li>
              ))}
            </ul>
          </article>
        </section>
      </section>
    </main>
  );
}
