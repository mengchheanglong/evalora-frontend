"use client";

import { useCallback, useRef, useState } from "react";

type DraggableCameraProps = {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  label?: string;
  playing?: boolean;
};

/**
 * Small floating camera widget that can be dragged anywhere on screen.
 * The video element is provided by the parent so it can attach a MediaStream.
 */
export function DraggableCamera({
  videoRef,
  label = "Camera",
  playing = false,
}: DraggableCameraProps) {
  const [pos, setPos] = useState({
    x: typeof window !== "undefined" ? window.innerWidth - 240 : 100,
    y: typeof window !== "undefined" ? window.innerHeight - 220 : 100,
  });
  const [dragging, setDragging] = useState(false);
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
            playsInline
            className="block h-full w-full object-cover"
          />

          {!playing ? (
            <div className="absolute inset-0 flex items-center justify-center bg-neutral-900">
              <p className="text-[10px] font-semibold text-white">Connecting…</p>
            </div>
          ) : null}

          {/* Live badge */}
          <div className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-black/70 px-1.5 py-0.5">
            <span className={`size-1.5 rounded-full ${playing ? "bg-emerald-400" : "bg-amber-400"}`} />
            <span className="text-[9px] font-bold text-white">{playing ? "Live" : "Camera"}</span>
          </div>
        </div>

        {/* Label */}
        <div className="bg-white px-2.5 py-1.5">
          <p className="text-[11px] font-bold text-neutral-800">{label}</p>
          <p className="text-[9px] text-neutral-400">{playing ? "Active" : "Connecting…"}</p>
        </div>
      </div>
    </div>
  );
}
