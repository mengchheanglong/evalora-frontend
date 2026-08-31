"use client";

import { useCallback, useEffect, useRef, useState } from "react";

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
  const [size, setSize] = useState(200); // width in pixels
  const [resizing, setResizing] = useState(false);
  const dragStart = useRef({ x: 0, y: 0, posx: 0, posy: 0 });
  const resizeStart = useRef({ x: 0, y: 0, startSize: 0 });

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
    setResizing(false);
  }, []);

  // Resize handlers
  const handleResizeMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setResizing(true);
    resizeStart.current = { x: e.clientX, y: e.clientY, startSize: size };
  }, [size]);

  useEffect(() => {
    if (!resizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const dx = e.clientX - resizeStart.current.x;
      const newSize = resizeStart.current.startSize + dx;
      setSize(Math.max(120, Math.min(500, newSize)));
    };

    const handleMouseUp = () => {
      setResizing(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = 'nwse-resize';
    document.body.style.userSelect = 'none';

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [resizing]);

  // Size presets
  const handleSizeSmall = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setSize(160);
  }, []);

  const handleSizeMedium = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setSize(240);
  }, []);

  const handleSizeLarge = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setSize(360);
  }, []);

  return (
    <div
      className="fixed z-[99999] select-none"
      style={{ left: pos.x, top: pos.y, width: size, touchAction: "none" }}
    >
      <div
        className={`overflow-hidden rounded-xl border-2 border-white/80 bg-black shadow-[0_8px_32px_rgba(0,0,0,0.4)] ${dragging ? "cursor-grabbing shadow-[0_12px_48px_rgba(0,0,0,0.6)]" : "cursor-grab"}`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        {/* Video */}
        <div className="relative aspect-video overflow-hidden bg-neutral-900">
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
            {/* Size controls */}
            <div className="flex items-center gap-0.5 rounded-full bg-neutral-100 px-1 py-0.5">
              <button
                className="flex size-4 items-center justify-center rounded-full text-[9px] font-bold text-neutral-600 hover:bg-neutral-200"
                onClick={handleSizeSmall}
                onPointerDown={(e) => e.stopPropagation()}
                title="Small (160px)"
                type="button"
              >
                S
              </button>
              <button
                className="flex size-4 items-center justify-center rounded-full text-[9px] font-bold text-neutral-600 hover:bg-neutral-200"
                onClick={handleSizeMedium}
                onPointerDown={(e) => e.stopPropagation()}
                title="Medium (240px)"
                type="button"
              >
                M
              </button>
              <button
                className="flex size-4 items-center justify-center rounded-full text-[9px] font-bold text-neutral-600 hover:bg-neutral-200"
                onClick={handleSizeLarge}
                onPointerDown={(e) => e.stopPropagation()}
                title="Large (360px)"
                type="button"
              >
                L
              </button>
            </div>
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

      {/* Resize handle */}
      <div
        className="absolute bottom-0 right-0 z-10 flex size-5 cursor-nwse-resize items-center justify-center rounded-tl-lg bg-white/80 shadow-[inset_1px_1px_0_rgba(0,0,0,0.1)] hover:bg-white"
        onMouseDown={handleResizeMouseDown}
      >
        <svg width="10" height="10" viewBox="0 0 10 10" className="text-neutral-400">
          <path d="M9 1L1 9M9 5L5 9M9 9L9 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </div>
    </div>
  );
}
