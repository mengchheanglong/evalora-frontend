import type { ReactNode } from "react";
import { Button } from "@/components/button-link";
import { Icon, type IconName } from "@/components/icons";
import { EvaloraLogo } from "@/components/logo";

type PageProps = {
  params: Promise<{ sessionId: string }>;
};

type CandidateModule = {
  title: string;
  subtitle: string;
  duration: string;
  icon: IconName;
  state: "completed" | "active" | "ready";
};

const candidate = {
  name: "Dara Sok",
  role: "Software Engineer",
  assessment: "Software Engineer Assessment",
  duration: "60 minutes",
};

const modules: CandidateModule[] = [
  {
    title: "AI Interview Chat",
    subtitle: "Interactive preliminary screening",
    duration: "15 min",
    icon: "message",
    state: "active",
  },
  {
    title: "Coding Assessment",
    subtitle: "Technical problem solving",
    duration: "25 min",
    icon: "code",
    state: "ready",
  },
  {
    title: "Behavioral Questions",
    subtitle: "Core competency evaluation",
    duration: "10 min",
    icon: "sparkle",
    state: "ready",
  },
  {
    title: "Leadership Scenario",
    subtitle: "Situational judgement",
    duration: "10 min",
    icon: "users",
    state: "ready",
  },
];

const interviewTips = [
  "Be specific about technologies, decisions, and outcomes.",
  "Explain your reasoning, not only the final answer.",
  "Avoid confidential employer or customer data.",
];

const behavioralOptions = [
  "Start working immediately without asking questions",
  "Re-prioritize tasks and discuss with the team",
  "Ask for clarification before making changes",
  "Wait until the manager gives more instructions",
];

export default async function AssessmentPage({ params }: PageProps) {
  const { sessionId } = await params;

  return (
    <main className="min-h-screen bg-[#f8f9ff] text-[#0b1c30]">
      <CandidateHeader sessionId={sessionId} />

      <section className="mx-auto w-full max-w-[1280px] px-5 pb-24 pt-8 sm:px-8 lg:px-12">
        <StartPanel />
        <ModuleProgress />

        <div className="mt-8 space-y-8">
          <AIInterviewModule />
          <CodingAssessmentModule />
          <BehavioralAssessmentModule />
          <LeadershipScenarioModule />
          <FinalSubmissionPanel sessionId={sessionId} />
        </div>
      </section>
    </main>
  );
}

function CandidateHeader({ sessionId }: { sessionId: string }) {
  return (
    <header className="sticky top-0 z-40 border-b border-[#d3e4fe] bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-[1280px] items-center gap-4 px-5 sm:px-8 lg:px-12">
        <EvaloraLogo compact href="#" />
        <div className="hidden h-6 w-px bg-neutral-200 sm:block" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[14px] font-bold text-[#0b1c30] sm:text-[18px]">{candidate.assessment}</p>
          <p className="hidden text-[12px] font-semibold text-neutral-500 sm:block">Invite session: {sessionId}</p>
        </div>

        <div className="ml-auto flex items-center gap-3">
          <div className="hidden rounded-full bg-[#eff4ff] px-3 py-1.5 text-right text-[12px] font-bold text-[#4648d4] md:block">
            <span className="block uppercase tracking-wider text-[#464554]">Progress</span>
            Module 1 of 4
          </div>
          <TimerChip />
          <button className="hidden h-10 items-center gap-2 rounded-[8px] bg-[#4648d4] px-4 text-[14px] font-bold text-white shadow-sm transition hover:bg-[#6063ee] sm:inline-flex" type="button">
            Submit Assessment
          </button>
          <button aria-label="Help" className="inline-flex size-10 items-center justify-center rounded-full border border-[#d3e4fe] bg-white text-neutral-700 transition hover:text-[#4648d4]" type="button">
            <Icon name="question" size={20} />
          </button>
        </div>
      </div>
    </header>
  );
}

function TimerChip() {
  return (
    <div className="inline-flex h-10 items-center gap-2 rounded-full border border-red-200 bg-red-50 px-3 text-[13px] font-black text-red-700">
      <Icon name="clock" size={17} />
      42:18
    </div>
  );
}

function StartPanel() {
  return (
    <section className="mx-auto max-w-[880px] overflow-hidden rounded-[24px] border border-[#d3e4fe] bg-white shadow-[0_18px_55px_rgba(15,23,42,0.05)]">
      <div className="h-2 bg-gradient-to-r from-[#4648d4] to-[#8b5cf6]" />
      <div className="px-6 py-8 sm:px-10 sm:py-10">
        <div className="text-center">
          <p className="text-[12px] font-black uppercase tracking-[0.22em] text-[#4648d4]">Secure candidate assessment</p>
          <h1 className="mt-3 text-[34px] font-black leading-tight tracking-[-0.03em] text-[#0b1c30] sm:text-[42px]">
            {candidate.assessment}
          </h1>
          <p className="mt-3 text-[17px] leading-7 text-[#464554]">You are joining from an invitation link. Complete each module and submit when finished.</p>
        </div>

        <div className="mt-8 grid gap-4 rounded-[16px] border border-[#d3e4fe] bg-[#f8f9ff] p-4 sm:grid-cols-2">
          <InfoPill icon="user" label="Candidate" value={candidate.name} />
          <InfoPill icon="clock" label="Estimated duration" value={candidate.duration} />
        </div>

        <div className="mt-8">
          <h2 className="text-[22px] font-black text-[#0b1c30]">Assessment Modules</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {modules.map((module) => (
              <div className="rounded-[14px] border border-[#d3e4fe] bg-[#eff4ff] p-4 transition hover:shadow-[0_10px_32px_rgba(15,23,42,0.06)]" key={module.title}>
                <div className="flex items-start gap-4">
                  <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-[#e1e0ff] text-[#4648d4]">
                    <Icon name={module.icon} size={22} />
                  </span>
                  <div>
                    <h3 className="text-[15px] font-black text-[#0b1c30]">{module.title}</h3>
                    <p className="mt-1 text-[13px] leading-5 text-[#464554]">{module.subtitle}</p>
                    <p className="mt-2 text-[11px] font-bold uppercase tracking-wider text-[#4648d4]">{module.duration}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-8 rounded-[16px] bg-[#eaf1ff] p-5">
          <p className="flex items-center gap-2 text-[14px] font-black text-[#0b1c30]">
            <Icon className="text-[#4648d4]" name="question" size={18} /> Important Instructions
          </p>
          <ul className="mt-4 grid gap-3 text-[14px] leading-6 text-[#464554] sm:grid-cols-2">
            {[
              "Make sure you have a stable internet connection.",
              "Read each prompt carefully before continuing.",
              "Your progress should be saved before moving modules.",
              "AI feedback supports human review and is not a final hiring decision.",
            ].map((instruction) => (
              <li className="flex items-start gap-2" key={instruction}>
                <Icon className="mt-1 shrink-0 text-[#4648d4]" name="check" size={15} />
                <span>{instruction}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="mx-auto mt-8 max-w-sm">
          <div className="mb-2 flex justify-between text-[12px] font-black uppercase tracking-wider text-[#464554]">
            <span>Progress</span>
            <span className="text-[#4648d4]">0 of 4 modules completed</span>
          </div>
          <div className="flex h-2 overflow-hidden rounded-full bg-[#dce9ff]">
            {modules.map((module) => (
              <span className={`flex-1 border-r border-white last:border-r-0 ${module.state === "completed" ? "bg-[#4648d4]" : "bg-[#d3e4fe]"}`} key={module.title} />
            ))}
          </div>
          <Button className="mt-6 h-12 w-full rounded-[8px] !bg-[#4648d4] !text-[15px] !text-white hover:!bg-[#6063ee]" type="button">
            Start Assessment
            <Icon name="chevron" size={16} className="-rotate-90" />
          </Button>
        </div>
      </div>
    </section>
  );
}

function InfoPill({ icon, label, value }: { icon: IconName; label: string; value: string }) {
  return (
    <div className="flex items-center justify-center gap-3 rounded-[10px] bg-white px-4 py-3 text-center sm:justify-start sm:text-left">
      <Icon className="text-[#4648d4]" name={icon} size={20} />
      <div>
        <p className="text-[11px] font-bold uppercase tracking-wider text-[#464554]">{label}</p>
        <p className="text-[15px] font-black text-[#0b1c30]">{value}</p>
      </div>
    </div>
  );
}

function ModuleProgress() {
  return (
    <nav aria-label="Assessment modules" className="sticky top-16 z-30 mt-6 rounded-[16px] border border-[#d3e4fe] bg-white/95 p-3 shadow-[0_10px_30px_rgba(15,23,42,0.04)] backdrop-blur">
      <div className="grid gap-2 md:grid-cols-4">
        {modules.map((module, index) => {
          const active = module.state === "active";
          return (
            <a
              className={`flex items-center gap-3 rounded-[12px] px-3 py-3 transition ${
                active ? "bg-[#4648d4] text-white shadow-sm" : "bg-[#f8f9ff] text-[#464554] hover:bg-[#eff4ff]"
              }`}
              href={`#module-${index + 1}`}
              key={module.title}
            >
              <span className={`inline-flex size-8 shrink-0 items-center justify-center rounded-full ${active ? "bg-white/20" : "bg-[#e1e0ff] text-[#4648d4]"}`}>
                <Icon name={module.icon} size={17} />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-[13px] font-black">{module.title}</span>
                <span className={`block text-[11px] font-semibold ${active ? "text-white/75" : "text-[#767586]"}`}>Module {index + 1}</span>
              </span>
            </a>
          );
        })}
      </div>
    </nav>
  );
}

function CandidateModuleCard({ children, eyebrow, icon, index, title }: { children: ReactNode; eyebrow: string; icon: IconName; index: number; title: string }) {
  return (
    <section className="rounded-[24px] border border-[#d3e4fe] bg-white shadow-[0_18px_55px_rgba(15,23,42,0.05)]" id={`module-${index}`}>
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#d3e4fe] px-5 py-4 sm:px-6">
        <div className="flex items-center gap-3">
          <span className="inline-flex size-10 items-center justify-center rounded-full bg-[#e1e0ff] text-[#4648d4]">
            <Icon name={icon} size={21} />
          </span>
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#4648d4]">{eyebrow}</p>
            <h2 className="text-[22px] font-black tracking-[-0.02em] text-[#0b1c30]">{title}</h2>
          </div>
        </div>
        <StatusBadge index={index} />
      </div>
      {children}
    </section>
  );
}

function StatusBadge({ index }: { index: number }) {
  return (
    <span className="inline-flex h-8 items-center rounded-full bg-[#eff4ff] px-3 text-[12px] font-black text-[#4648d4]">
      Module {index} of 4
    </span>
  );
}

function AIInterviewModule() {
  return (
    <CandidateModuleCard eyebrow="Interactive screening" icon="message" index={1} title="AI Interview Chat">
      <div className="grid gap-5 p-5 lg:grid-cols-[1fr_310px] sm:p-6">
        <section className="overflow-hidden rounded-[18px] border border-[#d3e4fe] bg-[#fafbff]">
          <div className="flex items-center gap-3 border-b border-[#d3e4fe] bg-white px-5 py-4">
            <span className="inline-flex size-10 items-center justify-center rounded-full bg-[#e1e0ff] text-[#4648d4]">
              <Icon name="sparkle" size={20} />
            </span>
            <div>
              <h3 className="text-[16px] font-black text-[#0b1c30]">Technical Interviewer</h3>
              <p className="text-[12px] font-semibold text-[#464554]">Evalora AI model</p>
            </div>
          </div>

          <div className="space-y-5 px-5 py-6">
            <ChatBubble kind="ai">Hello. Let&apos;s begin the technical assessment. Tell me about a technical project you built and the main challenge you faced.</ChatBubble>
            <ChatBubble kind="candidate">I built a Next.js and Node.js application for a logistics team. The hardest part was keeping real-time driver location updates fast without overloading the server.</ChatBubble>
            <ChatBubble kind="ai">Good. What trade-off did you make when choosing your backend architecture for those real-time updates?</ChatBubble>
            <div className="flex items-center gap-3">
              <span className="inline-flex size-8 items-center justify-center rounded-full bg-[#e1e0ff] text-[#4648d4]">
                <Icon name="sparkle" size={15} />
              </span>
              <div className="rounded-2xl border border-[#d3e4fe] bg-white px-5 py-3 text-[#4648d4] shadow-sm">•••</div>
            </div>
          </div>

          <div className="border-t border-[#d3e4fe] bg-white p-4">
            <label className="flex min-h-[64px] items-center gap-3 rounded-[16px] border border-[#c7c4d7] bg-white px-4 shadow-sm focus-within:border-[#4648d4] focus-within:ring-4 focus-within:ring-[#e1e0ff]">
              <span className="sr-only">Interview response</span>
              <textarea className="min-h-[44px] flex-1 resize-none bg-transparent py-3 text-[15px] outline-none placeholder:text-neutral-400" placeholder="Type your detailed response..." />
              <button className="inline-flex size-10 shrink-0 items-center justify-center rounded-[10px] bg-[#4648d4] text-white" type="button">
                <Icon name="paperPlane" size={18} />
              </button>
            </label>
          </div>
        </section>

        <aside className="rounded-[18px] border border-[#d3e4fe] bg-white p-5 shadow-sm">
          <h3 className="flex items-center gap-2 text-[16px] font-black text-[#0b1c30]">
            <Icon className="text-[#904900]" name="question" size={18} /> Interview Tips
          </h3>
          <div className="mt-5 space-y-4">
            {interviewTips.map((tip) => (
              <div className="flex gap-3" key={tip}>
                <Icon className="mt-0.5 shrink-0 text-[#4648d4]" name="check" size={16} />
                <p className="text-[14px] leading-6 text-[#464554]">{tip}</p>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </CandidateModuleCard>
  );
}

function ChatBubble({ children, kind }: { children: ReactNode; kind: "ai" | "candidate" }) {
  const isCandidate = kind === "candidate";
  return (
    <div className={`flex gap-3 ${isCandidate ? "justify-end" : "justify-start"}`}>
      {!isCandidate && (
        <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-[#e1e0ff] text-[#4648d4]">
          <Icon name="sparkle" size={15} />
        </span>
      )}
      <div className={`max-w-[760px] rounded-2xl p-4 text-[15px] leading-7 shadow-sm ${isCandidate ? "rounded-tr-sm bg-[#4648d4] text-white" : "rounded-tl-sm border border-[#d3e4fe] border-l-[3px] border-l-[#8b5cf6] bg-white text-[#0b1c30]"}`}>
        {children}
      </div>
      {isCandidate && <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-[#4648d4] text-[13px] font-black text-white">C</span>}
    </div>
  );
}

function CodingAssessmentModule() {
  return (
    <CandidateModuleCard eyebrow="Technical problem solving" icon="code" index={2} title="Coding Assessment">
      <div className="grid min-h-[620px] gap-0 overflow-hidden rounded-b-[24px] lg:grid-cols-[0.92fr_1.08fr]">
        <section className="border-b border-[#d3e4fe] bg-white p-6 lg:border-b-0 lg:border-r">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-[32px] font-black tracking-[-0.03em] text-[#0b1c30]">Two Sum</h3>
              <div className="mt-4 h-0.5 w-14 rounded-full bg-[#4648d4]" />
            </div>
            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[13px] font-black text-emerald-700">Easy</span>
          </div>

          <div className="mt-8 space-y-5 text-[16px] leading-8 text-[#0b1c30]">
            <p>Given an array of integers <code className="rounded bg-[#eff4ff] px-1.5 py-0.5">nums</code> and an integer <code className="rounded bg-[#eff4ff] px-1.5 py-0.5">target</code>, return indices of the two numbers such that they add up to target.</p>
            <p>You may assume that each input has exactly one solution, and you may not use the same element twice.</p>
            <p>You can return the answer in any order.</p>
          </div>

          <div className="mt-8 space-y-5">
            <CodeInfoBlock title="Example 1">
              <p>Input: nums = [2,7,11,15], target = 9</p>
              <p>Output: [0,1]</p>
              <p className="mt-1 text-[#464554]">Because nums[0] + nums[1] == 9.</p>
            </CodeInfoBlock>
            <CodeInfoBlock title="Constraints">
              <ul className="list-inside list-disc space-y-1">
                <li>2 &lt;= nums.length &lt;= 10⁴</li>
                <li>-10⁹ &lt;= nums[i] &lt;= 10⁹</li>
                <li>Exactly one valid solution exists</li>
              </ul>
            </CodeInfoBlock>
          </div>

          <div className="mt-8">
            <h4 className="text-[22px] font-black text-[#0b1c30]">Test Cases</h4>
            <div className="mt-4 flex gap-3">
              <TestCaseButton label="Case 1" state="passed" />
              <TestCaseButton label="Case 2" state="failed" />
            </div>
            <div className="mt-4 rounded-[14px] border border-red-200 bg-red-50 p-4">
              <p className="flex items-center gap-2 text-[14px] font-black text-red-700"><Icon name="clock" size={16} /> Failed</p>
              <div className="mt-4 grid gap-3 text-[13px] md:grid-cols-2">
                <TestValue label="Input" value="nums = [3,2,4], target = 6" />
                <TestValue label="Expected" value="[1,2]" />
                <TestValue label="Output" value="[0,1]" wide />
              </div>
            </div>
          </div>
        </section>

        <section className="flex min-h-[620px] flex-col bg-[#1e1e1e] text-slate-100">
          <div className="flex h-12 items-center justify-between border-b border-white/10 bg-[#2d2d2d] px-4">
            <button className="rounded-[7px] border border-white/15 bg-white/10 px-3 py-1.5 text-[13px] font-semibold text-white" type="button">JavaScript (Node.js)</button>
            <div className="flex items-center gap-2">
              <button className="inline-flex h-8 items-center gap-2 rounded-[7px] border border-white/20 px-3 text-[13px] font-semibold text-white" type="button"><Icon name="paperPlane" size={14} /> Run Code</button>
              <button className="inline-flex h-8 items-center gap-2 rounded-[7px] bg-[#4648d4] px-3 text-[13px] font-bold text-white" type="button"><Icon name="check" size={14} /> Submit</button>
            </div>
          </div>
          <pre className="flex-1 overflow-auto p-6 font-mono text-[14px] leading-7 text-slate-200">{`function twoSum(nums, target) {
  const map = new Map();

  for (let i = 0; i < nums.length; i++) {
    const complement = target - nums[i];

    if (map.has(complement)) {
      return [map.get(complement), i];
    }

    map.set(nums[i], i);
  }

  return [];
}`}</pre>
          <div className="border-t border-white/10 bg-[#252525] p-4">
            <p className="flex items-center gap-2 text-[13px] font-bold text-emerald-400"><Icon name="check" size={15} /> Run finished successfully</p>
            <p className="mt-2 text-[12px] text-slate-400">Runtime: 120ms · Memory: 42.8MB</p>
            <pre className="mt-3 rounded-[8px] border border-white/10 bg-[#1e1e1e] p-3 text-[12px] leading-6 text-slate-300">{`stdout:
> Initializing hash map...
> Case 1 passed
> Case 2 failed: expected [1,2]`}</pre>
          </div>
        </section>
      </div>
    </CandidateModuleCard>
  );
}

function CodeInfoBlock({ children, title }: { children: ReactNode; title: string }) {
  return (
    <div className="rounded-r-[12px] border-l-[3px] border-l-[#8b5cf6] bg-[#eff4ff] p-4 font-mono text-[14px] leading-7 text-[#0b1c30]">
      <p className="mb-2 text-[12px] font-black uppercase tracking-wider text-[#464554]">{title}</p>
      {children}
    </div>
  );
}

function TestCaseButton({ label, state }: { label: string; state: "passed" | "failed" }) {
  const passed = state === "passed";
  return (
    <button className={`inline-flex h-10 items-center gap-2 rounded-[8px] border px-4 text-[14px] font-bold ${passed ? "border-emerald-200 bg-white text-emerald-700" : "border-red-200 bg-white text-red-700"}`} type="button">
      {label} <Icon name={passed ? "check" : "clock"} size={15} />
    </button>
  );
}

function TestValue({ label, value, wide = false }: { label: string; value: string; wide?: boolean }) {
  return (
    <div className={wide ? "md:col-span-2" : ""}>
      <p className="mb-1 text-[11px] font-black uppercase tracking-wider text-[#464554]">{label}</p>
      <div className="rounded-[8px] border border-red-200 bg-white p-3 font-mono text-[13px] text-[#0b1c30]">{value}</div>
    </div>
  );
}

function BehavioralAssessmentModule() {
  return (
    <CandidateModuleCard eyebrow="Work style and collaboration" icon="sparkle" index={3} title="Behavioral Assessment">
      <div className="grid gap-6 p-5 lg:grid-cols-[1fr_340px] sm:p-6">
        <div className="space-y-6">
          <QuestionCard number={1} title="When a deadline suddenly changes, what do you usually do first?">
            <div className="space-y-3">
              {behavioralOptions.map((option, index) => (
                <label className="flex min-h-[58px] cursor-pointer items-center gap-3 rounded-[10px] border border-[#c7c4d7] bg-white px-4 transition hover:border-[#4648d4]" key={option}>
                  <input className="size-5 accent-[#4648d4]" defaultChecked={index === 1} name="deadline-response" type="radio" />
                  <span className="text-[15px] font-medium text-[#0b1c30]">{String.fromCharCode(65 + index)}. {option}</span>
                </label>
              ))}
            </div>
          </QuestionCard>

          <QuestionCard number={2} title="I prefer working...">
            <div className="px-4 py-6">
              <div className="mb-6 flex justify-between text-[12px] font-bold text-[#0b1c30]">
                <span>1: Independently</span>
                <span>3: Mixed</span>
                <span>5: With a team</span>
              </div>
              <div className="relative flex items-center justify-between">
                <div className="absolute left-5 right-5 top-1/2 h-1 -translate-y-1/2 rounded-full bg-[#dce9ff]" />
                <div className="absolute left-5 right-1/2 top-1/2 h-1 -translate-y-1/2 rounded-full bg-[#4648d4]" />
                {[1, 2, 3, 4, 5].map((value) => (
                  <button className={`relative z-10 inline-flex size-12 items-center justify-center rounded-full border-2 text-[15px] font-black shadow-sm ${value === 3 ? "border-[#4648d4] bg-[#4648d4] text-white" : "border-[#c7c4d7] bg-white text-[#464554]"}`} key={value} type="button">
                    {value}
                  </button>
                ))}
              </div>
            </div>
          </QuestionCard>

          <QuestionCard number={3} title="Describe a time you had to adjust priorities because multiple tasks were urgent.">
            <textarea className="min-h-[150px] w-full resize-y rounded-[10px] border border-[#c7c4d7] bg-white p-4 text-[15px] outline-none transition placeholder:text-neutral-400 focus:border-[#4648d4] focus:ring-4 focus:ring-[#e1e0ff]" placeholder="Type your response here..." />
          </QuestionCard>
        </div>

        <aside className="h-fit rounded-[18px] border border-[#d3e4fe] bg-white p-5 shadow-sm lg:sticky lg:top-40">
          <p className="text-[12px] font-black uppercase tracking-[0.2em] text-[#464554]">Module Progress</p>
          <div className="mt-5 flex items-center justify-between text-[14px] font-bold text-[#0b1c30]">
            <span>Behavioral questions completed</span>
            <span className="text-[#4648d4]">3 / 8</span>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#dce9ff]">
            <div className="h-full w-[38%] rounded-full bg-[#4648d4]" />
          </div>
          <div className="mt-6 flex items-center gap-3 rounded-[10px] bg-[#eaf1ff] p-4 text-[15px] font-medium text-[#464554]">
            <Icon className="text-emerald-600" name="check" size={19} /> Responses saved automatically
          </div>
        </aside>
      </div>
    </CandidateModuleCard>
  );
}

function QuestionCard({ children, number, title }: { children: ReactNode; number: number; title: string }) {
  return (
    <section className="rounded-[18px] border border-[#d3e4fe] border-l-[#8b5cf6] border-l-2 bg-white p-5 shadow-sm sm:p-6">
      <div className="mb-5 flex items-start gap-4">
        <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-[#6063ee] text-[16px] font-black text-white">{number}</span>
        <h3 className="text-[22px] font-black leading-8 tracking-[-0.02em] text-[#0b1c30]">{title}</h3>
      </div>
      {children}
    </section>
  );
}

function LeadershipScenarioModule() {
  return (
    <CandidateModuleCard eyebrow="Situational judgement" icon="users" index={4} title="Leadership Scenario">
      <div className="grid gap-6 p-5 lg:grid-cols-[1fr_330px] sm:p-6">
        <section className="rounded-[18px] border border-[#d3e4fe] bg-[#f8f9ff] p-6">
          <p className="text-[12px] font-black uppercase tracking-[0.2em] text-[#4648d4]">Scenario</p>
          <h3 className="mt-3 text-[24px] font-black tracking-[-0.02em] text-[#0b1c30]">Two teams disagree on release priority</h3>
          <p className="mt-4 text-[16px] leading-8 text-[#464554]">
            A release is at risk because product and engineering disagree on what should ship first. The candidate should explain how they would align the group, protect customer impact, and communicate next steps.
          </p>
          <textarea className="mt-6 min-h-[220px] w-full resize-y rounded-[12px] border border-[#c7c4d7] bg-white p-4 text-[15px] outline-none transition placeholder:text-neutral-400 focus:border-[#4648d4] focus:ring-4 focus:ring-[#e1e0ff]" placeholder="Write your leadership response here..." />
        </section>

        <aside className="space-y-4">
          <RubricCard title="What reviewers look for" items={["Clarifies shared goal", "Communicates trade-offs", "Escalates calmly", "Protects customer impact"]} />
          <div className="rounded-[18px] border border-amber-200 bg-amber-50 p-5 text-[14px] leading-6 text-amber-900">
            <p className="font-black">Before continuing</p>
            <p className="mt-2">Use work-safe examples only. Do not share private company, customer, or salary information.</p>
          </div>
        </aside>
      </div>
    </CandidateModuleCard>
  );
}

function RubricCard({ items, title }: { items: string[]; title: string }) {
  return (
    <div className="rounded-[18px] border border-[#d3e4fe] bg-white p-5 shadow-sm">
      <p className="text-[16px] font-black text-[#0b1c30]">{title}</p>
      <ul className="mt-4 space-y-3 text-[14px] text-[#464554]">
        {items.map((item) => (
          <li className="flex items-center gap-2" key={item}>
            <Icon className="text-[#4648d4]" name="check" size={15} /> {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

function FinalSubmissionPanel({ sessionId }: { sessionId: string }) {
  return (
    <section className="rounded-[24px] border border-[#d3e4fe] bg-white p-6 text-center shadow-[0_18px_55px_rgba(15,23,42,0.05)] sm:p-8">
      <span className="mx-auto inline-flex size-20 items-center justify-center rounded-full bg-[#dce9ff] text-emerald-600 shadow-[0_0_45px_rgba(16,185,129,0.22)]">
        <Icon name="check" size={42} />
      </span>
      <h2 className="mt-5 text-[32px] font-black tracking-[-0.03em] text-[#0b1c30]">Ready to submit?</h2>
      <p className="mx-auto mt-3 max-w-2xl text-[16px] leading-7 text-[#464554]">
        Review your answers before final submission. After submission, your access link should close and authorized reviewers can generate the candidate report.
      </p>

      <div className="mx-auto mt-7 grid max-w-3xl gap-4 rounded-[18px] border border-[#d3e4fe] bg-[#f8f9ff] p-5 text-left sm:grid-cols-2">
        <SummaryItem icon="user" label="Candidate" value={candidate.name} />
        <SummaryItem icon="clipboard" label="Assessment" value={candidate.assessment} />
        <SummaryItem icon="check" label="Completed modules" value="4 / 4" />
        <SummaryItem icon="clock" label="Session" value={sessionId} />
      </div>

      <div className="mt-7 rounded-[14px] bg-[#eaf1ff] p-4 text-[14px] leading-6 text-[#464554]">
        Your assessment will be reviewed using Evalora&apos;s structured evaluation system. The organization may contact you after reviewing your report.
      </div>

      <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
        <Button className="h-12 rounded-[8px] border-[#c7c4d7] !text-[14px]" type="button" variant="outline">
          Save progress
        </Button>
        <Button className="h-12 rounded-[8px] !bg-[#4648d4] px-8 !text-[14px] !text-white hover:!bg-[#6063ee]" type="button">
          Submit assessment
          <Icon name="check" size={17} />
        </Button>
      </div>
      <p className="mt-5 text-[12px] font-semibold text-[#767586]">No dashboard account is required for candidates. You may close this page after submission.</p>
    </section>
  );
}

function SummaryItem({ icon, label, value }: { icon: IconName; label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#464554]">{label}</p>
      <p className="mt-2 flex items-center gap-2 text-[16px] font-black text-[#0b1c30]">
        <Icon className="text-[#767586]" name={icon} size={17} /> {value}
      </p>
    </div>
  );
}
