"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Icon } from "@/components/icons";
import { EvaloraLogo } from "@/components/logo";

type Props = {
  onCancel: () => void;
  onContinue: (stream: MediaStream) => void;
};

type State = "idle" | "requesting" | "ready" | "error";

/**
 * Candidate-side consent and device check. The parent takes ownership of the
 * stream only after Continue, so cancelling or leaving this screen always
 * stops the camera tracks.
 */
export function CameraPreflight({ onCancel, onContinue }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [state, setState] = useState<State>("idle");
  const [message, setMessage] = useState("");

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  useEffect(() => stopStream, [stopStream]);

  const requestCamera = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setState("error");
      setMessage("Camera access requires a modern browser and a secure HTTPS connection.");
      return;
    }

    stopStream();
    setState("requesting");
    setMessage("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => undefined);
      }
      setState("ready");
    } catch (error) {
      setState("error");
      const name = error instanceof DOMException ? error.name : "";
      setMessage(
        name === "NotAllowedError"
          ? "Camera permission was denied. Allow camera access in your browser, then try again."
          : "We could not access your camera. Check that it is connected and not in use by another app.",
      );
    }
  }, [stopStream]);

  function continueAssessment() {
    const stream = streamRef.current;
    if (!stream) return;
    streamRef.current = null;
    onContinue(stream);
  }

  function cancel() {
    stopStream();
    onCancel();
  }

  return (
    <main className="min-h-screen bg-[#f4f7f9] px-4 py-8 text-neutral-950 sm:px-6">
      <section className="mx-auto flex min-h-[calc(100vh-64px)] max-w-[760px] items-center">
        <div className="w-full overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-[0_20px_55px_rgba(15,23,42,0.10)]">
          <header className="flex items-center justify-between border-b border-neutral-200 px-5 py-4 sm:px-8">
            <EvaloraLogo compact />

            <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-50 px-3 py-1.5 text-xs font-semibold text-sky-700">
              <Icon name="lock" size={12} />
              Private interview
            </span>
          </header>

          <div className="px-5 py-8 sm:px-8 sm:py-10">
            {/* Heading */}
            <div className="flex items-start gap-4">
              <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-sky-100 text-sky-700">
                <Icon name="video" size={22} />
              </span>

              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-sky-700">Camera check</p>
                <h1 className="mt-1 text-2xl font-black tracking-tight">Turn on your camera</h1>
              </div>
            </div>

            <p className="mt-4 max-w-[560px] text-sm leading-6 text-neutral-600">
              Your live camera is shown only to the authorized interviewer during this assessment. It is not recorded by this feature.
            </p>

            {/* Video preview */}
            <div className="relative mt-6 overflow-hidden rounded-xl border border-neutral-200 bg-neutral-950">
              <video autoPlay className="aspect-video size-full object-cover" muted playsInline ref={videoRef} />

              {state !== "ready" ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-neutral-950/85 px-5 text-center">
                  <span
                    className={`grid size-12 place-items-center rounded-full ${
                      state === "requesting" ? "bg-white/10" : "bg-white/5"
                    }`}
                  >
                    {state === "requesting" ? (
                      <span className="size-4 animate-spin rounded-full border-2 border-white/25 border-t-white" />
                    ) : (
                      <Icon className="text-white/40" name="video" size={20} />
                    )}
                  </span>
                  <p className="text-sm font-semibold text-white">
                    {state === "requesting"
                      ? "Requesting camera access…"
                      : state === "error"
                        ? "Camera unavailable"
                        : "Your camera preview will appear here."}
                  </p>
                  {state !== "requesting" && state !== "error" ? (
                    <p className="max-w-[340px] text-xs leading-5 text-white/50">
                      Click &ldquo;Enable camera&rdquo; and approve the browser prompt to continue.
                    </p>
                  ) : null}
                </div>
              ) : (
                <>
                  <div className="pointer-events-none absolute bottom-3 left-3 flex items-center gap-1.5 rounded-full bg-black/60 px-3 py-1.5 text-xs font-bold text-white backdrop-blur">
                    <span className="size-1.5 animate-pulse rounded-full bg-emerald-400" />
                    Camera ready
                  </div>
                  <button
                    className="absolute right-3 top-3 grid size-8 place-items-center rounded-full bg-black/60 text-white/80 backdrop-blur transition-colors hover:bg-black/80 hover:text-white"
                    onClick={cancel}
                    title="Delete camera"
                    type="button"
                  >
                    <Icon name="trash" size={14} />
                  </button>
                </>
              )}
            </div>

            {message ? (
              <div className="mt-4 flex items-start gap-2.5 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3">
                <Icon className="mt-0.5 shrink-0 text-rose-500" name="shield" size={15} />
                <p className="text-sm leading-5 text-rose-700">{message}</p>
              </div>
            ) : null}

            {/* Actions */}
            <div className="mt-7 flex flex-wrap items-center justify-between gap-3">
              <button className="button-secondary h-10 px-4" onClick={cancel} type="button">
                <Icon name="chevron" className="rotate-90" size={14} />
                Back
              </button>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  className="button-secondary h-10 px-4"
                  disabled={state === "requesting"}
                  onClick={() => void requestCamera()}
                  type="button"
                >
                  {state === "requesting" ? (
                    <>
                      <span className="size-3 animate-spin rounded-full border-2 border-neutral-300 border-t-neutral-600" />
                      Requesting…
                    </>
                  ) : (
                    <>
                      <Icon name="video" size={14} />
                      {state === "ready" ? "able camera" : "Enable camera"}
                    </>
                  )}
                </button>

                <button
                  className="button-primary h-10 px-5"
                  disabled={state !== "ready"}
                  onClick={continueAssessment}
                  type="button"
                >
                  Continue
                  <Icon className="-rotate-90" name="chevron" size={14} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
