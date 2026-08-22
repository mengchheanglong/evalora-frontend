"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Icon } from "@/components/icons";

type FloatingCandidateCameraProps = {
  stream: MediaStream | null;
  candidateName: string;
  connectionState: "connecting" | "connected" | "reconnecting" | "offline";
  connectionQuality: "excellent" | "good" | "poor" | "lost";
  lowBandwidthMode: boolean;
  interviewerMicrophoneState: "waiting" | "live" | "muted" | "offline";
  microphoneMuted: boolean;
  screenShareState: "idle" | "starting" | "sharing";
  /** Shown under the camera when live captions are unavailable in this browser. */
  captionNotice?: string;
  onToggleLowBandwidth: () => void;
  onToggleMicrophone: () => void;
  onToggleScreenShare: () => void;
};

export function FloatingCandidateCamera({
  stream,
  candidateName,
  connectionQuality,
  lowBandwidthMode,
  microphoneMuted,
  screenShareState,
  captionNotice,
  onToggleLowBandwidth,
  onToggleMicrophone,
  onToggleScreenShare,
}: FloatingCandidateCameraProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const [playing, setPlaying] = useState(false);
  const [pos, setPos] = useState({
    x: typeof window !== "undefined" ? Math.max(16, window.innerWidth - 316) : 20,
    y: typeof window !== "undefined" ? Math.max(16, window.innerHeight - 340) : 500,
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

  useEffect(() => {
    const handleResize = () => {
      const cardWidth = cardRef.current?.offsetWidth ?? 200;
      const cardHeight = cardRef.current?.offsetHeight ?? 150;
      const maxX = Math.max(0, window.innerWidth - cardWidth);
      const maxY = Math.max(0, window.innerHeight - cardHeight);
      setPos((current) => ({
        x: Math.max(0, Math.min(maxX, current.x)),
        y: Math.max(0, Math.min(maxY, current.y)),
      }));
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

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
      const cardWidth = cardRef.current?.offsetWidth ?? 300;
      const cardHeight = cardRef.current?.offsetHeight ?? 300;
      const maxX = typeof window !== "undefined" ? window.innerWidth - cardWidth : 1000;
      const maxY = typeof window !== "undefined" ? window.innerHeight - cardHeight : 800;
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
      ref={cardRef}
      className="fixed z-[99999] w-[170px] select-none sm:w-[190px] lg:w-[220px]"
      style={{ left: pos.x, top: pos.y, touchAction: "none" }}
    >
      <div
        className={`overflow-hidden rounded-[20px] border border-white/15 bg-[#111827] shadow-[0_18px_55px_rgba(15,23,42,0.35)] transition-shadow duration-200 ${dragging ? "cursor-grabbing shadow-[0_24px_70px_rgba(15,23,42,0.48)]" : "cursor-grab"}`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        <div className="relative aspect-[3/2] overflow-hidden bg-neutral-900">
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className="block size-full object-cover"
          />

          {!playing ? (
            <div className="absolute inset-0 z-10 grid place-items-center bg-neutral-900/85 backdrop-blur-sm">
              <span className="size-4 animate-spin rounded-full border-2 border-white/20 border-t-white/80" />
            </div>
          ) : null}

          <div className="absolute left-2.5 top-2.5 flex items-center gap-1 rounded-full border border-white/10 bg-black/40 px-2 py-0.5 backdrop-blur-md">
            <span
              className={`size-1.5 rounded-full ${
                playing ? "bg-emerald-400" : "bg-amber-400"
              }`}
            />
            <span className="text-[9px] font-semibold text-white/90">
              Live
            </span>
          </div>

          <div className="absolute right-2.5 top-2.5 flex items-center gap-1 rounded-full border border-white/10 bg-black/40 px-2 py-0.5 backdrop-blur-md">
            <span className={`size-1.5 rounded-full ${
              connectionQuality === "excellent"
                ? "bg-emerald-400"
                : connectionQuality === "good"
                  ? "bg-sky-400"
                  : connectionQuality === "poor"
                    ? "bg-amber-400"
                    : "bg-rose-400"
            }`} />
            <span className="text-[9px] font-semibold capitalize text-white/90">
              {connectionQuality}
            </span>
          </div>

        </div>

        <div className="flex h-11 items-center gap-1 bg-white px-2">
          <div className="min-w-0 flex-1">
            <p className="truncate text-[11px] font-semibold text-neutral-900">{candidateName}</p>
            <p className="mt-0.5 text-[8px] text-neutral-400">Candidate</p>
          </div>

          <div className="flex shrink-0 items-center justify-center gap-1 rounded-full border border-neutral-200/80 bg-neutral-50/90 p-1 shadow-sm">
            <button
              aria-label={microphoneMuted ? "Unmute microphone" : "Mute microphone"}
              className={`grid size-[22px] shrink-0 place-items-center rounded-full border transition-all ${
                microphoneMuted
                  ? "border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100"
                  : "border-neutral-200 bg-white text-emerald-600 hover:bg-neutral-50"
              }`}
              onClick={(event) => {
                event.stopPropagation();
                onToggleMicrophone();
              }}
              onPointerDown={(event) => event.stopPropagation()}
              title={microphoneMuted ? "Unmute microphone" : "Mute microphone"}
              type="button"
            >
              <Icon name="waves" size={11} />
            </button>

            <button
              aria-label={lowBandwidthMode ? "Restore normal video quality" : "Enable low bandwidth mode"}
              className={`relative grid size-[22px] shrink-0 place-items-center rounded-full border transition-all ${
                lowBandwidthMode
                  ? "border-amber-200 bg-amber-50 text-amber-600 hover:bg-amber-100"
                  : "border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50"
              }`}
              onClick={(event) => {
                event.stopPropagation();
                onToggleLowBandwidth();
              }}
              onPointerDown={(event) => event.stopPropagation()}
              title={lowBandwidthMode ? "Low bandwidth mode enabled" : "Use low bandwidth mode"}
              type="button"
            >
              <Icon name="video" size={11} />
              {lowBandwidthMode ? <span className="absolute right-1 top-1 size-1.5 rounded-full bg-amber-500" /> : null}
            </button>

            <button
              aria-label={screenShareState === "sharing" ? "Stop sharing screen" : "Share screen"}
              className={`relative grid size-[22px] shrink-0 place-items-center rounded-full border transition-all ${
                screenShareState === "sharing"
                  ? "border-violet-200 bg-violet-50 text-violet-600 hover:bg-violet-100"
                  : "border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50"
              } disabled:cursor-wait disabled:opacity-50`}
              disabled={screenShareState === "starting"}
              onClick={(event) => {
                event.stopPropagation();
                onToggleScreenShare();
              }}
              onPointerDown={(event) => event.stopPropagation()}
              title={screenShareState === "sharing" ? "Stop sharing screen" : "Share your screen"}
              type="button"
            >
              {screenShareState === "starting" ? (
                <span className="size-4 animate-spin rounded-full border-2 border-current/30 border-t-current" />
              ) : (
                <Icon name="eye" size={11} />
              )}
              {screenShareState === "sharing" ? <span className="absolute right-1 top-1 size-1.5 rounded-full bg-violet-500" /> : null}
            </button>
          </div>

        </div>

        {captionNotice ? (
          <div className="border-t border-neutral-100 bg-amber-50 px-2 py-1.5">
            <p className="text-[8px] leading-tight text-amber-700">{captionNotice}</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
