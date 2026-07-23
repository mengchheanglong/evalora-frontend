"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Icon } from "@/components/icons";
import { ErrorState, PageLoader } from "@/components/ui-states";
import { apiGet, apiPost, getErrorMessage } from "@/lib/api";
import type { CandidateCodeSubmission, CandidateCodeSubmitResult, CodeQuestion, CodeRunResult } from "@/lib/types";

type CandidateCodingAssessmentProps = {
  accessCode: string;
  onBack: () => void;
  onContinue: () => void;
  locked?: boolean;
};

export function CandidateCodingAssessment({ accessCode, onBack, onContinue, locked = false }: CandidateCodingAssessmentProps) {
  const [questions, setQuestions] = useState<CodeQuestion[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [codeByQuestion, setCodeByQuestion] = useState<Record<string, string>>({});
  const [results, setResults] = useState<Record<string, CandidateCodeSubmitResult>>({});
  const [terminal, setTerminal] = useState<CodeRunResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const loadWorkspace = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [assigned, previous] = await Promise.all([
        apiGet<CodeQuestion[]>(`/code/access/${encodeURIComponent(accessCode)}/questions`),
        apiGet<CandidateCodeSubmission[]>(`/code/access/${encodeURIComponent(accessCode)}/submissions`),
      ]);
      const latestByQuestion = new Map<string, CandidateCodeSubmission>();
      for (const submission of previous) if (!latestByQuestion.has(submission.questionId)) latestByQuestion.set(submission.questionId, submission);
      setQuestions(assigned);
      setCodeByQuestion(Object.fromEntries(assigned.map((question) => [question.id, latestByQuestion.get(question.id)?.sourceCode ?? question.starterCode])));
      setResults(Object.fromEntries(Array.from(latestByQuestion.values()).map((submission) => [submission.questionId, {
        submissionId: submission.id,
        sessionId: submission.sessionId,
        questionId: submission.questionId,
        status: submission.status,
        stdout: submission.stdout,
        stderr: submission.stderr,
        compileOutput: submission.compileOutput,
        executionTime: submission.executionTime,
        score: submission.score,
        totalTestCases: 0,
        passedTestCases: 0,
        testResults: [],
      }])));
    } catch (requestError) {
      setError(getErrorMessage(requestError, "Unable to open the coding workspace."));
    } finally {
      setLoading(false);
    }
  }, [accessCode]);

  useEffect(() => { void loadWorkspace(); }, [loadWorkspace]);

  const activeQuestion = questions[activeIndex];
  const activeCode = activeQuestion ? codeByQuestion[activeQuestion.id] ?? activeQuestion.starterCode : "";
  const completedCount = Object.keys(results).length;
  const allSubmitted = questions.length > 0 && questions.every((question) => results[question.id]);

  const output = useMemo(() => {
    if (!terminal) return { title: "Ready", body: "Run the sample input to inspect output, then submit against hidden test cases.", tone: "text-neutral-400" };
    const diagnostics = terminal.compileOutput || terminal.stderr;
    return {
      title: terminal.status,
      body: diagnostics || terminal.stdout || "Execution finished without console output.",
      tone: terminal.status === "Accepted" ? "text-emerald-400" : "text-amber-300",
    };
  }, [terminal]);

  async function runCode() {
    if (!activeQuestion || locked) return;
    setRunning(true);
    setError("");
    try {
      setTerminal(await apiPost<CodeRunResult>(`/code/access/${encodeURIComponent(accessCode)}/run`, { language: "javascript", sourceCode: activeCode, stdin: activeQuestion.sampleInput }));
    } catch (requestError) {
      setError(getErrorMessage(requestError, "Code execution failed. Your source is still in the editor."));
    } finally {
      setRunning(false);
    }
  }

  async function submitCode() {
    if (!activeQuestion || locked) return;
    setSubmitting(true);
    setError("");
    try {
      const result = await apiPost<CandidateCodeSubmitResult>(`/code/access/${encodeURIComponent(accessCode)}/submit`, { questionId: activeQuestion.id, language: "javascript", sourceCode: activeCode });
      setResults((current) => ({ ...current, [activeQuestion.id]: result }));
      const nextIndex = activeIndex + 1;
      if (nextIndex < questions.length) {
        const nextQuestion = questions[nextIndex];
        setActiveIndex(nextIndex);
        setTerminal(results[nextQuestion.id] ?? null);
      } else {
        setTerminal(result);
      }
    } catch (requestError) {
      setError(getErrorMessage(requestError, "Submission failed. Your source is still in the editor."));
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <PageLoader label="Preparing secure coding workspace" />;
  if (error && !questions.length) return <ErrorState message={error} onRetry={() => void loadWorkspace()} />;
  if (!activeQuestion) return <ErrorState message="No coding questions are assigned to this session." />;

  return (
    <section className="overflow-hidden rounded-[8px] border border-[var(--theme-border)] bg-[var(--theme-panel)] shadow-[var(--shadow-card)]">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--theme-border)] px-4 py-3 sm:px-5">
        <div><p className="text-[9px] font-bold uppercase text-[var(--color-primary-700)]">Coding assessment</p><h2 className="mt-1 text-[12px] font-black text-[var(--theme-heading)]">JavaScript sandbox</h2></div>
        <div className="flex items-center gap-3"><span className="text-[9px] font-semibold text-[var(--theme-muted)]">{completedCount}/{questions.length} submitted</span><div className="h-1.5 w-28 overflow-hidden rounded-full bg-[var(--theme-panel-soft)]"><div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${questions.length ? (completedCount / questions.length) * 100 : 0}%` }} /></div></div>
      </header>

      {error ? <div className="border-b border-red-100 bg-red-50 px-5 py-3 text-[10px] text-red-800" role="alert">{error}</div> : null}

      <div className="grid min-h-[620px] lg:grid-cols-[220px_minmax(0,1fr)]">
        <nav aria-label="Coding challenges" className="border-b border-[var(--theme-border)] bg-[var(--theme-panel-soft)] p-3 lg:border-b-0 lg:border-r">
          <p className="px-2 pb-2 text-[9px] font-bold uppercase text-[var(--theme-faint)]">Challenges</p>
          <div className="grid gap-1 sm:grid-cols-3 lg:grid-cols-1">
            {questions.map((question, index) => {
              const active = index === activeIndex;
              const result = results[question.id];
              return <button className={`flex min-h-11 items-center gap-2.5 rounded-[6px] px-2.5 py-1.5 text-left transition ${active ? "bg-[var(--theme-panel)] shadow-sm ring-1 ring-[var(--theme-border)]" : "hover:bg-[var(--theme-panel)]"}`} key={question.id} onClick={() => { setActiveIndex(index); setTerminal(result ?? null); setError(""); }} type="button"><span className={`flex size-6 shrink-0 items-center justify-center rounded-[5px] text-[9px] font-black ${result ? "bg-emerald-100 text-emerald-700" : active ? "bg-[var(--theme-active)] text-[var(--theme-active-text)]" : "bg-[var(--theme-panel-soft)] text-[var(--theme-muted)]"}`}>{result ? <Icon name="check" size={11} /> : index + 1}</span><span className="min-w-0"><span className="block truncate text-[10px] font-bold leading-4 text-[var(--theme-heading)]">{question.title}</span><span className="block text-[9px] leading-3 capitalize text-[var(--theme-muted)]">{result ? `${result.score}% score` : question.difficulty}</span></span></button>;
            })}
          </div>
        </nav>

        <div className="grid min-w-0 xl:grid-cols-[minmax(260px,0.72fr)_minmax(420px,1.28fr)]">
          <article className="border-b border-[var(--theme-border)] p-5 xl:border-b-0 xl:border-r">
            <div className="flex items-center justify-between gap-3"><span className={`rounded-[4px] px-2 py-1 text-[9px] font-bold capitalize ${activeQuestion.difficulty === "easy" ? "bg-emerald-50 text-emerald-700" : activeQuestion.difficulty === "medium" ? "bg-amber-50 text-amber-700" : "bg-red-50 text-red-700"}`}>{activeQuestion.difficulty}</span><span className="text-[9px] font-semibold text-[var(--theme-faint)]">{activeQuestion.testCaseCount} hidden tests</span></div>
            <h3 className="mt-3 text-[13px] font-black leading-5 text-[var(--theme-heading)]">{activeQuestion.title}</h3>
            <p className="mt-2 text-[10px] leading-4 text-[var(--theme-muted)]">{activeQuestion.description}</p>
            <div className="mt-4 space-y-3">
              <InfoBlock label="Sample input"><pre>{activeQuestion.sampleInput || "(no input)"}</pre></InfoBlock>
              <InfoBlock label="Expected output"><pre>{activeQuestion.sampleOutput}</pre></InfoBlock>
            </div>
            <div className="mt-5 rounded-[6px] border border-[var(--theme-border)] bg-[var(--theme-active)] px-3 py-2.5 text-[9px] leading-3 text-[var(--theme-active-text)]">Hidden inputs and expected outputs stay private. You receive pass/fail evidence after submission.</div>
          </article>

          <div className="flex min-w-0 flex-col bg-[#0e1117]">
            <div className="flex h-11 items-center justify-between border-b border-white/10 px-4"><span className="flex items-center gap-2 text-[10px] font-bold text-white"><Icon name="code" size={13} /> solution.js</span><span className="text-[9px] font-semibold text-slate-400">JavaScript (Node.js)</span></div>
            <textarea aria-label="Code editor" className="min-h-[360px] flex-1 resize-none bg-[#0e1117] p-4 font-mono text-[11px] leading-5 text-slate-100 outline-none selection:bg-sky-500/30" onChange={(event) => setCodeByQuestion((current) => ({ ...current, [activeQuestion.id]: event.target.value }))} readOnly={locked} spellCheck={false} value={activeCode} />
            <div className="border-t border-white/10 bg-[#090c11]">
              <div className="flex items-center justify-between border-b border-white/10 px-4 py-2"><span className={`text-[9px] font-bold ${output.tone}`}>{output.title}</span>{terminal ? <span className="text-[9px] text-slate-500">{Math.round(terminal.executionTime * 1000)} ms</span> : null}</div>
              <pre className="min-h-[96px] max-h-[150px] overflow-auto whitespace-pre-wrap p-4 text-[10px] leading-4 text-slate-300">{output.body}</pre>
              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/10 px-4 py-3"><button className="rounded-[5px] px-3 py-2 text-[10px] font-bold text-slate-300 hover:bg-white/5" onClick={onBack} type="button">Back</button><div className="flex gap-2"><button className="inline-flex min-h-9 items-center gap-2 rounded-[5px] border border-white/15 px-3 text-[10px] font-bold text-white hover:bg-white/5 disabled:opacity-50" disabled={running || submitting || locked} onClick={() => void runCode()} type="button"><Icon name="paperPlane" size={12} />{running ? "Running" : "Run sample"}</button><button className="inline-flex min-h-9 items-center gap-2 rounded-[5px] bg-[#29b7e5] px-3 text-[10px] font-black text-[#07111f] hover:bg-[#53c7eb] disabled:opacity-50" disabled={running || submitting || locked} onClick={() => void submitCode()} type="button"><Icon name="check" size={12} />{submitting ? "Submitting" : results[activeQuestion.id] ? "Resubmit" : "Submit"}</button></div></div>
            </div>
          </div>
        </div>
      </div>

      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--theme-border)] bg-[var(--theme-panel)] px-4 py-3 sm:px-5"><p className="text-[9px] text-[var(--theme-muted)]">Your latest submission for each challenge is included in the reviewer report.</p><button className="button-primary !min-h-9 !text-[10px]" disabled={!allSubmitted || locked} onClick={onContinue} type="button">Continue assessment <Icon className="-rotate-90" name="chevron" size={12} /></button></footer>
    </section>
  );
}

function InfoBlock({ label, children }: { label: string; children: React.ReactNode }) { return <div><p className="mb-1.5 text-[9px] font-bold uppercase text-[var(--theme-faint)]">{label}</p><div className="overflow-auto rounded-[6px] bg-neutral-950 p-2.5 font-mono text-[10px] leading-4 text-slate-200">{children}</div></div>; }
