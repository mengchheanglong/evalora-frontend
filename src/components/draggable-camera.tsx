"use client";

import { useCallback, useRef, useState } from "react";

type DraggableCameraProps = {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  connectionState?: "waiting" | "connecting" | "reconnecting" | "connected" | "error" | "offline";
  connectionQuality?: "excellent" | "good" | "poor" | "lost";
  label?: string;
  lowBandwidthMode?: boolean;
  microphoneState?: "waiting" | "live" | "muted";
  onToggleLowBandwidth?: () => void;
};

/**
 * Small floating camera widget that can be dragged anywhere on screen.
 * The video element is provided by the parent so it can attach a MediaStream.
 */
export function DraggableCamera({
  videoRef,
  connectionState = "connecting",
  connectionQuality = "lost",
  label = "Camera",
  lowBandwidthMode = false,
  microphoneState = "waiting",
  onToggleLowBandwidth,
}: DraggableCameraProps) {
  const [pos, setPos] = useState({
    x: typeof window !== "undefined" ? window.innerWidth - 240 : 100,
    y: typeof window !== "undefined" ? window.innerHeight - 220 : 100,
  });
  const [dragging, setDragging] = useState(false);
  const [playing, setPlaying] = useState(false);
  const dragStart = useRef({ x: 0, y: 0, posx: 0, posy: 0 });

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
      const maxX = typeof window !== "undefined" ? window.innerWidth - 200 : 1000;
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

  return (
    <div
      className="fixed z-[99999] select-none"
      style={{ left: pos.x, top: pos.y, width: 200, touchAction: "none" }}
    >
      <div
        className={`overflow-hidden rounded-xl border-2 border-white/80 bg-black shadow-[0_8px_32px_rgba(0,0,0,0.4)] ${dragging ? "cursor-grabbing shadow-[0_12px_48px_rgba(0,0,0,0.6)]" : "cursor-grab"}`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        {/* Video */}
        <div className="relative aspect-video bg-neutral-900">
          <video
            ref={videoRef}
            autoPlay
            muted
            onEmptied={() => setPlaying(false)}
            onPlaying={() => setPlaying(true)}
            onWaiting={() => setPlaying(false)}
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
              <p className="text-[10px] font-semibold text-white">Connecting…</p>
            </div>
          ) : null}

          {/* Live badge */}
          <div className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-black/70 px-1.5 py-0.5">
            <span className={`size-1.5 rounded-full ${playing ? "bg-emerald-400" : "bg-amber-400"}`} />
            <span className="text-[9px] font-bold text-white">{playing ? "Live" : "Camera"}</span>
          </div>

          <div className="absolute right-2 top-2 flex items-center gap-1 rounded-full bg-black/70 px-1.5 py-0.5">
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

        {/* Label */}
        <div className="flex items-center justify-between gap-2 bg-white px-2.5 py-1.5">
          <div>
            <p className="text-[11px] font-bold text-neutral-800">{label}</p>
            <p className="text-[9px] text-neutral-400">
              {connectionState === "reconnecting" ? "Reconnecting..." : playing ? "Active" : "Connecting…"}
            </p>
          </div>
          <div className="flex items-center gap-1">
            <button
              className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold ${
                lowBandwidthMode
                  ? "bg-amber-100 text-amber-700"
                  : "bg-sky-100 text-sky-700"
              }`}
              onClick={(event) => {
                event.stopPropagation();
                onToggleLowBandwidth?.();
              }}
              onPointerDown={(event) => event.stopPropagation()}
              title={lowBandwidthMode ? "Restore normal video quality" : "Enable low bandwidth mode"}
              type="button"
            >
              {lowBandwidthMode ? "Low" : "Normal"}
            </button>
            <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold ${
              microphoneState === "muted"
                ? "bg-rose-100 text-rose-700"
                : microphoneState === "live"
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-neutral-100 text-neutral-500"
            }`}>
              {microphoneState === "muted" ? "Mic muted" : microphoneState === "live" ? "Mic live" : "No mic"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
