"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type FloatingCandidateCameraProps = {
  stream: MediaStream | null;
};

export function FloatingCandidateCamera({
  stream,
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

          {!playing ? (
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
        </div>

        <div className="bg-white px-3 py-2">
          <p className="text-[11px] font-bold text-neutral-800">
            Your camera
          </p>
          <p className="mt-0.5 text-[10px] text-neutral-400">
            {playing ? "Camera is active" : "Connecting..."}
          </p>
        </div>
      </div>
    </div>
  );
}
