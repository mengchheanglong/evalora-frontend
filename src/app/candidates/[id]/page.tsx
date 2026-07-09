import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { Icon, type IconName } from "@/components/icons";

const candidate = {
  name: "Chim Lina",
  role: "Frontend Developer",
  status: "Active",
  email: "chimlina@gmail.com",
  phone: "0966545678",
  location: "Kohpich, PhnomPenh",
  id: "CAN-2026-0001",
  source: "LinkedIn",
  appliedOn: "May 10, 2026",
  currentStatus: "In Assessment",
  recruiter: "Noeun Tithearin",
  sessionId: "demo-session",
  avatar: "https://randomuser.me/api/portraits/women/44.jpg",
};

const skills = [
  { name: "React", value: 90 },
  { name: "JavaScript (ES6+)", value: 85 },
  { name: "TypeScript", value: 70 },
  { name: "HTML / CSS", value: 90 },
  { name: "Next.js", value: 65 },
  { name: "UI/UX Design", value: 60 },
];

const activities: Array<{ title: string; description: string; time: string; icon: IconName; color: string }> = [
  {
    title: "Interview session started",
    description: "Frontend Developer Interview has been started by Sophia Kim.",
    time: "May 28, 2026 at 10:02 AM",
    icon: "calendar",
    color: "bg-sky-100 text-sky-600",
  },
  {
    title: "Assessment invitation sent",
    description: "Technical Assessment has been sent to chimlina@gmail.com.",
    time: "May 26, 2026 at 03:15 PM",
    icon: "mail",
    color: "bg-orange-100 text-orange-600",
  },
  {
    title: "Note added",
    description: "Added a note by Sophia Kim.",
    time: "May 25, 2026 at 11:20 AM",
    icon: "file",
    color: "bg-emerald-100 text-emerald-600",
  },
];

const quickActions: Array<{ label: string; icon: IconName; tone?: "danger" }> = [
  { label: "Schedule New Interview", icon: "calendar" },
  { label: "Send Assessment Invitation", icon: "mail" },
  { label: "Move to Next Stage", icon: "trend" },
  { label: "Add Note", icon: "file" },
  { label: "Reject Candidate", icon: "lock", tone: "danger" },
];

export default function CandidateDetailPage() {
  return (
    <AppShell active="candidates" hideSidebar showPageHeader={false} title="Candidate Detail">
      <div className="mx-auto w-full max-w-[1180px] space-y-5">
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-[12px] font-semibold text-neutral-500">
            <Link className="hover:text-primary-600" href="/candidates">Candidates</Link>
            <span>&gt;</span>
            <span className="text-neutral-900">David Lee</span>
          </div>
          <div>
            <h1 className="text-[26px] font-black tracking-[-0.03em] text-neutral-950">Candidate Detail</h1>
            <p className="mt-2 text-[13px] text-neutral-600">View comprehensive information and assessment history.</p>
          </div>
        </div>

        <section className="grid gap-4 lg:grid-cols-[1fr_305px]">
          <div className="space-y-4">
            <article className="card p-6">
              <div className="grid gap-6 md:grid-cols-[120px_1fr_1fr] md:items-center">
                <div className="mx-auto size-[110px] overflow-hidden rounded-full bg-neutral-100 md:mx-0">
                  <img alt={candidate.name} className="h-full w-full object-cover" src={candidate.avatar} />
                </div>

                <div className="min-w-0 text-center md:text-left">
                  <div className="flex flex-wrap items-center justify-center gap-3 md:justify-start">
                    <h2 className="text-[24px] font-black tracking-[-0.03em] text-neutral-950">{candidate.name}</h2>
                    <span className="rounded-[5px] border border-sky-100 bg-sky-50 px-2 py-1 text-[11px] font-bold text-sky-600">{candidate.status}</span>
                  </div>
                  <p className="mt-1 text-[13px] font-semibold text-neutral-600">{candidate.role}</p>

                  <div className="mt-4 space-y-2 text-[12px] text-neutral-600">
                    <ContactRow icon="mail" label="Email" value={candidate.email} />
                    <ContactRow icon="message" label="Phone" value={candidate.phone} />
                    <ContactRow icon="globe" label="Location" value={candidate.location} />
                  </div>
                </div>

                <div className="border-t border-neutral-100 pt-4 text-[12px] md:border-l md:border-t-0 md:pl-7 md:pt-0">
                  <MetaRow label="Candidate ID" value={candidate.id} />
                  <MetaRow label="Source" value={candidate.source} />
                  <MetaRow label="Applied On" value={candidate.appliedOn} />
                  <MetaRow accent label="Current Status" value={candidate.currentStatus} />
                  <div className="mt-3 flex items-center justify-between gap-4">
                    <span className="text-neutral-500">Owner / Recruiter</span>
                    <span className="flex items-center gap-2 font-bold text-neutral-900">
                      <span className="inline-flex size-5 items-center justify-center rounded-full bg-violet-100 text-[10px] text-violet-600">NT</span>
                      {candidate.recruiter}
                    </span>
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-4">
                    <span className="text-neutral-500">Tags</span>
                    <span className="text-right font-semibold text-neutral-800">React, JavaScript, UI/UX</span>
                  </div>
                </div>
              </div>
            </article>

            <nav className="flex items-center gap-7 border-b border-neutral-200 px-1 text-[13px] font-bold">
              <button className="flex items-center gap-2 border-b-2 border-primary pb-3 text-primary" type="button">
                <Icon name="file" size={15} /> Overview
              </button>
              <Link className="flex items-center gap-2 border-b-2 border-transparent pb-3 text-neutral-700 transition hover:text-primary" href={`/reports/${candidate.sessionId}`}>
                <Icon name="report" size={15} /> Report
              </Link>
            </nav>

            <section className="grid gap-4 md:grid-cols-3">
              <article className="card p-5">
                <h3 className="text-[14px] font-bold text-neutral-950">About Candidate</h3>
                <p className="mt-4 text-[12px] leading-5 text-neutral-600">
                  Passionate frontend developer with 3+ years of experience building modern web applications using React, TypeScript, and modern UI libraries. Strong problem-solving skills and attention to detail.
                </p>
                <div className="mt-4 space-y-3 border-t border-neutral-100 pt-4 text-[11px]">
                  <MetaRow label="Experience" value="3.2 years" />
                  <MetaRow label="Current Company" value="TechSolutions Co., Ltd." />
                  <MetaRow label="Education" value="KIT" />
                  <MetaRow label="Expected Salary" value="45,000 THB" />
                  <MetaRow label="Availability" value="2 weeks notice period" />
                </div>
              </article>

              <article className="card p-5">
                <h3 className="text-[14px] font-bold text-neutral-950">Skills</h3>
                <div className="mt-4 space-y-3">
                  {skills.map((skill) => <ProgressRow key={skill.name} label={skill.name} value={skill.value} />)}
                </div>
                <button className="mt-5 text-[12px] font-bold text-primary hover:underline" type="button">View all skills (12)</button>
              </article>

              <article className="card p-5">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-[14px] font-bold text-neutral-950">Latest Session</h3>
                  <span className="rounded-[5px] bg-sky-50 px-2 py-1 text-[10px] font-bold text-sky-600">In progress</span>
                </div>
                <p className="mt-4 text-[13px] font-bold text-neutral-950">Frontend Developer Interview</p>
                <p className="text-[11px] font-semibold text-neutral-400">SES-2026-0155</p>
                <div className="mt-4 space-y-2 border-t border-neutral-100 pt-4 text-[11px]">
                  <MetaRow label="Date" value="May 28, 2026" />
                  <MetaRow label="Time" value="10:00 AM" />
                  <MetaRow label="Duration" value="120 min" />
                  <MetaRow label="Interviewers" value="Sophia Kim, Michael Chen" />
                </div>
                <div className="mt-4">
                  <ProgressRow label="Progress" value={65} />
                  <button className="mt-4 flex w-full items-center justify-center gap-2 rounded-[6px] bg-primary px-4 py-2 text-[12px] font-bold text-white transition hover:bg-primary-600" type="button">
                    View Session Details <Icon className="-rotate-90" name="chevron" size={13} />
                  </button>
                </div>
              </article>
            </section>

            <article className="card p-5">
              <h3 className="text-[14px] font-bold text-neutral-950">Recent Activity</h3>
              <div className="mt-4 space-y-4">
                {activities.map((activity) => (
                  <div className="flex items-start gap-4" key={activity.title}>
                    <span className={`flex size-9 shrink-0 items-center justify-center rounded-[8px] ${activity.color}`}>
                      <Icon name={activity.icon} size={17} />
                    </span>
                    <div className="flex min-w-0 flex-1 flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="text-[13px] font-bold text-neutral-950">{activity.title}</p>
                        <p className="mt-1 text-[12px] text-neutral-500">{activity.description}</p>
                      </div>
                      <span className="text-[11px] text-neutral-500">{activity.time}</span>
                    </div>
                  </div>
                ))}
              </div>
              <button className="mt-5 text-[12px] font-bold text-primary hover:underline" type="button">View all activity</button>
            </article>
          </div>

          <aside className="space-y-4">
            <article className="card p-5">
              <h3 className="text-[14px] font-bold text-neutral-950">Overall Summary</h3>
              <div className="mt-5 flex flex-col items-center text-center">
                <ScoreRing score={65} />
                <h4 className="mt-4 text-[14px] font-bold text-neutral-950">Good Candidate</h4>
                <p className="mt-2 max-w-[240px] text-[12px] leading-5 text-neutral-600">
                  David demonstrates strong technical skills with good problem-solving ability and communication.
                </p>
              </div>
              <div className="mt-5 space-y-4 border-t border-neutral-100 pt-5 text-[12px]">
                <ListBlock items={["React & JavaScript", "Problem Solving", "UI Implementation"]} title="Strengths" />
                <ListBlock items={["System Design", "Communication Depth"]} title="Areas to Improve" />
              </div>
            </article>

            <article className="card p-5">
              <h3 className="text-[14px] font-bold text-neutral-950">Quick Actions</h3>
              <div className="mt-3 divide-y divide-neutral-100">
                {quickActions.map((action) => (
                  <button className={`flex w-full items-center justify-between py-3 text-[13px] font-semibold transition ${action.tone === "danger" ? "text-red-500 hover:text-red-600" : "text-neutral-800 hover:text-primary"}`} key={action.label} type="button">
                    <span className="flex items-center gap-3">
                      <Icon name={action.icon} size={17} />
                      {action.label}
                    </span>
                    <span>&gt;</span>
                  </button>
                ))}
              </div>
            </article>
          </aside>
        </section>
      </div>
    </AppShell>
  );
}

function ContactRow({ icon, label, value }: { icon: IconName; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="text-neutral-400" name={icon} size={14} />
      <span>{label}: <strong className="text-neutral-900">{value}</strong></span>
    </div>
  );
}

function MetaRow({ accent = false, label, value }: { accent?: boolean; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-neutral-500">{label}</span>
      <span className={`text-right font-bold ${accent ? "text-primary" : "text-neutral-900"}`}>{value}</span>
    </div>
  );
}

function ProgressRow({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-[11px] font-bold text-neutral-800">
        <span>{label}</span>
        <span>{value}%</span>
      </div>
      <div className="h-[6px] overflow-hidden rounded-full bg-neutral-100">
        <div className="h-full rounded-full bg-sky-400" style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

function ScoreRing({ score }: { score: number }) {
  const radius = 52;
  const circumference = 2 * Math.PI * radius;

  return (
    <div className="relative size-[150px]">
      <svg className="h-full w-full -rotate-90" viewBox="0 0 120 120">
        <circle cx="60" cy="60" fill="none" r={radius} stroke="#e0f2fe" strokeWidth="8" />
        <circle
          cx="60"
          cy="60"
          fill="none"
          r={radius}
          stroke="url(#candidate-score-gradient)"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - score / 100)}
          strokeLinecap="round"
          strokeWidth="8"
        />
        <defs>
          <linearGradient id="candidate-score-gradient" x1="0" x2="1" y1="0" y2="1">
            <stop stopColor="#22d3ee" />
            <stop offset="1" stopColor="#6366f1" />
          </linearGradient>
        </defs>
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-[30px] font-black text-indigo-500">{score}%</span>
    </div>
  );
}

function ListBlock({ items, title }: { items: string[]; title: string }) {
  return (
    <div>
      <h4 className="font-bold text-neutral-950">{title}</h4>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-neutral-700 marker:text-neutral-300">
        {items.map((item) => <li key={item}>{item}</li>)}
      </ul>
    </div>
  );
}
