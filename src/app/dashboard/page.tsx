import { AppShell } from "@/components/app-shell";
import { ButtonLink } from "@/components/button-link";
import { Icon } from "@/components/icons";
import { StatusChip } from "@/components/status-chip";
import { analyticsModules, dashboardStats, recentActivity } from "@/lib/mock-data";

const trend = [52, 61, 58, 70, 64, 76, 82, 74, 88, 81, 91, 86];

export default function DashboardPage() {
  return (
    <AppShell
      active="dashboard"
      actions={<ButtonLink href="/assessment/demo-session">New Session</ButtonLink>}
      description="Monitor candidate progress, assessment performance, and recent activity from one workspace."
      title="Assessment overview"
    >
      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {dashboardStats.map((stat) => (
          <article className="card p-5" key={stat.label}>
            <div className="flex items-start justify-between gap-4">
              <span className="inline-flex size-11 items-center justify-center rounded-[8px] bg-sky-100 text-blue-700">
                <Icon name={stat.icon} size={24} />
              </span>
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">{stat.change}</span>
            </div>
            <p className="mt-6 text-sm font-semibold text-neutral-500">{stat.label}</p>
            <p className="mt-2 text-4xl font-black tracking-normal text-neutral-950">{stat.value}</p>
          </article>
        ))}
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[1fr_390px]">
        <article className="card p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-black">Assessment Performance Trend</h2>
              <p className="mt-1 text-sm text-neutral-500">Average module score and completion movement across recent sessions.</p>
            </div>
            <StatusChip label="Ready" />
          </div>
          <div className="mt-8 flex h-80 items-end gap-3 border-b border-l border-neutral-200 px-4">
            {trend.map((height, index) => (
              <div className="flex h-full flex-1 items-end" key={index}>
                <span className="w-full rounded-t-[6px] bg-[#75d8c8]" style={{ height: `${height}%` }} />
              </div>
            ))}
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-4">
            {analyticsModules.map((module) => (
              <div className="rounded-[8px] bg-neutral-50 p-4" key={module.label}>
                <div className="mb-3 flex items-center justify-between text-sm font-bold">
                  <span>{module.label}</span>
                  <span>{module.value}%</span>
                </div>
                <div className="h-2 rounded-full bg-neutral-200">
                  <div className="h-2 rounded-full bg-[#2fb2e4]" style={{ width: `${module.value}%` }} />
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="card p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-black">Recent Activity</h2>
            <a className="text-sm font-bold text-emerald-600" href="/candidates">
              View all
            </a>
          </div>
          <div className="mt-6 space-y-4">
            {recentActivity.map((activity) => (
              <div className="flex gap-4 rounded-[8px] bg-neutral-50 p-4" key={activity.title}>
                <span className="mt-1 inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-sky-100 text-blue-700">
                  <Icon name={activity.type === "completed" ? "check" : activity.type === "progress" ? "clock" : activity.type === "template" ? "clipboard" : "report"} size={18} />
                </span>
                <div>
                  <p className="font-bold leading-6 text-neutral-900">{activity.title}</p>
                  <p className="mt-1 text-sm text-neutral-500">{activity.time}</p>
                </div>
              </div>
            ))}
          </div>
        </article>
      </section>
    </AppShell>
  );
}
