import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { Icon, type IconName } from "@/components/icons";

type SummaryCard = {
  label: string;
  value: string;
  change: string;
  detail: string;
  icon: IconName;
  tone: string;
};

const summaryCards: SummaryCard[] = [
  {
    label: "Total Candidates",
    value: "238",
    change: "+18.4%",
    detail: "vs Apr 1 - Apr 30",
    icon: "users",
    tone: "bg-purple-100 text-purple-600",
  },
  {
    label: "Assessments Completed",
    value: "156",
    change: "+22.1%",
    detail: "vs Apr 1 - Apr 30",
    icon: "check",
    tone: "bg-emerald-100 text-emerald-600",
  },
  {
    label: "Interview Sessions",
    value: "156",
    change: "+16.7%",
    detail: "vs Apr 1 - Apr 30",
    icon: "calendar",
    tone: "bg-sky-100 text-sky-600",
  },
  {
    label: "Avg. Score",
    value: "72%",
    change: "+5.6%",
    detail: "vs Apr 1 - Apr 30",
    icon: "star",
    tone: "bg-orange-100 text-orange-500",
  },
  {
    label: "In Assessment",
    value: "41",
    change: "+8.1%",
    detail: "vs Apr 1 - Apr 30",
    icon: "clock",
    tone: "bg-amber-100 text-amber-600",
  },
  {
    label: "Needs Review",
    value: "18",
    change: "-3.2%",
    detail: "reports awaiting notes",
    icon: "report",
    tone: "bg-rose-100 text-rose-600",
  },
];

const trendPoints = [
  { day: "May 1", invited: 50, completed: 28, sessions: 18 },
  { day: "May 8", invited: 66, completed: 36, sessions: 24 },
  { day: "May 15", invited: 78, completed: 47, sessions: 29 },
  { day: "May 22", invited: 82, completed: 52, sessions: 34 },
  { day: "May 29", invited: 94, completed: 61, sessions: 38 },
];

const statusBreakdown = [
  { label: "Completed", value: 156, percent: "65.5%", color: "bg-primary-700" },
  { label: "In Assessment", value: 41, percent: "17.2%", color: "bg-sky-500" },
  { label: "Invited", value: 28, percent: "11.8%", color: "bg-orange-400" },
  { label: "Needs Review", value: 13, percent: "5.5%", color: "bg-rose-500" },
];

const modulePerformance = [
  { label: "AI Interview", value: 78, color: "bg-primary-700" },
  { label: "Coding", value: 75, color: "bg-sky-500" },
  { label: "Problem Solving", value: 72, color: "bg-indigo-500" },
  { label: "Behavioral", value: 68, color: "bg-emerald-500" },
  { label: "Leadership", value: 64, color: "bg-amber-500" },
];

const scoreTrend = [62, 68, 64, 74, 76, 70, 71, 69, 73, 82];

const funnelSteps = [
  { label: "Invited", value: 238, percent: 100, color: "bg-primary-700" },
  { label: "Started", value: 197, percent: 83, color: "bg-sky-500" },
  { label: "Completed", value: 156, percent: 66, color: "bg-emerald-500" },
  { label: "Report Ready", value: 149, percent: 63, color: "bg-violet-500" },
  { label: "Reviewed", value: 118, percent: 50, color: "bg-amber-500" },
];

const templatePerformance = [
  {
    template: "Software Engineer Assessment",
    modules: "AI interview, coding, behavioral",
    sessions: 82,
    completion: "68%",
    avgScore: "75%",
    status: "Strong signal",
    tone: "bg-emerald-50 text-emerald-700",
  },
  {
    template: "HR Generalist Assessment",
    modules: "Communication, work-style, scenario",
    sessions: 61,
    completion: "72%",
    avgScore: "71%",
    status: "Healthy",
    tone: "bg-sky-50 text-sky-700",
  },
  {
    template: "Team Leader Assessment",
    modules: "Leadership, judgment, communication",
    sessions: 44,
    completion: "59%",
    avgScore: "69%",
    status: "Review drop-off",
    tone: "bg-amber-50 text-amber-700",
  },
];

const recentCompleted = [
  { name: "David Lee", position: "Frontend Developer", score: "92%", assessment: "Software Engineer", completed: "May 28, 2026" },
  { name: "Michael Chen", position: "Data Scientist", score: "88%", assessment: "Software Engineer", completed: "May 27, 2026" },
  { name: "Olivia Smith", position: "Product Manager", score: "81%", assessment: "Team Leader", completed: "May 27, 2026" },
  { name: "James Brown", position: "Full Stack Developer", score: "80%", assessment: "Software Engineer", completed: "May 26, 2026" },
  { name: "Emma Johnson", position: "Backend Developer", score: "79%", assessment: "Software Engineer", completed: "May 26, 2026" },
];

const activityOverview = [
  { label: "Interview sessions conducted", value: "156", change: "+16.7%", icon: "calendar" as const, tone: "bg-sky-100 text-sky-600" },
  { label: "Assessments completed", value: "156", change: "+22.1%", icon: "check" as const, tone: "bg-emerald-100 text-emerald-600" },
  { label: "Reports generated", value: "149", change: "+19.4%", icon: "report" as const, tone: "bg-violet-100 text-violet-600" },
  { label: "Sessions awaiting reviewer notes", value: "18", change: "-3.2%", icon: "message" as const, tone: "bg-rose-100 text-rose-600" },
];

export default function AnalyticsPage() {
  return (
    <AppShell
      active="analytics"
      actions={
        <div className="hidden items-center gap-3 lg:flex">
          <button className="inline-flex h-[38px] items-center gap-2 whitespace-nowrap rounded-[6px] border border-neutral-200 bg-white px-3 text-[13px] font-semibold text-neutral-700 shadow-sm transition hover:bg-neutral-50" type="button">
            <Icon name="calendar" size={16} /> May 2026
            <Icon className="text-neutral-400" name="chevron" size={14} />
          </button>
          <button className="inline-flex h-[38px] items-center gap-2 whitespace-nowrap rounded-[6px] border border-neutral-200 bg-white px-3 text-[13px] font-semibold text-neutral-700 shadow-sm transition hover:bg-neutral-50" type="button">
            <Icon name="file" size={16} /> Export
          </button>
        </div>
      }
      description="Track assessment completion, report readiness, module performance, and reviewer follow-up across your hiring process."
      title="Analytics"
    >
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
        {summaryCards.map((card) => (
          <article className="card p-3" key={card.label}>
            <div className="flex items-start gap-2.5">
              <span className={`inline-flex size-8 shrink-0 items-center justify-center rounded-[8px] ${card.tone}`}>
                <Icon name={card.icon} size={16} />
              </span>
              <div className="min-w-0">
                <p className="min-h-[28px] text-[11px] font-bold leading-[14px] text-neutral-900">{card.label}</p>
                <p className="mt-1 text-[24px] font-black leading-none tracking-tight text-neutral-950">{card.value}</p>
                <p className="mt-2 text-[10px] font-bold leading-[13px] text-emerald-600">
                  {card.change} <span className="font-medium text-neutral-500">{card.detail}</span>
                </p>
              </div>
            </div>
          </article>
        ))}
      </section>

      <section className="mt-5 grid gap-5 lg:grid-cols-[1.35fr_0.9fr_1fr]">
        <ChartCard title="Candidates Over Time" action="Daily">
          <TrendChart />
        </ChartCard>

        <article className="card p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-[15px] font-bold text-neutral-950">Assessment Completion Rate</h2>
          </div>
          <div className="mt-6 flex items-center justify-center gap-7">
            <Donut percent={65.5} />
            <div className="space-y-5">
              <MetricLine label="Completed" value="156" />
              <MetricLine label="Total Assigned" value="238" />
              <span className="inline-flex rounded bg-emerald-50 px-2 py-1 text-[11px] font-bold text-emerald-700">+22.1% vs Apr</span>
            </div>
          </div>
        </article>

        <article className="card p-5">
          <h2 className="text-[15px] font-bold text-neutral-950">Candidates by Status</h2>
          <div className="mt-5 grid items-center gap-5 sm:grid-cols-[150px_1fr] lg:grid-cols-1 2xl:grid-cols-[150px_1fr]">
            <StatusDonut />
            <div className="space-y-3">
              {statusBreakdown.map((item) => (
                <div className="flex items-center justify-between gap-3 text-[12px]" key={item.label}>
                  <span className="flex items-center gap-2 font-semibold text-neutral-700">
                    <span className={`size-2.5 rounded-full ${item.color}`} /> {item.label}
                  </span>
                  <span className="font-bold text-neutral-950">{item.value} <span className="font-medium text-neutral-500">({item.percent})</span></span>
                </div>
              ))}
            </div>
          </div>
        </article>
      </section>

      <section className="mt-5 grid gap-5 lg:grid-cols-[1fr_1fr_1fr]">
        <ChartCard title="Average Score Trend" action="Weekly">
          <ScoreChart />
        </ChartCard>

        <article className="card p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-[15px] font-bold text-neutral-950">Module Performance</h2>
            <Link className="text-[12px] font-bold text-primary-700 hover:underline" href="/reports/demo-session">View report</Link>
          </div>
          <div className="mt-6 space-y-4">
            {modulePerformance.map((module) => (
              <div key={module.label}>
                <div className="mb-2 flex items-center justify-between text-[12px] font-bold text-neutral-700">
                  <span>{module.label}</span>
                  <span>{module.value}%</span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-neutral-100">
                  <div className={`h-full rounded-full ${module.color}`} style={{ width: `${module.value}%` }} />
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="card p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-[15px] font-bold text-neutral-950">Candidate Funnel</h2>
            <Link className="text-[12px] font-bold text-primary-700 hover:underline" href="/candidates">View all</Link>
          </div>
          <div className="mt-6 space-y-4">
            {funnelSteps.map((step) => (
              <div key={step.label}>
                <div className="mb-2 flex items-center justify-between text-[12px]">
                  <span className="font-bold text-neutral-800">{step.label}</span>
                  <span className="font-bold text-neutral-950">{step.value}</span>
                </div>
                <div className="h-8 overflow-hidden rounded-[6px] bg-neutral-100">
                  <div className={`flex h-full items-center justify-end rounded-[6px] pr-3 text-[11px] font-bold text-white ${step.color}`} style={{ width: `${step.percent}%` }}>
                    {step.percent}%
                  </div>
                </div>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="mt-5 grid gap-5 xl:grid-cols-[1.35fr_0.85fr]">
        <article className="card overflow-hidden">
          <div className="flex items-center justify-between border-b border-neutral-200 px-5 py-4">
            <div>
              <h2 className="text-[15px] font-bold text-neutral-950">Recent Completed Assessments</h2>
              <p className="mt-1 text-[12px] text-neutral-500">AI scores are advisory signals for reviewer follow-up, not final hiring decisions.</p>
            </div>
            <Link className="text-[12px] font-bold text-primary-700 hover:underline" href="/candidates">View all</Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-[13px]">
              <thead>
                <tr className="border-b border-neutral-200 bg-neutral-50/60 text-[12px] text-neutral-500">
                  <th className="px-5 py-3 font-semibold">#</th>
                  <th className="px-4 py-3 font-semibold">Candidate</th>
                  <th className="px-4 py-3 font-semibold">Position</th>
                  <th className="px-4 py-3 font-semibold">Advisory Score</th>
                  <th className="px-4 py-3 font-semibold">Assessment</th>
                  <th className="px-5 py-3 text-right font-semibold">Completed On</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {recentCompleted.map((candidate, index) => (
                  <tr className="transition hover:bg-neutral-50" key={candidate.name}>
                    <td className="px-5 py-3 font-bold text-neutral-500">{index + 1}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <span className="flex size-8 items-center justify-center rounded-full bg-primary-100 text-[11px] font-black text-primary-700">
                          {candidate.name.split(" ").map((name) => name[0]).join("")}
                        </span>
                        <span className="font-bold text-neutral-950">{candidate.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-medium text-neutral-600">{candidate.position}</td>
                    <td className="px-4 py-3">
                      <span className="rounded bg-emerald-50 px-2 py-1 text-[11px] font-black text-emerald-700">{candidate.score}</span>
                    </td>
                    <td className="px-4 py-3 font-medium text-neutral-600">{candidate.assessment}</td>
                    <td className="px-5 py-3 text-right font-medium text-neutral-500">{candidate.completed}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>

        <article className="card p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-[15px] font-bold text-neutral-950">Recent Activity Overview</h2>
            <Link className="text-[12px] font-bold text-primary-700 hover:underline" href="/dashboard">View dashboard</Link>
          </div>
          <div className="mt-5 space-y-4">
            {activityOverview.map((item) => (
              <div className="flex items-center gap-3" key={item.label}>
                <span className={`flex size-9 shrink-0 items-center justify-center rounded-[8px] ${item.tone}`}>
                  <Icon name={item.icon} size={17} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-bold text-neutral-900">{item.label}</p>
                  <p className="mt-0.5 text-[11px] font-semibold text-emerald-600">{item.change} <span className="font-medium text-neutral-500">vs Apr</span></p>
                </div>
                <span className="text-[15px] font-black text-neutral-950">{item.value}</span>
              </div>
            ))}
          </div>
          <div className="mt-5 rounded-[8px] bg-primary-50 p-4">
            <p className="flex items-center gap-2 text-[13px] font-black text-neutral-950">
              <Icon className="text-primary-700" name="sparkle" size={16} /> Reviewer insight
            </p>
            <p className="mt-2 text-[12px] leading-relaxed text-neutral-600">
              Coding and leadership modules have the largest review gap this month. Prioritize reviewer notes before comparing candidates.
            </p>
          </div>
        </article>
      </section>

      <section className="mt-5">
        <article className="card overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-200 px-5 py-4">
            <div>
              <h2 className="text-[15px] font-bold text-neutral-950">Assessment Template Performance</h2>
              <p className="mt-1 text-[12px] text-neutral-500">Backend-aligned summary from sessions, reports, and module evaluations.</p>
            </div>
            <Link className="text-[12px] font-bold text-primary-700 hover:underline" href="/templates">Manage templates</Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-[13px]">
              <thead>
                <tr className="border-b border-neutral-200 bg-neutral-50/60 text-[12px] text-neutral-500">
                  <th className="px-5 py-3 font-semibold">Template</th>
                  <th className="px-4 py-3 font-semibold">Modules</th>
                  <th className="px-4 py-3 font-semibold">Sessions</th>
                  <th className="px-4 py-3 font-semibold">Completion</th>
                  <th className="px-4 py-3 font-semibold">Avg. Score</th>
                  <th className="px-5 py-3 text-right font-semibold">Signal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {templatePerformance.map((template) => (
                  <tr className="transition hover:bg-neutral-50" key={template.template}>
                    <td className="px-5 py-4 font-bold text-neutral-950">{template.template}</td>
                    <td className="px-4 py-4 text-neutral-600">{template.modules}</td>
                    <td className="px-4 py-4 font-bold text-neutral-950">{template.sessions}</td>
                    <td className="px-4 py-4 font-bold text-neutral-950">{template.completion}</td>
                    <td className="px-4 py-4 font-bold text-neutral-950">{template.avgScore}</td>
                    <td className="px-5 py-4 text-right">
                      <span className={`rounded px-2 py-1 text-[11px] font-black ${template.tone}`}>{template.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>
      </section>
    </AppShell>
  );
}

function ChartCard({ title, action, children }: { title: string; action: string; children: React.ReactNode }) {
  return (
    <article className="card p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-[15px] font-bold text-neutral-950">{title}</h2>
        <button className="inline-flex h-8 items-center gap-2 rounded-[6px] border border-neutral-200 bg-white px-3 text-[12px] font-semibold text-neutral-700" type="button">
          {action} <Icon className="text-neutral-400" name="chevron" size={13} />
        </button>
      </div>
      {children}
    </article>
  );
}

function TrendChart() {
  return (
    <div className="mt-5 h-[210px]">
      <div className="flex h-full gap-3">
        <div className="flex w-8 flex-col justify-between pb-7 text-[10px] font-medium text-neutral-400">
          <span>100</span><span>80</span><span>60</span><span>40</span><span>20</span>
        </div>
        <div className="relative flex-1 border-b border-l border-neutral-100">
          <div className="absolute inset-0 flex flex-col justify-between pb-7">
            {Array.from({ length: 5 }).map((_, index) => <span className="border-t border-neutral-100" key={index} />)}
          </div>
          <svg className="absolute inset-0 h-[calc(100%-28px)] w-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 420 160">
            <path d="M0 120 C55 108 70 86 105 82 C150 77 160 62 210 58 C260 55 280 50 315 48 C360 43 380 30 420 28" fill="none" stroke="#6d28d9" strokeLinecap="round" strokeWidth="3" />
            <path d="M0 142 C60 128 86 121 120 112 C170 99 208 99 245 88 C302 78 354 72 420 70" fill="none" stroke="#10b981" strokeLinecap="round" strokeWidth="3" />
            <path d="M0 152 C70 147 92 135 140 132 C190 125 225 120 270 116 C320 108 365 106 420 100" fill="none" stroke="#f59e0b" strokeLinecap="round" strokeWidth="3" />
          </svg>
          <div className="absolute bottom-0 left-0 right-0 flex justify-between text-[10px] font-medium text-neutral-400">
            {trendPoints.map((point) => <span key={point.day}>{point.day}</span>)}
          </div>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-4 pl-11 text-[11px] font-semibold text-neutral-600">
        <Legend color="bg-primary-700" label="Total candidates" />
        <Legend color="bg-emerald-500" label="Completed assessments" />
        <Legend color="bg-amber-500" label="Interview sessions" />
      </div>
    </div>
  );
}

function ScoreChart() {
  return (
    <div className="mt-5 h-[210px]">
      <div className="relative h-[172px] border-b border-l border-neutral-100">
        <div className="absolute inset-0 flex flex-col justify-between">
          {Array.from({ length: 5 }).map((_, index) => <span className="border-t border-neutral-100" key={index} />)}
        </div>
        <svg className="absolute inset-0 h-full w-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 400 160">
          <defs>
            <linearGradient id="scoreFill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#6d28d9" stopOpacity="0.18" />
              <stop offset="100%" stopColor="#6d28d9" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d="M0 92 C35 78 50 90 80 82 C120 70 140 52 180 54 C220 56 235 76 270 70 C310 66 340 78 400 45 L400 160 L0 160 Z" fill="url(#scoreFill)" />
          <path d="M0 92 C35 78 50 90 80 82 C120 70 140 52 180 54 C220 56 235 76 270 70 C310 66 340 78 400 45" fill="none" stroke="#6d28d9" strokeLinecap="round" strokeWidth="3" />
          {scoreTrend.map((point, index) => (
            <circle cx={(index / (scoreTrend.length - 1)) * 400} cy={160 - point * 1.45} fill="white" key={index} r="3" stroke="#6d28d9" strokeWidth="2" />
          ))}
        </svg>
      </div>
      <div className="mt-3 flex justify-between text-[10px] font-medium text-neutral-400">
        <span>May 1</span><span>May 8</span><span>May 15</span><span>May 22</span><span>May 29</span>
      </div>
    </div>
  );
}

function Donut({ percent }: { percent: number }) {
  return (
    <div
      className="relative flex size-[150px] shrink-0 items-center justify-center rounded-full"
      style={{ background: `conic-gradient(#6d28d9 ${percent * 3.6}deg, #eef2ff 0deg)` }}
    >
      <div className="flex size-[104px] flex-col items-center justify-center rounded-full bg-white text-center shadow-inner">
        <span className="text-[28px] font-black leading-none text-neutral-950">{percent}%</span>
        <span className="mt-1 text-[11px] font-bold text-neutral-500">Completion Rate</span>
      </div>
    </div>
  );
}

function StatusDonut() {
  return (
    <div
      className="relative mx-auto flex size-[148px] items-center justify-center rounded-full"
      style={{ background: "conic-gradient(#005cff 0deg 236deg, #0ea5e9 236deg 298deg, #fb923c 298deg 340deg, #f43f5e 340deg 360deg)" }}
    >
      <div className="flex size-[92px] flex-col items-center justify-center rounded-full bg-white text-center shadow-inner">
        <span className="text-[26px] font-black leading-none text-neutral-950">238</span>
        <span className="mt-1 text-[11px] font-bold text-neutral-500">Total</span>
      </div>
    </div>
  );
}

function MetricLine({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[26px] font-black leading-none text-neutral-950">{value}</p>
      <p className="mt-1 text-[12px] font-semibold text-neutral-500">{label}</p>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span className={`size-2 rounded-full ${color}`} /> {label}
    </span>
  );
}
