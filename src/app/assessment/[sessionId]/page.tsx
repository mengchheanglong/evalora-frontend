"use client";

import { use, useState, useEffect, type FormEvent } from "react";
import { Button } from "@/components/button-link";
import { CandidateCodingAssessment } from "@/components/candidate-coding-assessment";
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
  stepIndex: number;
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
    stepIndex: 1,
  },
  {
    title: "Coding Assessment",
    subtitle: "Technical problem solving",
    duration: "25 min",
    icon: "code",
    stepIndex: 2,
  },
  {
    title: "Behavioral Questions",
    subtitle: "Core competency evaluation",
    duration: "10 min",
    icon: "sparkle",
    stepIndex: 3,
  },
  {
    title: "Leadership Scenario",
    subtitle: "Situational judgement",
    duration: "10 min",
    icon: "users",
    stepIndex: 4,
  },
];

const interviewTips = [
  "Be specific about technologies, decisions, and outcomes.",
  "Explain your reasoning, not only the final answer.",
  "Avoid confidential employer or customer data.",
];

export default function AssessmentPage({ params }: PageProps) {
  const { sessionId } = use(params);

  // Flow Step:
  // -1: Candidate name entry
  // 0: Start Panel
  // 1: AI Interview Chat
  // 2: Coding Assessment
  // 3: Behavioral Questions
  // 4: Leadership Scenario
  // 5: Final Submission Panel
  // 6: Success Splash
  const [currentStep, setCurrentStep] = useState<number>(-1);
  const [candidateName, setCandidateName] = useState("");

  // Timer state: 42 minutes 18 seconds = 2538 seconds
  const [timeLeft, setTimeLeft] = useState<number>(2538);

  useEffect(() => {
    if (currentStep <= 0 || currentStep === 6) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [currentStep]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // AI Interview state
  const [chatMessages, setChatMessages] = useState<Array<{ sender: "ai" | "candidate"; text: string }>>([
    { sender: "ai", text: "Hello. Let's begin the technical assessment. Tell me about a technical project you built and the main challenge you faced." },
    { sender: "candidate", text: "I built a Next.js and Node.js application for a logistics team. The hardest part was keeping real-time driver location updates fast without overloading the server." },
    { sender: "ai", text: "Good. What trade-off did you make when choosing your backend architecture for those real-time updates?" }
  ]);
  const [aiTyping, setAiTyping] = useState(false);
  const [aiInputValue, setAiInputValue] = useState("");

  const handleSendAiMessage = () => {
    if (!aiInputValue.trim()) return;
    const userMsg = aiInputValue.trim();
    setChatMessages((prev) => [...prev, { sender: "candidate", text: userMsg }]);
    setAiInputValue("");
    setAiTyping(true);

    setTimeout(() => {
      setAiTyping(false);
      setChatMessages((prev) => [
        ...prev,
        { sender: "ai", text: "That's a very practical design choice. In a production system, how would you scale this architecture to support tens of thousands of concurrent active drivers?" }
      ]);
    }, 1500);
  };

  // Behavioral questions states
  const [deadlineAnswer, setDeadlineAnswer] = useState<number>(1); // Index 1 is default checked
  const [collaborationValue, setCollaborationValue] = useState<number>(3); // 1-5 slider
  const [priorityExplanation, setPriorityExplanation] = useState<string>("");
  const [behavioralSaving, setBehavioralSaving] = useState(false);

  const handleBehavioralChange = (updater: () => void) => {
    updater();
    setBehavioralSaving(true);
    setTimeout(() => setBehavioralSaving(false), 800);
  };

  const getBehavioralCompletedCount = () => {
    let count = 0;
    if (deadlineAnswer !== null) count++;
    if (collaborationValue !== null) count++;
    if (priorityExplanation.trim().length > 0) count++;
    return count;
  };

  // Leadership Scenario state
  const [leadershipResponse, setLeadershipResponse] = useState<string>("");
  const [leadershipSaving, setLeadershipSaving] = useState(false);

  const handleLeadershipChange = (val: string) => {
    setLeadershipResponse(val);
    setLeadershipSaving(true);
    setTimeout(() => setLeadershipSaving(false), 800);
  };

  const displayCandidateName = candidateName.trim() || candidate.name;

  const handleWelcomeContinue = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!candidateName.trim()) return;
    setCurrentStep(0);
  };

  if (currentStep === -1) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-[#f3f4fd] px-5 py-12 text-[#111827]">
        <section className="w-full max-w-[622px] rounded-[14px] border border-[#e3e7f2] bg-white px-[72px] py-[94px] shadow-[0_10px_34px_rgba(15,23,42,0.025)] max-sm:px-6 max-sm:py-10">
          <div className="flex items-center justify-center gap-4">
            <WelcomeBotIcon />
            <div>
              <h1 className="text-[22px] font-black tracking-[-0.02em] text-[#050505] sm:text-[24px]">Welcome to interview</h1>
              <p className="mt-2 text-[8px] font-semibold text-[#3f3f46] sm:text-[9px]">Please enter your name to continue to assessment</p>
            </div>
          </div>

          <form className="mt-10" onSubmit={handleWelcomeContinue}>
            <label className="text-[14px] font-bold text-[#050505]" htmlFor="candidate-name">
              Your Name <span className="text-red-500">*</span>
            </label>
            <input
              className="mt-4 h-[44px] w-full rounded-[7px] border border-transparent bg-[#f7f7f8] px-4 text-[12px] font-medium text-neutral-900 outline-none transition placeholder:text-[#8b8b95] focus:border-[#2fb2e4] focus:bg-white focus:ring-4 focus:ring-sky-100"
              id="candidate-name"
              onChange={(event) => setCandidateName(event.target.value)}
              placeholder="Enter your full name"
              required
              type="text"
              value={candidateName}
            />

            <button
              className="mt-4 flex h-[43px] w-full items-center justify-center gap-1 rounded-[6px] bg-[#2fb2e4] text-[12px] font-black text-white transition hover:bg-[#229fd0] focus:outline-none focus:ring-4 focus:ring-sky-100"
              type="submit"
            >
              Continue to interview <span aria-hidden="true">→</span>
            </button>
          </form>

          <p className="mt-12 flex items-center justify-center gap-1.5 text-center text-[11px] font-medium text-[#52525b]">
            <Icon name="lock" size={12} />
            Your information is kept confidential and used only for this assessment.
          </p>
        </section>

        <section className="mt-9 grid w-full max-w-[622px] gap-6 text-[#050505] sm:grid-cols-3 sm:gap-0">
          <WelcomeFeature icon="shield" title="Secure & Private" description="Your information is protected." />
          <WelcomeFeature bordered icon="clock" title="30–60 Minutes" description="Complete at your own pace." />
          <WelcomeFeature bordered icon="clipboard" title="Multiple Sections" description="AI, coding, behavioral, and communication." />
        </section>
      </main>
    );
  }

  if (currentStep === 6) {
    return (
      <main className="min-h-screen bg-[#f8f9ff] flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-md w-full bg-white rounded-[24px] border border-[#d3e4fe] shadow-[0_20px_60px_rgba(15,23,42,0.06)] p-8">
          <span className="mx-auto flex size-20 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 shadow-[0_0_40px_rgba(16,185,129,0.2)]">
            <Icon name="check" size={40} />
          </span>
          <h1 className="mt-6 text-[28px] font-black text-[#0b1c30] tracking-tight">Assessment Submitted!</h1>
          <p className="mt-3 text-[15px] leading-relaxed text-[#464554]">
            Thank you, your responses have been successfully submitted for review. Authorized reviewers can now generate your candidate evaluation report.
          </p>
          <div className="mt-8 p-4 rounded-xl bg-slate-50 border border-neutral-100 text-left text-[13px] text-[#464554] space-y-2">
            <div className="flex justify-between"><span className="font-semibold">Candidate:</span> {displayCandidateName}</div>
            <div className="flex justify-between"><span className="font-semibold">Role:</span> {candidate.role}</div>
            <div className="flex justify-between"><span className="font-semibold">Session ID:</span> {sessionId}</div>
          </div>
          <p className="mt-6 text-[12px] font-semibold text-neutral-400">You may close this tab or window now.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f8f9ff] text-[#0b1c30] flex flex-col">
      {/* Sticky Header */}
      <header className="sticky top-0 z-40 border-b border-[#d3e4fe] bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-[1280px] items-center gap-4 px-5 sm:px-8 lg:px-12">
          <EvaloraLogo compact href="#" />
          <div className="hidden h-6 w-px bg-neutral-200 sm:block" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[14px] font-bold text-[#0b1c30] sm:text-[18px]">{candidate.assessment}</p>
            <p className="hidden text-[12px] font-semibold text-neutral-500 sm:block">Invite session: {sessionId}</p>
          </div>

          <div className="ml-auto flex items-center gap-3">
            {currentStep > 0 && currentStep < 5 && (
              <div className="hidden rounded-full bg-[#eff4ff] px-4 py-1.5 text-right text-[11px] font-bold text-[#4648d4] md:block">
                <span className="block uppercase tracking-wider text-[#464554] text-[9px]">Progress</span>
                Module {currentStep} of 4
              </div>
            )}
            {currentStep > 0 && (
              <div className="inline-flex h-10 items-center gap-2 rounded-full border border-red-200 bg-red-50 px-3 text-[13px] font-black text-red-700">
                <Icon name="clock" size={17} />
                {formatTime(timeLeft)}
              </div>
            )}
            {currentStep > 0 && currentStep < 5 && (
              <button
                onClick={() => setCurrentStep(5)}
                className="hidden h-10 items-center gap-2 rounded-[8px] bg-[#4648d4] px-4 text-[14px] font-bold text-white shadow-sm transition hover:bg-[#6063ee] sm:inline-flex"
                type="button"
              >
                Submit Assessment
              </button>
            )}
            <button aria-label="Help" className="inline-flex size-10 items-center justify-center rounded-full border border-[#d3e4fe] bg-white text-neutral-700 transition hover:text-[#4648d4]" type="button">
              <Icon name="question" size={20} />
            </button>
          </div>
        </div>
      </header>

      {/* Module Progress Navigation (Sticky sub-bar) */}
      {currentStep > 0 && (
        <nav aria-label="Assessment modules" className="sticky top-16 z-30 border-b border-[#d3e4fe]/60 bg-white/90 p-3 backdrop-blur shadow-sm">
          <div className="mx-auto max-w-[1280px] px-2 sm:px-4 lg:px-8">
            <div className="grid gap-2 grid-cols-5">
              {modules.map((module) => {
                const active = currentStep === module.stepIndex;
                const completed = currentStep > module.stepIndex;
                return (
                  <button
                    key={module.title}
                    onClick={() => setCurrentStep(module.stepIndex)}
                    className={`flex items-center gap-2.5 rounded-[10px] px-3 py-2 transition text-left ${
                      active
                        ? "bg-[#4648d4] text-white shadow-sm"
                        : completed
                          ? "bg-emerald-50 text-emerald-800 hover:bg-emerald-100/50 border border-emerald-100"
                          : "bg-[#f8f9ff] text-[#464554] hover:bg-[#eff4ff]"
                    }`}
                  >
                    <span className={`inline-flex size-7 shrink-0 items-center justify-center rounded-full ${
                      active
                        ? "bg-white/20"
                        : completed
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-[#e1e0ff] text-[#4648d4]"
                    }`}>
                      {completed ? <Icon name="check" size={14} /> : <Icon name={module.icon} size={15} />}
                    </span>
                    <span className="hidden md:inline min-w-0">
                      <span className="block truncate text-[12px] font-black">{module.title}</span>
                      <span className={`block text-[10px] font-semibold ${active ? "text-white/75" : "text-[#767586]"}`}>Module {module.stepIndex}</span>
                    </span>
                  </button>
                );
              })}

              {/* Final Submit Tab */}
              <button
                onClick={() => setCurrentStep(5)}
                className={`flex items-center gap-2.5 rounded-[10px] px-3 py-2 transition text-left ${
                  currentStep === 5
                    ? "bg-[#4648d4] text-white shadow-sm"
                    : "bg-[#f8f9ff] text-[#464554] hover:bg-[#eff4ff]"
                }`}
              >
                <span className={`inline-flex size-7 shrink-0 items-center justify-center rounded-full ${
                  currentStep === 5 ? "bg-white/20" : "bg-neutral-200 text-neutral-600"
                }`}>
                  <Icon name="check" size={15} />
                </span>
                <span className="hidden md:inline min-w-0">
                  <span className="block truncate text-[12px] font-black">Submit</span>
                  <span className={`block text-[10px] font-semibold ${currentStep === 5 ? "text-white/75" : "text-[#767586]"}`}>Finish</span>
                </span>
              </button>
            </div>
          </div>
        </nav>
      )}

      {/* Main Panel Content Area */}
      <section className="flex-1 mx-auto w-full max-w-[1280px] px-5 py-8 sm:px-8 lg:px-12 flex flex-col justify-center">

        {/* STEP 0: Welcome / Start Panel */}
        {currentStep === 0 && (
          <section className="mx-auto max-w-[880px] w-full overflow-hidden rounded-[24px] border border-[#d3e4fe] bg-white shadow-[0_18px_55px_rgba(15,23,42,0.05)]">
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
                <div className="flex items-center justify-center gap-3 rounded-[10px] bg-white px-4 py-3 text-center sm:justify-start sm:text-left shadow-sm">
                  <Icon className="text-[#4648d4]" name="user" size={20} />
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-[#464554]">Candidate</p>
                    <p className="text-[15px] font-black text-[#0b1c30]">{candidate.name}</p>
                  </div>
                </div>
                <div className="flex items-center justify-center gap-3 rounded-[10px] bg-white px-4 py-3 text-center sm:justify-start sm:text-left shadow-sm">
                  <Icon className="text-[#4648d4]" name="clock" size={20} />
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-[#464554]">Estimated duration</p>
                    <p className="text-[15px] font-black text-[#0b1c30]">{candidate.duration}</p>
                  </div>
                </div>
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
                    "Your progress is saved automatically during the assessment.",
                    "AI feedback supports review and is not a final hiring decision.",
                  ].map((instruction) => (
                    <li className="flex items-start gap-2" key={instruction}>
                      <Icon className="mt-1 shrink-0 text-[#4648d4]" name="check" size={15} />
                      <span>{instruction}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mx-auto mt-8 max-w-sm">
                <Button
                  onClick={() => setCurrentStep(1)}
                  className="h-12 w-full rounded-[8px] !bg-[#4648d4] !text-[15px] !text-white hover:!bg-[#6063ee]"
                  type="button"
                >
                  Start Assessment
                  <Icon name="chevron" size={16} className="-rotate-90" />
                </Button>
              </div>
            </div>
          </section>
        )}

        {/* STEP 1: AI Interview Chat */}
        {currentStep === 1 && (
          <section className="mx-auto max-w-[1000px] w-full rounded-[24px] border border-[#d3e4fe] bg-white shadow-[0_18px_55px_rgba(15,23,42,0.05)] overflow-hidden">
            <div className="flex items-center justify-between border-b border-[#d3e4fe] px-6 py-4">
              <div className="flex items-center gap-3">
                <span className="inline-flex size-10 items-center justify-center rounded-full bg-[#e1e0ff] text-[#4648d4]">
                  <Icon name="message" size={21} />
                </span>
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#4648d4]">Module 1 of 4</p>
                  <h2 className="text-[20px] font-black tracking-[-0.02em] text-[#0b1c30]">AI Interview Chat</h2>
                </div>
              </div>
              <span className="text-[13px] font-bold text-neutral-400">15 min duration</span>
            </div>

            <div className="grid gap-5 p-5 lg:grid-cols-[1fr_310px] sm:p-6">
              <div className="flex flex-col overflow-hidden rounded-[18px] border border-[#d3e4fe] bg-[#fafbff]">
                <div className="flex items-center gap-3 border-b border-[#d3e4fe] bg-white px-5 py-4">
                  <span className="inline-flex size-10 items-center justify-center rounded-full bg-[#e1e0ff] text-[#4648d4]">
                    <Icon name="sparkle" size={20} />
                  </span>
                  <div>
                    <h3 className="text-[16px] font-black text-[#0b1c30]">Technical Interviewer</h3>
                    <p className="text-[12px] font-semibold text-[#464554]">Evalora AI model</p>
                  </div>
                </div>

                <div className="flex-1 space-y-5 px-5 py-6 min-h-[300px] max-h-[450px] overflow-y-auto">
                  {chatMessages.map((msg, idx) => {
                    const isCandidate = msg.sender === "candidate";
                    return (
                      <div className={`flex gap-3 ${isCandidate ? "justify-end" : "justify-start"}`} key={idx}>
                        {!isCandidate && (
                          <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-[#e1e0ff] text-[#4648d4]">
                            <Icon name="sparkle" size={15} />
                          </span>
                        )}
                        <div className={`max-w-[70%] rounded-2xl p-4 text-[14px] leading-6 shadow-sm ${
                          isCandidate
                            ? "rounded-tr-sm bg-[#4648d4] text-white"
                            : "rounded-tl-sm border border-[#d3e4fe] border-l-[3px] border-l-[#8b5cf6] bg-white text-[#0b1c30]"
                        }`}>
                          {msg.text}
                        </div>
                        {isCandidate && (
                          <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-[#4648d4] text-[13px] font-black text-white">
                            C
                          </span>
                        )}
                      </div>
                    );
                  })}

                  {aiTyping && (
                    <div className="flex gap-3 justify-start">
                      <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-[#e1e0ff] text-[#4648d4]">
                        <Icon name="sparkle" size={15} />
                      </span>
                      <div className="rounded-2xl border border-[#d3e4fe] bg-white px-5 py-3 text-[#4648d4] shadow-sm font-bold">
                        Thinking...
                      </div>
                    </div>
                  )}
                </div>

                <div className="border-t border-[#d3e4fe] bg-white p-4">
                  <div className="flex min-h-[64px] items-center gap-3 rounded-[16px] border border-[#c7c4d7] bg-white px-4 shadow-sm focus-within:border-[#4648d4] focus-within:ring-4 focus-within:ring-[#e1e0ff]">
                    <textarea
                      value={aiInputValue}
                      onChange={(e) => setAiInputValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleSendAiMessage();
                        }
                      }}
                      className="min-h-[44px] flex-1 resize-none bg-transparent py-3 text-[14px] outline-none placeholder:text-neutral-400"
                      placeholder="Type your detailed response..."
                    />
                    <button
                      onClick={handleSendAiMessage}
                      className="inline-flex size-10 shrink-0 items-center justify-center rounded-[10px] bg-[#4648d4] text-white transition hover:bg-[#6063ee]"
                      type="button"
                    >
                      <Icon name="paperPlane" size={18} />
                    </button>
                  </div>
                </div>
              </div>

              <aside className="rounded-[18px] border border-[#d3e4fe] bg-white p-5 shadow-sm h-fit">
                <h3 className="flex items-center gap-2 text-[15px] font-black text-[#0b1c30]">
                  <Icon className="text-amber-600" name="question" size={18} /> Interview Tips
                </h3>
                <div className="mt-4 space-y-4">
                  {interviewTips.map((tip) => (
                    <div className="flex gap-3" key={tip}>
                      <Icon className="mt-0.5 shrink-0 text-[#4648d4]" name="check" size={16} />
                      <p className="text-[13px] leading-5 text-[#464554]">{tip}</p>
                    </div>
                  ))}
                </div>
              </aside>
            </div>

            {/* Step Actions */}
            <div className="border-t border-[#d3e4fe] p-4 bg-neutral-50 flex justify-between">
              <button
                onClick={() => setCurrentStep(0)}
                className="h-11 rounded-[8px] border border-neutral-300 bg-white px-5 text-[14px] font-bold text-neutral-700 transition hover:bg-neutral-50"
              >
                Back to Welcome
              </button>
              <button
                onClick={() => setCurrentStep(2)}
                className="h-11 rounded-[8px] bg-[#4648d4] px-6 text-[14px] font-bold text-white shadow-sm transition hover:bg-[#6063ee] flex items-center gap-2"
              >
                Next: Coding Assessment
                <Icon name="chevron" size={16} className="-rotate-90" />
              </button>
            </div>
          </section>
        )}

        {/* STEP 2: Coding Assessment */}
        {currentStep === 2 && (
          <CandidateCodingAssessment
            sessionId={sessionId}
            onBack={() => setCurrentStep(1)}
            onContinue={() => setCurrentStep(3)}
          />
        )}

        {/* STEP 3: Behavioral Assessment */}
        {currentStep === 3 && (
          <section className="mx-auto max-w-[1000px] w-full rounded-[24px] border border-[#d3e4fe] bg-white shadow-[0_18px_55px_rgba(15,23,42,0.05)] overflow-hidden">
            <div className="flex items-center justify-between border-b border-[#d3e4fe] px-6 py-4">
              <div className="flex items-center gap-3">
                <span className="inline-flex size-10 items-center justify-center rounded-full bg-[#e1e0ff] text-[#4648d4]">
                  <Icon name="sparkle" size={21} />
                </span>
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#4648d4]">Module 3 of 4</p>
                  <h2 className="text-[20px] font-black tracking-[-0.02em] text-[#0b1c30]">Behavioral Assessment</h2>
                </div>
              </div>
              <span className="text-[13px] font-bold text-neutral-400">10 min duration</span>
            </div>

            <div className="grid gap-6 p-5 lg:grid-cols-[1fr_340px] sm:p-6">
              <div className="space-y-6">

                {/* Question 1 */}
                <section className="rounded-[18px] border border-[#d3e4fe] border-l-[#8b5cf6] border-l-2 bg-white p-5 shadow-sm sm:p-6">
                  <div className="mb-5 flex items-start gap-4">
                    <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-[#6063ee] text-[16px] font-black text-white">1</span>
                    <h3 className="text-[20px] font-black leading-7 tracking-[-0.02em] text-[#0b1c30]">When a deadline suddenly changes, what do you usually do first?</h3>
                  </div>
                  <div className="space-y-3">
                    {[
                      "Start working immediately without asking questions",
                      "Re-prioritize tasks and discuss with the team",
                      "Ask for clarification before making changes",
                      "Wait until the manager gives more instructions",
                    ].map((option, index) => (
                      <label
                        className={`flex min-h-[58px] cursor-pointer items-center gap-3 rounded-[10px] border px-4 transition ${
                          deadlineAnswer === index ? "border-[#4648d4] bg-slate-50" : "border-[#c7c4d7] bg-white hover:border-[#4648d4]"
                        }`}
                        key={option}
                      >
                        <input
                          type="radio"
                          name="deadline-response"
                          checked={deadlineAnswer === index}
                          onChange={() => handleBehavioralChange(() => setDeadlineAnswer(index))}
                          className="size-5 accent-[#4648d4]"
                        />
                        <span className="text-[14px] font-medium text-[#0b1c30]">{String.fromCharCode(65 + index)}. {option}</span>
                      </label>
                    ))}
                  </div>
                </section>

                {/* Question 2 */}
                <section className="rounded-[18px] border border-[#d3e4fe] border-l-[#8b5cf6] border-l-2 bg-white p-5 shadow-sm sm:p-6">
                  <div className="mb-5 flex items-start gap-4">
                    <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-[#6063ee] text-[16px] font-black text-white">2</span>
                    <h3 className="text-[20px] font-black leading-7 tracking-[-0.02em] text-[#0b1c30]">I prefer working...</h3>
                  </div>
                  <div className="px-4 py-6">
                    <div className="mb-6 flex justify-between text-[11px] font-bold text-[#0b1c30]">
                      <span>1: Independently</span>
                      <span>3: Mixed</span>
                      <span>5: With a team</span>
                    </div>
                    <div className="relative flex items-center justify-between">
                      <div className="absolute left-5 right-5 top-1/2 h-1 -translate-y-1/2 rounded-full bg-[#dce9ff]" />
                      <div className="absolute left-5 top-1/2 h-1 -translate-y-1/2 rounded-full bg-[#4648d4]" style={{ right: `${100 - ((collaborationValue - 1) * 25)}%` }} />
                      {[1, 2, 3, 4, 5].map((val) => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => handleBehavioralChange(() => setCollaborationValue(val))}
                          className={`relative z-10 inline-flex size-11 items-center justify-center rounded-full border-2 text-[14px] font-black shadow-sm transition ${
                            val === collaborationValue
                              ? "border-[#4648d4] bg-[#4648d4] text-white"
                              : "border-[#c7c4d7] bg-white text-[#464554] hover:border-[#4648d4]"
                          }`}
                        >
                          {val}
                        </button>
                      ))}
                    </div>
                  </div>
                </section>

                {/* Question 3 */}
                <section className="rounded-[18px] border border-[#d3e4fe] border-l-[#8b5cf6] border-l-2 bg-white p-5 shadow-sm sm:p-6">
                  <div className="mb-5 flex items-start gap-4">
                    <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-[#6063ee] text-[16px] font-black text-white">3</span>
                    <h3 className="text-[20px] font-black leading-7 tracking-[-0.02em] text-[#0b1c30]">Describe a time you had to adjust priorities because multiple tasks were urgent.</h3>
                  </div>
                  <textarea
                    value={priorityExplanation}
                    onChange={(e) => handleBehavioralChange(() => setPriorityExplanation(e.target.value))}
                    className="min-h-[120px] w-full resize-y rounded-[10px] border border-[#c7c4d7] bg-white p-4 text-[14px] outline-none transition placeholder:text-neutral-400 focus:border-[#4648d4] focus:ring-4 focus:ring-[#e1e0ff]"
                    placeholder="Type your response here..."
                  />
                </section>
              </div>

              <aside className="h-fit rounded-[18px] border border-[#d3e4fe] bg-white p-5 shadow-sm">
                <p className="text-[12px] font-black uppercase tracking-[0.2em] text-[#464554]">Module Progress</p>
                <div className="mt-5 flex items-center justify-between text-[13px] font-bold text-[#0b1c30]">
                  <span>Questions completed</span>
                  <span className="text-[#4648d4]">{getBehavioralCompletedCount()} / 3</span>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#dce9ff]">
                  <div
                    className="h-full rounded-full bg-[#4648d4] transition-all duration-300"
                    style={{ width: `${(getBehavioralCompletedCount() / 3) * 100}%` }}
                  />
                </div>
                <div className="mt-6 flex items-center gap-3 rounded-[10px] bg-[#eaf1ff] p-4 text-[14px] font-medium text-[#464554]">
                  <Icon className="text-emerald-600" name="check" size={19} />
                  <span>
                    {behavioralSaving ? "Saving responses..." : "Responses saved automatically"}
                  </span>
                </div>
              </aside>
            </div>

            {/* Step Actions */}
            <div className="border-t border-[#d3e4fe] p-4 bg-neutral-50 flex justify-between">
              <button
                onClick={() => setCurrentStep(2)}
                className="h-11 rounded-[8px] border border-neutral-300 bg-white px-5 text-[14px] font-bold text-neutral-700 transition hover:bg-neutral-50"
              >
                Previous Module
              </button>
              <button
                onClick={() => setCurrentStep(4)}
                className="h-11 rounded-[8px] bg-[#4648d4] px-6 text-[14px] font-bold text-white shadow-sm transition hover:bg-[#6063ee] flex items-center gap-2"
              >
                Next: Leadership Scenario
                <Icon name="chevron" size={16} className="-rotate-90" />
              </button>
            </div>
          </section>
        )}

        {/* STEP 4: Leadership Scenario */}
        {currentStep === 4 && (
          <section className="mx-auto max-w-[1000px] w-full rounded-[24px] border border-[#d3e4fe] bg-white shadow-[0_18px_55px_rgba(15,23,42,0.05)] overflow-hidden">
            <div className="flex items-center justify-between border-b border-[#d3e4fe] px-6 py-4">
              <div className="flex items-center gap-3">
                <span className="inline-flex size-10 items-center justify-center rounded-full bg-[#e1e0ff] text-[#4648d4]">
                  <Icon name="users" size={21} />
                </span>
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#4648d4]">Module 4 of 4</p>
                  <h2 className="text-[20px] font-black tracking-[-0.02em] text-[#0b1c30]">Leadership Scenario</h2>
                </div>
              </div>
              <span className="text-[13px] font-bold text-neutral-400">10 min duration</span>
            </div>

            <div className="grid gap-6 p-5 lg:grid-cols-[1fr_330px] sm:p-6">
              <section className="rounded-[18px] border border-[#d3e4fe] bg-[#f8f9ff] p-6">
                <p className="text-[12px] font-black uppercase tracking-[0.2em] text-[#4648d4]">Scenario</p>
                <h3 className="mt-3 text-[22px] font-black tracking-[-0.02em] text-[#0b1c30]">Two teams disagree on release priority</h3>
                <p className="mt-4 text-[15px] leading-7 text-[#464554]">
                  A release is at risk because product and engineering disagree on what should ship first. The candidate should explain how they would align the group, protect customer impact, and communicate next steps.
                  Answer based on your real experience.
                </p>
                <textarea
                  value={leadershipResponse}
                  onChange={(e) => handleLeadershipChange(e.target.value)}
                  className="mt-6 min-h-[200px] w-full resize-y rounded-[12px] border border-[#c7c4d7] bg-white p-4 text-[14px] outline-none transition placeholder:text-neutral-400 focus:border-[#4648d4] focus:ring-4 focus:ring-[#e1e0ff]"
                  placeholder="Write your leadership response here..."
                />
                <div className="mt-2 text-right text-[11px] text-[#464554]">
                  {leadershipSaving ? "Saving progress..." : "Progress saved automatically"}
                </div>
              </section>

              <aside className="space-y-4">
                <div className="rounded-[18px] border border-[#d3e4fe] bg-white p-5 shadow-sm">
                  <p className="text-[15px] font-black text-[#0b1c30]">What reviewers look for</p>
                  <ul className="mt-4 space-y-3 text-[13px] text-[#464554]">
                    {[
                      "Clarifies shared goal",
                      "Communicates trade-offs",
                      "Escalates calmly",
                      "Protects customer impact"
                    ].map((item) => (
                      <li className="flex items-center gap-2" key={item}>
                        <Icon className="text-[#4648d4]" name="check" size={15} /> {item}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="rounded-[18px] border border-amber-200 bg-amber-50 p-5 text-[13px] leading-5 text-amber-900">
                  <p className="font-black">Before continuing</p>
                  <p className="mt-2">Use work-safe examples only. Do not share private company, customer, or salary information.</p>
                </div>
              </aside>
            </div>

            {/* Step Actions */}
            <div className="border-t border-[#d3e4fe] p-4 bg-neutral-50 flex justify-between">
              <button
                onClick={() => setCurrentStep(3)}
                className="h-11 rounded-[8px] border border-neutral-300 bg-white px-5 text-[14px] font-bold text-neutral-700 transition hover:bg-neutral-50"
              >
                Previous Module
              </button>
              <button
                onClick={() => setCurrentStep(5)}
                className="h-11 rounded-[8px] bg-[#4648d4] px-6 text-[14px] font-bold text-white shadow-sm transition hover:bg-[#6063ee] flex items-center gap-2"
              >
                Review & Submit
                <Icon name="chevron" size={16} className="-rotate-90" />
              </button>
            </div>
          </section>
        )}

        {/* STEP 5: Final Submission Panel */}
        {currentStep === 5 && (
          <section className="mx-auto max-w-[880px] w-full rounded-[24px] border border-[#d3e4fe] bg-white p-6 text-center shadow-[0_18px_55px_rgba(15,23,42,0.05)] sm:p-10">
            <span className="mx-auto inline-flex size-20 items-center justify-center rounded-full bg-[#dce9ff] text-emerald-600 shadow-[0_0_45px_rgba(16,185,129,0.22)]">
              <Icon name="check" size={42} />
            </span>
            <h2 className="mt-5 text-[30px] font-black tracking-[-0.03em] text-[#0b1c30]">Ready to submit?</h2>
            <p className="mx-auto mt-3 max-w-xl text-[15px] leading-6 text-[#464554]">
              Review your answers before final submission. After submission, your access link will close and authorized reviewers can generate the candidate report.
            </p>

            <div className="mx-auto mt-8 grid max-w-2xl gap-4 rounded-[18px] border border-[#d3e4fe] bg-[#f8f9ff] p-5 text-left sm:grid-cols-2">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#464554]">Candidate</p>
                <p className="mt-1 flex items-center gap-2 text-[15px] font-black text-[#0b1c30]">
                  <Icon className="text-[#767586]" name="user" size={17} /> {candidate.name}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#464554]">Assessment</p>
                <p className="mt-1 flex items-center gap-2 text-[15px] font-black text-[#0b1c30]">
                  <Icon className="text-[#767586]" name="clipboard" size={17} /> {candidate.assessment}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#464554]">Completed modules</p>
                <p className="mt-1 flex items-center gap-2 text-[15px] font-black text-[#0b1c30]">
                  <Icon className="text-[#767586]" name="check" size={17} /> 4 / 4
                </p>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#464554]">Session</p>
                <p className="mt-1 flex items-center gap-2 text-[15px] font-black text-[#0b1c30]">
                  <Icon className="text-[#767586]" name="clock" size={17} /> {sessionId}
                </p>
              </div>
            </div>

            <div className="mt-8 rounded-[14px] bg-[#eaf1ff] p-4 text-[13px] leading-6 text-[#464554]">
              Your responses will be reviewed by a human interviewer. AI feedback supports review and is not the final hiring decision.
            </div>

            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <button
                onClick={() => setCurrentStep(4)}
                className="h-12 rounded-[8px] border border-neutral-300 bg-white px-6 text-[14px] font-bold text-neutral-700 transition hover:bg-neutral-50"
              >
                Back to Leadership
              </button>
              <button
                onClick={() => setCurrentStep(6)}
                className="h-12 rounded-[8px] bg-[#4648d4] px-8 text-[14px] font-bold text-white hover:bg-[#6063ee] transition flex items-center gap-2"
                type="button"
              >
                Submit assessment
                <Icon name="check" size={17} />
              </button>
            </div>
            <p className="mt-5 text-[11px] font-semibold text-[#767586]">No dashboard account is required for candidates. You may close this page after submission.</p>
          </section>
        )}

      </section>
    </main>
  );
}

function WelcomeBotIcon() {
  return (
    <svg aria-hidden="true" className="h-[46px] w-[46px] shrink-0" viewBox="0 0 52 52" fill="none">
      <path d="M20 8L37 17.7V36.9L20 46.5L3 36.9V17.7L20 8Z" fill="#32C5F4" stroke="#151455" strokeWidth="4" strokeLinejoin="round" />
      <path d="M8 31L18 36.5L18 45" stroke="#151455" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M6 37L2 43L9 41" stroke="#151455" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M37 27L47 32.5L37 38" stroke="#151455" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="15.5" cy="23" r="2" fill="#151455" />
      <circle cx="24.5" cy="27" r="2" fill="#151455" />
      <path d="M14 32.5C18 35 23.5 35.4 28 33" stroke="#151455" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

function WelcomeFeature({ bordered = false, description, icon, title }: { bordered?: boolean; description: string; icon: IconName; title: string }) {
  return (
    <div className={`flex items-start gap-4 ${bordered ? "sm:border-l sm:border-[#cfd3df] sm:pl-6" : ""}`}>
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#d9d4ff] text-[#5d4dff]">
        <Icon name={icon} size={18} />
      </span>
      <div>
        <h2 className="text-[11px] font-black text-[#050505]">{title}</h2>
        <p className="mt-3 max-w-[150px] text-[11px] font-medium leading-4 text-[#050505]">{description}</p>
      </div>
    </div>
  );
}
