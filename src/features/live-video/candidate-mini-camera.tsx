"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type FloatingCandidateCameraProps = {
  stream: MediaStream | null;
  connectionState: "connecting" | "connected" | "reconnecting" | "offline";
  connectionQuality: "excellent" | "good" | "poor" | "lost";
  lowBandwidthMode: boolean;
  interviewerMicrophoneState: "waiting" | "live" | "muted" | "offline";
  microphoneMuted: boolean;
  onToggleLowBandwidth: () => void;
  onToggleMicrophone: () => void;
};

export function FloatingCandidateCamera({
  stream,
  connectionState,
  connectionQuality,
  lowBandwidthMode,
  interviewerMicrophoneState,
  microphoneMuted,
  onToggleLowBandwidth,
  onToggleMicrophone,
}: FloatingCandidateCameraProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [pos, setPos] = useState({
    x: typeof window !== "undefined" ? 20 : 20,
    y: typeof window !== "undefined" ? window.innerHeight - 200 : 500,
  });
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0, posx: 0, posy: 0 });

  useEffect(() => {
    const video = videoRef.current;

    if (!video) {
      return;
    }

    if (!stream) {
      video.srcObject = null;
      setPlaying(false);
      return;
    }

    let cancelled = false;
    video.srcObject = stream;

    const playVideo = async () => {
      try {
        await video.play();
        if (!cancelled) {
          setPlaying(true);
        }
      } catch {
        if (!cancelled) {
          setPlaying(false);
        }
      }
    };

    const videoTrack = stream.getVideoTracks()[0];
    const handleEnded = () => setPlaying(false);
    const handleMute = () => setPlaying(false);
    const handleUnmute = () => void playVideo();

    videoTrack?.addEventListener("ended", handleEnded);
    videoTrack?.addEventListener("mute", handleMute);
    videoTrack?.addEventListener("unmute", handleUnmute);
    void playVideo();

    return () => {
      cancelled = true;
      videoTrack?.removeEventListener("ended", handleEnded);
      videoTrack?.removeEventListener("mute", handleMute);
      videoTrack?.removeEventListener("unmute", handleUnmute);

      if (video.srcObject === stream) {
        video.srcObject = null;
      }
    };
  }, [stream]);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      setDragging(true);
      dragStart.current = { x: e.clientX, y: e.clientY, posx: pos.x, posy: pos.y };
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    [pos],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragging) return;
      const dx = e.clientX - dragStart.current.x;
      const dy = e.clientY - dragStart.current.y;
      const maxX = typeof window !== "undefined" ? window.innerWidth - 210 : 1000;
      const maxY = typeof window !== "undefined" ? window.innerHeight - 200 : 800;
      setPos({
        x: Math.max(0, Math.min(maxX, dragStart.current.posx + dx)),
        y: Math.max(0, Math.min(maxY, dragStart.current.posy + dy)),
      });
    },
    [dragging],
  );

  const handlePointerUp = useCallback(() => {
    setDragging(false);
  }, []);

  if (!stream) {
    return null;
  }

  return (
    <div
      className="fixed z-[99999] w-[min(210px,32vw)] select-none"
      style={{ left: pos.x, top: pos.y, touchAction: "none" }}
    >
      <div
        className={`overflow-hidden rounded-xl border-2 border-white bg-black shadow-[0_12px_40px_rgba(15,23,42,0.28)] ${dragging ? "cursor-grabbing" : "cursor-grab"}`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        <div className="relative aspect-video bg-neutral-900">
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className="block h-full w-full object-cover"
          />

          {connectionState === "reconnecting" ? (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-neutral-900/80 backdrop-blur-sm">
              <div className="text-center">
                <span className="mx-auto block size-4 animate-spin rounded-full border-2 border-white/25 border-t-white" />
                <p className="mt-2 text-[10px] font-semibold text-white">Reconnecting...</p>
              </div>
            </div>
          ) : !playing ? (
            <div className="absolute inset-0 flex items-center justify-center bg-neutral-900">
              <p className="text-[10px] font-semibold text-white">
                Connecting camera...
              </p>
            </div>
          ) : null}

          <div className="absolute left-2 top-2 flex items-center gap-1.5 rounded-full bg-black/70 px-2 py-1">
            <span
              className={`size-1.5 rounded-full ${
                playing ? "bg-emerald-400" : "bg-amber-400"
              }`}
            />
            <span className="text-[10px] font-bold text-white">
              {playing ? "Live" : "Camera"}
            </span>
          </div>

          <div className="absolute right-2 top-2 flex items-center gap-1 rounded-full bg-black/70 px-2 py-1">
            <span className={`size-1.5 rounded-full ${
              connectionQuality === "excellent"
                ? "bg-emerald-400"
                : connectionQuality === "good"
                  ? "bg-sky-400"
                  : connectionQuality === "poor"
                    ? "bg-amber-400"
                    : "bg-rose-400"
            }`} />
            <span className="text-[9px] font-bold capitalize text-white">
              {connectionQuality}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 bg-white px-3 py-2">
          <div>
            <p className="text-[11px] font-bold text-neutral-800">
              Your camera
            </p>
            <p className={`mt-0.5 text-[10px] ${microphoneMuted ? "text-rose-500" : "text-neutral-400"}`}>
              {connectionState === "reconnecting"
                ? "Reconnecting..."
                : microphoneMuted
                  ? "Microphone muted"
                  : playing
                    ? "Camera and microphone active"
                    : "Connecting..."}
            </p>
            <p className={`mt-0.5 text-[9px] ${
              interviewerMicrophoneState === "live"
                ? "text-emerald-600"
                : interviewerMicrophoneState === "muted"
                  ? "text-neutral-400"
                  : "text-amber-600"
            }`}>
              {interviewerMicrophoneState === "live"
                ? "Interviewer mic live"
                : interviewerMicrophoneState === "muted"
                  ? "Interviewer mic muted"
                  : interviewerMicrophoneState === "offline"
                    ? "Interviewer audio disconnected"
                    : "Waiting for interviewer audio"}
            </p>
          </div>

          <div className="flex items-center gap-1">
            <button
              aria-label={lowBandwidthMode ? "Restore normal video quality" : "Enable low bandwidth mode"}
              className={`h-8 rounded-full px-2 text-[9px] font-bold transition-colors ${
                lowBandwidthMode
                  ? "bg-amber-100 text-amber-700 hover:bg-amber-200"
                  : "bg-sky-100 text-sky-700 hover:bg-sky-200"
              }`}
              onClick={(event) => {
                event.stopPropagation();
                onToggleLowBandwidth();
              }}
              onPointerDown={(event) => event.stopPropagation()}
              title={lowBandwidthMode ? "Low quality video" : "Normal quality video"}
              type="button"
            >
              {lowBandwidthMode ? "Low" : "Normal"}
            </button>

            <button
            aria-label={microphoneMuted ? "Unmute microphone" : "Mute microphone"}
            className={`grid size-8 shrink-0 place-items-center rounded-full text-sm transition-colors ${
              microphoneMuted
                ? "bg-rose-100 text-rose-700 hover:bg-rose-200"
                : "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
            }`}
            onClick={(event) => {
              event.stopPropagation();
              onToggleMicrophone();
            }}
            onPointerDown={(event) => event.stopPropagation()}
            title={microphoneMuted ? "Unmute microphone" : "Mute microphone"}
            type="button"
          >
            {microphoneMuted ? "⌁" : "●"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
