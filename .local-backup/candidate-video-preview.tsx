"use client";

import { useEffect, useRef, useState } from "react";

import { Icon } from "../../components/icons";

type CandidateVideoPreviewProps = {
  stream: MediaStream | null;
  cameraEnabled?: boolean;
  variant?: "default" | "mini";
};

export function CandidateVideoPreview({
  stream,
  cameraEnabled = true,
  variant = "default",
}: CandidateVideoPreviewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [minimized, setMinimized] = useState(false);

  useEffect(() => {
    const video = videoRef.current;

    if (!video) {
      return;
    }

    if (!stream || !cameraEnabled) {
      video.srcObject = null;
      return;
    }

    video.srcObject = stream;

    void video.play().catch(() => {
      // Some browsers wait for user interaction before playing media.
    });

    return () => {
      video.srcObject = null;
    };
  }, [stream, cameraEnabled]);

  /*
   * ---------------------------------------------------------
   * MINI CAMERA
   * ---------------------------------------------------------
   *
   * Used during the actual interview.
   */
  if (variant === "mini") {
    if (!stream || !cameraEnabled) {
      return null;
    }

    if (minimized) {
      return (
        <div className="fixed bottom-6 right-6 z-50">
          <button
            type="button"
            onClick={() => setMinimized(false)}
            aria-label="Show camera preview"
            className="flex h-12 w-12 items-center justify-center rounded-full border border-white/20 bg-slate-900 text-white shadow-[0_8px_30px_rgba(15,23,42,0.3)] transition hover:bg-slate-800"
          >
            <span className="relative flex h-3 w-3">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-500" />
            </span>
          </button>
        </div>
      );
    }

    return (
      <div className="fixed bottom-6 right-6 z-50 w-[220px] overflow-hidden rounded-2xl border border-white/20 bg-slate-950 shadow-[0_12px_40px_rgba(15,23,42,0.3)]">
        {/* Camera top bar */}
        <div className="absolute left-0 right-0 top-0 z-10 flex items-center justify-between bg-gradient-to-b from-black/70 to-transparent px-3 pb-6 pt-3">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>

            <span className="text-[11px] font-semibold text-white">
              Camera on
            </span>
          </div>

          <button
            type="button"
            onClick={() => setMinimized(true)}
            aria-label="Minimize camera preview"
            className="flex h-6 w-6 items-center justify-center rounded-md text-white/80 transition hover:bg-white/15 hover:text-white"
          >
            <span className="text-base leading-none">−</span>
          </button>
        </div>

        {/* Video */}
        <div className="aspect-[16/10] w-full bg-slate-900">
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className="h-full w-full object-cover"
          />
        </div>
      </div>
    );
  }

  /*
   * ---------------------------------------------------------
   * DEFAULT CAMERA PREVIEW
   * ---------------------------------------------------------
   *
   * Used on the camera setup page.
   */

  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-slate-950">
      {stream && cameraEnabled ? (
        <>
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className="h-full w-full object-cover"
          />

          {/* Camera status */}
          <div className="absolute left-4 top-4">
            <div className="flex items-center gap-2 rounded-full bg-black/60 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-md">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>

              Camera ready
            </div>
          </div>
        </>
      ) : (
        <div className="flex h-full flex-col items-center justify-center px-6 text-center text-white">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/10">
            <Icon name="video" size={29} className="text-white/85" />
          </div>

          <h2 className="mt-5 text-lg font-semibold">
            Camera preview unavailable
          </h2>

          <p className="mt-2 max-w-sm text-sm leading-6 text-white/60">
            Allow camera access to see your video before starting the
            interview.
          </p>
        </div>
      )}
    </div>
  );
}
