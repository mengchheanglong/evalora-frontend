"use client";

import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { Icon, type IconName } from "@/components/icons";

type KpiTone = "violet" | "emerald" | "sky" | "amber" | "rose";

const kpis: Array<{
  label: string;
  value: string;
  detail: string;
  trend: string;
  positive: boolean;
  icon: IconName;
  tone: KpiTone;
}> = [
  { label: "Total Candidates", value: "1,256", detail: "All time", trend: "+12.4% vs last 30 days", positive: true, icon: "user", tone: "violet" },
  { label: "Completed Assessments", value: "876", detail: "69.7% of total", trend: "+15.3% vs last 30 days", positive: true, icon: "check", tone: "emerald" },
  { label: "In Assessment", value: "238", detail: "18.9% of total", trend: "-4.1% vs last 30 days", positive: false, icon: "clock", tone: "sky" },
  { label: "Average Score", value: "76%", detail: "Across completed", trend: "+6.7% vs last 30 days", positive: true, icon: "file", tone: "amber" },
  { label: "Withdrawn / Rejected", value: "148", detail: "11.8% of total", trend: "-2.3% vs last 30 days", positive: false, icon: "shield", tone: "rose" },
];

const statusData = [
  { label: "Completed", value: 876, percent: "69.7%", color: "#2fc49a" },
  { label: "In Assessment", value: 238, percent: "18.9%", color: "#3b82f6" },
  { label: "Not Started", value: 102, percent: "8.1%", color: "#fb923c" },
  { label: "Withdrawn / Rejected", value: 148, percent: "11.8%", color: "#ec5b91" },
];

const departments = [
  { label: "Engineering", value: 520 },
  { label: "Product", value: 312 },
  { label: "Design", value: 184 },
  { label: "Marketing", value: 116 },
  { label: "Data Science", value: 74 },
  { label: "HR", value: 50 },
];

const topAssessments = [
  { assessment: "Product Manager Assessment", completed: 132, average: "84%" },
  { assessment: "Software Engineer Assessment", completed: 320, average: "81%" },
  { assessment: "Frontend Developer Assessment", completed: 186, average: "78%" },
  { assessment: "HR Generalist Assessment", completed: 98, average: "75%" },
  { assessment: "Data Scientist Assessment", completed: 62, average: "72%" },
];

const scoreDistribution = [
  { label: "0-20%", value: 28 },
  { label: "21-40%", value: 82 },
  { label: "41-60%", value: 214 },
  { label: "61-80%", value: 412 },
  { label: "81-100%", value: 520 },
];

const recentActivity = [
  { name: "Emma Johnson", action: "completed", assessment: "Software Engineer Assessment", time: "2m ago" },
  { name: "Daniel Lee", action: "completed", assessment: "Product Manager Assessment", time: "15m ago" },
  { name: "Sofia Williams", action: "started", assessment: "HR Generalist Assessment", time: "1h ago" },
  { name: "Noah Kim", action: "was added to", assessment: "UI/UX Designer Assessment", time: "2h ago" },
];

export default function AnalyticsPage() {
  return (
    <AppShell
      active="analytics"
      actions={<AnalyticsActions />}
      description="Track assessment performance and hiring insights across your organization."
      title="Analytics"
    >
      <div className="space-y-5">
        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {kpis.map((kpi) => <KpiCard key={kpi.label} {...kpi} />)}
        </section>

        <section className="grid gap-5 xl:grid-cols-[1.45fr_1fr_1fr]">
          <ChartCard
            action={
              <select aria-label="Candidates over time interval" className="h-9 rounded-[7px] border border-gray-200 bg-white px-3 text-[12px] font-semibold text-gray-700 outline-none">
                <option>Daily</option>
              </select>
            }
            className="xl:min-h-[340px]"
            title="Candidates Over Time"
          >
            <LineChart />
          </ChartCard>
          <ChartCard className="xl:min-h-[340px]" title="Assessments by Status">
            <DonutChart />
          </ChartCard>
          <ChartCard className="xl:min-h-[340px]" title="Assessments by Department">
            <DepartmentBars />
          </ChartCard>
        </section>

        <section className="grid items-start gap-5 xl:grid-cols-[1.18fr_0.86fr_0.94fr]">
          <ChartCard className="xl:h-[430px]" title="Top Performing Assessments">
            <TopAssessmentsTable />
          </ChartCard>
          <ChartCard className="xl:h-[430px]" title="Score Distribution">
            <ScoreBars />
          </ChartCard>
          <ChartCard className="xl:h-[430px]" title="Recent Activity">
            <RecentActivity />
          </ChartCard>
        </section>
      </div>
    </AppShell>
  );
}

function AnalyticsActions() {
  return (
    <div className="hidden items-center gap-3 sm:flex">
      <button className="flex h-10 items-center justify-center gap-2 whitespace-nowrap rounded-[8px] border border-gray-200 bg-white px-3.5 text-[12px] font-bold text-gray-800 transition hover:bg-gray-50" type="button">
        <Icon name="file" size={15} />
        Export Report
      </button>
      <button className="flex h-10 items-center justify-center gap-2 whitespace-nowrap rounded-[8px] border border-gray-200 bg-white px-3.5 text-[12px] font-bold text-gray-800 transition hover:bg-gray-50" type="button">
        <Icon name="calendar" size={15} />
        <span>May 11, 2026 - Jun 10, 2026</span>
        <Icon className="text-gray-400" name="chevron" size={13} />
      </button>
    </div>
  );
}

function KpiCard({ label, value, detail, trend, positive, icon, tone }: (typeof kpis)[number]) {
  const tones: Record<KpiTone, string> = {
    violet: "bg-violet-100 text-violet-700",
    emerald: "bg-emerald-100 text-emerald-700",
    sky: "bg-sky-100 text-sky-700",
    amber: "bg-amber-100 text-amber-700",
    rose: "bg-rose-100 text-rose-700",
  };

  return (
    <article className="rounded-[10px] border border-gray-200 bg-white px-4 py-4 shadow-[0_10px_28px_rgba(15,23,42,0.04)]">
      <div className="flex items-start gap-3">
        <span className={`flex size-10 shrink-0 items-center justify-center rounded-[9px] ${tones[tone]}`}>
          <Icon name={icon} size={19} />
        </span>
        <div className="min-w-0">
          <p className="text-[11px] font-bold text-gray-800">{label}</p>
          <p className="mt-1 text-[24px] font-black leading-none text-black">{value}</p>
          <p className="mt-2 text-[10px] font-semibold text-gray-500">{detail}</p>
          <p className={`mt-2 text-[9px] font-bold ${positive ? "text-emerald-600" : "text-rose-600"}`}>
            <span aria-hidden="true">{positive ? "▲" : "▼"}</span> {trend}
          </p>
        </div>
      </div>
    </article>
  );
}

function ChartCard({ title, action, className = "", children }: { title: string; action?: React.ReactNode; className?: string; children: React.ReactNode }) {
  return (
    <article className={`flex flex-col rounded-xl border border-gray-200 bg-white p-5 shadow-[0_12px_32px_rgba(15,23,42,0.035)] ${className}`}>
      <div className="mb-5 flex items-center justify-between gap-3">
        <h2 className="text-[14px] font-black text-gray-950">{title}</h2>
        {action}
      </div>
      <div className="min-h-0 flex-1">{children}</div>
    </article>
  );
}

function LineChart() {
  const points = "0,150 30,105 58,125 88,108 118,138 148,145 178,118 208,98 238,105 268,130 298,88 328,70 358,32 388,95 418,118 448,78 478,88 508,63";
  return (
    <div className="h-[250px]">
      <svg className="h-full w-full overflow-visible" viewBox="0 0 560 250" role="img" aria-label="Candidates over time line chart">
        <defs>
          <linearGradient id="analytics-line-fill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        {[20, 62, 104, 146, 188, 230].map((y, index) => (
          <g key={y}>
            <line stroke="#e5e7eb" strokeWidth="1" x1="42" x2="538" y1={y} y2={y} />
            <text fill="#6b7280" fontSize="11" x="10" y={y + 4}>{100 - index * 20}</text>
          </g>
        ))}
        <path d={`M42,230 L42,150 L${points} L538,63 L538,230 Z`} fill="url(#analytics-line-fill)" transform="translate(42 0)" />
        <polyline fill="none" points={points} stroke="#2477ff" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" transform="translate(42 0)" />
        {["May 11", "May 18", "May 25", "Jun 1", "Jun 8", "Jun 10"].map((label, index) => (
          <text fill="#4b5563" fontSize="11" key={label} textAnchor={index === 5 ? "end" : "middle"} x={[42, 140, 238, 336, 434, 538][index]} y="248">{label}</text>
        ))}
      </svg>
    </div>
  );
}

function DonutChart() {
  return (
    <div className="grid min-h-[245px] items-center gap-5 sm:grid-cols-[132px_1fr] xl:grid-cols-1 2xl:grid-cols-[132px_1fr]">
      <div
        aria-label="Assessments by status donut chart"
        className="mx-auto size-[132px] rounded-full"
        role="img"
        style={{ background: "conic-gradient(#2fc49a 0 69.7%, #3b82f6 69.7% 88.6%, #fb923c 88.6% 96.7%, #ec5b91 96.7% 100%)" }}
      >
        <div className="grid size-full place-items-center rounded-full p-[26px]">
          <div className="size-full rounded-full bg-white" />
        </div>
      </div>
      <div className="space-y-4">
        {statusData.map((item) => (
          <div className="grid grid-cols-[1fr_auto] items-center gap-3 text-[11px]" key={item.label}>
            <span className="flex items-center gap-2 font-semibold text-gray-700">
              <span className="size-2.5 rounded-full" style={{ backgroundColor: item.color }} />
              {item.label}
            </span>
            <span className="font-medium text-gray-500">{item.value} ({item.percent})</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function DepartmentBars() {
  const max = Math.max(...departments.map((item) => item.value));
  return (
    <div className="space-y-5 pt-2">
      {departments.map((item) => (
        <div className="grid grid-cols-[86px_1fr_36px] items-center gap-3 text-[11px]" key={item.label}>
          <span className="text-right font-medium text-gray-700">{item.label}</span>
          <div className="h-3 overflow-hidden rounded bg-gray-100">
            <div className="h-full rounded bg-gradient-to-r from-blue-400 to-violet-400" style={{ width: `${(item.value / max) * 100}%` }} />
          </div>
          <span className="font-black text-gray-900">{item.value}</span>
        </div>
      ))}
      <div className="grid grid-cols-[86px_1fr_36px] text-[11px] text-gray-500">
        <span />
        <div className="flex justify-between pt-4">
          <span>0</span>
          <span>200</span>
          <span>400</span>
          <span>600</span>
        </div>
      </div>
    </div>
  );
}

function TopAssessmentsTable() {
  return (
    <div className="flex h-full flex-col">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[440px] text-left text-[12px]">
          <thead className="border-b border-gray-200 text-[11px] font-bold text-gray-500">
            <tr>
              <th className="pb-3">Assessment</th>
              <th className="pb-3 text-center">Completed</th>
              <th className="pb-3 text-right">Average Score</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {topAssessments.map((row) => (
              <tr key={row.assessment}>
                <td className="py-3 font-semibold text-gray-800">{row.assessment}</td>
                <td className="py-3 text-center font-bold text-gray-700">{row.completed}</td>
                <td className="py-3 text-right font-black text-gray-900">{row.average}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Link className="mt-auto pt-5 text-[12px] font-black text-blue-600 hover:text-blue-700" href="/templates">View all assessments</Link>
    </div>
  );
}

function ScoreBars() {
  const max = Math.max(...scoreDistribution.map((item) => item.value));
  return (
    <div className="flex h-full max-h-[320px] items-end gap-4 border-b border-gray-200 px-2 pt-4">
      {scoreDistribution.map((item, index) => (
        <div className="flex h-full flex-1 flex-col justify-end" key={item.label}>
          <div className="flex flex-1 items-end justify-center">
            <div
              className={`relative w-full max-w-[58px] rounded-t-[5px] ${index === scoreDistribution.length - 1 ? "bg-violet-600" : "bg-violet-200"}`}
              style={{ height: `${Math.max(14, (item.value / max) * 100)}%` }}
            >
              <span className={`absolute -top-6 left-1/2 -translate-x-1/2 text-[11px] font-black ${index === scoreDistribution.length - 1 ? "text-violet-700" : "text-gray-700"}`}>{item.value}</span>
            </div>
          </div>
          <p className="py-3 text-center text-[11px] font-semibold text-gray-600">{item.label}</p>
        </div>
      ))}
    </div>
  );
}

function RecentActivity() {
  return (
    <div className="flex h-full flex-col">
      <div className="space-y-3">
        {recentActivity.map((item, index) => (
          <div className="grid grid-cols-[34px_1fr_auto] items-start gap-3 rounded-[9px] py-1.5 transition hover:bg-gray-50" key={`${item.name}-${item.time}`}>
            <span className={`flex size-8 items-center justify-center rounded-full text-[10px] font-black text-white ${avatarColor(index)}`}>{initials(item.name)}</span>
            <p className="min-w-0 text-[12px] leading-[18px] text-gray-600">
              <span className="font-black text-gray-950">{item.name}</span> <span>{item.action}</span>
              <span className="block font-medium text-gray-700">{item.assessment}</span>
            </p>
            <span className="whitespace-nowrap text-[11px] font-medium text-gray-500">{item.time}</span>
          </div>
        ))}
      </div>
      <Link className="mt-auto pt-5 text-[12px] font-black text-blue-600 hover:text-blue-700" href="/assessment">View all activity</Link>
    </div>
  );
}

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "EV";
}

function avatarColor(index: number) {
  return ["bg-[#e26d8e]", "bg-[#f59e66]", "bg-[#111827]", "bg-[#60a5fa]", "bg-[#0f766e]"][index % 5];
}
