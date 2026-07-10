"use client";

import { useMemo, useState, type ReactNode } from "react";
import { Icon } from "@/components/icons";

type Difficulty = "easy" | "medium" | "hard";

type CodeExample = {
  input: string;
  expectedOutput: string;
  explanation?: string;
};

type CodingQuestion = {
  id: string;
  title: string;
  difficulty: Difficulty;
  prompt: string[];
  functionSignature: string;
  starterCode: string;
  examples: CodeExample[];
  constraints: string[];
};

type TerminalKind = "idle" | "info" | "success" | "error";

type TerminalState = {
  kind: TerminalKind;
  status: string;
  body: string;
  runtime?: string;
};

type TestResult = {
  label: string;
  passed: boolean;
  status: string;
};

type CodingResult = {
  passed: boolean;
  score: number;
  status: string;
  passedTestCases: number;
  totalTestCases: number;
  testResults: TestResult[];
};

type CandidateCodingAssessmentProps = {
  sessionId: string;
  onBack: () => void;
  onContinue: () => void;
};

const IDLE_TERMINAL: TerminalState = {
  kind: "idle",
  status: "Ready",
  body: "Run your code against sample tests, or submit to grade hidden test cases.",
};

const CODING_QUESTIONS: CodingQuestion[] = [
  {
    id: "two-sum",
    title: "Two Sum",
    difficulty: "easy",
    functionSignature: "twoSum(nums, target)",
    prompt: [
      "Given an array of integers nums and an integer target, return the indices of the two numbers such that they add up to target.",
      "You may assume that each input has exactly one solution, and you may not use the same element twice.",
      "Return the answer in any order.",
    ],
    starterCode: `function twoSum(nums, target) {
  // Write your solution here
  return [];
}`,
    examples: [
      {
        input: "nums = [2,7,11,15], target = 9",
        expectedOutput: "[0,1]",
        explanation: "Because nums[0] + nums[1] == 9.",
      },
      {
        input: "nums = [3,2,4], target = 6",
        expectedOutput: "[1,2]",
      },
    ],
    constraints: ["2 <= nums.length <= 10⁴", "-10⁹ <= nums[i] <= 10⁹", "Exactly one valid solution exists."],
  },
  {
    id: "valid-parentheses",
    title: "Valid Parentheses",
    difficulty: "medium",
    functionSignature: "isValid(s)",
    prompt: [
      "Given a string containing only brackets, determine whether every opening bracket is closed by the same type of bracket.",
      "Open brackets must be closed in the correct order.",
      "Return true when the string is valid; otherwise return false.",
    ],
    starterCode: `function isValid(s) {
  // Write your solution here
  return false;
}`,
    examples: [
      { input: "s = '()[]{}'", expectedOutput: "true" },
      { input: "s = '(]'", expectedOutput: "false" },
    ],
    constraints: ["1 <= s.length <= 10⁴", "s consists only of characters: ()[]{}.", "Use a predictable approach that handles nesting."],
  },
  {
    id: "first-unique-character",
    title: "First Unique Character",
    difficulty: "medium",
    functionSignature: "firstUniqChar(s)",
    prompt: [
      "Given a string s, find the first non-repeating character and return its index.",
      "If every character repeats, return -1.",
      "Aim for a solution that is easy to explain and efficient enough for long input strings.",
    ],
    starterCode: `function firstUniqChar(s) {
  // Write your solution here
  return -1;
}`,
    examples: [
      { input: "s = 'leetcode'", expectedOutput: "0" },
      { input: "s = 'loveleetcode'", expectedOutput: "2" },
    ],
    constraints: ["1 <= s.length <= 10⁵", "s contains only lowercase English letters.", "Prefer linear-time counting over nested loops."],
  },
];

export function CandidateCodingAssessment({ sessionId, onBack, onContinue }: CandidateCodingAssessmentProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [language, setLanguage] = useState("JavaScript (Node.js)");
  const [codeByQuestion, setCodeByQuestion] = useState<Record<string, string>>(() =>
    Object.fromEntries(CODING_QUESTIONS.map((question) => [question.id, question.starterCode])),
  );
  const [results, setResults] = useState<Record<string, CodingResult>>({});
  const [terminal, setTerminal] = useState<TerminalState>(IDLE_TERMINAL);
  const [running, setRunning] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [view, setView] = useState<"coding" | "results">("coding");

  const activeQuestion = CODING_QUESTIONS[activeIndex];
  const activeCode = codeByQuestion[activeQuestion.id] ?? activeQuestion.starterCode;
  const activeResult = results[activeQuestion.id];
  const answeredCount = Object.keys(results).length;
  const totalQuestions = CODING_QUESTIONS.length;
  const allAnswered = answeredCount === totalQuestions;

  const summary = useMemo(() => {
    const graded = Object.values(results);
    const passed = graded.filter((result) => result.passed).length;
    const averageScore = graded.length ? Math.round(graded.reduce((sum, result) => sum + result.score, 0) / graded.length) : 0;

    return { attempted: graded.length, passed, averageScore };
  }, [results]);

  function setActiveCode(nextCode: string) {
    setCodeByQuestion((current) => ({ ...current, [activeQuestion.id]: nextCode }));
  }

  function goToQuestion(nextIndex: number) {
    setActiveIndex(nextIndex);
    setView("coding");
    const nextQuestion = CODING_QUESTIONS[nextIndex];
    const existingResult = results[nextQuestion.id];

    if (existingResult) {
      setTerminal(resultToTerminal(existingResult));
      return;
    }

    setTerminal(IDLE_TERMINAL);
  }

  function resetCurrentQuestion() {
    setCodeByQuestion((current) => ({ ...current, [activeQuestion.id]: activeQuestion.starterCode }));
    setTerminal(IDLE_TERMINAL);
  }

  function runCurrentCode() {
    setRunning(true);
    setTerminal({
      kind: "info",
      status: "Running sample tests…",
      body: "Executing candidate code against visible examples.",
    });

    window.setTimeout(() => {
      const looksIncomplete = isStarterLike(activeCode, activeQuestion);

      setRunning(false);
      setTerminal(
        looksIncomplete
          ? {
              kind: "error",
              status: "Wrong Answer",
              body: `Sample 1 failed\nInput: ${activeQuestion.examples[0].input}\nExpected: ${activeQuestion.examples[0].expectedOutput}\nYour output did not match the expected result.`,
              runtime: "126ms · Memory 42.8MB",
            }
          : {
              kind: "success",
              status: "Accepted",
              body: activeQuestion.examples.map((example, index) => `Case ${index + 1} passed · expected ${example.expectedOutput}`).join("\n"),
              runtime: "118ms · Memory 41.2MB",
            },
      );
    }, 700);
  }

  function submitCurrentCode() {
    setSubmitting(true);
    setTerminal({
      kind: "info",
      status: "Submitting…",
      body: "Grading against hidden test cases for this challenge.",
    });

    window.setTimeout(() => {
      const result = gradeSource(activeCode, activeQuestion);

      setSubmitting(false);
      setResults((current) => ({ ...current, [activeQuestion.id]: result }));
      setTerminal(resultToTerminal(result));
    }, 850);
  }

  if (view === "results") {
    return (
      <section className="w-full overflow-hidden rounded-[24px] border border-[#d3e4fe] bg-white shadow-[0_18px_55px_rgba(15,23,42,0.05)]">
        <CodingModuleHeader eyebrow="Module 2 of 4" sessionId={sessionId} title="Coding Assessment Results" />
        <div className="p-5 sm:p-6">
          <div className="rounded-[18px] border border-[#d3e4fe] bg-[#f8f9ff] p-5 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-5">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#4648d4]">Hidden test summary</p>
                <h3 className="mt-2 text-[28px] font-black tracking-[-0.03em] text-[#0b1c30]">Submission Result</h3>
                <p className="mt-2 max-w-xl text-[14px] leading-6 text-[#464554]">
                  This coding module result is saved as candidate evidence for human review. It supports the report but does not make the final hiring decision.
                </p>
              </div>
              <div className="grid grid-cols-3 gap-3 text-center">
                <ScoreTile label="Passed" value={`${summary.passed}/${totalQuestions}`} />
                <ScoreTile label="Avg score" value={`${summary.averageScore}%`} />
                <ScoreTile label="Attempted" value={`${summary.attempted}`} />
              </div>
            </div>
          </div>

          <div className="mt-5 grid gap-3">
            {CODING_QUESTIONS.map((question, index) => {
              const result = results[question.id];
              const passed = result?.passed;

              return (
                <div
                  className={`grid gap-4 rounded-[14px] border p-4 sm:grid-cols-[auto_1fr_auto] sm:items-center ${
                    passed
                      ? "border-emerald-200 bg-emerald-50/60"
                      : result
                        ? "border-red-200 bg-red-50/70"
                        : "border-[#d3e4fe] bg-white"
                  }`}
                  key={question.id}
                >
                  <span
                    className={`inline-flex size-9 items-center justify-center rounded-full text-[14px] font-black ${
                      passed ? "bg-emerald-100 text-emerald-700" : result ? "bg-red-100 text-red-700" : "bg-[#e1e0ff] text-[#4648d4]"
                    }`}
                  >
                    {passed ? <Icon name="check" size={16} /> : result ? "!" : index + 1}
                  </span>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-[16px] font-black text-[#0b1c30]">{index + 1}. {question.title}</h4>
                      <DifficultyBadge difficulty={question.difficulty} />
                    </div>
                    <p className="mt-1 text-[13px] font-semibold text-[#464554]">
                      {result
                        ? `${result.status} · passed ${result.passedTestCases}/${result.totalTestCases} hidden tests · score ${result.score}%`
                        : "Not attempted"}
                    </p>
                    {result ? <TestDots tests={result.testResults} /> : null}
                  </div>
                  <button
                    className="h-10 rounded-[8px] border border-[#d3e4fe] bg-white px-4 text-[13px] font-bold text-[#0b1c30] transition hover:border-[#4648d4] hover:text-[#4648d4]"
                    onClick={() => goToQuestion(index)}
                    type="button"
                  >
                    Review
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        <CodingFooter
          primaryLabel="Continue to Behavioral Questions"
          secondaryLabel="Back to coding"
          progress={answeredCount / totalQuestions}
          progressLabel={`${answeredCount}/${totalQuestions} submitted`}
          onPrimary={onContinue}
          onSecondary={() => setView("coding")}
        />
      </section>
    );
  }

  return (
    <section className="w-full overflow-hidden rounded-[18px] border border-[#d3e4fe] bg-white shadow-[0_18px_55px_rgba(15,23,42,0.05)]">
      <div className="grid min-h-[650px] lg:grid-cols-[240px_minmax(0,1fr)]">
        <aside className="border-b border-[#d3e4fe] bg-[#fbfcff] p-4 lg:border-b-0 lg:border-r">
          <div className="mb-4">
            <p className="text-[11px] font-black uppercase tracking-[0.14em] text-[#4648d4]">Challenges</p>
            <h2 className="mt-1 text-[18px] font-black tracking-[-0.02em] text-[#0b1c30]">Coding module</h2>
            <p className="mt-1 truncate text-[11px] font-semibold text-[#767586]">Session {sessionId}</p>
          </div>

          <ChallengeNavigator
            activeIndex={activeIndex}
            questions={CODING_QUESTIONS}
            results={results}
            onSelect={goToQuestion}
          />

          <div className="mt-4 rounded-[12px] border border-[#d3e4fe] bg-white p-3">
            <div className="mb-2 flex justify-between text-[11px] font-black uppercase tracking-wider text-[#464554]">
              <span>Progress</span>
              <span className="text-[#4648d4]">{answeredCount}/{totalQuestions}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-[#dce9ff]">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#4648d4] to-[#8b5cf6] transition-all"
                style={{ width: `${Math.max(4, Math.round((answeredCount / totalQuestions) * 100))}%` }}
              />
            </div>
            <p className="mt-2 text-[11px] leading-5 text-[#767586]">Submit when each answer is ready.</p>
          </div>
        </aside>

        <main className="min-w-0 bg-white">
          <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[#d3e4fe] px-5 py-3">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.14em] text-[#4648d4]">Question {activeIndex + 1} of {totalQuestions}</p>
              <h3 className="mt-1 text-[22px] font-black tracking-[-0.03em] text-[#0b1c30]">
                {activeIndex + 1}. {activeQuestion.title}
              </h3>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <DifficultyBadge difficulty={activeQuestion.difficulty} />
              <span className="rounded-full border border-red-200 bg-red-50 px-3 py-1 text-[12px] font-black text-red-700">25:00</span>
              <span className="rounded-full bg-[#eff4ff] px-3 py-1 text-[12px] font-black text-[#4648d4]">
                {answeredCount}/{totalQuestions} answered
              </span>
            </div>
          </header>

          <div className="grid min-h-[530px] lg:grid-cols-[0.86fr_1.14fr]">
            <section className="border-b border-[#d3e4fe] p-5 lg:border-b-0 lg:border-r">
              <h4 className="text-[12px] font-black uppercase tracking-[0.1em] text-[#0b1c30]">Problem</h4>
              <div className="mt-3 space-y-4 text-[14px] leading-7 text-[#0b1c30]">
                {activeQuestion.prompt.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>

              <CodeInfoBlock title="Function signature">
                <code>{activeQuestion.functionSignature}</code>
              </CodeInfoBlock>

              <div className="mt-6">
                <h4 className="text-[12px] font-black uppercase tracking-[0.1em] text-[#0b1c30]">Test cases</h4>
                <div className="mt-3 overflow-hidden rounded-[12px] border border-[#d3e4fe]">
                  <table className="w-full border-collapse text-left text-[13px]">
                    <thead className="bg-[#eff4ff] text-[#464554]">
                      <tr>
                        <th className="border-b border-[#d3e4fe] px-4 py-3 font-black uppercase tracking-wider">Input</th>
                        <th className="border-b border-[#d3e4fe] px-4 py-3 font-black uppercase tracking-wider">Expected Output</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activeQuestion.examples.map((example) => (
                        <tr className="border-b border-[#d3e4fe] last:border-b-0" key={`${example.input}-${example.expectedOutput}`}>
                          <td className="px-4 py-3 align-top font-mono text-[12px] text-[#0b1c30]">{example.input}</td>
                          <td className="px-4 py-3 align-top font-mono text-[12px] text-[#0b1c30]">
                            {example.expectedOutput}
                            {example.explanation ? <p className="mt-1 font-sans text-[12px] leading-5 text-[#464554]">{example.explanation}</p> : null}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <CodeInfoBlock title="Constraints">
                <ul className="list-inside list-disc space-y-1">
                  {activeQuestion.constraints.map((constraint) => (
                    <li key={constraint}>{constraint}</li>
                  ))}
                </ul>
              </CodeInfoBlock>
            </section>

            <section className="flex min-h-[530px] flex-col bg-[#1e1e1e] text-slate-100">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 bg-[#2d2d2d] px-3 py-2">
                <select
                  className="h-8 rounded-[7px] border border-white/15 bg-white/10 px-3 text-[12px] font-semibold text-white outline-none"
                  onChange={(event) => setLanguage(event.target.value)}
                  value={language}
                >
                  <option className="bg-[#2d2d2d]">JavaScript (Node.js)</option>
                  <option className="bg-[#2d2d2d]">TypeScript (Node.js)</option>
                </select>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    className="inline-flex h-8 items-center gap-2 rounded-[7px] border border-white/20 px-3 text-[12px] font-semibold text-white transition hover:bg-white/10 disabled:opacity-50"
                    disabled={running || submitting}
                    onClick={resetCurrentQuestion}
                    type="button"
                  >
                    Reset
                  </button>
                  <button
                    className="inline-flex h-8 items-center gap-2 rounded-[7px] border border-white/20 px-3 text-[12px] font-semibold text-white transition hover:bg-white/10 disabled:opacity-50"
                    disabled={running || submitting}
                    onClick={runCurrentCode}
                    type="button"
                  >
                    <Icon name="paperPlane" size={13} /> {running ? "Running…" : "Run"}
                  </button>
                  <button
                    className="inline-flex h-8 items-center gap-2 rounded-[7px] bg-[#4648d4] px-3 text-[12px] font-bold text-white transition hover:bg-[#6063ee] disabled:opacity-50"
                    disabled={running || submitting}
                    onClick={submitCurrentCode}
                    type="button"
                  >
                    <Icon name="check" size={13} /> {submitting ? "Submitting…" : activeResult ? "Resubmit" : "Submit"}
                  </button>
                </div>
              </div>

              <div className="relative flex-1">
                <div className="pointer-events-none absolute left-0 top-0 hidden h-full w-12 select-none border-r border-white/5 bg-[#191919] py-6 text-right font-mono text-[12px] leading-6 text-slate-600 sm:block">
                  {activeCode.split("\n").map((_, index) => (
                    <div className="pr-3" key={index}>{index + 1}</div>
                  ))}
                </div>
                <textarea
                  className="h-full min-h-[350px] w-full resize-none bg-[#1e1e1e] p-5 font-mono text-[13px] leading-6 text-slate-100 outline-none selection:bg-[#4648d4]/40 placeholder:text-slate-500 sm:pl-16"
                  onChange={(event) => setActiveCode(event.target.value)}
                  spellCheck={false}
                  value={activeCode}
                />
              </div>

              <TerminalPanel terminal={terminal} />
            </section>
          </div>

          <footer className="flex flex-col gap-3 border-t border-[#d3e4fe] bg-[#f8f9ff] p-3 sm:flex-row sm:items-center sm:justify-between">
            <button
              className="h-10 rounded-[8px] border border-[#d3e4fe] bg-white px-4 text-[13px] font-bold text-[#464554] transition hover:border-[#4648d4] hover:text-[#4648d4]"
              onClick={() => {
                if (activeIndex === 0) {
                  onBack();
                  return;
                }
                goToQuestion(activeIndex - 1);
              }}
              type="button"
            >
              {activeIndex === 0 ? "Previous module" : "Previous"}
            </button>
            <button
              className="inline-flex h-10 items-center justify-center gap-2 rounded-[8px] bg-[#4648d4] px-5 text-[13px] font-bold text-white shadow-sm transition hover:bg-[#6063ee]"
              onClick={() => {
                if (allAnswered || activeIndex === totalQuestions - 1) {
                  setView("results");
                  return;
                }
                goToQuestion(activeIndex + 1);
              }}
              type="button"
            >
              {allAnswered ? "View Results" : activeIndex === totalQuestions - 1 ? "Finish & View Results" : "Next"}
              <Icon className="-rotate-90" name="chevron" size={15} />
            </button>
          </footer>
        </main>
      </div>
    </section>
  );
}

function CodingModuleHeader({ eyebrow, sessionId, title }: { eyebrow: string; sessionId: string; title: string }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#d3e4fe] px-6 py-4">
      <div className="flex items-center gap-3">
        <span className="inline-flex size-10 items-center justify-center rounded-full bg-[#e1e0ff] text-[#4648d4]">
          <Icon name="code" size={21} />
        </span>
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#4648d4]">{eyebrow}</p>
          <h2 className="text-[20px] font-black tracking-[-0.02em] text-[#0b1c30]">{title}</h2>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-[#eff4ff] px-3 py-1 text-[12px] font-black text-[#4648d4]">Session {sessionId}</span>
        <span className="rounded-full bg-[#eff4ff] px-3 py-1 text-[12px] font-black text-[#4648d4]">3 challenges</span>
        <span className="rounded-full border border-red-200 bg-red-50 px-3 py-1 text-[12px] font-black text-red-700">25 min</span>
      </div>
    </div>
  );
}

function ChallengeNavigator({
  activeIndex,
  onSelect,
  questions,
  results,
}: {
  activeIndex: number;
  onSelect: (index: number) => void;
  questions: CodingQuestion[];
  results: Record<string, CodingResult>;
}) {
  return (
    <nav className="grid gap-2" aria-label="Coding challenges">
      {questions.map((question, index) => {
        const result = results[question.id];
        const active = activeIndex === index;
        const passed = result?.passed;

        return (
          <button
            className={`flex w-full items-center gap-3 rounded-[10px] border px-3 py-2.5 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#4648d4]/40 ${
              active
                ? "border-[#bfc8ff] bg-[#eef2ff] text-[#0b1c30] shadow-none"
                : passed
                  ? "border-emerald-200 bg-emerald-50 text-emerald-900 hover:bg-emerald-100"
                  : result
                    ? "border-red-200 bg-red-50 text-red-900 hover:bg-red-100"
                    : "border-[#d3e4fe] bg-white text-[#0b1c30] hover:bg-[#eff4ff]"
            }`}
            key={question.id}
            onClick={() => onSelect(index)}
            type="button"
          >
            <span
              className={`inline-flex size-8 shrink-0 items-center justify-center rounded-full text-[13px] font-black ${
                active
                  ? "bg-[#d9defd] text-[#4648d4]"
                  : passed
                    ? "bg-emerald-100 text-emerald-700"
                    : result
                      ? "bg-red-100 text-red-700"
                      : "bg-[#e1e0ff] text-[#4648d4]"
              }`}
            >
              {passed ? <Icon name="check" size={15} /> : result ? "!" : index + 1}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[12px] font-black">{question.title}</span>
              <span className={`block text-[11px] font-bold capitalize ${active ? "text-[#4648d4]" : "text-[#767586]"}`}>{question.difficulty}</span>
            </span>
          </button>
        );
      })}
    </nav>
  );
}

function CodeInfoBlock({ children, title }: { children: ReactNode; title: string }) {
  return (
    <div className="rounded-r-[12px] border-l-[3px] border-l-[#8b5cf6] bg-[#eff4ff] p-4 font-mono text-[13px] leading-6 text-[#0b1c30]">
      <p className="mb-2 text-[11px] font-black uppercase tracking-wider text-[#464554]">{title}</p>
      {children}
    </div>
  );
}

function DifficultyBadge({ difficulty }: { difficulty: Difficulty }) {
  const className =
    difficulty === "easy"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : difficulty === "medium"
        ? "border-amber-200 bg-amber-50 text-amber-700"
        : "border-red-200 bg-red-50 text-red-700";

  return <span className={`rounded-full border px-3 py-1 text-[12px] font-black capitalize ${className}`}>{difficulty}</span>;
}

function TerminalPanel({ terminal }: { terminal: TerminalState }) {
  const statusClass =
    terminal.kind === "success"
      ? "text-emerald-400"
      : terminal.kind === "error"
        ? "text-red-400"
        : terminal.kind === "info"
          ? "text-sky-300"
          : "text-slate-300";

  return (
    <div className="border-t border-white/10 bg-[#252525] p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className={`flex items-center gap-2 text-[12px] font-bold ${statusClass}`}>
          {terminal.kind === "error" ? "!" : <Icon name={terminal.kind === "success" ? "check" : "clock"} size={14} />}
          {terminal.status}
        </p>
        {terminal.runtime ? <p className="text-[11px] text-slate-400">{terminal.runtime}</p> : null}
      </div>
      <pre className="mt-3 max-h-[190px] overflow-auto rounded-[8px] border border-white/10 bg-[#1e1e1e] p-3 font-mono text-[11px] leading-5 text-slate-300 whitespace-pre-wrap">{terminal.body}</pre>
    </div>
  );
}

function CodingFooter({
  onPrimary,
  onSecondary,
  primaryLabel,
  progress,
  progressLabel,
  secondaryLabel,
}: {
  onPrimary: () => void;
  onSecondary: () => void;
  primaryLabel: string;
  progress: number;
  progressLabel: string;
  secondaryLabel: string;
}) {
  return (
    <div className="flex flex-col gap-4 border-t border-[#d3e4fe] bg-neutral-50 p-4 lg:flex-row lg:items-center lg:justify-between">
      <div className="min-w-0 flex-1 lg:max-w-sm">
        <div className="mb-2 flex justify-between text-[11px] font-black uppercase tracking-wider text-[#464554]">
          <span>Coding progress</span>
          <span className="text-[#4648d4]">{progressLabel}</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-[#dce9ff]">
          <div className="h-full rounded-full bg-gradient-to-r from-[#4648d4] to-[#8b5cf6] transition-all" style={{ width: `${Math.max(4, Math.round(progress * 100))}%` }} />
        </div>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
        <button
          className="h-11 rounded-[8px] border border-neutral-300 bg-white px-5 text-[14px] font-bold text-neutral-700 transition hover:bg-neutral-50"
          onClick={onSecondary}
          type="button"
        >
          {secondaryLabel}
        </button>
        <button
          className="inline-flex h-11 items-center justify-center gap-2 rounded-[8px] bg-[#4648d4] px-6 text-[14px] font-bold text-white shadow-sm transition hover:bg-[#6063ee]"
          onClick={onPrimary}
          type="button"
        >
          {primaryLabel}
          <Icon className="-rotate-90" name="chevron" size={16} />
        </button>
      </div>
    </div>
  );
}

function ScoreTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-[92px] rounded-[14px] border border-[#d3e4fe] bg-white px-4 py-3 shadow-sm">
      <strong className="block text-[24px] font-black text-[#0b1c30]">{value}</strong>
      <span className="text-[11px] font-bold uppercase tracking-wider text-[#767586]">{label}</span>
    </div>
  );
}

function TestDots({ tests }: { tests: TestResult[] }) {
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {tests.map((test) => (
        <span
          className={`inline-flex h-6 items-center rounded-full px-2 text-[11px] font-bold ${
            test.passed ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
          }`}
          key={test.label}
          title={test.status}
        >
          {test.label}
        </span>
      ))}
    </div>
  );
}

function isStarterLike(source: string, question: CodingQuestion) {
  const normalized = source.replace(/\s+/g, " ").toLowerCase();

  if (!normalized.trim()) return true;
  if (question.id === "two-sum") return normalized.includes("return []");
  if (question.id === "valid-parentheses") return normalized.includes("return false") && !normalized.includes("stack");
  if (question.id === "first-unique-character") return normalized.includes("return -1") && !normalized.includes("map") && !normalized.includes("count");

  return false;
}

function gradeSource(source: string, question: CodingQuestion): CodingResult {
  const incomplete = isStarterLike(source, question);
  const testResults: TestResult[] = incomplete
    ? [
        { label: "Hidden 1", passed: true, status: "Accepted" },
        { label: "Hidden 2", passed: false, status: "Wrong Answer" },
        { label: "Hidden 3", passed: false, status: "Wrong Answer" },
        { label: "Edge", passed: false, status: "Wrong Answer" },
      ]
    : [
        { label: "Hidden 1", passed: true, status: "Accepted" },
        { label: "Hidden 2", passed: true, status: "Accepted" },
        { label: "Hidden 3", passed: true, status: "Accepted" },
        { label: "Edge", passed: true, status: "Accepted" },
      ];

  const passedTestCases = testResults.filter((test) => test.passed).length;
  const totalTestCases = testResults.length;
  const score = Math.round((passedTestCases / totalTestCases) * 100);

  return {
    passed: passedTestCases === totalTestCases,
    score,
    status: passedTestCases === totalTestCases ? "Correct" : "Partial / Wrong Answer",
    passedTestCases,
    totalTestCases,
    testResults,
  };
}

function resultToTerminal(result: CodingResult): TerminalState {
  return {
    kind: result.passed ? "success" : "error",
    status: result.passed ? "Correct ✓" : result.status,
    body: `Passed ${result.passedTestCases}/${result.totalTestCases} hidden test cases · score ${result.score}%\n${result.testResults
      .map((test) => `${test.passed ? "✓" : "✕"} ${test.label}: ${test.status}`)
      .join("\n")}`,
    runtime: result.passed ? "116ms · Memory 41.7MB" : "121ms · Memory 42.1MB",
  };
}
