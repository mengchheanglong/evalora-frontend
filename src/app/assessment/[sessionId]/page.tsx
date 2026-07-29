"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CandidateInterviewerInbox, CandidateInterviewerQuestions, useInterviewerFollowUps } from "@/components/candidate-interviewer-questions";
import { ConnectionPill } from "@/components/realtime-indicators";
import type { ConnectionState } from "@/lib/realtime";
import { CandidateCodingAssessment } from "@/components/candidate-coding-assessment";
import { Icon, type IconName } from "@/components/icons";
import { useAiStream } from "@/components/use-ai-stream";
import { EvaloraLogo } from "@/components/logo";
import { ApiError, apiGet, apiPost, apiPut, getErrorMessage } from "@/lib/api";
import { decideInterviewerResume } from "@/lib/candidate-interview-navigation";
import type { AssessmentModule, CandidateAccessSession, CandidateCodeSubmission, CandidateResponse, InterviewerFollowUp, JsonValue, Question } from "@/lib/types";
import {
  parseSavedResponse,
  readStructuredFollowUp,
  withStructuredFollowUp,
} from "@/lib/candidate-response-storage";

type View = "loading" | "welcome" | "assessment" | "review" | "interviewer" | "complete" | "error";
type SaveState = "saved" | "saving" | "error";
type Answer = { text: string; json?: JsonValue };
type FollowUp = { question: string; answer: string };
type AiConversationMessage = { id: string; role: string; content: string; createdAt: string; basedOnQuestion?: string };
type AiStream = ReturnType<typeof useAiStream>;

function FloatingConnectionStatus({
  latencyMs,
  state,
  visible,
}: {
  latencyMs?: number | null;
  state: ConnectionState;
  visible: boolean;
}) {
  return (
    <div
      aria-atomic="true"
      aria-live="polite"
      className={`pointer-events-none fixed right-4 top-20 z-30 transition-all duration-200 sm:right-6 ${visible ? "translate-y-0 opacity-100" : "-translate-y-2 opacity-0"}`}
      role="status"
    >
      <span className="inline-flex rounded-full border border-neutral-200 bg-white/95 p-1 shadow-sm backdrop-blur">
        <ConnectionPill latencyMs={latencyMs} showLatency={false} state={state} />
      </span>
    </div>
  );
}

export default function CandidateAssessmentPage() {
  const { sessionId: rawAccessCode } = useParams<{ sessionId: string }>();
  const accessCode = decodeURIComponent(rawAccessCode);
  const [session, setSession] = useState<CandidateAccessSession | null>(null);
  const [answers, setAnswers] = useState<Record<string, Answer>>({});
  const [followUps, setFollowUps] = useState<Record<string, FollowUp>>({});
  const [view, setView] = useState<View>("loading");
  // Human interviewer questions delivered mid-session (polled; REST is authoritative).
  const interviewer = useInterviewerFollowUps(accessCode, view === "assessment" || view === "review" || view === "interviewer");
  // AI follow-up arrives token by token so the wait reads as a conversation.
  const aiStream = useAiStream(accessCode);
  const [activeModuleIndex, setActiveModuleIndex] = useState(0);
  const [activeQuestionIndex, setActiveQuestionIndex] = useState(0);
  const [briefingModuleId, setBriefingModuleId] = useState("");
  const [codingComplete, setCodingComplete] = useState(false);
  const [adaptiveQuestions, setAdaptiveQuestions] = useState<Question[] | null>(null);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [advancing, setAdvancing] = useState(false);
  const adaptiveRequested = useRef(false);
  const advancingRef = useRef(false);
  const advancingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedAdaptiveAnswers = useRef(new Map<string, Answer>());
  // Questions whose AI follow-up we already attempted. A follow-up is a bonus,
  // never a gate: without this the candidate re-enters the same failing branch on
  // every press and can never leave the question.
  const followUpAttempts = useRef(new Set<string>());
  const [saveState, setSaveState] = useState<SaveState>("saved");
  const [pageError, setPageError] = useState("");
  const [actionError, setActionError] = useState("");
  const [starting, setStarting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [reportStatus, setReportStatus] = useState<"generated" | "pending">("pending");
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [showFloatingConnection, setShowFloatingConnection] = useState(false);
  // Question to ring and scroll to once the interviewer view opens.
  const [highlightFollowUpId, setHighlightFollowUpId] = useState("");
  const [focusedFollowUpId, setFocusedFollowUpId] = useState("");
  // Set only when a required interviewer turn interrupted the candidate's
  // Continue action. An unsolicited question may be answered without advancing
  // the interview plan underneath it.
  const resumeAfterFollowUpId = useRef("");
  const saveTimers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const saveRequests = useRef(new Map<string, Promise<boolean>>());
  const answerRevisions = useRef(new Map<string, number>());
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
      const nextAdaptiveAnswers = new Map<string, Answer>();
      // Follow-up answers held beside the answer rather than inside it. The question
      // they answer is not stored on the response at all, so it is read back below
      // from the AI conversation that asked it.
      const savedFollowUpAnswers = new Map<string, string>();
      for (const response of savedResponses) {
        if (!response.questionId) {
          const adaptive = parseAdaptiveSavedResponse(response);
          if (adaptive) {
            nextAdaptiveAnswers.set(adaptive.question, { text: adaptive.answer });
            if (adaptive.followUp) nextFollowUps[adaptive.questionId] = adaptive.followUp;
          }
          continue;
        }
        const parsed = parseSavedResponse(response.responseText);
        nextAnswers[response.questionId] = { text: parsed.answer, json: response.responseJson };
        const structuredFollowUp = readStructuredFollowUp(response.responseJson);
        // Responses saved before the split still carry the whole exchange as text.
        if (parsed.followUp) nextFollowUps[response.questionId] = parsed.followUp;
        else if (structuredFollowUp?.question && structuredFollowUp.answer) {
          nextFollowUps[response.questionId] = {
            question: structuredFollowUp.question,
            answer: structuredFollowUp.answer,
          };
        } else if (structuredFollowUp?.answer) {
          savedFollowUpAnswers.set(response.questionId, structuredFollowUp.answer);
        }
      }
      if (savedFollowUpAnswers.size) {
        const probeByQuestion = await aiFollowUpQuestions(accessCode);
        for (const [questionId, answer] of savedFollowUpAnswers) {
          const question = probeByQuestion.get(questionTextById(nextSession.template.modules, questionId) ?? "");
          if (question) nextFollowUps[questionId] = { question, answer };
        }
      }
      savedAdaptiveAnswers.current = nextAdaptiveAnswers;
      let restoredAdaptiveQuestions: Question[] | null = null;
      if (nextSession.status === "in_progress" && nextSession.template.modules.some((module) => module.type === "ai_interview")) {
        try {
          const existing = await apiGet<{ questions: string[] }>(`/ai/access/${encodeURIComponent(accessCode)}/adaptive-questions`);
          const generated = toAdaptiveQuestions(existing.questions);
          if (generated.length) {
            restoredAdaptiveQuestions = generated;
            for (const question of generated) {
              const saved = nextAdaptiveAnswers.get(question.questionText);
              if (saved) nextAnswers[question.id] = saved;
            }
          }
        } catch {
          restoredAdaptiveQuestions = null;
        }
      }
      setSession(nextSession);
      setBriefingModuleId("");
      setAnswers(nextAnswers);
      setFollowUps(nextFollowUps);
      setAdaptiveQuestions(restoredAdaptiveQuestions);
      adaptiveRequested.current = Boolean(restoredAdaptiveQuestions);
      if (restoredAdaptiveQuestions) {
        const preparedModules = candidateModules(nextSession.template.modules);
        const aiModuleIndex = preparedModules.findIndex((module) => module.type === "ai_interview");
        const authoredCount = preparedModules[aiModuleIndex]?.questions?.length ?? 0;
        const firstUnanswered = restoredAdaptiveQuestions.findIndex((question) => !nextAnswers[question.id]?.text.trim());
        setActiveModuleIndex(Math.max(0, aiModuleIndex));
        setActiveQuestionIndex(authoredCount + (firstUnanswered >= 0 ? firstUnanswered : Math.max(0, restoredAdaptiveQuestions.length - 1)));
      }
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

  // Keep the live connection state available once the header is no longer in the
  // candidate's reading area. The dock mirrors the same state as the header.
  useEffect(() => {
    const updateFloatingConnection = () => setShowFloatingConnection(window.scrollY > 96);
    updateFloatingConnection();
    window.addEventListener("scroll", updateFloatingConnection, { passive: true });
    return () => window.removeEventListener("scroll", updateFloatingConnection);
  }, []);

  useEffect(() => {
    const startedAtMs = session?.startedAt ? new Date(session.startedAt).getTime() : Number.NaN;
    const limitMin = Number(session?.template?.timeLimitMin);
    // Untimed (or not yet started / malformed date) → leave the timer null so the
    // badge reads "Untimed" instead of ticking "NaN:NaN".
    if (Number.isNaN(startedAtMs) || !Number.isFinite(limitMin) || limitMin <= 0 || view === "complete") return;
    const endAt = startedAtMs + limitMin * 60_000;
    const update = () => setTimeLeft(Math.max(0, Math.ceil((endAt - Date.now()) / 1_000)));
    update();
    const timer = window.setInterval(update, 1_000);
    return () => window.clearInterval(timer);
  }, [session?.startedAt, session?.template?.timeLimitMin, view]);

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

  useEffect(() => () => {
    for (const timer of saveTimers.current.values()) clearTimeout(timer);
    if (advancingTimer.current) clearTimeout(advancingTimer.current);
  }, []);

  // A question that arrives mid-assessment is the one worth jumping to, whether
  // the candidate opens it from the alert now or from the sidebar later.
  const arrivalId = interviewer.arrival?.id;
  useEffect(() => {
    if (arrivalId) setHighlightFollowUpId(arrivalId);
  }, [arrivalId]);

  function focusInterviewerInbox(followUpId?: string) {
    if (followUpId) {
      setHighlightFollowUpId(followUpId);
      setFocusedFollowUpId(followUpId);
    }
    interviewer.dismissArrival();
    setActionError("");
    setView("assessment");
    window.setTimeout(() => {
      const inbox = document.getElementById("candidate-interviewer-inbox");
      if (!inbox) return;
      const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      inbox.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "center" });
    }, 0);
  }

  function openInterviewerHistory(followUpId?: string) {
    if (followUpId) setHighlightFollowUpId(followUpId);
    interviewer.dismissArrival();
    setActionError("");
    setView("interviewer");
  }

  const modules = useMemo(() => {
    const base = candidateModules(session?.template.modules ?? []);
    if (!adaptiveQuestions) return base;
    return base.map((module) => (
      module.type === "ai_interview"
        ? { ...module, questions: [...(module.questions ?? []), ...adaptiveQuestions] }
        : module
    ));
  }, [session?.template.modules, adaptiveQuestions]);
  const interviewerContextById = useMemo(() => {
    const contexts: Record<string, { moduleTitle?: string; questionText?: string; answerText?: string }> = {};
    for (const followUp of interviewer.followUps) {
      if (!followUp.parentQuestionId) continue;
      const module = modules.find((item) => (item.questions ?? []).some((question) => question.id === followUp.parentQuestionId));
      const question = module?.questions?.find((item) => item.id === followUp.parentQuestionId);
      const aiParentId = followUp.parentQuestionId.startsWith("ai-follow-up:")
        ? followUp.parentQuestionId.slice("ai-follow-up:".length)
        : undefined;
      const aiProbe = aiParentId ? followUps[aiParentId] : undefined;
      contexts[followUp.id] = {
        moduleTitle: module?.title ?? (aiParentId ? modules.find((item) => (item.questions ?? []).some((candidate) => candidate.id === aiParentId))?.title : undefined),
        questionText: question?.questionText ?? aiProbe?.question,
        answerText: answers[followUp.parentQuestionId]?.text ?? aiProbe?.answer,
      };
    }
    return contexts;
  }, [answers, interviewer.followUps, modules]);
  const activeModule = modules[activeModuleIndex];
  const activeQuestionCount = activeModule?.questions?.length ?? 0;
  const displayedQuestionIndex = activeQuestionCount > 0
    ? Math.min(activeQuestionIndex, activeQuestionCount - 1)
    : 0;
  const activeQuestion = activeModule?.questions?.[displayedQuestionIndex];
  const adaptiveReady = !modules.some((module) => module.type === "ai_interview") || adaptiveQuestions !== null;
  const focusedInterviewerTurn = interviewer.pending.find((item) => item.id === focusedFollowUpId);

  useEffect(() => {
    if (activeModuleIndex >= modules.length && modules.length > 0) {
      setActiveModuleIndex(modules.length - 1);
      setActiveQuestionIndex(0);
      return;
    }
    if (activeQuestionCount > 0 && activeQuestionIndex !== displayedQuestionIndex) {
      setActiveQuestionIndex(displayedQuestionIndex);
    }
  }, [activeModuleIndex, activeQuestionCount, activeQuestionIndex, displayedQuestionIndex, modules.length]);

  async function startAssessment() {
    setStarting(true);
    setActionError("");
    try {
      const started = await apiPut<CandidateAccessSession>(`/sessions/access/${encodeURIComponent(accessCode)}/start`);
      setSession(started);
      setBriefingModuleId(candidateModules(started.template.modules)[0]?.id ?? "");
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
    answerRevisions.current.set(question.id, (answerRevisions.current.get(question.id) ?? 0) + 1);
    dirtyQuestions.current.add(question.id);
    setSaveState("saving");
    const currentTimer = saveTimers.current.get(question.id);
    if (currentTimer) clearTimeout(currentTimer);
    saveTimers.current.set(question.id, setTimeout(() => void persistQuestion(question.id, answer), 700));
  }

  async function persistQuestion(questionId: string, answerOverride?: Answer): Promise<boolean> {
    const existingRequest = saveRequests.current.get(questionId);
    if (existingRequest) {
      const saved = await existingRequest;
      if (saveRequests.current.get(questionId) === existingRequest) saveRequests.current.delete(questionId);
      if (!saved || !dirtyQuestions.current.has(questionId)) return saved;
      return persistQuestion(questionId, answerOverride ?? answers[questionId]);
    }

    const answer = answerOverride ?? answers[questionId];
    if (!answer) return false;
    const revision = answerRevisions.current.get(questionId) ?? 0;
    const timer = saveTimers.current.get(questionId);
    if (timer) clearTimeout(timer);
    saveTimers.current.delete(questionId);
    setSaveState("saving");
    const request = (async () => {
      try {
        const followUp = followUps[questionId];
        if (questionId.startsWith("ai-adaptive-")) {
          const question = adaptiveQuestions?.find((item) => item.id === questionId)?.questionText ?? "";
          await apiPost(`/ai/access/${encodeURIComponent(accessCode)}/adaptive-answer`, {
            questionId,
            question,
            answer: answer.text,
            followUpQuestion: followUp?.question,
            followUpAnswer: followUp?.answer,
          });
        } else {
          await apiPost<CandidateResponse>(`/responses/access/${encodeURIComponent(accessCode)}`, {
            questionId,
            // Only what the candidate typed for this question. The AI's wording never
            // joins it: a reader of the column cannot tell the two apart afterwards.
            responseText: answer.text,
            responseJson: withStructuredFollowUp(answer.json, followUp),
          });
        }
        if ((answerRevisions.current.get(questionId) ?? 0) === revision) dirtyQuestions.current.delete(questionId);
        setSaveState("saved");
        return true;
      } catch {
        setSaveState("error");
        return false;
      }
    })();
    saveRequests.current.set(questionId, request);
    try {
      return await request;
    } finally {
      if (saveRequests.current.get(questionId) === request) saveRequests.current.delete(questionId);
    }
  }

  async function flushPendingSaves() {
    const pendingQuestionIds = new Set([
      ...dirtyQuestions.current,
      ...saveTimers.current.keys(),
      ...saveRequests.current.keys(),
    ]);
    const saved = await Promise.all(Array.from(pendingQuestionIds).map((questionId) => persistQuestion(questionId)));
    if (saved.some((result) => !result)) throw new Error("One or more responses could not be saved.");
  }

  async function ensureQuestionSaved(questionId: string, answer: Answer): Promise<boolean> {
    const hasPendingSave = dirtyQuestions.current.has(questionId)
      || saveTimers.current.has(questionId)
      || saveRequests.current.has(questionId);
    return hasPendingSave ? persistQuestion(questionId, answer) : true;
  }

  async function prepareAdaptiveQuestions(authoredQuestionCount: number): Promise<boolean> {
    if (adaptiveQuestions?.length) {
      setActiveQuestionIndex(authoredQuestionCount);
      return true;
    }
    if (adaptiveRequested.current) return false;

    adaptiveRequested.current = true;
    setAiGenerating(true);
    setActionError("");
    try {
      await flushPendingSaves();
      const aiModule = candidateModules(session?.template.modules ?? []).find((module) => module.type === "ai_interview");
      const result = await apiPost<{ questions: string[] }>(`/ai/access/${encodeURIComponent(accessCode)}/adaptive-questions`, {
        count: adaptiveQuestionCount(aiModule?.settings),
      });
      const generated = toAdaptiveQuestions(result.questions);
      if (!generated.length) throw new Error("No tailored questions were generated.");

      setAnswers((current) => {
        const next = { ...current };
        for (const question of generated) {
          const saved = savedAdaptiveAnswers.current.get(question.questionText);
          if (saved) next[question.id] = saved;
        }
        return next;
      });
      setAdaptiveQuestions(generated);
      setActiveQuestionIndex(authoredQuestionCount);
      return true;
    } catch (requestError) {
      adaptiveRequested.current = false;
      setActionError(getErrorMessage(requestError, "Your answers were saved, but the tailored interview could not load. Try again."));
      return false;
    } finally {
      setAiGenerating(false);
    }
  }

  async function handleInterviewerQuestionChanged(followUpId?: string): Promise<InterviewerFollowUp[]> {
    const refreshed = await interviewer.reload();
    if (!followUpId) return refreshed;

    const decision = decideInterviewerResume({
      activeQuestionId: activeQuestion?.id,
      changedFollowUpId: followUpId,
      refreshedFollowUps: refreshed,
      resumeAfterFollowUpId: resumeAfterFollowUpId.current,
    });
    if (!decision.resolved) return refreshed;
    if (focusedFollowUpId === followUpId) {
      setFocusedFollowUpId("");
      setHighlightFollowUpId("");
    }
    if (decision.nextBlockingId) {
      resumeAfterFollowUpId.current = decision.nextBlockingId;
      focusInterviewerInbox(decision.nextBlockingId);
      setActionError("Your interviewer has another follow-up before the interview continues.");
    } else if (decision.resume) {
      resumeAfterFollowUpId.current = "";
      setView("assessment");
      await nextQuestion(followUpId);
    }
    return refreshed;
  }

  async function nextQuestion(resolvedInterviewerFollowUpId?: string) {
    if (timeLeft === 0 || advancingRef.current) return;
    if (!activeModule || !activeQuestion) return;
    const answer = answers[activeQuestion.id];
    if (!answer?.text.trim()) {
      setActionError("Add a response before continuing.");
      return;
    }
    setActionError("");

    const remainingRequiredTurns = interviewer.pendingRequired.filter(
      (item) => item.id !== resolvedInterviewerFollowUpId,
    );
    const interviewerTurn = remainingRequiredTurns.find((item) => item.parentQuestionId === activeQuestion.id)
      ?? remainingRequiredTurns[0];
    if (interviewerTurn) {
      resumeAfterFollowUpId.current = interviewerTurn.id;
      focusInterviewerInbox(interviewerTurn.id);
      setActionError(`Your interviewer has a follow-up before the interview continues.`);
      return;
    }

    if (
      hasAiInterviewer(session?.template.modules ?? [])
      && !followUps[activeQuestion.id]
      && !followUpAttempts.current.has(activeQuestion.id)
    ) {
      advancingRef.current = true;
      setAdvancing(true);
      let decision: Awaited<ReturnType<typeof aiStream.start>> = null;
      try {
        if (!(await ensureQuestionSaved(activeQuestion.id, answer))) {
          setActionError("Your response could not be saved. Check your connection and try again.");
          return;
        }
        decision = await aiStream.start({
          questionId: activeQuestion.id,
          moduleId: activeModule.id,
          question: activeQuestion.questionText,
          answer: answer.text,
        });
      } catch (requestError) {
        setActionError(getErrorMessage(requestError, "Your answer was saved, but the follow-up could not load. You can continue."));
      } finally {
        advancingRef.current = false;
        setAdvancing(false);
      }

      if (decision?.shouldAsk && decision.question) {
        setFollowUps((current) => ({ ...current, [activeQuestion.id]: { question: decision.question, answer: "" } }));
        aiStream.reset();
        setActionError("One follow-up question was added based on your response.");
        return;
      }

      followUpAttempts.current.add(activeQuestion.id);
      aiStream.reset();
      if (!decision) {
        setActionError("The optional AI check could not load, so we moved on. Your answer was saved.");
      }
    }

    const followUp = followUps[activeQuestion.id];
    if (followUp && !followUp.answer.trim()) {
      setActionError("Answer the follow-up question before continuing.");
      return;
    }
    advancingRef.current = true;
    setAdvancing(true);
    if (!(await ensureQuestionSaved(activeQuestion.id, answer))) {
      setActionError("Your response could not be saved. Check your connection and try again.");
      advancingRef.current = false;
      setAdvancing(false);
      return;
    }

    if (displayedQuestionIndex < activeQuestionCount - 1) {
      setActiveQuestionIndex(displayedQuestionIndex + 1);
      releaseAdvanceLock();
      return;
    }
    if (activeModule.type === "coding") {
      releaseAdvanceLock();
      return;
    }
    if (activeModuleIndex < modules.length - 1) {
      const nextModule = modules[activeModuleIndex + 1];
      setActiveModuleIndex((index) => index + 1);
      setActiveQuestionIndex(0);
      setBriefingModuleId(nextModule?.id ?? "");
      releaseAdvanceLock();
      return;
    }
    setView("review");
    releaseAdvanceLock();
  }

  function releaseAdvanceLock() {
    if (advancingTimer.current) clearTimeout(advancingTimer.current);
    advancingTimer.current = setTimeout(() => {
      advancingRef.current = false;
      setAdvancing(false);
      advancingTimer.current = null;
    }, 220);
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
    if (!confirmed || !allModulesComplete(modules, answers, followUps, codingComplete, adaptiveReady)) return;
    setSubmitting(true);
    setActionError("");
    try {
      await flushPendingSaves();
      const completed = await apiPut<CandidateAccessSession>(`/sessions/access/${encodeURIComponent(accessCode)}/complete`);
      setReportStatus(completed.reportStatus ?? "pending");
      setView("complete");
    } catch (requestError) {
      // The server blocks submission while a required interviewer question is
      // unanswered (it can arrive after this screen opened) — send the candidate
      // straight to it instead of showing a dead-end error. This is the backstop;
      // the banner on the review panel shows the block before they get here.
      if (isPendingInterviewerQuestionError(requestError)) {
        // Read the target from what reload() just returned: `interviewer` here is
        // the object this render closed over, so its lists are still the stale ones.
        const refreshed = await interviewer.reload();
        const blocking = refreshed.find((item) => item.status === "sent" && item.required)
          ?? refreshed.find((item) => item.status === "sent");
        focusInterviewerInbox(blocking?.id);
        setActionError("Answer the question your interviewer sent, then submit again.");
      } else {
        setActionError(getErrorMessage(requestError, "Unable to submit. Your saved responses are still available."));
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (view === "loading") return <CandidateLoading />;
  if (view === "error") return <CandidateError message={pageError} />;
  if (!session) return null;
  if (view === "welcome") return <CandidateWelcome error={actionError} onStart={() => void startAssessment()} session={session} starting={starting} />;
  if (view === "complete") return <CandidateComplete candidateName={session.candidateName} reportStatus={reportStatus} />;

  const completion = completionPercent(modules, answers, followUps, codingComplete, adaptiveReady);
  const timeUp = timeLeft === 0;
  const pendingRequiredCount = interviewer.pendingRequired.length;
  const linkDropped = interviewer.connection === "reconnecting" || interviewer.connection === "offline";

  return (
    <main className="min-h-screen bg-[#f5f7f9] text-neutral-950">
      {/* Assertive is justified: an unanswered required question blocks submission,
          so missing it leaves the candidate stuck with no explanation. */}
      <div aria-atomic="true" aria-live="assertive" className="sr-only" role="alert">
        {interviewer.arrival
          ? `New ${interviewer.arrival.required ? "required " : ""}question from ${interviewer.arrival.askedBy.name}: ${interviewer.arrival.questionText}`
          : ""}
      </div>

      <FloatingConnectionStatus
        latencyMs={interviewer.latencyMs}
        state={interviewer.connection}
        visible={showFloatingConnection}
      />

      <header className="sticky top-0 z-40 border-b border-neutral-200 bg-white/95 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-[1480px] items-center gap-4 px-4 sm:px-6">
          <EvaloraLogo compact />
          <div className="hidden min-w-0 sm:block"><p className="truncate text-sm font-bold text-neutral-900">{session.template.title}</p><p className="mt-0.5 truncate text-xs text-neutral-500">{session.candidateName}</p></div>
          <div className="ml-auto flex items-center gap-4">
            <div className="hidden items-center gap-2 md:flex"><div className="h-1.5 w-32 overflow-hidden rounded-full bg-neutral-100"><div className="h-full rounded-full bg-[#29b7e5] transition-all" style={{ width: `${completion}%` }} /></div><span className="text-xs font-bold text-neutral-500">{completion}%</span></div>
            <span className={`inline-flex min-w-[92px] items-center justify-center gap-2 rounded-[5px] border px-3 py-2 text-sm font-bold ${timeLeft === 0 ? "border-red-200 bg-red-50 text-red-700" : "border-neutral-200 bg-white text-neutral-700"}`}><Icon name="clock" size={14} />{timeLeft === null ? "Untimed" : formatTimer(timeLeft)}</span>
            <span className="hidden sm:inline-flex"><ConnectionPill latencyMs={interviewer.latencyMs} state={interviewer.connection} /></span>
            <span className={`hidden items-center gap-1.5 text-xs font-semibold sm:flex ${saveState === "error" ? "text-red-600" : saveState === "saving" ? "text-amber-600" : "text-emerald-600"}`}><span className={`size-1.5 rounded-full ${saveState === "error" ? "bg-red-500" : saveState === "saving" ? "animate-pulse bg-amber-500" : "bg-emerald-500"}`} />{saveState === "error" ? "Save failed" : saveState === "saving" ? "Saving" : "Saved"}</span>
          </div>
        </div>
      </header>

      {linkDropped ? (
        <p
          aria-live="polite"
          className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-center text-sm font-semibold leading-5 text-amber-900 sm:px-6"
          role="status"
        >
          <Icon className="mr-1.5 inline-block -translate-y-px" name="shield" size={13} />
          {interviewer.connection === "offline" ? "The live connection is unavailable." : "Reconnecting to your interviewer."}{" "}
          Everything you write keeps saving automatically — nothing is lost.
        </p>
      ) : null}

      <div className="mx-auto grid max-w-[1480px] lg:grid-cols-[250px_minmax(0,1fr)]">
        <aside className="hidden min-h-[calc(100vh-64px)] border-r border-neutral-200 bg-white p-4 lg:block">
          <p className="px-2 pb-1 text-xs font-bold uppercase text-neutral-400">Interview plan</p>
          <p className="px-2 pb-3 text-xs text-neutral-400">{modules.length} stages</p>
          <nav className="space-y-1">{modules.map((module, index) => { const complete = moduleComplete(module, answers, followUps, codingComplete, adaptiveReady); const active = index === activeModuleIndex && view === "assessment"; return <button className={`flex w-full items-center gap-3 rounded-[6px] px-3 py-3 text-left transition ${active ? "bg-sky-50 text-sky-900" : "text-neutral-600 hover:bg-neutral-50"}`} disabled={index > activeModuleIndex && !moduleComplete(modules[index - 1], answers, followUps, codingComplete, adaptiveReady)} key={module.id} onClick={() => { setActiveModuleIndex(index); setActiveQuestionIndex(0); setView("assessment"); }} type="button"><span className={`flex size-7 shrink-0 items-center justify-center rounded-[5px] ${complete ? "bg-emerald-100 text-emerald-700" : active ? "bg-sky-100 text-sky-700" : "bg-neutral-100 text-neutral-500"}`}>{complete ? <Icon name="check" size={13} /> : <Icon name={moduleIcon(module.type)} size={13} />}</span><span className="min-w-0"><span className="block truncate text-sm font-bold">{module.title}</span><span className="mt-0.5 block text-xs text-neutral-400">{complete ? "Complete" : active ? "In progress" : stageFormatLabel(module.type)}</span></span></button>; })}</nav>
          {interviewer.followUps.length ? (
            <button className={`mt-3 flex w-full items-center gap-3 rounded-[6px] px-3 py-3 text-left text-sm font-bold transition ${view === "interviewer" ? "bg-violet-50 text-violet-800 ring-1 ring-inset ring-violet-200" : "text-neutral-600 hover:bg-neutral-50"}`} onClick={() => openInterviewerHistory()} type="button">
              <span className="flex size-7 items-center justify-center rounded-[5px] bg-violet-100 text-violet-700"><Icon name="message" size={13} /></span>
              Conversation history
              {interviewer.pending.length ? <span className="ml-auto grid size-5 place-items-center rounded-full bg-violet-600 text-xs font-black text-white">{interviewer.pending.length}</span> : null}
            </button>
          ) : null}
          <button className={`mt-3 flex w-full items-center gap-3 rounded-[6px] px-3 py-3 text-left text-sm font-bold ${view === "review" ? "bg-neutral-900 text-white" : "text-neutral-600 hover:bg-neutral-50"}`} onClick={() => setView("review")} type="button"><span className="flex size-7 items-center justify-center rounded-[5px] bg-white/10"><Icon name="report" size={13} /></span>Close interview</button>
        </aside>

        {/*
          The arrival alert is fixed to the bottom, where on a narrow screen it
          spans the full width and lands on top of the Back / Save and continue
          row. Reserve the space it occupies so a tap never hits the toast
          instead of the button underneath it.
        */}
        <section className={`min-w-0 p-4 sm:p-6 lg:p-8 ${interviewer.arrival && !timeUp ? "pb-52 sm:pb-6 lg:pb-8" : ""}`}>
          {view === "interviewer" ? (
            <>
              {actionError ? <p className="mx-auto mb-3 max-w-[860px] rounded-[6px] bg-amber-50 px-3 py-2 text-sm text-amber-800">{actionError}</p> : null}
              <CandidateInterviewerQuestions accessCode={accessCode} contextByFollowUpId={interviewerContextById} disabled={timeUp} followUps={interviewer.followUps} highlightId={highlightFollowUpId} onChanged={handleInterviewerQuestionChanged} />
            </>
          ) : view === "review" ? (
            <ReviewPanel adaptiveReady={adaptiveReady} answers={answers} codingComplete={codingComplete} confirmed={confirmed} error={actionError} followUps={followUps} modules={modules} onAnswerInterviewer={() => focusInterviewerInbox(interviewer.pendingRequired[0]?.id)} onBack={() => setView("assessment")} onConfirm={setConfirmed} onSubmit={() => void submitAssessment()} pendingRequiredCount={pendingRequiredCount} submitting={submitting} />
          ) : view === "assessment" && focusedInterviewerTurn ? (
            <CandidateInterviewerInbox
              accessCode={accessCode}
              contextByFollowUpId={interviewerContextById}
              disabled={timeUp}
              followUps={interviewer.followUps}
              highlightId={focusedInterviewerTurn.id}
              onChanged={handleInterviewerQuestionChanged}
              onOpenAll={() => openInterviewerHistory(focusedInterviewerTurn.id)}
              primary
            />
          ) : view === "assessment" && activeModule && briefingModuleId === activeModule.id ? (
            <StageBriefing
              module={activeModule}
              onBegin={() => {
                setBriefingModuleId("");
                if (activeModule.type === "ai_interview" && !(activeModule.questions?.length ?? 0)) {
                  void prepareAdaptiveQuestions(0);
                }
              }}
              stageIndex={activeModuleIndex}
              stageTotal={modules.length}
            />
          ) : activeModule?.type === "coding" ? (
            <CandidateCodingAssessment accessCode={accessCode} locked={timeUp} onBack={previousQuestion} onContinue={() => { setCodingComplete(true); if (activeModuleIndex < modules.length - 1) { const nextModule = modules[activeModuleIndex + 1]; setActiveModuleIndex((index) => index + 1); setActiveQuestionIndex(0); setBriefingModuleId(nextModule?.id ?? ""); } else setView("review"); }} />
          ) : activeModule?.type === "ai_interview" && aiGenerating ? (
            <AiPreparing />
          ) : activeModule && activeQuestion ? (
            <QuestionPanel answer={answers[activeQuestion.id]} busy={advancing} disabled={timeUp} error={actionError} followUp={followUps[activeQuestion.id]} module={activeModule} onAnswer={(answer) => updateAnswer(activeQuestion, answer)} onBack={previousQuestion} onFollowUp={(answer) => { if (timeLeft === 0) return; setFollowUps((current) => ({ ...current, [activeQuestion.id]: { ...current[activeQuestion.id], answer } })); answerRevisions.current.set(activeQuestion.id, (answerRevisions.current.get(activeQuestion.id) ?? 0) + 1); dirtyQuestions.current.add(activeQuestion.id); setSaveState("saving"); }} onNext={() => void nextQuestion()} question={activeQuestion} questionIndex={displayedQuestionIndex} stream={aiStream} />
          ) : <QuestionLoading />}
          {view === "assessment" && !briefingModuleId && !focusedInterviewerTurn ? (
            <CandidateInterviewerInbox
              accessCode={accessCode}
              contextByFollowUpId={interviewerContextById}
              disabled={timeUp}
              followUps={interviewer.followUps}
              highlightId={highlightFollowUpId}
              onChanged={handleInterviewerQuestionChanged}
              onOpenAll={() => openInterviewerHistory(highlightFollowUpId)}
            />
          ) : null}
        </section>
      </div>

      {interviewer.arrival && !timeUp ? (
        <NewQuestionAlert
          followUp={interviewer.arrival}
          onDismiss={interviewer.dismissArrival}
          onOpen={() => focusInterviewerInbox(interviewer.arrival?.id)}
        />
      ) : null}

      {timeUp ? <TimeUpModal /> : null}
    </main>
  );
}

/**
 * Visible counterpart to the assertive announcement: a question can land while
 * the candidate is scrolled elsewhere, and a required one silently blocks their
 * submission, so it stays until they open or dismiss it.
 */
function NewQuestionAlert({ followUp, onOpen, onDismiss }: { followUp: InterviewerFollowUp; onOpen: () => void; onDismiss: () => void }) {
  return (
    <div className="fixed inset-x-4 bottom-4 z-40 sm:inset-x-auto sm:right-6 sm:w-[380px]">
      <div className="rounded-[10px] border border-violet-300 bg-white p-4 shadow-[0_18px_50px_rgba(15,23,42,0.18)]">
        <div className="flex items-start gap-3">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-violet-100 text-violet-700"><Icon name="user" size={15} /></span>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold uppercase tracking-wide text-violet-700">
              New question from {followUp.askedBy.name}
            </p>
            <p className="mt-1 line-clamp-3 text-sm leading-5 text-neutral-700">{followUp.questionText}</p>
            <p className="mt-1 text-xs font-semibold text-neutral-500">
              {followUp.required ? "An answer is needed before you can submit." : "Optional — answer it whenever you like."}
            </p>
          </div>
          <button
            aria-label="Dismiss this notification"
            className="-mr-1 -mt-1 rounded-[6px] p-1.5 text-neutral-400 transition hover:bg-neutral-100 hover:text-neutral-700"
            onClick={onDismiss}
            type="button"
          >
            <Icon name="x" size={14} />
          </button>
        </div>
        <button
          className="mt-3 inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-[8px] bg-violet-600 px-4 text-sm font-bold text-white transition hover:bg-violet-700"
          onClick={onOpen}
          type="button"
        >
          Read and answer <Icon className="-rotate-90" name="chevron" size={12} />
        </button>
      </div>
    </div>
  );
}

function AiPreparing() {
  return (
    <div className="mx-auto max-w-[860px]">
      <div className="rounded-[10px] border border-sky-100 bg-sky-50 px-4 py-3">
        <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-sky-700"><Icon name="sparkle" size={14} /> AI Interview</p>
      </div>
      <div className="mt-4 flex flex-col items-center justify-center gap-4 rounded-[10px] border border-neutral-200 bg-white px-6 py-16 text-center shadow-[0_16px_45px_rgba(15,23,42,0.06)]">
        <span className="size-10 animate-spin rounded-full border-[3px] border-neutral-200 border-t-sky-500" />
        <div>
          <p className="text-base font-black text-neutral-900">Preparing your tailored questions…</p>
          <p className="mx-auto mt-2 max-w-[420px] text-sm leading-6 text-neutral-500">Our AI is reviewing your earlier answers to ask a few follow-up questions matched to your experience.</p>
        </div>
      </div>
    </div>
  );
}

/** The follow-up as it is being written: caret while tokens land, dots before the first one. */
function AiFollowUpStream({ text, streaming, error }: { text: string; streaming: boolean; error: string }) {
  return (
    <div className="mt-6 border-t border-neutral-200 pt-6">
      <div aria-busy={streaming} className="rounded-[7px] border border-sky-100 bg-sky-50 p-4">
        <p className="flex items-center gap-2 text-xs font-bold uppercase text-sky-700"><Icon name="sparkle" size={14} /> AI follow-up</p>
        {text ? (
          // Announcing every token would flood a screen reader; the finished
          // question is read out from the answerable card that replaces this one.
          <p aria-hidden={streaming || undefined} className="mt-2 text-sm font-bold leading-6 text-sky-950">
            {text}
            {streaming ? <span className="ml-0.5 inline-block h-[13px] w-[6px] translate-y-[2px] rounded-[1px] bg-sky-500 motion-safe:animate-pulse" /> : null}
          </p>
        ) : streaming ? (
          <p aria-live="polite" className="mt-2 flex items-center gap-2 text-sm font-semibold text-sky-700">
            <span className="flex gap-1">
              {[0, 160, 320].map((delay) => <span className="size-1.5 rounded-full bg-sky-400 motion-safe:animate-bounce" key={delay} style={{ animationDelay: `${delay}ms` }} />)}
            </span>
            Reading your answer…
          </p>
        ) : null}
        {error ? <p className="mt-3 rounded-[5px] bg-amber-50 px-3 py-2 text-sm leading-5 text-amber-800">{error}</p> : null}
      </div>
    </div>
  );
}

function TimeUpModal() {
  return (
    <div aria-live="assertive" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/60 px-5 backdrop-blur-sm" role="alertdialog">
      <div className="w-full max-w-[440px] rounded-[14px] border border-neutral-200 bg-white p-8 text-center shadow-[0_24px_70px_rgba(15,23,42,0.28)]">
        <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-red-100 text-red-600"><Icon name="clock" size={24} /></span>
        <h2 className="mt-5 text-xl font-black text-neutral-950">Time&apos;s up</h2>
        <p className="mt-3 text-sm leading-6 text-neutral-600">The time limit for this interview has ended. You can no longer edit answers, run code, or submit new responses. Everything you saved has been preserved for the review team.</p>
        <p className="mt-6 text-xs text-neutral-500">You may close this window.</p>
      </div>
    </div>
  );
}

function CandidateWelcome({ session, onStart, starting, error }: { session: CandidateAccessSession; onStart: () => void; starting: boolean; error: string }) {
  const modules = candidateModules(session.template.modules);
  const timeLabel = session.template.timeLimitMin ? `${session.template.timeLimitMin} minutes` : "Untimed";

  return (
    <main className="min-h-screen bg-[#f4f7f9] px-4 py-8 text-neutral-950 sm:px-6 sm:py-12">
      <section className="mx-auto flex min-h-[calc(100vh-64px)] max-w-[980px] items-center">
        <div className="w-full overflow-hidden rounded-[12px] border border-neutral-200 bg-white shadow-[0_20px_65px_rgba(15,23,42,0.08)]">
          <header className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-200 px-5 py-4 sm:px-8">
            <EvaloraLogo compact />
            <span className="inline-flex items-center gap-2 rounded-full bg-sky-50 px-3 py-1.5 text-xs font-bold text-sky-800">
              <Icon name="shield" size={13} /> Private candidate interview
            </span>
          </header>

          <div className="grid lg:grid-cols-[minmax(0,1fr)_360px]">
            <div className="px-5 py-8 sm:px-8 sm:py-10">
              <p className="text-xs font-bold uppercase text-sky-700">Interview for {session.targetRole ?? session.template.roleType}</p>
              <h1 className="mt-3 max-w-[560px] text-3xl font-black leading-tight text-neutral-950 sm:text-4xl">
                {session.template.title}
              </h1>
              <p className="mt-3 text-sm font-semibold text-neutral-600">Prepared for {session.candidateName}</p>
              <p className="mt-6 max-w-[590px] text-sm leading-6 text-neutral-600">
                This is a structured interview. Every candidate receives the same core stages, while relevant follow-up questions may be added to understand your reasoning in more depth.
              </p>

              <div className="mt-7 grid gap-4 border-y border-neutral-200 py-5 sm:grid-cols-3">
                <WelcomeFact icon="clock" title={timeLabel} body="Available interview time" />
                <WelcomeFact icon="clipboard" title={`${modules.length} stages`} body="Shown in order" />
                <WelcomeFact icon="message" title="Guided conversation" body="Human and adaptive follow-ups" />
              </div>

              <div className="mt-7">
                <h2 className="text-sm font-black text-neutral-900">Before you begin</h2>
                <ul className="mt-3 space-y-2 text-sm leading-5 text-neutral-600">
                  <li className="flex gap-2"><Icon className="mt-0.5 shrink-0 text-emerald-600" name="check" size={14} />Your responses save automatically and remain editable until final submission.</li>
                  <li className="flex gap-2"><Icon className="mt-0.5 shrink-0 text-emerald-600" name="check" size={14} />A live interviewer may ask a question about an answer before the next turn.</li>
                  <li className="flex gap-2"><Icon className="mt-0.5 shrink-0 text-emerald-600" name="check" size={14} />You will review the complete interview before closing it.</li>
                </ul>
              </div>

              {error ? <p className="status-alert status-alert--error mt-5 rounded-[7px] border px-4 py-3 text-sm">{error}</p> : null}
              <button className="mt-7 inline-flex h-11 items-center justify-center gap-2 rounded-[7px] bg-primary-500 px-5 text-sm font-bold text-white transition hover:bg-primary-600 disabled:cursor-not-allowed disabled:opacity-60" disabled={starting} onClick={onStart} type="button">
                {starting ? "Opening interview..." : "Start interview"}
                {!starting ? <Icon className="-rotate-90" name="chevron" size={14} /> : null}
              </button>
            </div>

            <aside className="border-t border-neutral-200 bg-neutral-50 px-5 py-7 sm:px-8 lg:border-l lg:border-t-0">
              <p className="text-xs font-bold uppercase text-neutral-400">Interview plan</p>
              <ol className="mt-4 space-y-1">
                {modules.map((module, index) => (
                  <li className="flex items-center gap-3 border-b border-neutral-200 py-3 last:border-0" key={module.id}>
                    <span className="grid size-7 shrink-0 place-items-center rounded-[6px] bg-white text-xs font-black text-neutral-500 ring-1 ring-neutral-200">{index + 1}</span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-bold text-neutral-900">{module.title}</span>
                      <span className="mt-0.5 block text-xs text-neutral-500">{stageFormatLabel(module.type)}</span>
                    </span>
                  </li>
                ))}
              </ol>
            </aside>
          </div>
        </div>
      </section>
    </main>
  );
}

function WelcomeFact({ icon, title, body }: { icon: IconName; title: string; body: string }) {
  return (
    <div className="flex gap-3">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-[6px] bg-sky-50 text-sky-700">
        <Icon name={icon} size={15} />
      </span>
      <div>
        <p className="text-sm font-black text-neutral-900">{title}</p>
        <p className="mt-0.5 text-xs text-neutral-500">{body}</p>
      </div>
    </div>
  );
}

function StageBriefing({ module, stageIndex, stageTotal, onBegin }: { module: AssessmentModule; stageIndex: number; stageTotal: number; onBegin: () => void }) {
  const questionCount = module.questions?.length ?? 0;
  return (
    <section className="mx-auto flex min-h-[520px] max-w-[860px] items-center">
      <div className="w-full rounded-[10px] border border-neutral-200 bg-white px-6 py-9 shadow-[0_16px_45px_rgba(15,23,42,0.06)] sm:px-10">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-[8px] bg-sky-50 text-sky-700">
            <Icon name={moduleIcon(module.type)} size={18} />
          </span>
          <div>
            <p className="text-xs font-bold uppercase text-sky-700">Stage {stageIndex + 1} of {stageTotal}</p>
            <p className="mt-0.5 text-xs text-neutral-500">{stageFormatLabel(module.type)}</p>
          </div>
        </div>
        <h1 className="mt-6 text-2xl font-black text-neutral-950 sm:text-3xl">{module.title}</h1>
        <p className="mt-3 max-w-[650px] text-sm leading-6 text-neutral-600">{stageBriefingText(module)}</p>
        <dl className="mt-7 flex flex-wrap gap-x-8 gap-y-3 border-y border-neutral-200 py-4 text-sm">
          <div><dt className="text-xs text-neutral-400">Format</dt><dd className="mt-1 font-bold text-neutral-800">{stageFormatLabel(module.type)}</dd></div>
          <div><dt className="text-xs text-neutral-400">Core prompts</dt><dd className="mt-1 font-bold text-neutral-800">{module.type === "coding" && questionCount === 0 ? "Coding workspace" : questionCount}</dd></div>
          <div><dt className="text-xs text-neutral-400">Progress</dt><dd className="mt-1 font-bold text-neutral-800">{stageIndex + 1} / {stageTotal}</dd></div>
        </dl>
        <button autoFocus className="button-primary mt-7" onClick={onBegin} type="button">
          Begin {module.title} <Icon className="-rotate-90" name="chevron" size={13} />
        </button>
      </div>
    </section>
  );
}

function QuestionPanel({ module, question, questionIndex, answer, followUp, onAnswer, onFollowUp, onBack, onNext, error, busy = false, disabled, stream }: { module: AssessmentModule; question: Question; questionIndex: number; answer?: Answer; followUp?: FollowUp; onAnswer: (answer: Answer) => void; onFollowUp: (answer: string) => void; onBack: () => void; onNext: () => void; error: string; busy?: boolean; disabled?: boolean; stream: AiStream }) {
  const options = questionOptions(question.options);
  const adaptive = question.id.startsWith("ai-adaptive-");
  return (
    <div className="mx-auto max-w-[860px]">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase text-sky-700">{module.title}</p>
          <p className="mt-1 text-xs text-neutral-500">Turn {questionIndex + 1} of {module.questions?.length ?? 1}</p>
        </div>
        <span className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-neutral-500 ring-1 ring-neutral-200">
          {stageFormatLabel(module.type)}
        </span>
      </div>

      <article className="overflow-hidden rounded-[10px] border border-neutral-200 bg-white shadow-[0_16px_45px_rgba(15,23,42,0.06)]">
        <div className="border-b border-neutral-200 px-5 py-5 sm:px-7 sm:py-6">
          <div className="flex items-center gap-3">
            <span className={`grid size-9 shrink-0 place-items-center rounded-[8px] ${adaptive ? "bg-amber-50 text-amber-700" : "bg-sky-50 text-sky-700"}`}>
              <Icon name={adaptive ? "sparkle" : "message"} size={16} />
            </span>
            <div>
              <p className="text-xs font-black text-neutral-900">{adaptive ? "Adaptive interviewer" : "Structured interview question"}</p>
              <p className="mt-0.5 text-xs text-neutral-400">{adaptive ? "Based on your earlier responses" : "From the interview plan"}</p>
            </div>
          </div>
          <h2 className="mt-5 text-lg font-black leading-7 text-neutral-950">{question.questionText}</h2>
          <p className="mt-2 text-xs leading-5 text-neutral-500">Use a concrete example and explain your actions, reasoning, and outcome.</p>
        </div>

        <div className="px-5 py-5 sm:px-7 sm:py-6">
          <div className="mb-2 flex items-center justify-between gap-3">
            <label className="text-xs font-black uppercase text-neutral-500" htmlFor={`candidate-answer-${question.id}`}>Your response</label>
            {question.questionType !== "scale" && options.length === 0 ? (
              <span className="text-xs text-neutral-400">{answer?.text.length ?? 0} characters</span>
            ) : null}
          </div>
          {question.questionType === "scale" ? (
            <ScaleInput disabled={disabled} value={numericAnswer(answer)} onChange={(value) => onAnswer({ text: String(value), json: { value } })} />
          ) : options.length ? (
            <ChoiceInput disabled={disabled} options={options} value={answer?.text ?? ""} onChange={(value) => onAnswer({ text: value, json: { selectedOption: value } })} />
          ) : (
            <textarea
              autoFocus
              className="control min-h-[190px] text-sm leading-6"
              id={`candidate-answer-${question.id}`}
              maxLength={12_000}
              onChange={(event) => onAnswer({ text: event.target.value })}
              placeholder="Respond as you would in an interview..."
              readOnly={disabled}
              value={answer?.text ?? ""}
            />
          )}

          {followUp ? (
            <div className="mt-6 border-t border-neutral-200 pt-6">
              <div className="rounded-[8px] bg-amber-50 p-4">
                <p className="flex items-center gap-2 text-xs font-bold text-amber-800"><Icon name="sparkle" size={14} /> Adaptive follow-up</p>
                <p className="mt-2 text-sm font-bold leading-6 text-amber-950">{followUp.question}</p>
              </div>
              <label className="mt-4 block text-xs font-black uppercase text-neutral-500" htmlFor={`candidate-follow-up-${question.id}`}>Your follow-up response</label>
              <textarea className="control mt-2 min-h-[130px]" id={`candidate-follow-up-${question.id}`} onChange={(event) => onFollowUp(event.target.value)} placeholder="Continue your answer..." readOnly={disabled} value={followUp.answer} />
            </div>
          ) : module.type === "ai_interview" && questionIndex === 0 && (stream.streaming || stream.error) ? (
            <AiFollowUpStream error={stream.error} streaming={stream.streaming} text={stream.text} />
          ) : null}

          {error ? <p className={`mt-4 rounded-[5px] px-3 py-2 text-sm ${error.startsWith("One follow-up") ? "bg-sky-50 text-sky-800" : "bg-amber-50 text-amber-800"}`}>{error}</p> : null}
          <div className="mt-6 flex items-center justify-between gap-3">
            <button className="button-secondary" disabled={disabled || busy} onClick={onBack} type="button">Previous</button>
            <button aria-busy={busy} className="button-primary transition-transform duration-150 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] disabled:hover:translate-y-0" disabled={disabled || busy} onClick={onNext} type="button">
              {busy ? <><span className="size-3.5 animate-spin rounded-full border-2 border-white/35 border-t-white" />Preparing next turn...</> : <>Continue interview <Icon className="-rotate-90" name="chevron" size={13} /></>}
            </button>
          </div>
        </div>
      </article>
    </div>
  );
}

function QuestionLoading() {
  return <div className="mx-auto flex min-h-[360px] max-w-[860px] items-center justify-center border border-neutral-200 bg-white"><span aria-label="Loading question" className="size-8 animate-spin rounded-full border-[3px] border-neutral-200 border-t-sky-500" /></div>;
}

function ReviewPanel({ modules, answers, followUps, codingComplete, adaptiveReady, confirmed, onConfirm, onBack, onSubmit, submitting, error, pendingRequiredCount, onAnswerInterviewer }: { modules: AssessmentModule[]; answers: Record<string, Answer>; followUps: Record<string, FollowUp>; codingComplete: boolean; adaptiveReady: boolean; confirmed: boolean; onConfirm: (value: boolean) => void; onBack: () => void; onSubmit: () => void; submitting: boolean; error: string; pendingRequiredCount: number; onAnswerInterviewer: () => void }) {
  const complete = allModulesComplete(modules, answers, followUps, codingComplete, adaptiveReady);
  return <div className="mx-auto max-w-[860px]"><p className="text-xs font-bold uppercase text-[#087aa4]">Interview close</p><h1 className="mt-2 text-3xl font-black text-neutral-950">Review the conversation</h1><p className="mt-2 text-sm leading-6 text-neutral-600">Check each stage before closing your interview. You can return to any incomplete stage.</p><div className="mt-6 border border-neutral-200 bg-white shadow-[0_16px_45px_rgba(15,23,42,0.06)]"><div className="divide-y divide-neutral-100">{modules.map((module) => { const done = moduleComplete(module, answers, followUps, codingComplete, adaptiveReady); return <div className="flex items-center gap-4 px-5 py-4 sm:px-6" key={module.id}><span className={`flex size-9 items-center justify-center rounded-[7px] ${done ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}><Icon name={done ? "check" : moduleIcon(module.type)} size={16} /></span><div className="min-w-0 flex-1"><p className="text-sm font-bold text-neutral-900">{module.title}</p><p className="mt-0.5 text-xs text-neutral-500">{done ? "Stage complete" : "Response required"}</p></div></div>; })}</div><div className="border-t border-neutral-200 bg-neutral-50 p-5 sm:p-6"><PendingInterviewerNotice count={pendingRequiredCount} onAnswer={onAnswerInterviewer} /><label className="flex cursor-pointer items-start gap-3"><input checked={confirmed} className="mt-0.5 size-4 accent-[#159ac8]" onChange={(event) => onConfirm(event.target.checked)} type="checkbox" /><span className="text-sm leading-5 text-neutral-600">I reviewed my responses and understand that completing the interview closes this private link.</span></label>{error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}<div className="mt-5 flex justify-between gap-3"><button className="button-secondary" onClick={onBack} type="button">Return to interview</button><button className="button-primary" disabled={!complete || !confirmed || submitting || pendingRequiredCount > 0} onClick={onSubmit} type="button">{submitting ? "Completing interview" : "Complete interview"}</button></div></div></div><p className="mt-4 text-center text-xs leading-5 text-neutral-500">AI-supported feedback is advisory. A human reviewer remains responsible for hiring decisions.</p></div>;
}

/**
 * The server rejects a submission while a required interviewer question is open.
 * Saying so next to the submit button turns a 409 dead-end into a visible,
 * fixable step the candidate can act on before they try.
 */
function PendingInterviewerNotice({ count, onAnswer }: { count: number; onAnswer: () => void }) {
  if (!count) return null;
  return (
    <div className="mb-4 flex flex-wrap items-center gap-3 rounded-[7px] border border-violet-300 bg-violet-50 px-4 py-3">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-violet-100 text-violet-700"><Icon name="user" size={15} /></span>
      <p className="min-w-0 flex-1 text-sm font-semibold leading-5 text-violet-950">
        {count === 1 ? "1 question from your interviewer needs an answer" : `${count} questions from your interviewer need an answer`} before you can submit.
      </p>
      <button
        className="inline-flex h-9 items-center gap-1.5 rounded-[7px] bg-violet-600 px-3 text-sm font-bold text-white transition hover:bg-violet-700"
        onClick={onAnswer}
        type="button"
      >
        Go to {count === 1 ? "the question" : "the questions"} <Icon className="-rotate-90" name="chevron" size={12} />
      </button>
    </div>
  );
}

/**
 * The complete-by-access-code endpoint returns 409 for exactly one reason: an
 * unanswered required interviewer question. Prefer the structured code when it
 * survives the proxy, and fall back to the status — never to the English prose,
 * which changes without notice.
 */
function isPendingInterviewerQuestionError(error: unknown): boolean {
  if (!(error instanceof ApiError)) return false;
  const details = error.details;
  const code = details && typeof details === "object" ? (details as { code?: unknown }).code : undefined;
  return code === "INTERVIEWER_FOLLOW_UP_REQUIRED" || error.status === 409;
}

function CandidateComplete({ candidateName, reportStatus }: { candidateName: string; reportStatus: "generated" | "pending" }) { return <main className="flex min-h-screen items-center justify-center bg-[#f4f8f9] px-5"><div className="w-full max-w-[620px] border border-neutral-200 bg-white p-8 text-center shadow-[0_24px_70px_rgba(15,23,42,0.09)] sm:p-12"><span className="mx-auto flex size-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-700"><Icon name="check" size={23} /></span><h1 className="mt-5 text-3xl font-black text-neutral-950">Interview complete</h1><p className="mt-3 text-sm leading-6 text-neutral-600">Thank you, {firstName(candidateName)}. Your conversation and coding evidence are now available to the authorized review team.</p><div className="mt-6 rounded-[7px] bg-neutral-50 px-4 py-3 text-xs leading-5 text-neutral-600">{reportStatus === "generated" ? "The reviewer report is ready inside the private workspace." : "Your interview is complete. Report processing will continue for the review team."}</div><p className="mt-7 text-xs text-neutral-500">You may close this window.</p></div></main>; }
function CandidateLoading() { return <main className="flex min-h-screen items-center justify-center bg-[#f4f8f9]"><div className="text-center"><span className="mx-auto block size-9 animate-spin rounded-full border-[3px] border-neutral-200 border-t-[#29b7e5]" /><p className="mt-4 text-sm font-semibold text-neutral-600">Preparing private interview</p></div></main>; }
function CandidateError({ message }: { message: string }) { return <main className="flex min-h-screen items-center justify-center bg-[#f4f8f9] px-5"><div className="w-full max-w-[560px] border border-neutral-200 bg-white p-8 text-center shadow-[0_20px_60px_rgba(15,23,42,0.08)]"><EvaloraLogo className="justify-center" href="/" /><span className="mx-auto mt-8 flex size-11 items-center justify-center rounded-full bg-red-50 text-red-600"><Icon name="lock" size={20} /></span><h1 className="mt-4 text-xl font-black text-neutral-950">Interview unavailable</h1><p className="mt-3 text-sm leading-6 text-neutral-600">{message}</p><Link className="button-secondary mt-6" href="/">Return to Evalora</Link></div></main>; }

function candidateModules(modules: AssessmentModule[]): AssessmentModule[] {
  const prepared = [...modules]
    .sort((a, b) => a.orderIndex - b.orderIndex)
    .map((module) => ({ ...module, questions: module.questions ?? [] }))
    .filter((module) => module.type === "coding" || module.type === "ai_interview" || (module.questions?.length ?? 0) > 0);
  // AI interview always comes last: it adapts to everything answered before it.
  return [...prepared.filter((module) => module.type !== "ai_interview"), ...prepared.filter((module) => module.type === "ai_interview")];
}
function toAdaptiveQuestions(questions: string[] | undefined): Question[] { return (questions ?? []).map((text, index) => ({ id: `ai-adaptive-${index}`, questionText: text.trim(), questionType: "short_answer" as const })).filter((question) => question.questionText); }
function questionResponsesComplete(module: AssessmentModule, answers: Record<string, Answer>, followUps: Record<string, FollowUp>) { if (module.type === "coding") return true; const questions = module.questions ?? []; return questions.length > 0 && questions.every((question) => Boolean(answers[question.id]?.text.trim()) && (!followUps[question.id] || Boolean(followUps[question.id]?.answer.trim()))); }
function moduleComplete(module: AssessmentModule, answers: Record<string, Answer>, followUps: Record<string, FollowUp>, codingComplete: boolean, adaptiveReady: boolean) { return questionResponsesComplete(module, answers, followUps) && (module.type !== "coding" || codingComplete) && (module.type !== "ai_interview" || adaptiveReady); }
function allModulesComplete(modules: AssessmentModule[], answers: Record<string, Answer>, followUps: Record<string, FollowUp>, codingComplete: boolean, adaptiveReady: boolean) { return modules.length > 0 && modules.every((module) => moduleComplete(module, answers, followUps, codingComplete, adaptiveReady)); }
function completionPercent(modules: AssessmentModule[], answers: Record<string, Answer>, followUps: Record<string, FollowUp>, codingComplete: boolean, adaptiveReady: boolean) { return modules.length ? Math.round((modules.filter((module) => moduleComplete(module, answers, followUps, codingComplete, adaptiveReady)).length / modules.length) * 100) : 0; }
function moduleIcon(type: AssessmentModule["type"]): IconName { return type === "coding" || type === "debugging" ? "code" : type === "leadership" ? "crown" : type === "communication" ? "paperPlane" : type === "behavioral" || type === "work_style" ? "users" : type === "problem_solving" ? "sparkle" : "message"; }
function stageFormatLabel(type: AssessmentModule["type"]): string {
  if (type === "coding") return "Coding exercise";
  if (type === "ai_interview") return "Adaptive conversation";
  if (type === "work_style") return "Work-style reflection";
  if (type === "debugging" || type === "problem_solving") return "Technical discussion";
  return "Structured conversation";
}
function stageBriefingText(module: AssessmentModule): string {
  if (module.type === "coding") return "Work through the coding exercises in the language you are most comfortable using. Run sample inputs as often as needed, then submit each solution against the private test cases.";
  if (module.type === "ai_interview") return "This closing conversation builds on what you shared earlier. The questions may adapt to your responses, but they are reviewed under the same evidence-based hiring process.";
  if (module.type === "work_style") return "Share how you typically approach work. Answer honestly from your experience; there is no single preferred personality or style.";
  if (module.type === "debugging" || module.type === "problem_solving") return "Talk through how you diagnose the situation, compare options, and reach a decision. Your reasoning is as important as the final answer.";
  return "Answer from your own experience. Use a concrete situation where possible, then explain your actions, reasoning, and the result.";
}
function hasAiInterviewer(modules: AssessmentModule[]): boolean {
  return modules.some((module) => module.type === "ai_interview");
}
function adaptiveQuestionCount(settings: JsonValue | undefined): number {
  if (!settings || typeof settings !== "object" || Array.isArray(settings)) return 3;
  const count = Number((settings as Record<string, JsonValue>).adaptiveQuestionCount);
  return Number.isFinite(count) ? Math.min(5, Math.max(1, Math.trunc(count))) : 3;
}
function questionOptions(value: JsonValue | undefined): string[] { if (Array.isArray(value)) return value.filter((item): item is string => typeof item === "string"); if (value && typeof value === "object") { const record = value as Record<string, JsonValue>; for (const key of ["options", "choices", "answers"]) { const nested = record[key]; if (Array.isArray(nested)) return nested.map((item) => typeof item === "string" ? item : typeof item === "object" && item ? String((item as Record<string, JsonValue>).label ?? (item as Record<string, JsonValue>).value ?? "") : "").filter(Boolean); } } return []; }
function ChoiceInput({ options, value, onChange, disabled }: { options: string[]; value: string; onChange: (value: string) => void; disabled?: boolean }) { return <div className="grid gap-2">{options.map((option) => <label className={`flex items-center gap-3 rounded-[7px] border px-4 py-3 text-sm font-semibold transition ${disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"} ${value === option ? "border-sky-300 bg-sky-50 text-sky-950" : "border-neutral-200 hover:bg-neutral-50"}`} key={option}><input checked={value === option} className="size-4 accent-[#159ac8]" disabled={disabled} name="choice" onChange={() => onChange(option)} type="radio" />{option}</label>)}</div>; }
function ScaleInput({ value, onChange, disabled }: { value?: number; onChange: (value: number) => void; disabled?: boolean }) { return <div><div className="grid grid-cols-5 gap-2">{[1, 2, 3, 4, 5].map((item) => <button className={`h-12 rounded-[6px] border text-sm font-black transition disabled:cursor-not-allowed disabled:opacity-60 ${value === item ? "border-sky-400 bg-sky-500 text-white" : "border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50"}`} disabled={disabled} key={item} onClick={() => onChange(item)} type="button">{item}</button>)}</div><div className="mt-2 flex justify-between text-xs text-neutral-400"><span>Strongly disagree</span><span>Strongly agree</span></div></div>; }
function numericAnswer(answer?: Answer) { const value = Number(answer?.json && typeof answer.json === "object" && !Array.isArray(answer.json) ? (answer.json as Record<string, JsonValue>).value : answer?.text); return Number.isFinite(value) ? value : undefined; }
function questionTextById(modules: AssessmentModule[], questionId: string): string | undefined { return modules.flatMap((module) => module.questions ?? []).find((question) => question.id === questionId)?.questionText; }
/** The AI probe generated from each answered question, keyed by that question. */
async function aiFollowUpQuestions(accessCode: string): Promise<Map<string, string>> {
  const probes = new Map<string, string>();
  try {
    const messages = await apiGet<AiConversationMessage[]>(`/ai/access/${encodeURIComponent(accessCode)}/conversation`);
    // Oldest first, so a question asked twice keeps the probe the candidate last saw.
    for (const message of messages) {
      if (message.role !== "assistant" || !message.basedOnQuestion || !message.content.trim()) continue;
      probes.set(message.basedOnQuestion, message.content.trim());
    }
  } catch {
    // A follow-up is a bonus, never a gate: without the question the candidate is
    // simply asked a new one, and nothing they already answered is lost.
  }
  return probes;
}
function parseAdaptiveSavedResponse(response: CandidateResponse): { questionId: string; question: string; answer: string; followUp?: FollowUp } | undefined { const json = response.responseJson; if (!json || typeof json !== "object" || Array.isArray(json)) return undefined; const record = json as Record<string, JsonValue>; if (record.adaptive !== true || typeof record.question !== "string" || typeof record.questionId !== "string") return undefined; const marker = "\n\nResponse: "; const markerIndex = response.responseText.indexOf(marker); const answer = markerIndex >= 0 ? response.responseText.slice(markerIndex + marker.length).trim() : response.responseText.trim(); if (!answer) return undefined; const aiFollowUp = record.aiFollowUp && typeof record.aiFollowUp === "object" && !Array.isArray(record.aiFollowUp) ? record.aiFollowUp as Record<string, JsonValue> : undefined; const followUp = typeof aiFollowUp?.question === "string" ? { question: aiFollowUp.question, answer: typeof aiFollowUp.answer === "string" ? aiFollowUp.answer : "" } : undefined; return { questionId: record.questionId, question: record.question, answer, followUp }; }
function firstName(name: string) { return name.trim().split(/\s+/)[0] || "Candidate"; }
function formatTimer(seconds: number) { if (!Number.isFinite(seconds) || seconds < 0) return "--:--"; const minutes = Math.floor(seconds / 60); return `${String(minutes).padStart(2, "0")}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`; }
