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
  const [codingSandboxActive, setCodingSandboxActive] = useState(false);
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
      const codingModule = candidateModules(nextSession.template.modules).find((module) => module.type === "coding");
      setCodingSandboxActive(Boolean(codingModule && questionResponsesComplete(codingModule, nextAnswers, nextFollowUps)));
      if (nextSession.status === "in_progress" && nextSession.template.modules.some((module) => module.type === "coding")) {
        try {
          const [codeQuestions, codeSubmissions] = await Promise.all([
            apiGet<Array<{ id: string }>>(`/code/access/${encodeURIComponent(accessCode)}/questions`),
            apiGet<CandidateCodeSubmission[]>(`/code/access/${encodeURIComponent(accessCode)}/submissions`),
          ]);
          const submittedQuestionIds = new Set(codeSubmissions.map((submission) => submission.questionId));
          setCodingComplete(codeQuestions.length > 0 && codeQuestions.every((question) => submittedQuestionIds.has(question.id)));
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

  useEffect(() => {
    if (timeLeft === 0 && typeof document !== "undefined") {
      (document.activeElement as HTMLElement | null)?.blur?.();
    }
  }, [timeLeft]);

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

  async function persistQuestion(questionId: string, answerOverride?: Answer): Promise<boolean> {
    const answer = answerOverride ?? answers[questionId];
    if (!answer) return false;
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
      return true;
    } catch {
      setSaveState("error");
      return false;
    }
  }

  async function flushPendingSaves() {
    const saved = await Promise.all(Array.from(dirtyQuestions.current).map((questionId) => persistQuestion(questionId)));
    if (saved.some((result) => !result)) throw new Error("One or more responses could not be saved.");
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
      if (!(await persistQuestion(activeQuestion.id, answer))) {
        setActionError("Your response could not be saved. Check your connection and try again.");
        return;
      }
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
    if (!(await persistQuestion(activeQuestion.id, answer))) {
      setActionError("Your response could not be saved. Check your connection and try again.");
      return;
    }

    const questionCount = activeModule.questions?.length ?? 0;
    if (activeQuestionIndex < questionCount - 1) {
      setActiveQuestionIndex((index) => index + 1);
      return;
    }
    if (activeModule.type === "coding") {
      setCodingSandboxActive(true);
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
      setCodingSandboxActive(previousModule.type === "coding" && questionResponsesComplete(previousModule, answers, followUps));
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
    <main className="min-h-screen bg-[var(--theme-bg)] text-[var(--theme-heading)]">
      <header className="sticky top-0 z-40 border-b border-[var(--theme-border)] bg-[var(--theme-panel)]/95 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-[1480px] items-center gap-4 px-4 sm:px-6">
          <EvaloraLogo compact />
          <div className="hidden min-w-0 sm:block"><p className="truncate text-[var(--text-caption)] font-bold text-[var(--theme-heading)]">{session.template.title}</p><p className="mt-0.5 truncate text-[var(--text-micro)] text-[var(--theme-muted)]">{session.candidateName}</p></div>
          <div className="ml-auto flex items-center gap-4">
            <div className="hidden items-center gap-2 md:flex"><div className="h-1.5 w-32 overflow-hidden rounded-full bg-[var(--theme-panel-soft)]"><div className="h-full rounded-full bg-[var(--color-primary)] transition-all" style={{ width: `${completion}%` }} /></div><span className="text-[var(--text-micro)] font-bold text-[var(--theme-muted)]">{completion}%</span></div>
            <span className={`inline-flex min-w-[92px] items-center justify-center gap-2 rounded-[5px] border px-3 py-2 text-[var(--text-micro)] font-bold ${timeLeft === 0 ? "border-red-200 bg-red-50 text-red-700" : "border-[var(--theme-border)] bg-[var(--theme-panel)] text-[var(--theme-text)]"}`}><Icon name="clock" size={14} />{timeLeft === null ? "Untimed" : formatTimer(timeLeft)}</span>
            <span className={`hidden items-center gap-1.5 text-[var(--text-micro)] font-semibold sm:flex ${saveState === "error" ? "text-red-600" : saveState === "saving" ? "text-amber-600" : "text-emerald-600"}`}><span className={`size-1.5 rounded-full ${saveState === "error" ? "bg-red-500" : saveState === "saving" ? "animate-pulse bg-amber-500" : "bg-emerald-500"}`} />{saveState === "error" ? "Save failed" : saveState === "saving" ? "Saving" : "Saved"}</span>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1480px] lg:grid-cols-[250px_minmax(0,1fr)]">
        <aside className="hidden min-h-[calc(100vh-64px)] border-r border-[var(--theme-border)] bg-[var(--theme-panel)] p-4 lg:block">
          <p className="px-2 pb-3 text-[var(--text-micro)] font-bold uppercase text-[var(--theme-faint)]">Assessment modules</p>
          <nav className="space-y-1">{modules.map((module, index) => { const complete = moduleComplete(module, answers, followUps, codingComplete); const active = index === activeModuleIndex && view === "assessment"; return <button className={`flex w-full items-center gap-3 rounded-[6px] px-3 py-3 text-left transition ${active ? "bg-[var(--theme-active)] text-[var(--theme-active-text)]" : "text-[var(--theme-text)] hover:bg-[var(--theme-panel-soft)]"}`} disabled={index > activeModuleIndex && !moduleComplete(modules[index - 1], answers, followUps, codingComplete)} key={module.id} onClick={() => { setActiveModuleIndex(index); setActiveQuestionIndex(0); setCodingSandboxActive(module.type === "coding" && questionResponsesComplete(module, answers, followUps)); setView("assessment"); }} type="button"><span className={`flex size-7 shrink-0 items-center justify-center rounded-[5px] ${complete ? "bg-emerald-100 text-emerald-700" : active ? "bg-[var(--theme-active)] text-[var(--theme-active-text)]" : "bg-[var(--theme-panel-soft)] text-[var(--theme-faint)]"}`}>{complete ? <Icon name="check" size={13} /> : <Icon name={moduleIcon(module.type)} size={13} />}</span><span className="min-w-0"><span className="block truncate text-[var(--text-micro)] font-bold">{module.title}</span><span className="mt-0.5 block text-[var(--text-micro)] text-[var(--theme-faint)]">{module.type === "coding" ? `${module.questions?.length ?? 0} questions + sandbox` : `${module.questions?.length ?? 0} questions`}</span></span></button>; })}</nav>
          <button className={`mt-3 flex w-full items-center gap-3 rounded-[6px] px-3 py-3 text-left text-[var(--text-micro)] font-bold ${view === "review" ? "bg-[var(--theme-heading)] text-[var(--theme-panel)]" : "text-[var(--theme-text)] hover:bg-[var(--theme-panel-soft)]"}`} onClick={() => setView("review")} type="button"><span className="flex size-7 items-center justify-center rounded-[5px] bg-[var(--theme-panel)]/10"><Icon name="report" size={13} /></span>Review and submit</button>
        </aside>

        <section className="min-w-0 p-4 sm:p-6 lg:p-8">
          {view === "review" ? (
            <ReviewPanel answers={answers} codingComplete={codingComplete} confirmed={confirmed} error={actionError} followUps={followUps} modules={modules} onBack={() => setView("assessment")} onConfirm={setConfirmed} onSubmit={() => void submitAssessment()} submitting={submitting} />
          ) : activeModule?.type === "coding" && (codingSandboxActive || !(activeModule.questions?.length ?? 0)) ? (
            <CandidateCodingAssessment accessCode={accessCode} locked={timeUp} onBack={() => { setCodingSandboxActive(false); setActiveQuestionIndex(Math.max(0, (activeModule.questions?.length ?? 1) - 1)); }} onContinue={() => { setCodingComplete(true); setCodingSandboxActive(false); if (activeModuleIndex < modules.length - 1) { setActiveModuleIndex((index) => index + 1); setActiveQuestionIndex(0); } else setView("review"); }} />
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
    <div aria-live="assertive" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--theme-heading)]/60 px-5 backdrop-blur-sm" role="alertdialog">
      <div className="w-full max-w-[440px] rounded-[14px] border border-[var(--theme-border)] bg-[var(--theme-panel)] p-8 text-center shadow-[var(--theme-shadow)]">
        <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-red-100 text-red-600"><Icon name="clock" size={24} /></span>
        <h2 className="mt-5 text-[var(--text-body-lg)] font-black text-[var(--theme-heading)]">Time&apos;s up</h2>
        <p className="mt-3 text-[var(--text-caption)] leading-[var(--text-caption--line-height)] text-[var(--theme-muted)]">The time limit for this assessment has ended. You can no longer edit answers, run code, or submit new responses. Everything you saved has been preserved for the review team.</p>
        <p className="mt-6 text-[var(--text-micro)] text-[var(--theme-muted)]">You may close this window.</p>
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
    <main className="min-h-screen bg-[var(--theme-bg)] px-5 py-10 text-[var(--theme-heading)] sm:py-14">
      <section className="mx-auto flex min-h-[calc(100vh-96px)] max-w-[980px] flex-col justify-center">
        <form className="mx-auto w-full max-w-[700px] rounded-[14px] border border-[var(--theme-border)] bg-[var(--theme-panel)] px-6 py-12 shadow-[var(--shadow-card)] sm:px-20 sm:py-24" onSubmit={handleSubmit}>
          <div className="mx-auto flex max-w-[420px] items-center justify-center gap-4 text-left">
            <EvaloraLogo compact />
            <div>
              <h1 className="text-[var(--text-h1)] font-black leading-[var(--text-h1--line-height)] text-[var(--theme-heading)]">Welcome to interview</h1>
              <p className="mt-2 text-[var(--text-caption)] font-semibold text-[var(--theme-muted)]">Please enter your name to continue to assessment</p>
            </div>
          </div>

          <div className="mx-auto mt-10 max-w-[540px]">
            <label className="block">
              <span className="text-[var(--text-caption)] font-bold text-[var(--theme-heading)]">Your Name <span className="text-red-500">*</span></span>
              <input
                autoComplete="name"
                autoFocus
                className="mt-4 h-12 w-full rounded-[7px] border border-transparent bg-[var(--theme-panel-soft)] px-4 text-[var(--text-caption)] text-[var(--theme-heading)] outline-none transition placeholder:text-[var(--theme-faint)] focus:border-[var(--color-primary-300)] focus:bg-[var(--theme-panel)] focus:shadow-[0_0_0_4px_rgba(47,178,228,0.14)]"
                onChange={(event) => setCandidateName(event.target.value)}
                placeholder="Enter your full name"
                required
                type="text"
                value={candidateName}
              />
            </label>

            {error ? <p className="mt-4 rounded-[7px] border border-red-200 bg-red-50 px-4 py-3 text-[var(--text-caption)] text-red-800">{error}</p> : null}

            <button className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-[7px] bg-primary-500 text-[var(--text-caption)] font-bold text-[var(--theme-panel)] transition hover:bg-primary-600 disabled:cursor-not-allowed disabled:opacity-60" disabled={starting || !candidateName.trim()} type="submit">
              {starting ? "Starting interview" : "Continue to interview"}
              {!starting ? <Icon className="-rotate-90" name="chevron" size={14} /> : null}
            </button>

          </div>
        </form>

        <div className="mx-auto mt-10 grid w-full max-w-[760px] gap-5 text-left sm:grid-cols-3 sm:divide-x sm:divide-[var(--theme-border)]">
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
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary-100)] text-[var(--color-primary-700)]">
        <Icon name={icon} size={18} />
      </span>
      <div>
        <h2 className="text-[var(--text-caption)] font-black text-[var(--theme-heading)]">{title}</h2>
        <p className="mt-3 text-[var(--text-micro)] font-semibold leading-[var(--text-micro--line-height)] text-[var(--theme-text)]">{body}</p>
      </div>
    </article>
  );
}

function QuestionPanel({ module, question, questionIndex, answer, followUp, onAnswer, onFollowUp, onBack, onNext, error, disabled }: { module: AssessmentModule; question: Question; questionIndex: number; answer?: Answer; followUp?: FollowUp; onAnswer: (answer: Answer) => void; onFollowUp: (answer: string) => void; onBack: () => void; onNext: () => void; error: string; disabled?: boolean }) {
  const options = questionOptions(question.options);
  return <div className="mx-auto max-w-[860px]"><div className="mb-5 flex items-center justify-between gap-4"><div><p className="text-[var(--text-micro)] font-bold uppercase text-[var(--color-primary-700)]">{module.title}</p><p className="mt-1 text-[var(--text-micro)] text-[var(--theme-muted)]">Question {questionIndex + 1} of {module.questions?.length ?? 1}</p></div><span className="rounded-[5px] bg-[var(--theme-panel)] px-3 py-2 text-[var(--text-micro)] font-semibold text-[var(--theme-muted)] shadow-sm ring-1 ring-[var(--theme-border)]">Answer from your real experience</span></div><article className="border border-[var(--theme-border)] bg-[var(--theme-panel)] p-5 shadow-[var(--shadow-card)] sm:p-8"><h2 className="text-[var(--text-body-lg)] font-black leading-[var(--text-body-lg--line-height)] text-[var(--theme-heading)]">{question.questionText}</h2><p className="mt-3 text-[var(--text-caption)] leading-[var(--text-caption--line-height)] text-[var(--theme-muted)]">Be specific about your actions, reasoning, trade-offs, and outcome where relevant.</p><div className="mt-7">{question.questionType === "scale" ? <ScaleInput disabled={disabled} value={numericAnswer(answer)} onChange={(value) => onAnswer({ text: String(value), json: { value } })} /> : options.length ? <ChoiceInput disabled={disabled} options={options} value={answer?.text ?? ""} onChange={(value) => onAnswer({ text: value, json: { selectedOption: value } })} /> : <textarea autoFocus className="control min-h-[210px] text-[var(--text-caption)] leading-[var(--text-caption--line-height)]" maxLength={12_000} onChange={(event) => onAnswer({ text: event.target.value })} placeholder="Write your response here..." readOnly={disabled} value={answer?.text ?? ""} />}</div>{followUp ? <div className="mt-6 border-t border-[var(--theme-border)] pt-6"><div className="rounded-[7px] border border-[var(--theme-border)] bg-[var(--theme-active)] p-4"><p className="flex items-center gap-2 text-[var(--text-micro)] font-bold uppercase text-[var(--theme-active-text)]"><Icon name="sparkle" size={14} /> AI follow-up</p><p className="mt-2 text-[var(--text-caption)] font-bold leading-[var(--text-caption--line-height)] text-[var(--theme-heading)]">{followUp.question}</p></div><textarea className="control mt-3 min-h-[130px]" onChange={(event) => onFollowUp(event.target.value)} placeholder="Answer the follow-up..." readOnly={disabled} value={followUp.answer} /></div> : null}<div className="mt-6 flex items-center justify-between gap-3">{error ? <p className="text-[var(--text-micro)] text-red-700">{error}</p> : <span />}<div className="flex gap-2"><button className="button-secondary" disabled={disabled} onClick={onBack} type="button">Back</button><button className="button-primary" disabled={disabled} onClick={onNext} type="button">Continue</button></div></div></article></div>;
}

function ReviewPanel({ modules, answers, followUps, codingComplete, confirmed, onConfirm, onBack, onSubmit, submitting, error }: { modules: AssessmentModule[]; answers: Record<string, Answer>; followUps: Record<string, FollowUp>; codingComplete: boolean; confirmed: boolean; onConfirm: (value: boolean) => void; onBack: () => void; onSubmit: () => void; submitting: boolean; error: string }) {
  const complete = allModulesComplete(modules, answers, followUps, codingComplete);
  return <div className="mx-auto max-w-[860px]"><p className="text-[var(--text-micro)] font-bold uppercase text-[var(--color-primary-700)]">Final review</p><h1 className="mt-2 text-[var(--text-h1)] font-black text-[var(--theme-heading)]">Ready to submit?</h1><p className="mt-2 text-[var(--text-body)] leading-[var(--text-body--line-height)] text-[var(--theme-muted)]">Check each module before closing access to this assessment.</p><div className="mt-6 border border-[var(--theme-border)] bg-[var(--theme-panel)] shadow-[var(--shadow-card)]"><div className="divide-y divide-[var(--theme-border)]">{modules.map((module) => { const done = moduleComplete(module, answers, followUps, codingComplete); return <div className="flex items-center gap-4 px-5 py-4 sm:px-6" key={module.id}><span className={`flex size-9 items-center justify-center rounded-[7px] ${done ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}><Icon name={done ? "check" : moduleIcon(module.type)} size={16} /></span><div className="min-w-0 flex-1"><p className="text-[var(--text-caption)] font-bold text-[var(--theme-heading)]">{module.title}</p><p className="mt-0.5 text-[var(--text-micro)] text-[var(--theme-muted)]">{done ? "Complete" : "Response required"}</p></div></div>; })}</div><div className="border-t border-[var(--theme-border)] bg-[var(--theme-panel-soft)] p-5 sm:p-6"><label className="flex cursor-pointer items-start gap-3"><input checked={confirmed} className="mt-0.5 size-4 accent-[var(--color-primary)]" onChange={(event) => onConfirm(event.target.checked)} type="checkbox" /><span className="text-[var(--text-micro)] leading-[var(--text-micro--line-height)] text-[var(--theme-muted)]">I confirm that I reviewed my responses and understand that submitting will close this private assessment link.</span></label>{error ? <p className="mt-3 text-[var(--text-micro)] text-red-700">{error}</p> : null}<div className="mt-5 flex justify-between gap-3"><button className="button-secondary" onClick={onBack} type="button">Return to assessment</button><button className="button-primary" disabled={!complete || !confirmed || submitting} onClick={onSubmit} type="button">{submitting ? "Submitting" : "Submit assessment"}</button></div></div></div><p className="mt-4 text-center text-[var(--text-micro)] text-[var(--theme-muted)]">Submitting will lock this assessment. You cannot resume after submission.</p></div>;
}

function CandidateComplete({ candidateName, reportStatus }: { candidateName: string; reportStatus: "generated" | "pending" }) { return <main className="flex min-h-screen items-center justify-center bg-[var(--theme-bg)] px-5"><div className="w-full max-w-[620px] border border-[var(--theme-border)] bg-[var(--theme-panel)] p-8 text-center shadow-[var(--theme-shadow)] sm:p-12"><span className="mx-auto flex size-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-700"><Icon name="check" size={23} /></span><h1 className="mt-5 text-[var(--text-h1)] font-black text-[var(--theme-heading)]">Assessment submitted</h1><p className="mt-3 text-[var(--text-body)] leading-[var(--text-body--line-height)] text-[var(--theme-muted)]">Thank you, {firstName(candidateName)}. Your saved responses and coding evidence are now available to the authorized review team.</p><div className="mt-6 rounded-[7px] bg-[var(--theme-panel-soft)] px-4 py-3 text-[var(--text-micro)] leading-[var(--text-micro--line-height)] text-[var(--theme-muted)]">{reportStatus === "generated" ? "The reviewer report is ready inside the private workspace." : "Your submission is complete. Report processing will continue for the review team."}</div><p className="mt-7 text-[var(--text-micro)] text-[var(--theme-muted)]">You may close this window.</p></div></main>; }
function CandidateLoading() { return <main className="flex min-h-screen items-center justify-center bg-[var(--theme-bg)]"><div className="text-center"><span className="mx-auto block size-9 animate-spin rounded-full border-[3px] border-[var(--theme-border)] border-t-[var(--color-primary)]" /><p className="mt-4 text-[var(--text-body)] font-semibold text-[var(--theme-muted)]">Validating private invitation</p></div></main>; }
function CandidateError({ message }: { message: string }) { return <main className="flex min-h-screen items-center justify-center bg-[var(--theme-bg)] px-5"><div className="w-full max-w-[560px] border border-[var(--theme-border)] bg-[var(--theme-panel)] p-8 text-center shadow-[var(--theme-shadow)]"><EvaloraLogo className="justify-center" href="/" /><span className="mx-auto mt-8 flex size-11 items-center justify-center rounded-full bg-red-50 text-red-600"><Icon name="lock" size={20} /></span><h1 className="mt-4 text-[var(--text-h2)] font-black text-[var(--theme-heading)]">Assessment unavailable</h1><p className="mt-3 text-[var(--text-body)] leading-[var(--text-body--line-height)] text-[var(--theme-muted)]">{message}</p><Link className="button-secondary mt-6" href="/">Return to Evalora</Link></div></main>; }

function candidateModules(modules: AssessmentModule[]): AssessmentModule[] {
  return [...modules]
    .sort((a, b) => a.orderIndex - b.orderIndex)
    .map((module) => ({ ...module, questions: module.questions ?? [] }))
    .filter((module) => module.type === "coding" || (module.questions?.length ?? 0) > 0);
}
function questionResponsesComplete(module: AssessmentModule, answers: Record<string, Answer>, followUps: Record<string, FollowUp>) { const questions = module.questions ?? []; return (module.type === "coding" && questions.length === 0) || (questions.length > 0 && questions.every((question, index) => Boolean(answers[question.id]?.text.trim()) && (module.type !== "ai_interview" || index !== 0 || Boolean(followUps[question.id]?.answer.trim())))); }
function moduleComplete(module: AssessmentModule, answers: Record<string, Answer>, followUps: Record<string, FollowUp>, codingComplete: boolean) { return questionResponsesComplete(module, answers, followUps) && (module.type !== "coding" || codingComplete); }
function allModulesComplete(modules: AssessmentModule[], answers: Record<string, Answer>, followUps: Record<string, FollowUp>, codingComplete: boolean) { return modules.length > 0 && modules.every((module) => moduleComplete(module, answers, followUps, codingComplete)); }
function completionPercent(modules: AssessmentModule[], answers: Record<string, Answer>, followUps: Record<string, FollowUp>, codingComplete: boolean) { return modules.length ? Math.round((modules.filter((module) => moduleComplete(module, answers, followUps, codingComplete)).length / modules.length) * 100) : 0; }
function moduleIcon(type: AssessmentModule["type"]): IconName { return type === "coding" || type === "debugging" ? "code" : type === "leadership" ? "crown" : type === "communication" ? "paperPlane" : type === "behavioral" || type === "work_style" ? "users" : type === "problem_solving" ? "sparkle" : "message"; }
function questionOptions(value: JsonValue | undefined): string[] { if (Array.isArray(value)) return value.filter((item): item is string => typeof item === "string"); if (value && typeof value === "object") { const record = value as Record<string, JsonValue>; for (const key of ["options", "choices", "answers"]) { const nested = record[key]; if (Array.isArray(nested)) return nested.map((item) => typeof item === "string" ? item : typeof item === "object" && item ? String((item as Record<string, JsonValue>).label ?? (item as Record<string, JsonValue>).value ?? "") : "").filter(Boolean); } } return []; }
function ChoiceInput({ options, value, onChange, disabled }: { options: string[]; value: string; onChange: (value: string) => void; disabled?: boolean }) { return <div className="grid gap-2">{options.map((option) => <label className={`flex items-center gap-3 rounded-[7px] border px-4 py-3 text-[var(--text-caption)] font-semibold transition ${disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"} ${value === option ? "border-[var(--color-primary-300)] bg-[var(--color-primary-50)] text-[var(--theme-heading)]" : "border-[var(--theme-border)] hover:bg-[var(--theme-panel-soft)]"}`} key={option}><input checked={value === option} className="size-4 accent-[var(--color-primary)]" disabled={disabled} name="choice" onChange={() => onChange(option)} type="radio" />{option}</label>)}</div>; }
function ScaleInput({ value, onChange, disabled }: { value?: number; onChange: (value: number) => void; disabled?: boolean }) { return <div><div className="grid grid-cols-5 gap-2">{[1, 2, 3, 4, 5].map((item) => <button className={`h-12 rounded-[6px] border text-[var(--text-body)] font-black transition disabled:cursor-not-allowed disabled:opacity-60 ${value === item ? "border-[var(--color-primary-400)] bg-[var(--color-primary-500)] text-[var(--theme-panel)]" : "border-[var(--theme-border)] bg-[var(--theme-panel)] text-[var(--theme-text)] hover:bg-[var(--theme-panel-soft)]"}`} disabled={disabled} key={item} onClick={() => onChange(item)} type="button">{item}</button>)}</div><div className="mt-2 flex justify-between text-[var(--text-micro)] text-[var(--theme-faint)]"><span>Strongly disagree</span><span>Strongly agree</span></div></div>; }
function numericAnswer(answer?: Answer) { const value = Number(answer?.json && typeof answer.json === "object" && !Array.isArray(answer.json) ? (answer.json as Record<string, JsonValue>).value : answer?.text); return Number.isFinite(value) ? value : undefined; }
function formatResponseForSave(answer: string, followUp?: FollowUp) { return followUp ? `${answer.trim()}\n\nAI follow-up: ${followUp.question.trim()}\nFollow-up response: ${followUp.answer.trim()}` : answer; }
function parseSavedResponse(value: string): { answer: string; followUp?: FollowUp } { const marker = "\n\nAI follow-up: "; const index = value.indexOf(marker); if (index < 0) return { answer: value }; const answer = value.slice(0, index); const remaining = value.slice(index + marker.length); const responseMarker = "\nFollow-up response: "; const responseIndex = remaining.indexOf(responseMarker); return responseIndex < 0 ? { answer } : { answer, followUp: { question: remaining.slice(0, responseIndex), answer: remaining.slice(responseIndex + responseMarker.length) } }; }
function firstName(name: string) { return name.trim().split(/\s+/)[0] || "Candidate"; }
function formatTimer(seconds: number) { const minutes = Math.floor(seconds / 60); return `${String(minutes).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`; }
