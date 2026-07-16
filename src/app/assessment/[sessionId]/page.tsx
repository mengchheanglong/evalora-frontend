"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { CandidateCodingAssessment } from "@/components/candidate-coding-assessment";
import { Icon, type IconName } from "@/components/icons";
import { EvaloraLogo } from "@/components/logo";
import { apiGet, apiPost, apiPut, getErrorMessage } from "@/lib/api";
import type { AssessmentModule, CandidateAccessSession, CandidateCodeSubmission, CandidateResponse, JsonValue, Question } from "@/lib/types";

type View = "loading" | "welcome" | "assessment" | "review" | "complete" | "error";
type SaveState = "saved" | "saving" | "error";
type Answer = { text: string; json?: JsonValue };
type FollowUp = { question: string; answer: string };

export default function CandidateAssessmentPage() {
  const { sessionId: rawAccessCode } = useParams<{ sessionId: string }>();
  const accessCode = decodeURIComponent(rawAccessCode);
  const [session, setSession] = useState<CandidateAccessSession | null>(null);
  const [answers, setAnswers] = useState<Record<string, Answer>>({});
  const [followUps, setFollowUps] = useState<Record<string, FollowUp>>({});
  const [view, setView] = useState<View>("loading");
  const [activeModuleIndex, setActiveModuleIndex] = useState(0);
  const [activeQuestionIndex, setActiveQuestionIndex] = useState(0);
  const [codingComplete, setCodingComplete] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>("saved");
  const [pageError, setPageError] = useState("");
  const [actionError, setActionError] = useState("");
  const [starting, setStarting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [reportStatus, setReportStatus] = useState<"generated" | "pending">("pending");
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const saveTimers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const dirtyQuestions = useRef(new Set<string>());
  const timedOut = useRef(false);

  const loadAssessment = useCallback(async () => {
    setView("loading");
    setPageError("");
    try {
      const [nextSession, savedResponses] = await Promise.all([
        apiGet<CandidateAccessSession>(`/sessions/access/${encodeURIComponent(accessCode)}`),
        apiGet<CandidateResponse[]>(`/responses/access/${encodeURIComponent(accessCode)}`),
      ]);
      const nextAnswers: Record<string, Answer> = {};
      const nextFollowUps: Record<string, FollowUp> = {};
      for (const response of savedResponses) {
        if (!response.questionId) continue;
        const parsed = parseSavedResponse(response.responseText);
        nextAnswers[response.questionId] = { text: parsed.answer, json: response.responseJson };
        if (parsed.followUp) nextFollowUps[response.questionId] = parsed.followUp;
      }
      setSession(nextSession);
      setAnswers(nextAnswers);
      setFollowUps(nextFollowUps);
      if (nextSession.status === "in_progress" && nextSession.template.modules.some((module) => module.type === "coding")) {
        try {
          const codeSubmissions = await apiGet<CandidateCodeSubmission[]>(`/code/access/${encodeURIComponent(accessCode)}/submissions`);
          setCodingComplete(codeSubmissions.length >= 3);
        } catch {
          setCodingComplete(false);
        }
      }
      setView(nextSession.status === "not_started" ? "welcome" : "assessment");
    } catch (requestError) {
      setPageError(getErrorMessage(requestError, "This invitation is invalid, expired, or already completed."));
      setView("error");
    }
  }, [accessCode]);

  useEffect(() => { void loadAssessment(); }, [loadAssessment]);

  useEffect(() => {
    if (!session?.startedAt || !session.template.timeLimitMin || view === "complete") return;
    const endAt = new Date(session.startedAt).getTime() + session.template.timeLimitMin * 60_000;
    const update = () => setTimeLeft(Math.max(0, Math.ceil((endAt - Date.now()) / 1_000)));
    update();
    const timer = window.setInterval(update, 1_000);
    return () => window.clearInterval(timer);
  }, [session?.startedAt, session?.template.timeLimitMin, view]);

  // When time runs out, drop focus so a field that was already active cannot keep
  // receiving keystrokes behind the lock overlay.
  useEffect(() => {
    if (timeLeft === 0 && typeof document !== "undefined") {
      (document.activeElement as HTMLElement | null)?.blur?.();
    }
  }, [timeLeft]);

  // On time-up, mark the session expired server-side so the workspace sees the
  // candidate as "Withdrawn / Rejected". Fires once; the backend re-checks the
  // elapsed time and ignores the call for already-finished sessions.
  useEffect(() => {
    if (timeLeft !== 0 || timedOut.current || session?.status !== "in_progress") return;
    timedOut.current = true;
    void apiPut<CandidateAccessSession>(`/sessions/access/${encodeURIComponent(accessCode)}/timeout`)
      .then((updated) => setSession(updated))
      .catch(() => undefined);
  }, [timeLeft, session?.status, accessCode]);

  useEffect(() => () => { for (const timer of saveTimers.current.values()) clearTimeout(timer); }, []);

  const modules = useMemo(() => candidateModules(session?.template.modules ?? []), [session?.template.modules]);
  const activeModule = modules[activeModuleIndex];
  const activeQuestion = activeModule?.questions?.[activeQuestionIndex];

  async function startAssessment() {
    setStarting(true);
    setActionError("");
    try {
      const started = await apiPut<CandidateAccessSession>(`/sessions/access/${encodeURIComponent(accessCode)}/start`);
      setSession(started);
      setView("assessment");
    } catch (requestError) {
      setActionError(getErrorMessage(requestError, "Unable to start the assessment."));
    } finally {
      setStarting(false);
    }
  }

  function updateAnswer(question: Question, answer: Answer) {
    if (timeLeft === 0) return;
    setAnswers((current) => ({ ...current, [question.id]: answer }));
    dirtyQuestions.current.add(question.id);
    setSaveState("saving");
    const currentTimer = saveTimers.current.get(question.id);
    if (currentTimer) clearTimeout(currentTimer);
    saveTimers.current.set(question.id, setTimeout(() => void persistQuestion(question.id, answer), 700));
  }

  async function persistQuestion(questionId: string, answerOverride?: Answer) {
    const answer = answerOverride ?? answers[questionId];
    if (!answer) return;
    const timer = saveTimers.current.get(questionId);
    if (timer) clearTimeout(timer);
    saveTimers.current.delete(questionId);
    setSaveState("saving");
    try {
      const followUp = followUps[questionId];
      await apiPost<CandidateResponse>(`/responses/access/${encodeURIComponent(accessCode)}`, {
        questionId,
        responseText: formatResponseForSave(answer.text, followUp),
        responseJson: answer.json,
      });
      dirtyQuestions.current.delete(questionId);
      setSaveState("saved");
    } catch {
      setSaveState("error");
    }
  }

  async function flushPendingSaves() {
    await Promise.all(Array.from(dirtyQuestions.current).map((questionId) => persistQuestion(questionId)));
  }

  async function nextQuestion() {
    if (timeLeft === 0) return;
    if (!activeModule || !activeQuestion) return;
    const answer = answers[activeQuestion.id];
    if (!answer?.text.trim()) {
      setActionError("Add a response before continuing.");
      return;
    }
    setActionError("");

    if (activeModule.type === "ai_interview" && activeQuestionIndex === 0 && !followUps[activeQuestion.id]) {
      await persistQuestion(activeQuestion.id, answer);
      try {
        const generated = await apiPost<{ question: string }>(`/ai/access/${encodeURIComponent(accessCode)}/follow-up`, {
          question: activeQuestion.questionText,
          answer: answer.text,
        });
        setFollowUps((current) => ({ ...current, [activeQuestion.id]: { question: generated.question, answer: "" } }));
        setActionError("One follow-up question was added based on your response.");
      } catch (requestError) {
        setActionError(getErrorMessage(requestError, "Your answer was saved, but the follow-up could not load. You can continue."));
      }
      return;
    }

    const followUp = followUps[activeQuestion.id];
    if (followUp && !followUp.answer.trim()) {
      setActionError("Answer the follow-up question before continuing.");
      return;
    }
    dirtyQuestions.current.add(activeQuestion.id);
    await persistQuestion(activeQuestion.id, answer);

    const questionCount = activeModule.questions?.length ?? 0;
    if (activeQuestionIndex < questionCount - 1) {
      setActiveQuestionIndex((index) => index + 1);
      return;
    }
    if (activeModuleIndex < modules.length - 1) {
      setActiveModuleIndex((index) => index + 1);
      setActiveQuestionIndex(0);
      return;
    }
    setView("review");
  }

  function previousQuestion() {
    setActionError("");
    if (activeQuestionIndex > 0) setActiveQuestionIndex((index) => index - 1);
    else if (activeModuleIndex > 0) {
      const previousModule = modules[activeModuleIndex - 1];
      setActiveModuleIndex((index) => index - 1);
      setActiveQuestionIndex(Math.max(0, (previousModule.questions?.length ?? 1) - 1));
    }
  }

  async function submitAssessment() {
    if (timeLeft === 0) return;
    if (!confirmed || !allModulesComplete(modules, answers, followUps, codingComplete)) return;
    setSubmitting(true);
    setActionError("");
    try {
      await flushPendingSaves();
      const completed = await apiPut<CandidateAccessSession>(`/sessions/access/${encodeURIComponent(accessCode)}/complete`);
      setReportStatus(completed.reportStatus ?? "pending");
      setView("complete");
    } catch (requestError) {
      setActionError(getErrorMessage(requestError, "Unable to submit. Your saved responses are still available."));
    } finally {
      setSubmitting(false);
    }
  }

  if (view === "loading") return <CandidateLoading />;
  if (view === "error") return <CandidateError message={pageError} />;
  if (!session) return null;
  if (view === "welcome") return <CandidateWelcome error={actionError} onStart={() => void startAssessment()} session={session} starting={starting} />;
  if (view === "complete") return <CandidateComplete candidateName={session.candidateName} reportStatus={reportStatus} />;

  const completion = completionPercent(modules, answers, followUps, codingComplete);
  const timeUp = timeLeft === 0;

  return (
    <main className="min-h-screen bg-[#f5f7f9] text-neutral-950">
      <header className="sticky top-0 z-40 border-b border-neutral-200 bg-white/95 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-[1480px] items-center gap-4 px-4 sm:px-6">
          <EvaloraLogo compact />
          <div className="hidden min-w-0 sm:block"><p className="truncate text-[12px] font-bold text-neutral-900">{session.template.title}</p><p className="mt-0.5 truncate text-[10px] text-neutral-500">{session.candidateName}</p></div>
          <div className="ml-auto flex items-center gap-4">
            <div className="hidden items-center gap-2 md:flex"><div className="h-1.5 w-32 overflow-hidden rounded-full bg-neutral-100"><div className="h-full rounded-full bg-[#29b7e5] transition-all" style={{ width: `${completion}%` }} /></div><span className="text-[10px] font-bold text-neutral-500">{completion}%</span></div>
            <span className={`inline-flex min-w-[92px] items-center justify-center gap-2 rounded-[5px] border px-3 py-2 text-[11px] font-bold ${timeLeft === 0 ? "border-red-200 bg-red-50 text-red-700" : "border-neutral-200 bg-white text-neutral-700"}`}><Icon name="clock" size={14} />{timeLeft === null ? "Untimed" : formatTimer(timeLeft)}</span>
            <span className={`hidden items-center gap-1.5 text-[10px] font-semibold sm:flex ${saveState === "error" ? "text-red-600" : saveState === "saving" ? "text-amber-600" : "text-emerald-600"}`}><span className={`size-1.5 rounded-full ${saveState === "error" ? "bg-red-500" : saveState === "saving" ? "animate-pulse bg-amber-500" : "bg-emerald-500"}`} />{saveState === "error" ? "Save failed" : saveState === "saving" ? "Saving" : "Saved"}</span>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1480px] lg:grid-cols-[250px_minmax(0,1fr)]">
        <aside className="hidden min-h-[calc(100vh-64px)] border-r border-neutral-200 bg-white p-4 lg:block">
          <p className="px-2 pb-3 text-[10px] font-bold uppercase text-neutral-400">Assessment modules</p>
          <nav className="space-y-1">{modules.map((module, index) => { const complete = moduleComplete(module, answers, followUps, codingComplete); const active = index === activeModuleIndex && view === "assessment"; return <button className={`flex w-full items-center gap-3 rounded-[6px] px-3 py-3 text-left transition ${active ? "bg-sky-50 text-sky-900" : "text-neutral-600 hover:bg-neutral-50"}`} disabled={index > activeModuleIndex && !moduleComplete(modules[index - 1], answers, followUps, codingComplete)} key={module.id} onClick={() => { setActiveModuleIndex(index); setActiveQuestionIndex(0); setView("assessment"); }} type="button"><span className={`flex size-7 shrink-0 items-center justify-center rounded-[5px] ${complete ? "bg-emerald-100 text-emerald-700" : active ? "bg-sky-100 text-sky-700" : "bg-neutral-100 text-neutral-500"}`}>{complete ? <Icon name="check" size={13} /> : <Icon name={moduleIcon(module.type)} size={13} />}</span><span className="min-w-0"><span className="block truncate text-[11px] font-bold">{module.title}</span><span className="mt-0.5 block text-[9px] text-neutral-400">{module.type === "coding" ? "Sandbox task" : `${module.questions?.length ?? 0} questions`}</span></span></button>; })}</nav>
          <button className={`mt-3 flex w-full items-center gap-3 rounded-[6px] px-3 py-3 text-left text-[11px] font-bold ${view === "review" ? "bg-neutral-900 text-white" : "text-neutral-600 hover:bg-neutral-50"}`} onClick={() => setView("review")} type="button"><span className="flex size-7 items-center justify-center rounded-[5px] bg-white/10"><Icon name="report" size={13} /></span>Review and submit</button>
        </aside>

        <section className="min-w-0 p-4 sm:p-6 lg:p-8">
          {view === "review" ? (
            <ReviewPanel answers={answers} codingComplete={codingComplete} confirmed={confirmed} error={actionError} followUps={followUps} modules={modules} onBack={() => setView("assessment")} onConfirm={setConfirmed} onSubmit={() => void submitAssessment()} submitting={submitting} />
          ) : activeModule?.type === "coding" ? (
            <CandidateCodingAssessment accessCode={accessCode} locked={timeUp} onBack={previousQuestion} onContinue={() => { setCodingComplete(true); if (activeModuleIndex < modules.length - 1) { setActiveModuleIndex((index) => index + 1); setActiveQuestionIndex(0); } else setView("review"); }} />
          ) : activeModule && activeQuestion ? (
            <QuestionPanel answer={answers[activeQuestion.id]} disabled={timeUp} error={actionError} followUp={followUps[activeQuestion.id]} module={activeModule} onAnswer={(answer) => updateAnswer(activeQuestion, answer)} onBack={previousQuestion} onFollowUp={(answer) => { if (timeLeft === 0) return; setFollowUps((current) => ({ ...current, [activeQuestion.id]: { ...current[activeQuestion.id], answer } })); dirtyQuestions.current.add(activeQuestion.id); setSaveState("saving"); }} onNext={() => void nextQuestion()} question={activeQuestion} questionIndex={activeQuestionIndex} />
          ) : <CandidateError message="This assessment module has no candidate questions." />}
        </section>
      </div>

      {timeUp ? <TimeUpModal /> : null}
    </main>
  );
}

function TimeUpModal() {
  return (
    <div aria-live="assertive" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/60 px-5 backdrop-blur-sm" role="alertdialog">
      <div className="w-full max-w-[440px] rounded-[14px] border border-neutral-200 bg-white p-8 text-center shadow-[0_24px_70px_rgba(15,23,42,0.28)]">
        <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-red-100 text-red-600"><Icon name="clock" size={24} /></span>
        <h2 className="mt-5 text-[22px] font-black text-neutral-950">Time&apos;s up</h2>
        <p className="mt-3 text-[13px] leading-6 text-neutral-600">The time limit for this assessment has ended. You can no longer edit answers, run code, or submit new responses. Everything you saved has been preserved for the review team.</p>
        <p className="mt-6 text-[11px] text-neutral-500">You may close this window.</p>
      </div>
    </div>
  );
}

function CandidateWelcome({ session, onStart, starting, error }: { session: CandidateAccessSession; onStart: () => void; starting: boolean; error: string }) {
  const modules = candidateModules(session.template.modules);
  const [candidateName, setCandidateName] = useState(session.candidateName);
  const timeLabel = session.template.timeLimitMin ? `${session.template.timeLimitMin} Minutes` : "30-60 Minutes";

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!candidateName.trim()) return;
    onStart();
  }

  return (
    <main className="min-h-screen bg-[#f1f2fb] px-5 py-10 text-neutral-950 sm:py-14">
      <section className="mx-auto flex min-h-[calc(100vh-96px)] max-w-[980px] flex-col justify-center">
        <form className="mx-auto w-full max-w-[700px] rounded-[14px] border border-white/80 bg-white px-6 py-12 shadow-[0_18px_55px_rgba(67,72,107,0.06)] sm:px-20 sm:py-24" onSubmit={handleSubmit}>
          <div className="mx-auto flex max-w-[420px] items-center justify-center gap-4 text-left">
            <EvaloraLogo compact />
            <div>
              <h1 className="text-[26px] font-black leading-tight text-neutral-950">Welcome to interview</h1>
              <p className="mt-2 text-[12px] font-semibold text-neutral-500">Please enter your name to continue to assessment</p>
            </div>
          </div>

          <div className="mx-auto mt-10 max-w-[540px]">
            <label className="block">
              <span className="text-[14px] font-bold text-neutral-900">Your Name <span className="text-red-500">*</span></span>
              <input
                autoComplete="name"
                autoFocus
                className="mt-4 h-12 w-full rounded-[7px] border border-transparent bg-neutral-50 px-4 text-[13px] text-neutral-900 outline-none transition placeholder:text-neutral-400 focus:border-primary-300 focus:bg-white focus:shadow-[0_0_0_4px_rgba(47,178,228,0.14)]"
                onChange={(event) => setCandidateName(event.target.value)}
                placeholder="Enter your full name"
                required
                type="text"
                value={candidateName}
              />
            </label>

            {error ? <p className="mt-4 rounded-[7px] border border-red-200 bg-red-50 px-4 py-3 text-[12px] text-red-800">{error}</p> : null}

            <button className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-[7px] bg-primary-500 text-[13px] font-bold text-white transition hover:bg-primary-600 disabled:cursor-not-allowed disabled:opacity-60" disabled={starting || !candidateName.trim()} type="submit">
              {starting ? "Starting interview" : "Continue to interview"}
              {!starting ? <Icon className="-rotate-90" name="chevron" size={14} /> : null}
            </button>

            <div className="mt-14 flex justify-center text-neutral-400">
              <Icon name="lock" size={14} />
            </div>
          </div>
        </form>

        <div className="mx-auto mt-10 grid w-full max-w-[760px] gap-5 text-left sm:grid-cols-3 sm:divide-x sm:divide-neutral-300/80">
          <WelcomeFact icon="shield" title="Secure & Private" body="Your information is protected." />
          <WelcomeFact icon="clock" title={timeLabel} body="Complete at your own pace." />
          <WelcomeFact icon="settings" title="Multiple Sections" body={`${modules.length} sections including AI, coding, behavioral, and communication.`} />
        </div>
      </section>
    </main>
  );
}

function WelcomeFact({ icon, title, body }: { icon: IconName; title: string; body: string }) {
  return (
    <article className="flex gap-4 sm:px-6 sm:first:pl-0 sm:last:pr-0">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#c9c2ff] text-[#493cff]">
        <Icon name={icon} size={18} />
      </span>
      <div>
        <h2 className="text-[12px] font-black text-neutral-900">{title}</h2>
        <p className="mt-3 text-[11px] font-semibold leading-4 text-neutral-700">{body}</p>
      </div>
    </article>
  );
}

function QuestionPanel({ module, question, questionIndex, answer, followUp, onAnswer, onFollowUp, onBack, onNext, error, disabled }: { module: AssessmentModule; question: Question; questionIndex: number; answer?: Answer; followUp?: FollowUp; onAnswer: (answer: Answer) => void; onFollowUp: (answer: string) => void; onBack: () => void; onNext: () => void; error: string; disabled?: boolean }) {
  const options = questionOptions(question.options);
  return <div className="mx-auto max-w-[860px]"><div className="mb-5 flex items-center justify-between gap-4"><div><p className="text-[10px] font-bold uppercase text-[#087aa4]">{module.title}</p><p className="mt-1 text-[11px] text-neutral-500">Question {questionIndex + 1} of {module.questions?.length ?? 1}</p></div><span className="rounded-[5px] bg-white px-3 py-2 text-[10px] font-semibold text-neutral-500 shadow-sm ring-1 ring-neutral-200">Answer from your real experience</span></div><article className="border border-neutral-200 bg-white p-5 shadow-[0_16px_45px_rgba(15,23,42,0.06)] sm:p-8"><h2 className="text-[22px] font-black leading-8 text-neutral-950">{question.questionText}</h2><p className="mt-3 text-[12px] leading-5 text-neutral-500">Be specific about your actions, reasoning, trade-offs, and outcome where relevant.</p><div className="mt-7">{question.questionType === "scale" ? <ScaleInput disabled={disabled} value={numericAnswer(answer)} onChange={(value) => onAnswer({ text: String(value), json: { value } })} /> : options.length ? <ChoiceInput disabled={disabled} options={options} value={answer?.text ?? ""} onChange={(value) => onAnswer({ text: value, json: { selectedOption: value } })} /> : <textarea autoFocus className="control min-h-[210px] text-[13px] leading-6" maxLength={12_000} onChange={(event) => onAnswer({ text: event.target.value })} placeholder="Write your response here..." readOnly={disabled} value={answer?.text ?? ""} />}</div>{followUp ? <div className="mt-6 border-t border-neutral-200 pt-6"><div className="rounded-[7px] border border-sky-100 bg-sky-50 p-4"><p className="flex items-center gap-2 text-[10px] font-bold uppercase text-sky-700"><Icon name="sparkle" size={14} /> AI follow-up</p><p className="mt-2 text-[13px] font-bold leading-6 text-sky-950">{followUp.question}</p></div><textarea className="control mt-3 min-h-[130px]" onChange={(event) => onFollowUp(event.target.value)} placeholder="Answer the follow-up..." readOnly={disabled} value={followUp.answer} /></div> : null}{error ? <p className={`mt-4 rounded-[5px] px-3 py-2 text-[11px] ${error.startsWith("One follow-up") ? "bg-sky-50 text-sky-800" : "bg-amber-50 text-amber-800"}`}>{error}</p> : null}<div className="mt-7 flex items-center justify-between gap-3"><button className="button-secondary" disabled={disabled} onClick={onBack} type="button">Back</button><button className="button-primary" disabled={disabled} onClick={onNext} type="button">Save and continue <Icon className="-rotate-90" name="chevron" size={13} /></button></div></article></div>;
}

function ReviewPanel({ modules, answers, followUps, codingComplete, confirmed, onConfirm, onBack, onSubmit, submitting, error }: { modules: AssessmentModule[]; answers: Record<string, Answer>; followUps: Record<string, FollowUp>; codingComplete: boolean; confirmed: boolean; onConfirm: (value: boolean) => void; onBack: () => void; onSubmit: () => void; submitting: boolean; error: string }) {
  const complete = allModulesComplete(modules, answers, followUps, codingComplete);
  return <div className="mx-auto max-w-[860px]"><p className="text-[10px] font-bold uppercase text-[#087aa4]">Final review</p><h1 className="mt-2 text-[30px] font-black text-neutral-950">Ready to submit?</h1><p className="mt-2 text-sm leading-6 text-neutral-600">Check each module before closing access to this assessment.</p><div className="mt-6 border border-neutral-200 bg-white shadow-[0_16px_45px_rgba(15,23,42,0.06)]"><div className="divide-y divide-neutral-100">{modules.map((module) => { const done = moduleComplete(module, answers, followUps, codingComplete); return <div className="flex items-center gap-4 px-5 py-4 sm:px-6" key={module.id}><span className={`flex size-9 items-center justify-center rounded-[7px] ${done ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}><Icon name={done ? "check" : moduleIcon(module.type)} size={16} /></span><div className="min-w-0 flex-1"><p className="text-[12px] font-bold text-neutral-900">{module.title}</p><p className="mt-0.5 text-[10px] text-neutral-500">{done ? "Complete" : "Response required"}</p></div></div>; })}</div><div className="border-t border-neutral-200 bg-neutral-50 p-5 sm:p-6"><label className="flex cursor-pointer items-start gap-3"><input checked={confirmed} className="mt-0.5 size-4 accent-[#159ac8]" onChange={(event) => onConfirm(event.target.checked)} type="checkbox" /><span className="text-[11px] leading-5 text-neutral-600">I confirm that I reviewed my responses and understand that submitting will close this private assessment link.</span></label>{error ? <p className="mt-3 text-[11px] text-red-700">{error}</p> : null}<div className="mt-5 flex justify-between gap-3"><button className="button-secondary" onClick={onBack} type="button">Return to assessment</button><button className="button-primary" disabled={!complete || !confirmed || submitting} onClick={onSubmit} type="button">{submitting ? "Submitting" : "Submit assessment"}</button></div></div></div><p className="mt-4 text-center text-[10px] leading-5 text-neutral-500">AI-supported feedback is advisory. A human reviewer remains responsible for hiring decisions.</p></div>;
}

function CandidateComplete({ candidateName, reportStatus }: { candidateName: string; reportStatus: "generated" | "pending" }) { return <main className="flex min-h-screen items-center justify-center bg-[#f4f8f9] px-5"><div className="w-full max-w-[620px] border border-neutral-200 bg-white p-8 text-center shadow-[0_24px_70px_rgba(15,23,42,0.09)] sm:p-12"><span className="mx-auto flex size-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-700"><Icon name="check" size={23} /></span><h1 className="mt-5 text-[30px] font-black text-neutral-950">Assessment submitted</h1><p className="mt-3 text-sm leading-6 text-neutral-600">Thank you, {firstName(candidateName)}. Your saved responses and coding evidence are now available to the authorized review team.</p><div className="mt-6 rounded-[7px] bg-neutral-50 px-4 py-3 text-[11px] leading-5 text-neutral-600">{reportStatus === "generated" ? "The reviewer report is ready inside the private workspace." : "Your submission is complete. Report processing will continue for the review team."}</div><p className="mt-7 text-[11px] text-neutral-500">You may close this window.</p></div></main>; }
function CandidateLoading() { return <main className="flex min-h-screen items-center justify-center bg-[#f4f8f9]"><div className="text-center"><span className="mx-auto block size-9 animate-spin rounded-full border-[3px] border-neutral-200 border-t-[#29b7e5]" /><p className="mt-4 text-sm font-semibold text-neutral-600">Validating private invitation</p></div></main>; }
function CandidateError({ message }: { message: string }) { return <main className="flex min-h-screen items-center justify-center bg-[#f4f8f9] px-5"><div className="w-full max-w-[560px] border border-neutral-200 bg-white p-8 text-center shadow-[0_20px_60px_rgba(15,23,42,0.08)]"><EvaloraLogo className="justify-center" href="/" /><span className="mx-auto mt-8 flex size-11 items-center justify-center rounded-full bg-red-50 text-red-600"><Icon name="lock" size={20} /></span><h1 className="mt-4 text-xl font-black text-neutral-950">Assessment unavailable</h1><p className="mt-3 text-sm leading-6 text-neutral-600">{message}</p><Link className="button-secondary mt-6" href="/">Return to Evalora</Link></div></main>; }

function candidateModules(modules: AssessmentModule[]): AssessmentModule[] { return [...modules].sort((a, b) => a.orderIndex - b.orderIndex).map((module) => module.type === "coding" ? { ...module, questions: [] } : { ...module, questions: (module.questions ?? []).slice(0, 2) }).filter((module) => module.type === "coding" || (module.questions?.length ?? 0) > 0); }
function moduleComplete(module: AssessmentModule, answers: Record<string, Answer>, followUps: Record<string, FollowUp>, codingComplete: boolean) { if (module.type === "coding") return codingComplete; const questions = module.questions ?? []; return questions.length > 0 && questions.every((question, index) => Boolean(answers[question.id]?.text.trim()) && (module.type !== "ai_interview" || index !== 0 || Boolean(followUps[question.id]?.answer.trim()))); }
function allModulesComplete(modules: AssessmentModule[], answers: Record<string, Answer>, followUps: Record<string, FollowUp>, codingComplete: boolean) { return modules.length > 0 && modules.every((module) => moduleComplete(module, answers, followUps, codingComplete)); }
function completionPercent(modules: AssessmentModule[], answers: Record<string, Answer>, followUps: Record<string, FollowUp>, codingComplete: boolean) { return modules.length ? Math.round((modules.filter((module) => moduleComplete(module, answers, followUps, codingComplete)).length / modules.length) * 100) : 0; }
function moduleIcon(type: AssessmentModule["type"]): IconName { return type === "coding" || type === "debugging" ? "code" : type === "leadership" ? "crown" : type === "communication" ? "paperPlane" : type === "behavioral" || type === "work_style" ? "users" : type === "problem_solving" ? "sparkle" : "message"; }
function questionOptions(value: JsonValue | undefined): string[] { if (Array.isArray(value)) return value.filter((item): item is string => typeof item === "string"); if (value && typeof value === "object") { const record = value as Record<string, JsonValue>; for (const key of ["options", "choices", "answers"]) { const nested = record[key]; if (Array.isArray(nested)) return nested.map((item) => typeof item === "string" ? item : typeof item === "object" && item ? String((item as Record<string, JsonValue>).label ?? (item as Record<string, JsonValue>).value ?? "") : "").filter(Boolean); } } return []; }
function ChoiceInput({ options, value, onChange, disabled }: { options: string[]; value: string; onChange: (value: string) => void; disabled?: boolean }) { return <div className="grid gap-2">{options.map((option) => <label className={`flex items-center gap-3 rounded-[7px] border px-4 py-3 text-[12px] font-semibold transition ${disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"} ${value === option ? "border-sky-300 bg-sky-50 text-sky-950" : "border-neutral-200 hover:bg-neutral-50"}`} key={option}><input checked={value === option} className="size-4 accent-[#159ac8]" disabled={disabled} name="choice" onChange={() => onChange(option)} type="radio" />{option}</label>)}</div>; }
function ScaleInput({ value, onChange, disabled }: { value?: number; onChange: (value: number) => void; disabled?: boolean }) { return <div><div className="grid grid-cols-5 gap-2">{[1, 2, 3, 4, 5].map((item) => <button className={`h-12 rounded-[6px] border text-sm font-black transition disabled:cursor-not-allowed disabled:opacity-60 ${value === item ? "border-sky-400 bg-sky-500 text-white" : "border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50"}`} disabled={disabled} key={item} onClick={() => onChange(item)} type="button">{item}</button>)}</div><div className="mt-2 flex justify-between text-[10px] text-neutral-400"><span>Strongly disagree</span><span>Strongly agree</span></div></div>; }
function numericAnswer(answer?: Answer) { const value = Number(answer?.json && typeof answer.json === "object" && !Array.isArray(answer.json) ? (answer.json as Record<string, JsonValue>).value : answer?.text); return Number.isFinite(value) ? value : undefined; }
function formatResponseForSave(answer: string, followUp?: FollowUp) { return followUp ? `${answer.trim()}\n\nAI follow-up: ${followUp.question.trim()}\nFollow-up response: ${followUp.answer.trim()}` : answer; }
function parseSavedResponse(value: string): { answer: string; followUp?: FollowUp } { const marker = "\n\nAI follow-up: "; const index = value.indexOf(marker); if (index < 0) return { answer: value }; const answer = value.slice(0, index); const remaining = value.slice(index + marker.length); const responseMarker = "\nFollow-up response: "; const responseIndex = remaining.indexOf(responseMarker); return responseIndex < 0 ? { answer } : { answer, followUp: { question: remaining.slice(0, responseIndex), answer: remaining.slice(responseIndex + responseMarker.length) } }; }
function firstName(name: string) { return name.trim().split(/\s+/)[0] || "Candidate"; }
function formatTimer(seconds: number) { const minutes = Math.floor(seconds / 60); return `${String(minutes).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`; }
