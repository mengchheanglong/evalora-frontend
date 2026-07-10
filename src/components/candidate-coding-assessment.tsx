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
};

export function CandidateCodingAssessment({ accessCode, onBack, onContinue }: CandidateCodingAssessmentProps) {
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
    if (!activeQuestion) return;
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
    if (!activeQuestion) return;
    setSubmitting(true);
    setError("");
    try {
      const result = await apiPost<CandidateCodeSubmitResult>(`/code/access/${encodeURIComponent(accessCode)}/submit`, { questionId: activeQuestion.id, language: "javascript", sourceCode: activeCode });
      setResults((current) => ({ ...current, [activeQuestion.id]: result }));
      setTerminal(result);
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
    <section className="overflow-hidden rounded-[8px] border border-[#dfe3e8] bg-white shadow-[0_16px_45px_rgba(15,23,42,0.08)]">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-200 px-4 py-3 sm:px-5">
        <div><p className="text-[10px] font-bold uppercase text-[#087aa4]">Coding assessment</p><h2 className="mt-1 text-[15px] font-black text-neutral-950">JavaScript sandbox</h2></div>
        <div className="flex items-center gap-3"><span className="text-[11px] font-semibold text-neutral-500">{completedCount}/{questions.length} submitted</span><div className="h-1.5 w-28 overflow-hidden rounded-full bg-neutral-100"><div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${questions.length ? (completedCount / questions.length) * 100 : 0}%` }} /></div></div>
      </header>

      {error ? <div className="border-b border-red-100 bg-red-50 px-5 py-3 text-[12px] text-red-800" role="alert">{error}</div> : null}

      <div className="grid min-h-[620px] lg:grid-cols-[220px_minmax(0,1fr)]">
        <nav aria-label="Coding challenges" className="border-b border-neutral-200 bg-[#fafbfc] p-3 lg:border-b-0 lg:border-r">
          <p className="px-2 pb-2 text-[10px] font-bold uppercase text-neutral-400">Challenges</p>
          <div className="grid gap-1 sm:grid-cols-3 lg:grid-cols-1">
            {questions.map((question, index) => {
              const active = index === activeIndex;
              const result = results[question.id];
              return <button className={`flex min-h-14 items-center gap-3 rounded-[6px] px-3 py-2 text-left transition ${active ? "bg-white shadow-sm ring-1 ring-neutral-200" : "hover:bg-white"}`} key={question.id} onClick={() => { setActiveIndex(index); setTerminal(result ?? null); setError(""); }} type="button"><span className={`flex size-7 shrink-0 items-center justify-center rounded-[5px] text-[10px] font-black ${result ? "bg-emerald-100 text-emerald-700" : active ? "bg-sky-100 text-sky-700" : "bg-neutral-200 text-neutral-600"}`}>{result ? <Icon name="check" size={13} /> : index + 1}</span><span className="min-w-0"><span className="block truncate text-[11px] font-bold text-neutral-900">{question.title}</span><span className="mt-0.5 block text-[10px] capitalize text-neutral-500">{result ? `${result.score}% score` : question.difficulty}</span></span></button>;
            })}
          </div>
        </nav>

        <div className="grid min-w-0 xl:grid-cols-[minmax(260px,0.72fr)_minmax(420px,1.28fr)]">
          <article className="border-b border-neutral-200 p-5 xl:border-b-0 xl:border-r">
            <div className="flex items-center justify-between gap-3"><span className={`rounded-[4px] px-2 py-1 text-[10px] font-bold capitalize ${activeQuestion.difficulty === "easy" ? "bg-emerald-50 text-emerald-700" : activeQuestion.difficulty === "medium" ? "bg-amber-50 text-amber-700" : "bg-red-50 text-red-700"}`}>{activeQuestion.difficulty}</span><span className="text-[10px] font-semibold text-neutral-400">{activeQuestion.testCaseCount} hidden tests</span></div>
            <h3 className="mt-4 text-lg font-black text-neutral-950">{activeQuestion.title}</h3>
            <p className="mt-3 text-[12px] leading-6 text-neutral-600">{activeQuestion.description}</p>
            <div className="mt-6 space-y-4">
              <InfoBlock label="Sample input"><pre>{activeQuestion.sampleInput || "(no input)"}</pre></InfoBlock>
              <InfoBlock label="Expected output"><pre>{activeQuestion.sampleOutput}</pre></InfoBlock>
            </div>
            <div className="mt-6 rounded-[6px] border border-sky-100 bg-sky-50 p-3 text-[11px] leading-5 text-sky-900">Hidden inputs and expected outputs stay private. You receive pass/fail evidence after submission.</div>
          </article>

          <div className="flex min-w-0 flex-col bg-[#0e1117]">
            <div className="flex h-11 items-center justify-between border-b border-white/10 px-4"><span className="flex items-center gap-2 text-[11px] font-bold text-white"><Icon name="code" size={14} /> solution.js</span><span className="text-[10px] font-semibold text-slate-400">JavaScript (Node.js)</span></div>
            <textarea aria-label="Code editor" className="min-h-[360px] flex-1 resize-none bg-[#0e1117] p-4 font-mono text-[13px] leading-6 text-slate-100 outline-none selection:bg-sky-500/30" onChange={(event) => setCodeByQuestion((current) => ({ ...current, [activeQuestion.id]: event.target.value }))} spellCheck={false} value={activeCode} />
            <div className="border-t border-white/10 bg-[#090c11]">
              <div className="flex items-center justify-between border-b border-white/10 px-4 py-2"><span className={`text-[10px] font-bold ${output.tone}`}>{output.title}</span>{terminal ? <span className="text-[9px] text-slate-500">{Math.round(terminal.executionTime * 1000)} ms</span> : null}</div>
              <pre className="min-h-[96px] max-h-[150px] overflow-auto whitespace-pre-wrap p-4 text-[11px] leading-5 text-slate-300">{output.body}</pre>
              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/10 px-4 py-3"><button className="rounded-[5px] px-3 py-2 text-[11px] font-bold text-slate-300 hover:bg-white/5" onClick={onBack} type="button">Back</button><div className="flex gap-2"><button className="inline-flex min-h-9 items-center gap-2 rounded-[5px] border border-white/15 px-3 text-[11px] font-bold text-white hover:bg-white/5 disabled:opacity-50" disabled={running || submitting} onClick={() => void runCode()} type="button"><Icon name="paperPlane" size={13} />{running ? "Running" : "Run sample"}</button><button className="inline-flex min-h-9 items-center gap-2 rounded-[5px] bg-[#29b7e5] px-3 text-[11px] font-black text-[#07111f] hover:bg-[#53c7eb] disabled:opacity-50" disabled={running || submitting} onClick={() => void submitCode()} type="button"><Icon name="check" size={13} />{submitting ? "Submitting" : results[activeQuestion.id] ? "Resubmit" : "Submit"}</button></div></div>
            </div>
          </div>
        </div>
      </div>

      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-neutral-200 bg-white px-4 py-3 sm:px-5"><p className="text-[11px] text-neutral-500">Your latest submission for each challenge is included in the reviewer report.</p><button className="button-primary" disabled={!allSubmitted} onClick={onContinue} type="button">Continue assessment <Icon className="-rotate-90" name="chevron" size={13} /></button></footer>
    </section>
  );
}

function InfoBlock({ label, children }: { label: string; children: React.ReactNode }) { return <div><p className="mb-2 text-[10px] font-bold uppercase text-neutral-400">{label}</p><div className="overflow-auto rounded-[6px] bg-neutral-950 p-3 font-mono text-[11px] leading-5 text-slate-200">{children}</div></div>; }
