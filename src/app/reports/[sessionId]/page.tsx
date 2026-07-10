import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { Icon, type IconName } from "@/components/icons";

type PageProps = {
  params: Promise<{ sessionId: string }>;
};

const competencyBreakdown = [
  { label: "Technical Skill", value: 80 },
  { label: "Problem Solving", value: 85 },
  { label: "Communication", value: 70 },
  { label: "Leadership", value: 90 },
  { label: "Work Style", value: 65 },
  { label: "Adaptability", value: 60 },
  { label: "Ownership", value: 90 },
];

const moduleAnalysis = [
  { label: "AI Interview Chat", value: 90 },
  { label: "Coding Assessment", value: 85 },
  { label: "Behavioral Assessment", value: 70 },
  { label: "Leadership Scenario", value: 90 },
];

const signals: Array<{ label: string; icon: IconName; color: string }> = [
  { label: "Strategic thinker", icon: "sparkle", color: "bg-violet-50 text-violet-700" },
  { label: "Strong ownership", icon: "shield", color: "bg-emerald-50 text-emerald-700" },
  { label: "Clear technical reasoning", icon: "code", color: "bg-indigo-50 text-indigo-700" },
  { label: "Moderate leadership confidence", icon: "users", color: "bg-amber-50 text-amber-700" },
  { label: "Collaborative under pressure", icon: "message", color: "bg-purple-50 text-purple-700" },
  { label: "Needs more concise communication", icon: "question", color: "bg-red-50 text-red-600" },
];

const behaviorPatterns: Array<{ label: string; value: string; icon: IconName }> = [
  { label: "Decision Style", value: "Analytical", icon: "sparkle" },
  { label: "Work Preference", value: "Hybrid / Team-oriented", icon: "users" },
  { label: "Stress Response", value: "Stable", icon: "trend" },
  { label: "Learning Style", value: "Hands-on", icon: "clipboard" },
  { label: "Initiative Level", value: "High", icon: "paperPlane" },
];

const evidenceQuotes = [
  "I chose a modular backend structure to keep the API maintainable as the project scaled.",
  "When deadlines tighten, I usually re-prioritize tasks and communicate trade-offs early.",
  "If two team members disagree, I would align them on goals first, then guide a practical decision.",
];

export default async function ReportPage({ params }: PageProps) {
  await params;

  return (
    <AppShell active="candidates" showPageHeader={false} title="Candidate Report">
      <div className="-mt-3 w-full max-w-[1200px] space-y-3">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-[28px] font-bold tracking-[-0.02em] text-neutral-950">Candidate Report</h1>
            <p className="mt-1.5 text-[12px] font-medium text-neutral-600">AI-supported assessment summary and extracted candidate insights.</p>
          </div>
          <Link className="inline-flex h-8 items-center rounded-[7px] border border-neutral-200 bg-white px-3 text-[12px] font-medium text-neutral-600 transition hover:bg-neutral-50 hover:text-neutral-900" href="/candidates/david-lee">
            &larr; Back to report
          </Link>
        </header>

        <section className="card grid w-full gap-5 p-5 shadow-none sm:p-6 lg:grid-cols-[150px_minmax(260px,1fr)_210px_280px] lg:items-center">
          <div className="mx-auto size-[132px] overflow-hidden rounded-full border-2 border-fuchsia-300 p-1 lg:mx-0">
            <img alt="Chim Lina" className="h-full w-full rounded-full object-cover" src="https://randomuser.me/api/portraits/women/44.jpg" />
          </div>

          <div className="text-center lg:text-left">
            <h2 className="text-[23px] font-bold tracking-[-0.02em] text-neutral-950">Chim Lina</h2>
            <div className="mx-auto mt-5 grid max-w-[420px] gap-x-5 gap-y-3 text-[11px] sm:grid-cols-[105px_1fr] lg:mx-0">
              <ReportMeta icon="building" label="Target Role" value="Software Engineer" />
              <ReportMeta icon="clipboard" label="Assessment" value="Software Engineer Assessment" />
              <ReportMeta icon="check" label="Status" value="Completed" valueClass="rounded bg-sky-100 px-2 py-1 text-sky-700" />
            </div>
          </div>

          <div className="flex justify-center">
            <ScoreRing score={82} />
          </div>

          <div>
            <p className="text-[14px] font-semibold text-neutral-900">Recommendation</p>
            <span className="mt-3 inline-flex rounded-[5px] bg-gradient-to-r from-indigo-600 to-fuchsia-400 px-4 py-1.5 text-[11px] font-bold text-white">Strong Potential</span>
            <div className="mt-5 flex gap-3 rounded-[8px] bg-violet-50 p-3 text-[11px] leading-4 text-neutral-700">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-[7px] bg-violet-100 text-violet-600">
                <Icon name="sparkle" size={18} />
              </span>
              Profile synthesized from interview, coding, behavioral, and leadership modules. Human reviewers should validate final fit.
            </div>
          </div>
        </section>

        <section className="grid gap-2 md:grid-cols-2 lg:grid-cols-4">
          <ReportCard title="1. Core Competency Breakdown">
            <div className="space-y-3">
              {competencyBreakdown.map((item) => <MetricBar key={item.label} label={item.label} value={item.value} />)}
            </div>
          </ReportCard>

          <ReportCard title="2. AI Extracted Candidate Signals">
            <div className="grid grid-cols-2 gap-3">
              {signals.map((signal) => (
                <div className={`rounded-[8px] p-3 text-[11px] font-semibold leading-4 ${signal.color}`} key={signal.label}>
                  <Icon className="mb-2" name={signal.icon} size={18} />
                  {signal.label}
                </div>
              ))}
            </div>
          </ReportCard>

          <ReportCard title="3. Capability Map">
            <CapabilityMap />
          </ReportCard>

          <ReportCard title="4. Behavioral Pattern Analysis">
            <div className="space-y-2">
              {behaviorPatterns.map((pattern) => (
                <div className="flex items-center justify-between gap-3 rounded-[7px] bg-violet-50 px-3 py-2 text-[11px]" key={pattern.label}>
                  <span className="flex items-center gap-2 font-semibold text-neutral-700">
                    <Icon className="text-indigo-500" name={pattern.icon} size={15} />
                    {pattern.label}
                  </span>
                  <span className="max-w-[86px] text-right font-bold text-emerald-600">{pattern.value}</span>
                </div>
              ))}
            </div>
          </ReportCard>

          <ReportCard title="5. Module Analysis">
            <div className="space-y-4 pt-8">
              {moduleAnalysis.map((item) => <MetricBar key={item.label} label={item.label} value={item.value} />)}
            </div>
          </ReportCard>

          <ReportCard title="6. Evidence Extracted from Responses">
            <div className="space-y-3">
              {evidenceQuotes.map((quote) => (
                <blockquote className="rounded-[8px] bg-violet-50 p-3 text-[11px] leading-5 text-neutral-700" key={quote}>
                  <span className="mr-2 text-[20px] font-black text-indigo-500">&quot;</span>{quote}&quot;
                </blockquote>
              ))}
            </div>
          </ReportCard>

          <ReportCard title="7. AI Summary">
            <p className="text-[11px] leading-5 text-neutral-700">
              Dara demonstrates strong technical reasoning, problem solving, and a high sense of ownership. They approach challenges analytically and communicate ideas clearly in most scenarios. Collaboration under pressure and initiative are notable strengths. Growth opportunities exist in communication conciseness and building stronger leadership confidence in ambiguous situations. Overall, Dara shows strong potential as a valuable contributor and future leader.
            </p>
          </ReportCard>

          <ReportCard title="8. Reviewer Notes">
            <textarea
              className="min-h-[125px] w-full resize-none rounded-[6px] border border-neutral-200 p-3 text-[12px] outline-none transition placeholder:text-neutral-400 focus:border-indigo-300 focus:ring-4 focus:ring-indigo-50"
              placeholder="Write your notes about the candidate..."
            />
            <p className="mt-1 text-right text-[10px] text-neutral-400">0 / 1000 characters</p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button className="rounded-[6px] border border-neutral-200 bg-white px-3 py-2 text-[12px] font-semibold text-neutral-700 transition hover:bg-neutral-50" type="button">&larr; Export report</button>
              <button className="rounded-[6px] bg-primary px-3 py-2 text-[12px] font-bold text-white transition hover:bg-primary-600" type="button">Save</button>
            </div>
          </ReportCard>
        </section>
      </div>
    </AppShell>
  );
}

function ReportCard({ children, title }: { children: React.ReactNode; title: string }) {
  return (
    <article className="card min-h-[250px] p-4 shadow-none">
      <h2 className="mb-4 text-[13px] font-bold leading-4 text-neutral-950">{title}</h2>
      {children}
    </article>
  );
}

function ReportMeta({ icon, label, value, valueClass }: { icon: IconName; label: string; value: string; valueClass?: string }) {
  return (
    <>
      <span className="flex items-center gap-2 font-semibold text-neutral-600">
        <Icon name={icon} size={13} /> {label}
      </span>
      <span className={`w-fit font-bold text-neutral-950 ${valueClass ?? ""}`}>{value}</span>
    </>
  );
}

function MetricBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="grid grid-cols-[92px_1fr_30px] items-center gap-2 text-[10px] font-semibold text-neutral-800">
      <span>{label}</span>
      <div className="h-[5px] overflow-hidden rounded-full bg-neutral-100">
        <div className="h-full rounded-full bg-sky-400" style={{ width: `${value}%` }} />
      </div>
      <span className="text-right">{value}%</span>
    </div>
  );
}

function ScoreRing({ score }: { score: number }) {
  const radius = 50;
  const circumference = 2 * Math.PI * radius;

  return (
    <div className="relative size-[162px]">
      <svg className="h-full w-full -rotate-90" viewBox="0 0 120 120">
        <circle cx="60" cy="60" fill="none" r={radius} stroke="#f3e8ff" strokeWidth="10" />
        <circle
          cx="60"
          cy="60"
          fill="none"
          r={radius}
          stroke="url(#report-score-gradient)"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - score / 100)}
          strokeLinecap="round"
          strokeWidth="10"
        />
        <defs>
          <linearGradient id="report-score-gradient" x1="0" x2="1" y1="0" y2="1">
            <stop stopColor="#c026d3" />
            <stop offset="1" stopColor="#6366f1" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="text-[34px] font-black text-purple-950">{score}%</span>
        <span className="text-[10px] text-neutral-500">Over all score</span>
      </div>
    </div>
  );
}

function CapabilityMap() {
  return (
    <div className="flex items-center justify-center">
      <svg className="h-[160px] w-[160px]" viewBox="0 0 160 160">
        <polygon fill="#faf5ff" points="80,12 139,46 139,114 80,148 21,114 21,46" stroke="#a855f7" strokeWidth="1" />
        <polygon fill="none" points="80,38 116,59 116,101 80,122 44,101 44,59" stroke="#ddd6fe" strokeDasharray="3 3" />
        <polygon fill="#8b5cf633" points="80,26 126,55 120,103 80,133 39,104 34,55" stroke="#7c3aed" strokeWidth="2" />
        <line stroke="#ddd6fe" x1="80" x2="80" y1="12" y2="148" />
        <line stroke="#ddd6fe" x1="21" x2="139" y1="46" y2="114" />
        <line stroke="#ddd6fe" x1="139" x2="21" y1="46" y2="114" />
        {[
          [80, 26],
          [126, 55],
          [120, 103],
          [80, 133],
          [39, 104],
          [34, 55],
        ].map(([x, y]) => <circle cx={x} cy={y} fill="#7c3aed" key={`${x}-${y}`} r="3" />)}
        <text className="fill-neutral-700 text-[8px]" textAnchor="middle" x="80" y="9">Technical</text>
        <text className="fill-neutral-700 text-[8px]" textAnchor="middle" x="143" y="45">Communication</text>
        <text className="fill-neutral-700 text-[8px]" textAnchor="middle" x="143" y="119">Adaptability</text>
        <text className="fill-neutral-700 text-[8px]" textAnchor="middle" x="80" y="157">Leadership</text>
        <text className="fill-neutral-700 text-[8px]" textAnchor="middle" x="18" y="119">Problem Solving</text>
        <text className="fill-neutral-700 text-[8px]" textAnchor="middle" x="17" y="45">Ownership</text>
      </svg>
    </div>
  );
}
