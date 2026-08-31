"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Icon, type IconName } from "@/components/icons";
import { DraggableCamera } from "@/components/draggable-camera";
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
  const [candidateScreenSharing, setCandidateScreenSharing] = useState(false);
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
  const [splitPosition, setSplitPosition] = useState(50); // percentage for left panel
  const [isDraggingSplitter, setIsDraggingSplitter] = useState(false);
  const splitterRef = useRef<HTMLDivElement | null>(null);
  const mainContainerRef = useRef<HTMLElement | null>(null);

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

  // Splitter drag handlers for resizing panels
  const handleSplitterMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDraggingSplitter(true);
  }, []);

  useEffect(() => {
    if (!isDraggingSplitter) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!mainContainerRef.current) return;
      const rect = mainContainerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const percentage = (x / rect.width) * 100;
      // Clamp between 25% and 75%
      setSplitPosition(Math.max(25, Math.min(75, percentage)));
    };

    const handleMouseUp = () => {
      setIsDraggingSplitter(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isDraggingSplitter]);

  const tabs: Array<[WorkspaceTab, string, IconName]> = [["questions", "Questions", "question"], ["captions", "Captions", "waves"], ["notes", "Notes", "pencil"], ["chat", "Chat", "message"]];

  return (
    <div className="live-interview-workspace fixed inset-0 z-50 flex min-h-0 flex-col bg-gray-50 text-gray-900">
      {/* Header - compact dark header */}
      <header className="relative z-40 flex h-16 shrink-0 items-center border-b border-gray-200 bg-white px-4 sm:px-5">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <button aria-label="Back to candidate" className="grid size-9 shrink-0 place-items-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-900" onClick={onClose} type="button"><Icon className="rotate-90" name="chevron" size={17} /></button>
          <div className="min-w-0"><p className="truncate text-sm font-semibold text-gray-900">{candidateName} Interview</p><p className="truncate text-[11px] text-gray-500">Live assessment workspace</p></div>
        </div>
        <div className="hidden items-center gap-4 rounded-xl border border-gray-200 bg-gray-50 px-4 py-2 md:flex">
          <span className={`inline-flex items-center gap-2 text-xs font-bold ${connection === "live" ? "text-emerald-600" : "text-amber-600"}`}><span className={`size-2 rounded-full ${connection === "live" ? "animate-pulse bg-emerald-500" : "bg-amber-500"}`} />{connection === "live" ? "LIVE" : "CONNECTING"}</span>
          <span className="h-4 w-px bg-gray-300" /><span className="inline-flex items-center gap-2 font-mono text-xs text-gray-600"><Icon name="clock" size={14} />{formatDuration(elapsedSeconds)}</span>
          <span className="h-4 w-px bg-gray-300" /><span className="inline-flex items-center gap-2 text-xs text-gray-600"><span className={`size-2 rounded-full ${candidateConnectionQuality === "excellent" ? "bg-emerald-500" : candidateConnectionQuality === "good" ? "bg-sky-500" : candidateConnectionQuality === "poor" ? "bg-amber-500" : "bg-rose-500"}`} /><span className="capitalize">{candidateConnectionQuality}</span> network</span>
        </div>
        <div className="flex flex-1 items-center justify-end gap-2">
          <button className={`inline-flex h-9 items-center gap-2 rounded-lg border px-3 text-xs font-semibold ${interviewerMicrophoneMuted ? "border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100" : "border-emerald-300 bg-emerald-50 text-emerald-700"}`} onClick={() => setInterviewerMicrophoneMuted((value) => !value)} type="button"><Icon name="microphone" size={15} /><span className="hidden lg:inline">{interviewerMicrophoneState === "error" ? "Mic unavailable" : interviewerMicrophoneMuted ? "Mic off" : "Mic on"}</span></button>
          <div className="relative"><button aria-label="Interview settings" className="grid size-9 place-items-center rounded-lg border border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100" onClick={() => setShowSettings((value) => !value)} type="button"><Icon name="settings" size={16} /></button>
            {showSettings ?            <div className="absolute right-0 top-11 w-64 rounded-xl border border-gray-200 bg-white p-3 shadow-2xl"><p className="text-xs font-semibold text-gray-900">Video quality</p><p className="mt-1 text-[11px] leading-4 text-gray-500">Reduce candidate video quality on unstable networks.</p><button className={`mt-3 w-full rounded-lg px-3 py-2 text-xs font-semibold ${lowBandwidthMode ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`} onClick={() => setLowBandwidthOverride(!lowBandwidthMode)} type="button">{lowBandwidthMode ? "Low bandwidth enabled" : "Enable low bandwidth"}</button></div> : null}
          </div>
          <button className="ml-1 hidden h-9 rounded-lg border border-rose-300 px-3 text-xs font-semibold text-rose-600 hover:bg-rose-50 sm:block" onClick={onClose} type="button">Leave interview</button>
        </div>
      </header>

      {/* Main content area */}
      <main ref={mainContainerRef} className="relative flex min-h-0 flex-1 overflow-hidden">
        {/* Screen sharing mode: resizable split */}
        {candidateScreenSharing ? (
          <>
            {/* Left: Candidate's shared screen */}
            <div className="relative overflow-hidden bg-gray-100" style={{ width: `${splitPosition}%` }}>
              <div className="absolute inset-0 flex items-center justify-center">
                <video ref={screenShareVideoRef} autoPlay className="size-full object-contain" playsInline />
              </div>
              <div className="absolute left-4 top-4 z-10 inline-flex items-center gap-2 rounded-lg bg-white/90 px-3 py-2 text-xs font-semibold text-gray-900 shadow-sm backdrop-blur">
                <Icon name="code" size={15} />
                Candidate screen · Live workspace
              </div>
              {/* Floating camera PiP over the shared screen */}
              <div className="absolute bottom-4 right-4 z-20">
                <DraggableCamera
                  videoRef={cameraVideoRef}
                  connectionState={candidateCameraStatus}
                  connectionQuality={candidateConnectionQuality}
                  label={candidateName}
                  lowBandwidthMode={lowBandwidthMode}
                  microphoneState={candidateMicrophoneState}
                />
              </div>
            </div>

            {/* Resizable splitter */}
            <div
              ref={splitterRef}
              className={`relative z-20 flex w-1 shrink-0 cursor-col-resize items-center justify-center bg-gray-200 transition-colors hover:bg-gray-300 ${isDraggingSplitter ? 'bg-gray-400' : ''}`}
              onMouseDown={handleSplitterMouseDown}
            >
              <div className="absolute inset-y-0 -left-1 -right-1" /> {/* Wider hit area */}
              <div className="flex flex-col gap-1">
                <div className="size-1 rounded-full bg-gray-400" />
                <div className="size-1 rounded-full bg-gray-400" />
                <div className="size-1 rounded-full bg-gray-400" />
              </div>
            </div>

            {/* Right: Interview Answers */}
            <div className="flex min-w-[300px] flex-1 flex-col overflow-hidden bg-white border-l border-gray-200">
              <aside className="live-interview-transcript min-h-0 flex-1 overflow-y-auto p-4 text-gray-900">
                <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.16em] text-gray-400">Interview answers</p>
                <SessionTranscriptView onStatusChange={() => {}} sessionId={sessionId} />
              </aside>
            </div>
          </>
        ) : (
          /* Normal mode: Interview Answers fills the workspace */
          <div className="min-h-0 flex-1 overflow-hidden p-4">
            <div className="live-interview-transcript h-full overflow-y-auto rounded-xl border border-gray-200 bg-white p-6 text-gray-900 shadow-lg">
              <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.16em] text-gray-400">Interview answers</p>
              <SessionTranscriptView onStatusChange={() => {}} sessionId={sessionId} />
            </div>
          </div>
        )}

        {/* Floating candidate camera PiP - only in normal mode */}
        {!candidateScreenSharing && (
          <div className="absolute bottom-24 right-6 z-30">
            <DraggableCamera
              videoRef={cameraVideoRef}
              connectionState={candidateCameraStatus}
              connectionQuality={candidateConnectionQuality}
              label={candidateName}
              lowBandwidthMode={lowBandwidthMode}
              microphoneState={candidateMicrophoneState}
            />
          </div>
        )}

        {/* Tool panel drawer - right side */}
        {workspaceTab ? (
          <div className="absolute bottom-0 right-0 top-0 z-30 flex w-[min(380px,calc(100%-32px))] flex-col overflow-hidden border-l border-gray-200 bg-white shadow-xl">
            <div className="flex h-12 shrink-0 items-center justify-between border-b border-gray-200 px-4">
              <p className="text-sm font-semibold capitalize text-gray-900">{workspaceTab}</p>
              <button aria-label="Close panel" className="grid size-7 place-items-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-900" onClick={() => setWorkspaceTab(null)} type="button"><Icon name="x" size={15} /></button>
            </div>
            <div className="live-interview-panel min-h-0 flex-1 overflow-y-auto bg-white text-gray-900">
              {workspaceTab === "questions" ? <QuestionsPanel error={error} followUps={followUps} handleKeyDown={handleKeyDown} question={question} required={required} sending={sending} setQuestion={setQuestion} setRequired={setRequired} sendQuestion={sendQuestion} /> : null}
              {workspaceTab === "captions" ? <CaptionsPanel cameraStatus={candidateCameraStatus} captions={liveCaptions} microphoneState={candidateMicrophoneState} /> : null}
              {workspaceTab === "notes" ? <NotesPanel notes={notes} updateNotes={updateNotes} /> : null}
              {workspaceTab === "chat" ? <EmptyChat /> : null}
            </div>
          </div>
        ) : null}

        {/* Bottom toolbar */}
        <nav className="absolute bottom-5 left-1/2 z-40 flex -translate-x-1/2 items-center gap-1 rounded-2xl border border-gray-200 bg-white/95 p-1.5 shadow-xl backdrop-blur-xl" aria-label="Interview tools">
          {tabs.map(([tab, label, icon]) => <button className={`relative flex min-w-[72px] flex-col items-center gap-1 rounded-xl px-3 py-2 text-[10px] font-medium transition ${workspaceTab === tab ? "bg-gray-100 text-gray-900" : "text-gray-500 hover:bg-gray-100 hover:text-gray-900"}`} key={tab} onClick={() => setWorkspaceTab((current) => current === tab ? null : tab)} type="button"><Icon name={icon} size={17} /><span>{label}</span>{tab === "captions" && liveCaptions.length ? <span className="absolute right-2 top-1.5 size-1.5 rounded-full bg-emerald-500" /> : null}</button>)}
        </nav>
      </main>

      {/* Hidden CandidateLiveCamera for LiveKit signaling */}
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
