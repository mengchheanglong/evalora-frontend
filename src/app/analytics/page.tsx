import { AppShell } from "@/components/app-shell";
import { Icon } from "@/components/icons";
import { analyticsModules, dashboardStats } from "@/lib/mock-data";

const scoreDistribution = [
  { label: "1", value: 6 },
  { label: "2", value: 12 },
  { label: "3", value: 28 },
  { label: "4", value: 38 },
  { label: "5", value: 16 },
];

const strengths = ["Clear technical explanation", "Ownership examples", "Structured communication", "Collaborative decision-making"];
const improvementAreas = ["Edge-case discussion", "Time management under pressure", "Stakeholder framing"];

export default function AnalyticsPage() {
  return (
    <AppShell
      active="analytics"
      description="High-level signals for assessment health, module performance, and recurring feedback themes."
      title="Analytics"
    >
      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {dashboardStats.map((stat) => (
          <article className="card p-5" key={stat.label}>
            <span className="inline-flex size-11 items-center justify-center rounded-[8px] bg-sky-100 text-blue-700">
              <Icon name={stat.icon} size={24} />
            </span>
            <p className="mt-5 text-sm font-semibold text-neutral-500">{stat.label}</p>
            <p className="mt-2 text-4xl font-black">{stat.value}</p>
          </article>
        ))}
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[1fr_420px]">
        <article className="card p-6">
          <h2 className="text-xl font-black">Module performance</h2>
          <div className="mt-8 space-y-6">
            {analyticsModules.map((module) => (
              <div key={module.label}>
                <div className="mb-2 flex items-center justify-between text-sm font-bold">
                  <span>{module.label}</span>
                  <span>{module.value}%</span>
                </div>
                <div className="h-4 rounded-full bg-neutral-100">
                  <div className="h-4 rounded-full bg-[#2fb2e4]" style={{ width: `${module.value}%` }} />
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="card p-6">
          <h2 className="text-xl font-black">Score distribution</h2>
          <div className="mt-8 flex h-64 items-end gap-4 border-b border-l border-neutral-200 px-4">
            {scoreDistribution.map((bucket) => (
              <div className="flex flex-1 flex-col items-center gap-3" key={bucket.label}>
                <div className="flex h-52 w-full items-end">
                  <span className="w-full rounded-t-[6px] bg-[#75d8c8]" style={{ height: `${bucket.value * 2}%` }} />
                </div>
                <span className="text-sm font-bold">{bucket.label}</span>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="mt-6 grid gap-6 lg:grid-cols-2">
        <article className="card p-6">
          <h2 className="text-xl font-black">Common strengths</h2>
          <div className="mt-5 flex flex-wrap gap-3">
            {strengths.map((item) => (
              <span className="rounded-full bg-emerald-50 px-4 py-2 text-sm font-bold text-emerald-700" key={item}>
                {item}
              </span>
            ))}
          </div>
        </article>

        <article className="card p-6">
          <h2 className="text-xl font-black">Improvement themes</h2>
          <div className="mt-5 flex flex-wrap gap-3">
            {improvementAreas.map((item) => (
              <span className="rounded-full bg-amber-50 px-4 py-2 text-sm font-bold text-amber-700" key={item}>
                {item}
              </span>
            ))}
          </div>
        </article>
      </section>
    </AppShell>
  );
}
