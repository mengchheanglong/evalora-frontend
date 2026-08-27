"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Icon, type IconName } from "@/components/icons";
import { CandidateLiveCamera, type CameraStatus, type MediaConnectionQuality } from "@/components/livekit/candidate-live-camera";
import { SessionTranscriptView } from "@/components/session-transcript";
import { useInterviewSocket } from "@/components/use-interview-socket";
import type { LiveCaption } from "@/features/live-video/live-captions";
import { apiGet, apiPost, getErrorMessage } from "@/lib/api";
import type { InterviewerFollowUp } from "@/lib/types";

const POLL_MS = 10_000;
type WorkspaceTab = "questions" | "captions" | "notes" | "chat";
type Props = { sessionId: string; onClose: () => void };

function formatDuration(totalSeconds: number) {
  const parts = [Math.floor(totalSeconds / 3_600), Math.floor((totalSeconds % 3_600) / 60), totalSeconds % 60];
  return parts.map((part) => String(part).padStart(2, "0")).join(":");
}

export function LiveInterviewRoom({ sessionId, onClose }: Props) {
  const [followUps, setFollowUps] = useState<InterviewerFollowUp[]>([]);
  const [question, setQuestion] = useState("");
  const [required, setRequired] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const idempotencyKey = useRef(crypto.randomUUID());
  const cameraVideoRef = useRef<HTMLVideoElement | null>(null);
  const screenShareVideoRef = useRef<HTMLVideoElement | null>(null);
  const stageRef = useRef<HTMLElement | null>(null);
  const cameraTileRef = useRef<HTMLDivElement | null>(null);
  const cameraDragRef = useRef({ pointerX: 0, pointerY: 0, startX: 0, startY: 0 });
  const speakingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [candidateScreenSharing, setCandidateScreenSharing] = useState(false);
  const [candidateSpeaking, setCandidateSpeaking] = useState(false);
  const [candidateMicrophoneState, setCandidateMicrophoneState] = useState<"waiting" | "live" | "muted">("waiting");
  const [candidateConnectionQuality, setCandidateConnectionQuality] = useState<MediaConnectionQuality>("lost");
  const [candidateCameraStatus, setCandidateCameraStatus] = useState<CameraStatus>("connecting");
  const [lowBandwidthOverride, setLowBandwidthOverride] = useState<boolean | null>(null);
  const lowBandwidthMode = lowBandwidthOverride ?? ["poor", "lost"].includes(candidateConnectionQuality);
  const [liveCaptions, setLiveCaptions] = useState<LiveCaption[]>([]);
  const [interviewerMicrophoneMuted, setInterviewerMicrophoneMuted] = useState(true);
  const [interviewerMicrophoneState, setInterviewerMicrophoneState] = useState<"connecting" | "live" | "muted" | "error">("muted");
  const [workspaceTab, setWorkspaceTab] = useState<WorkspaceTab | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [notes, setNotes] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [cameraPosition, setCameraPosition] = useState<{ x: number; y: number } | null>(null);
  const [cameraDragging, setCameraDragging] = useState(false);

  const { connection, participants } = useInterviewSocket({ sessionId, enabled: true });
  const candidateName = participants.filter((item) => item.role === "candidate").map((item) => item.name).join(", ") || "Candidate";

  useEffect(() => {
    const timer = window.setInterval(() => setElapsedSeconds((value) => value + 1), 1_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => setNotes(window.sessionStorage.getItem(`evalora-interviewer-notes:${sessionId}`) ?? ""), [sessionId]);
  const updateNotes = useCallback((value: string) => {
    setNotes(value);
    window.sessionStorage.setItem(`evalora-interviewer-notes:${sessionId}`, value);
  }, [sessionId]);

  const handleCaption = useCallback((caption: LiveCaption) => {
    setLiveCaptions((current) => [...current.filter((item) => item.id !== caption.id), caption].sort((a, b) => a.timestamp - b.timestamp).slice(-20));
    setCandidateSpeaking(true);
    if (speakingTimerRef.current) clearTimeout(speakingTimerRef.current);
    speakingTimerRef.current = setTimeout(() => setCandidateSpeaking(false), 1_800);
  }, []);

  useEffect(() => () => {
    if (speakingTimerRef.current) clearTimeout(speakingTimerRef.current);
  }, []);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const items = await apiGet<InterviewerFollowUp[]>(`/interviewer-follow-ups/session/${encodeURIComponent(sessionId)}`);
        if (active) setFollowUps(items);
      } catch { /* best-effort live polling */ }
    }
    void load();
    const timer = setInterval(load, POLL_MS);
    return () => { active = false; clearInterval(timer); };
  }, [sessionId]);

  const sendQuestion = useCallback(async () => {
    if (question.trim().length < 3 || sending) return;
    setSending(true);
    setError("");
    try {
      await apiPost(`/interviewer-follow-ups/session/${encodeURIComponent(sessionId)}`, { questionText: question.trim(), required, idempotencyKey: idempotencyKey.current });
      setQuestion("");
      setFollowUps(await apiGet<InterviewerFollowUp[]>(`/interviewer-follow-ups/session/${encodeURIComponent(sessionId)}`));
    } catch (requestError) {
      setError(getErrorMessage(requestError, "Could not send question."));
    } finally { setSending(false); }
  }, [question, required, sending, sessionId]);

  function handleKeyDown(event: React.KeyboardEvent) {
    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") { event.preventDefault(); void sendQuestion(); }
  }

  function handleCameraPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (!candidateScreenSharing || !stageRef.current || !cameraTileRef.current) return;
    const stageBounds = stageRef.current.getBoundingClientRect();
    const tileBounds = cameraTileRef.current.getBoundingClientRect();
    if (event.clientX >= tileBounds.right - 22 && event.clientY >= tileBounds.bottom - 22) {
      return;
    }
    const startX = tileBounds.left - stageBounds.left;
    const startY = tileBounds.top - stageBounds.top;
    cameraDragRef.current = {
      pointerX: event.clientX,
      pointerY: event.clientY,
      startX,
      startY,
    };
    setCameraPosition({ x: startX, y: startY });
    setCameraDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handleCameraPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (!cameraDragging || !stageRef.current || !cameraTileRef.current) return;
    const stageBounds = stageRef.current.getBoundingClientRect();
    const tileBounds = cameraTileRef.current.getBoundingClientRect();
    const nextX = cameraDragRef.current.startX + event.clientX - cameraDragRef.current.pointerX;
    const nextY = cameraDragRef.current.startY + event.clientY - cameraDragRef.current.pointerY;
    setCameraPosition({
      x: Math.max(0, Math.min(stageBounds.width - tileBounds.width, nextX)),
      y: Math.max(0, Math.min(stageBounds.height - tileBounds.height, nextY)),
    });
  }

  const qualityDot = candidateConnectionQuality === "excellent" ? "bg-emerald-400" : candidateConnectionQuality === "good" ? "bg-sky-400" : candidateConnectionQuality === "poor" ? "bg-amber-400" : "bg-rose-400";
  const tabs: Array<[WorkspaceTab, string, IconName]> = [["questions", "Questions", "question"], ["captions", "Captions", "waves"], ["notes", "Notes", "pencil"], ["chat", "Chat", "message"]];

  return (
    <div className="live-interview-workspace fixed inset-0 z-50 flex min-h-0 flex-col bg-[#080c12] text-white">
      <header className="relative z-40 flex h-16 shrink-0 items-center border-b border-white/10 bg-[#10161f] px-4 sm:px-5">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <button aria-label="Back to candidate" className="grid size-9 shrink-0 place-items-center rounded-lg text-white/65 hover:bg-white/10 hover:text-white" onClick={onClose} type="button"><Icon className="rotate-90" name="chevron" size={17} /></button>
          <div className="min-w-0"><p className="truncate text-sm font-semibold">{candidateName} Interview</p><p className="truncate text-[11px] text-white/40">Live assessment workspace</p></div>
        </div>
        <div className="hidden items-center gap-4 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2 md:flex">
          <span className={`inline-flex items-center gap-2 text-xs font-bold ${connection === "live" ? "text-emerald-400" : "text-amber-300"}`}><span className={`size-2 rounded-full ${connection === "live" ? "animate-pulse bg-emerald-400" : "bg-amber-300"}`} />{connection === "live" ? "LIVE" : "CONNECTING"}</span>
          <span className="h-4 w-px bg-white/10" /><span className="inline-flex items-center gap-2 font-mono text-xs text-white/75"><Icon name="clock" size={14} />{formatDuration(elapsedSeconds)}</span>
          <span className="h-4 w-px bg-white/10" /><span className="inline-flex items-center gap-2 text-xs text-white/65"><span className={`size-2 rounded-full ${qualityDot}`} /><span className="capitalize">{candidateConnectionQuality}</span> network</span>
        </div>
        <div className="flex flex-1 items-center justify-end gap-2">
          <button className={`inline-flex h-9 items-center gap-2 rounded-lg border px-3 text-xs font-semibold ${interviewerMicrophoneMuted ? "border-white/10 bg-white/[0.04] text-white/60 hover:bg-white/10" : "border-emerald-400/30 bg-emerald-400/10 text-emerald-300"}`} onClick={() => setInterviewerMicrophoneMuted((value) => !value)} type="button"><Icon name="microphone" size={15} /><span className="hidden lg:inline">{interviewerMicrophoneState === "error" ? "Mic unavailable" : interviewerMicrophoneMuted ? "Mic off" : "Mic on"}</span></button>
          <div className="relative"><button aria-label="Interview settings" className="grid size-9 place-items-center rounded-lg border border-white/10 bg-white/[0.04] text-white/60 hover:bg-white/10" onClick={() => setShowSettings((value) => !value)} type="button"><Icon name="settings" size={16} /></button>
            {showSettings ? <div className="absolute right-0 top-11 w-64 rounded-xl border border-white/10 bg-[#18202b] p-3 shadow-2xl"><p className="text-xs font-semibold">Video quality</p><p className="mt-1 text-[11px] leading-4 text-white/45">Reduce candidate video quality on unstable networks.</p><button className={`mt-3 w-full rounded-lg px-3 py-2 text-xs font-semibold ${lowBandwidthMode ? "bg-amber-400/15 text-amber-200" : "bg-white/[0.06] text-white/70"}`} onClick={() => setLowBandwidthOverride(!lowBandwidthMode)} type="button">{lowBandwidthMode ? "Low bandwidth enabled" : "Enable low bandwidth"}</button></div> : null}
          </div>
          <button className="ml-1 hidden h-9 rounded-lg border border-rose-400/30 px-3 text-xs font-semibold text-rose-300 hover:bg-rose-400/10 sm:block" onClick={onClose} type="button">Leave interview</button>
        </div>
      </header>

      <main className="relative grid min-h-0 flex-1 grid-cols-1 gap-3 overflow-hidden p-3 pb-24 lg:grid-cols-2 lg:gap-4 lg:p-4 lg:pb-24">
        <section ref={stageRef} className="relative min-h-0 overflow-hidden rounded-xl border border-white/10 bg-[#05080d] shadow-2xl">
          <div className={`absolute inset-0 flex items-center justify-center transition-opacity ${candidateScreenSharing ? "opacity-100" : "pointer-events-none opacity-0"}`}><video ref={screenShareVideoRef} autoPlay className="size-full object-contain" playsInline /></div>
          <div
            ref={cameraTileRef}
            className={`${candidateScreenSharing ? `absolute z-20 h-[180px] min-h-[120px] w-[240px] min-w-[180px] resize touch-none ${cameraDragging ? "cursor-grabbing" : "cursor-grab"}` : "absolute inset-0"} max-h-full max-w-full overflow-hidden rounded-xl bg-[#111827] shadow-2xl transition-[width,height] duration-300`}
            onPointerDown={handleCameraPointerDown}
            onPointerMove={handleCameraPointerMove}
            onPointerUp={() => setCameraDragging(false)}
            onPointerCancel={() => setCameraDragging(false)}
            style={candidateScreenSharing
              ? cameraPosition
                ? { left: cameraPosition.x, top: cameraPosition.y }
                : { bottom: 20, right: 20 }
              : undefined}
          >
            <video ref={cameraVideoRef} autoPlay muted className="size-full object-cover" playsInline />
            {candidateCameraStatus !== "connected" ? <div className="absolute inset-0 grid place-items-center bg-[#111827] text-center"><div><span className="mx-auto block size-5 animate-spin rounded-full border-2 border-white/20 border-t-white/80" /><p className="mt-3 text-xs text-white/60">{candidateCameraStatus === "reconnecting" ? "Reconnecting camera…" : "Waiting for candidate video…"}</p></div></div> : null}
            <div className={`absolute inset-x-0 bottom-0 flex items-end justify-between bg-gradient-to-t from-black/90 via-black/45 to-transparent ${candidateScreenSharing ? "p-3" : "p-5 sm:p-7"}`}>
              <div><p className={`${candidateScreenSharing ? "text-sm" : "text-lg"} font-semibold`}>{candidateName}</p><p className={`mt-1 inline-flex items-center gap-1.5 ${candidateScreenSharing ? "text-[10px]" : "text-xs"} ${candidateSpeaking ? "text-emerald-300" : "text-white/60"}`}><span className={`size-1.5 rounded-full ${candidateSpeaking ? "animate-pulse bg-emerald-400" : candidateMicrophoneState === "muted" ? "bg-rose-400" : "bg-white/40"}`} />{candidateMicrophoneState === "muted" ? "Microphone muted" : candidateSpeaking ? "Speaking" : "Mic live"}</p></div>
              <span className={`inline-flex items-center gap-1.5 rounded-full bg-black/50 px-2 py-1 ${candidateScreenSharing ? "text-[9px]" : "text-[11px]"} font-semibold text-white/80 backdrop-blur`}><span className={`size-1.5 rounded-full ${qualityDot}`} /><span className="capitalize">{candidateConnectionQuality}</span></span>
            </div>
          </div>
          {candidateScreenSharing ? <div className="absolute left-4 top-4 z-10 inline-flex items-center gap-2 rounded-lg bg-black/65 px-3 py-2 text-xs font-semibold text-white/85 backdrop-blur"><Icon name="code" size={15} />Candidate screen · Live workspace</div> : null}
        </section>

        <aside className="live-interview-transcript min-h-0 overflow-y-auto rounded-xl border border-white/10 bg-[#111827] p-4 text-white shadow-2xl">
          <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.16em] text-neutral-400">Interview answers</p>
          <SessionTranscriptView onStatusChange={() => {}} sessionId={sessionId} />
        </aside>

        {workspaceTab ? (
          <aside className="absolute bottom-24 right-4 top-4 z-30 flex w-[min(390px,calc(100%-32px))] flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#111827] shadow-2xl">
            <div className="flex h-12 shrink-0 items-center justify-between border-b border-white/10 px-4">
              <p className="text-sm font-semibold capitalize text-white">{workspaceTab}</p>
              <button aria-label="Close panel" className="grid size-7 place-items-center rounded-lg text-white/50 hover:bg-white/10 hover:text-white" onClick={() => setWorkspaceTab(null)} type="button"><Icon name="x" size={15} /></button>
            </div>
            <div className="live-interview-panel min-h-0 flex-1 overflow-y-auto bg-[#111827] text-white">
              {workspaceTab === "questions" ? <QuestionsPanel error={error} followUps={followUps} handleKeyDown={handleKeyDown} question={question} required={required} sending={sending} setQuestion={setQuestion} setRequired={setRequired} sendQuestion={sendQuestion} /> : null}
              {workspaceTab === "captions" ? <CaptionsPanel cameraStatus={candidateCameraStatus} captions={liveCaptions} microphoneState={candidateMicrophoneState} /> : null}
              {workspaceTab === "notes" ? <NotesPanel notes={notes} updateNotes={updateNotes} /> : null}
              {workspaceTab === "chat" ? <EmptyChat /> : null}
            </div>
          </aside>
        ) : null}

        <nav className="absolute bottom-5 left-1/2 z-40 flex -translate-x-1/2 items-center gap-1 rounded-2xl border border-white/10 bg-[#111827]/90 p-1.5 shadow-2xl backdrop-blur-xl" aria-label="Interview tools">
          {tabs.map(([tab, label, icon]) => <button className={`relative flex min-w-[72px] flex-col items-center gap-1 rounded-xl px-3 py-2 text-[10px] font-medium transition ${workspaceTab === tab ? "bg-white/10 text-white" : "text-white/55 hover:bg-white/[0.06] hover:text-white"}`} key={tab} onClick={() => setWorkspaceTab((current) => current === tab ? null : tab)} type="button"><Icon name={icon} size={17} /><span>{label}</span>{tab === "captions" && liveCaptions.length ? <span className="absolute right-2 top-1.5 size-1.5 rounded-full bg-emerald-400" /> : null}</button>)}
        </nav>
      </main>

      <div className="sr-only" aria-hidden><CandidateLiveCamera compact externalVideoRef={cameraVideoRef} externalScreenShareRef={screenShareVideoRef} lowBandwidthMode={lowBandwidthMode} interviewerMicrophoneMuted={interviewerMicrophoneMuted} onConnectionQualityChange={setCandidateConnectionQuality} onCaption={handleCaption} onInterviewerMicrophoneStateChange={setInterviewerMicrophoneState} onMicrophoneStateChange={setCandidateMicrophoneState} onScreenShareChange={setCandidateScreenSharing} onStatusChange={setCandidateCameraStatus} sessionId={sessionId} /></div>
    </div>
  );
}

type QuestionsPanelProps = {
  error: string; followUps: InterviewerFollowUp[]; handleKeyDown: (event: React.KeyboardEvent) => void;
  question: string; required: boolean; sending: boolean;
  setQuestion: (value: string) => void; setRequired: (value: boolean) => void; sendQuestion: () => Promise<void>;
};

function QuestionsPanel({ error, followUps, handleKeyDown, question, required, sending, setQuestion, setRequired, sendQuestion }: QuestionsPanelProps) {
  return <div className="p-4">
    <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-neutral-400">Send follow-up</p><textarea className="mt-2 min-h-[96px] w-full resize-none rounded-lg border border-neutral-200 bg-neutral-50 p-3 text-xs outline-none focus:border-[var(--color-primary-400)] focus:bg-white" disabled={sending} maxLength={2000} onChange={(event) => setQuestion(event.target.value)} onKeyDown={handleKeyDown} placeholder="Ask the candidate a follow-up question…" value={question} />{error ? <p className="mt-1.5 text-[11px] text-rose-600">{error}</p> : null}<div className="mt-2 flex items-center justify-between"><label className="flex items-center gap-2 text-[11px] text-neutral-500"><input checked={required} className="accent-[var(--color-primary-600)]" onChange={(event) => setRequired(event.target.checked)} type="checkbox" />Response required</label><button className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--color-primary-600)] px-3 py-2 text-[11px] font-bold text-white hover:bg-[var(--color-primary-700)] disabled:opacity-40" disabled={sending || question.trim().length < 3} onClick={() => void sendQuestion()} type="button"><Icon name="paperPlane" size={12} />{sending ? "Sending…" : "Send"}</button></div>
    <div className="my-4 border-t border-neutral-200" /><div className="flex items-center justify-between"><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-neutral-400">Previous questions</p><span className="text-[10px] text-neutral-400">{followUps.length}</span></div><div className="mt-2 space-y-2">{followUps.length ? followUps.map((item) => <article className="rounded-lg border border-neutral-200 bg-neutral-50 p-2.5" key={item.id}><div className="flex items-start justify-between gap-2"><p className="text-[11px] font-semibold leading-4 text-neutral-800">{item.questionText}</p><span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-bold ${item.status === "answered" ? "bg-emerald-100 text-emerald-700" : "bg-violet-100 text-violet-700"}`}>{item.status}</span></div>{item.answerText ? <p className="mt-1.5 text-[11px] leading-4 text-neutral-500">{item.answerText}</p> : null}</article>) : <p className="py-8 text-center text-[11px] text-neutral-400">No follow-ups sent yet.</p>}</div>
  </div>;
}

function CaptionsPanel({ cameraStatus, captions, microphoneState }: { cameraStatus: CameraStatus; captions: LiveCaption[]; microphoneState: "waiting" | "live" | "muted" }) {
  return <div className="size-full overflow-y-auto px-6 py-4"><div className="mx-auto max-w-4xl"><div className="flex items-center justify-between"><div><p className="text-xs font-bold">Live captions</p><p className="mt-0.5 text-[10px] text-neutral-400">Live speech only — not part of saved evidence.</p></div><span className={`rounded-full px-2 py-1 text-[10px] font-bold ${microphoneState === "muted" || cameraStatus === "offline" ? "bg-rose-100 text-rose-700" : "bg-emerald-100 text-emerald-700"}`}>{microphoneState === "muted" ? "Mic muted" : cameraStatus === "offline" ? "Disconnected" : "Listening"}</span></div><div className="mt-3 space-y-1">{captions.length ? captions.map((caption) => <div className="grid grid-cols-[74px_100px_1fr] gap-3 rounded-lg px-3 py-2 text-xs hover:bg-neutral-50" key={caption.id}><time className="font-mono text-[10px] text-neutral-400">{new Date(caption.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</time><span className="font-bold text-[var(--color-primary-700)]">{caption.speaker}</span><p className={caption.final ? "text-neutral-700" : "italic text-neutral-400"}>{caption.text}</p></div>) : <p className="py-12 text-center text-xs text-neutral-400">Waiting for the candidate to speak…</p>}</div></div></div>;
}

function NotesPanel({ notes, updateNotes }: { notes: string; updateNotes: (value: string) => void }) {
  return <div className="mx-auto flex size-full max-w-4xl flex-col px-6 py-4"><div className="flex items-center justify-between gap-4"><div><p className="text-xs font-bold">Private interviewer notes</p><p className="mt-0.5 text-[10px] text-neutral-400">Stored only in this browser tab. Never shared with the candidate.</p></div><div className="flex gap-2"><button className="rounded-lg bg-amber-50 px-2.5 py-1.5 text-[10px] font-semibold text-amber-700" onClick={() => updateNotes(`${notes}${notes ? "\n" : ""}⭐ Strong communication`)} type="button">⭐ Strong communication</button><button className="rounded-lg bg-rose-50 px-2.5 py-1.5 text-[10px] font-semibold text-rose-700" onClick={() => updateNotes(`${notes}${notes ? "\n" : ""}⚠ Review technical depth`)} type="button">⚠ Review technical depth</button></div></div><textarea className="mt-3 min-h-0 flex-1 resize-none rounded-xl border border-neutral-200 bg-neutral-50 p-4 text-xs leading-5 outline-none focus:border-[var(--color-primary-400)] focus:bg-white" onChange={(event) => updateNotes(event.target.value)} placeholder="Capture observations, evidence, and topics to revisit…" value={notes} /></div>;
}

function EmptyChat() {
  return <div className="grid size-full place-items-center px-6 text-center"><div className="max-w-sm"><span className="mx-auto grid size-10 place-items-center rounded-xl bg-neutral-100 text-neutral-500"><Icon name="message" size={18} /></span><p className="mt-3 text-sm font-semibold text-neutral-800">Interview chat</p><p className="mt-1 text-xs leading-5 text-neutral-400">Text chat will appear here when candidate messaging is enabled. Existing interview functionality is unchanged.</p></div></div>;
}
