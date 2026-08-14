"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  CandidateLiveCamera,
  type CameraStatus,
  type MediaConnectionQuality,
} from "@/components/livekit/candidate-live-camera";
import { DraggableCamera } from "@/components/draggable-camera";
import { SessionTranscriptView } from "@/components/session-transcript";
import { useInterviewSocket } from "@/components/use-interview-socket";
import { Icon } from "@/components/icons";
import { apiGet, apiPost, getErrorMessage } from "@/lib/api";
import type { InterviewerFollowUp } from "@/lib/types";
import type { LiveCaption } from "@/features/live-video/live-captions";

const POLL_MS = 10_000;

type Props = {
  sessionId: string;
  onClose: () => void;
};

/**
 * Full-screen interview room.
 * - Small draggable floating candidate camera
 * - Full transcript view with answers
 * - Live follow-up question composer
 */
export function LiveInterviewRoom({ sessionId, onClose }: Props) {
  const [followUps, setFollowUps] = useState<InterviewerFollowUp[]>([]);
  const [question, setQuestion] = useState("");
  const [required, setRequired] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const idempotencyKey = useRef(crypto.randomUUID());
  const mountedRef = useRef(true);
  const cameraVideoRef = useRef<HTMLVideoElement | null>(null);
  const [candidateMicrophoneState, setCandidateMicrophoneState] =
    useState<"waiting" | "live" | "muted">("waiting");
  const [candidateConnectionQuality, setCandidateConnectionQuality] =
    useState<MediaConnectionQuality>("lost");
  const [candidateCameraStatus, setCandidateCameraStatus] =
    useState<CameraStatus>("connecting");
  const [lowBandwidthOverride, setLowBandwidthOverride] =
    useState<boolean | null>(null);
  const lowBandwidthMode = lowBandwidthOverride ??
    (candidateConnectionQuality === "poor" || candidateConnectionQuality === "lost");
  const [liveCaptions, setLiveCaptions] = useState<LiveCaption[]>([]);
  const [interviewerMicrophoneMuted, setInterviewerMicrophoneMuted] =
    useState(true);
  const [interviewerMicrophoneState, setInterviewerMicrophoneState] =
    useState<"connecting" | "live" | "muted" | "error">("muted");

  const handleLiveCaption = useCallback((caption: LiveCaption) => {
    setLiveCaptions((current) => {
      const next = current.filter((item) => item.id !== caption.id);
      return [...next, caption].sort((a, b) => a.timestamp - b.timestamp).slice(-20);
    });
  }, []);

  const { connection, participants } = useInterviewSocket({
    sessionId,
    enabled: true,
  });

  /* Poll follow-ups so the interviewer sees answers arrive */
  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null;
    async function load() {
      try {
        const items = await apiGet<InterviewerFollowUp[]>(
          `/interviewer-follow-ups/session/${encodeURIComponent(sessionId)}`,
        );
        if (mountedRef.current) setFollowUps(items);
      } catch {
        /* silent */
      }
    }
    void load();
    timer = setInterval(load, POLL_MS);
    return () => {
      mountedRef.current = false;
      if (timer) clearInterval(timer);
    };
  }, [sessionId]);

  const sendQuestion = useCallback(async () => {
    if (question.trim().length < 3 || sending) return;
    setSending(true);
    setError("");
    try {
      await apiPost(
        `/interviewer-follow-ups/session/${encodeURIComponent(sessionId)}`,
        {
          questionText: question.trim(),
          required,
          idempotencyKey: idempotencyKey.current,
        },
      );
      setQuestion("");
      const items = await apiGet<InterviewerFollowUp[]>(
        `/interviewer-follow-ups/session/${encodeURIComponent(sessionId)}`,
      );
      setFollowUps(items);
    } catch (requestError) {
      setError(getErrorMessage(requestError, "Could not send question."));
    } finally {
      setSending(false);
    }
  }, [question, required, sending, sessionId]);

  function handleKeyDown(e: React.KeyboardEvent) {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      void sendQuestion();
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[var(--theme-bg,#f5f7f9)]">
      {/* Top bar */}
      <header className="flex shrink-0 items-center justify-between border-b border-[var(--theme-border)] bg-white px-4 py-2.5">
        <button
          className="inline-flex items-center gap-1.5 text-sm font-bold text-[var(--color-primary-700)] transition-colors hover:underline"
          onClick={onClose}
          type="button"
        >
          <Icon className="rotate-90" name="chevron" size={14} />
          Back to candidate
        </button>

        <div className="flex items-center gap-3">
          <button
            className={`inline-flex h-8 items-center gap-2 rounded-full px-3 text-xs font-bold transition-colors ${
              interviewerMicrophoneState === "error"
                ? "bg-rose-100 text-rose-700"
                : interviewerMicrophoneMuted
                  ? "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                  : "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
            }`}
            onClick={() => setInterviewerMicrophoneMuted((muted) => !muted)}
            type="button"
          >
            <span className={`size-2 rounded-full ${
              interviewerMicrophoneState === "error"
                ? "bg-rose-500"
                : interviewerMicrophoneMuted
                  ? "bg-neutral-400"
                  : "bg-emerald-500"
            }`} />
            {interviewerMicrophoneState === "error"
              ? "Mic unavailable"
              : interviewerMicrophoneState === "connecting"
                ? "Starting mic…"
                : interviewerMicrophoneMuted
                  ? "Unmute my mic"
                  : "Mute my mic"}
          </button>

          <span className="text-xs text-[var(--theme-muted)]">
            {participants
              .filter((p) => p.role === "candidate")
              .map((p) => p.name)
              .join(", ") || "Candidate"}
          </span>
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-bold ${
              connection === "live"
                ? "bg-emerald-100 text-emerald-700"
                : "bg-amber-100 text-amber-700"
            }`}
          >
            <span
              className={`size-1.5 rounded-full ${connection === "live" ? "bg-emerald-500" : "bg-amber-500"}`}
            />
            {connection === "live" ? "Live" : "Connecting…"}
          </span>
        </div>
      </header>

      {/* Main: transcript + question composer */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: transcript */}
        <div className="flex-1 overflow-y-auto p-6">
          <SessionTranscriptView
            onStatusChange={() => {}}
            sessionId={sessionId}
          />

          <section className="mt-5 h-[200px] overflow-hidden rounded-xl border border-[var(--theme-border)] bg-white/95 shadow-[var(--shadow-card)] backdrop-blur">
            <div className="flex items-center justify-between border-b border-[var(--theme-border)] px-4 py-2.5">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-[var(--theme-heading)]">Live captions</p>
                <p className="mt-0.5 text-[10px] text-[var(--theme-muted)]">Live speech only — not part of the saved evidence transcript.</p>
              </div>
              <span className={`rounded-full px-2 py-1 text-[10px] font-bold ${
                candidateMicrophoneState === "muted" || candidateCameraStatus === "offline"
                  ? "bg-rose-100 text-rose-700"
                  : candidateCameraStatus === "reconnecting"
                    ? "bg-amber-100 text-amber-700"
                    : "bg-emerald-100 text-emerald-700"
              }`}>
                {candidateMicrophoneState === "muted"
                  ? "Microphone muted"
                  : candidateCameraStatus === "offline"
                    ? "Disconnected"
                    : candidateCameraStatus === "reconnecting"
                      ? "Reconnecting..."
                      : "Listening"}
              </span>
            </div>

            <div
              className="h-[152px] overflow-y-auto px-4 py-3 scroll-smooth"
              ref={(el) => {
                if (el) {
                  el.scrollTop = el.scrollHeight;
                }
              }}
            >
              {liveCaptions.length ? (
                <div className="space-y-2">
                  {liveCaptions.map((caption) => (
                    <div className="flex gap-3 text-sm" key={caption.id}>
                      <time className="shrink-0 pt-0.5 text-[10px] font-semibold text-[var(--theme-faint)]">
                        {new Date(caption.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                      </time>
                      <p className={caption.final ? "text-[var(--theme-text)]" : "italic text-[var(--theme-muted)]"}>
                        <span className="mr-1.5 font-bold text-[var(--color-primary-700)]">{caption.speaker}:</span>
                        {caption.text}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="py-2 text-center text-xs text-[var(--theme-faint)]">
                  {candidateMicrophoneState === "muted"
                    ? "Captions are paused while the candidate microphone is muted."
                    : candidateCameraStatus === "offline" || candidateCameraStatus === "reconnecting"
                      ? "Captions will resume when the media connection returns."
                      : "Waiting for the candidate to speak…"}
                </p>
              )}
            </div>
          </section>
        </div>

        {/* Right: question composer */}
        <aside className="flex w-[340px] shrink-0 flex-col border-l border-[var(--theme-border)] bg-white">
          <div className="border-b border-[var(--theme-border)] p-4">
            <h3 className="text-sm font-bold text-[var(--theme-heading)]">
              Send a question
            </h3>
            <p className="mt-0.5 text-xs text-[var(--theme-muted)]">
              The candidate sees it immediately.
            </p>

            <textarea
              className="mt-3 min-h-[80px] w-full resize-none rounded-lg border border-[var(--theme-border)] bg-[var(--theme-panel)] p-3 text-sm text-[var(--theme-text)] placeholder-[var(--theme-faint)] outline-none focus:border-[var(--color-primary-400)]"
              disabled={sending}
              maxLength={2000}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="e.g. Can you walk through one concrete trade-off you made?"
              value={question}
            />

            {error ? (
              <p className="mt-1.5 text-xs text-rose-600">{error}</p>
            ) : null}

            <div className="mt-2 flex items-center justify-between">
              <label className="flex items-center gap-2 text-xs text-[var(--theme-muted)]">
                <input
                  checked={required}
                  className="accent-[var(--color-primary-500)]"
                  onChange={(e) => setRequired(e.target.checked)}
                  type="checkbox"
                />
                Required
              </label>

              <div className="flex items-center gap-2">
                <span className="text-xs text-[var(--theme-faint)]">
                  {question.length}/2000
                </span>
                <button
                  className="rounded-lg bg-[var(--color-primary-600)] px-3 py-1.5 text-xs font-bold text-white transition-colors hover:bg-[var(--color-primary-700)] disabled:opacity-40"
                  disabled={sending || question.trim().length < 3}
                  onClick={() => void sendQuestion()}
                  type="button"
                >
                  {sending ? "Sending…" : "Send"}
                </button>
              </div>
            </div>

            <p className="mt-1 text-[10px] text-[var(--theme-faint)]">
              ⌘ + Enter to send
            </p>
          </div>

          {/* Follow-up history */}
          <div className="flex-1 overflow-y-auto p-4">
            <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-[var(--theme-faint)]">
              Questions ({followUps.length})
            </h4>

            {followUps.length === 0 ? (
              <p className="py-8 text-center text-xs text-[var(--theme-faint)]">
                No questions sent yet.
              </p>
            ) : (
              <div className="space-y-3">
                {followUps.map((item) => (
                  <div
                    className={`rounded-lg border p-3 ${
                      item.status === "answered"
                        ? "border-emerald-200 bg-emerald-50/50"
                        : item.status === "cancelled"
                          ? "border-[var(--theme-border)] bg-[var(--theme-panel-soft)] opacity-50"
                          : "border-violet-200 bg-violet-50/50"
                    }`}
                    key={item.id}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-xs font-semibold text-[var(--theme-text)]">
                        {item.questionText}
                      </p>
                      <span
                        className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                          item.status === "answered"
                            ? "bg-emerald-100 text-emerald-700"
                            : item.status === "cancelled"
                              ? "bg-neutral-100 text-neutral-500"
                              : "bg-violet-100 text-violet-700"
                        }`}
                      >
                        {item.status === "answered"
                          ? "Answered"
                          : item.status === "cancelled"
                            ? "Withdrawn"
                            : "Pending"}
                      </span>
                    </div>

                    {item.answerText ? (
                      <p className="mt-1.5 text-xs leading-4 text-[var(--theme-muted)]">
                        {item.answerText}
                      </p>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </div>
        </aside>
      </div>

      {/* Visually hidden — runs WebRTC logic but renders nothing */}
      <div className="sr-only" aria-hidden>
        <CandidateLiveCamera
          compact
          externalVideoRef={cameraVideoRef}
          lowBandwidthMode={lowBandwidthMode}
          interviewerMicrophoneMuted={interviewerMicrophoneMuted}
          onConnectionQualityChange={setCandidateConnectionQuality}
          onCaption={handleLiveCaption}
          onInterviewerMicrophoneStateChange={setInterviewerMicrophoneState}
          onMicrophoneStateChange={setCandidateMicrophoneState}
          onStatusChange={setCandidateCameraStatus}
          sessionId={sessionId}
        />
      </div>

      {/* Draggable floating camera with the shared video ref */}
      <DraggableCamera
        connectionState={candidateCameraStatus}
        connectionQuality={candidateConnectionQuality}
        label="Candidate camera"
        lowBandwidthMode={lowBandwidthMode}
        microphoneState={candidateMicrophoneState}
        onToggleLowBandwidth={() => setLowBandwidthOverride(!lowBandwidthMode)}
        videoRef={cameraVideoRef}
      />
    </div>
  );
}
