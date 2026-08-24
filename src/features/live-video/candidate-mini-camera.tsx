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
  cameraMuted: boolean;
  microphoneMuted: boolean;
  screenShareState: "idle" | "starting" | "sharing";
  /** Shown under the camera when live captions are unavailable in this browser. */
  captionNotice?: string;
  onToggleLowBandwidth: () => void;
  onToggleMicrophone: () => void;
  onToggleCamera: () => void;
  onToggleScreenShare: () => void;
};

export function FloatingCandidateCamera({
  stream,
  candidateName,
  connectionQuality,
  cameraMuted,
  microphoneMuted,
  screenShareState,
  captionNotice,
  onToggleMicrophone,
  onToggleCamera,
  onToggleScreenShare,
}: FloatingCandidateCameraProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const [playing, setPlaying] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
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

  useEffect(() => {
    if (!menuOpen) return;

    const closeOutside = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };

    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [menuOpen]);

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

          {!playing || cameraMuted ? (
            <div className="absolute inset-0 z-10 grid place-items-center bg-neutral-900/85 backdrop-blur-sm">
              {cameraMuted ? (
                <div className="text-center text-white/80">
                  <Icon className="mx-auto" name="video" size={20} />
                  <p className="mt-1 text-[9px] font-semibold">Camera off</p>
                </div>
              ) : (
                <span className="size-4 animate-spin rounded-full border-2 border-white/20 border-t-white/80" />
              )}
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

          <div className="relative shrink-0" ref={menuRef}>
            <button
              aria-expanded={menuOpen}
              aria-haspopup="menu"
              aria-label="Open media controls"
              className="grid size-8 place-items-center rounded-full border border-neutral-200 bg-neutral-50 text-neutral-600 shadow-sm transition hover:bg-neutral-100 hover:text-neutral-900"
              onClick={(event) => {
                event.stopPropagation();
                setMenuOpen((open) => !open);
              }}
              onPointerDown={(event) => event.stopPropagation()}
              title="Media controls"
              type="button"
            >
              <Icon name="more" size={16} />
            </button>

            {menuOpen ? (
              <div className="absolute bottom-10 right-0 z-30 w-44 overflow-hidden rounded-xl border border-neutral-200 bg-white p-1.5 shadow-xl" role="menu">
                {[
                  { label: microphoneMuted ? "Unmute microphone" : "Mute microphone", icon: "microphone" as const, action: onToggleMicrophone, active: microphoneMuted },
                  { label: cameraMuted ? "Turn on camera" : "Turn off camera", icon: "video" as const, action: onToggleCamera, active: cameraMuted },
                  { label: screenShareState === "sharing" ? "Stop sharing" : "Share screen", icon: "eye" as const, action: onToggleScreenShare, active: screenShareState === "sharing" },
                ].map((item) => (
                  <button
                    className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-xs font-semibold transition disabled:cursor-wait disabled:opacity-50 ${item.active ? "bg-sky-50 text-sky-700" : "text-neutral-700 hover:bg-neutral-50"}`}
                    disabled={item.icon === "eye" && screenShareState === "starting"}
                    key={item.label}
                    onClick={(event) => {
                      event.stopPropagation();
                      item.action();
                      setMenuOpen(false);
                    }}
                    onPointerDown={(event) => event.stopPropagation()}
                    role="menuitem"
                    type="button"
                  >
                    <Icon name={item.icon} size={15} />
                    {item.icon === "eye" && screenShareState === "starting" ? "Starting share…" : item.label}
                  </button>
                ))}
              </div>
            ) : null}
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
