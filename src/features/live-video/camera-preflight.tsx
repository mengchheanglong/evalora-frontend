"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Icon } from "@/components/icons";

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
    <main className="flex min-h-screen items-center justify-center bg-[#f4f8f9] px-5 py-10 text-neutral-950">
      <section className="w-full max-w-xl border border-neutral-200 bg-white p-6 shadow-[0_20px_55px_rgba(15,23,42,0.10)] sm:p-8">
        <span className="flex size-11 items-center justify-center rounded-full bg-sky-100 text-sky-700"><Icon name="eye" size={19} /></span>
        <p className="mt-5 text-xs font-bold uppercase tracking-wide text-[#087aa4]">Camera check</p>
        <h1 className="mt-2 text-2xl font-black">Turn on your camera</h1>
        <p className="mt-2 text-sm leading-6 text-neutral-600">Your live camera is shown only to the authorized interviewer during this assessment. It is not recorded by this feature.</p>

        <div className="mt-6 aspect-video overflow-hidden bg-neutral-950">
          <video autoPlay className="size-full object-cover" muted playsInline ref={videoRef} />
          {state !== "ready" ? <div className="-mt-[56.25%] flex aspect-video items-center justify-center bg-neutral-950/85 px-5 text-center text-sm text-white">{state === "requesting" ? "Requesting camera access…" : "Your camera preview will appear here."}</div> : null}
        </div>

        {message ? <p className="mt-4 rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">{message}</p> : null}

        <div className="mt-6 flex flex-wrap justify-between gap-3">
          <button className="button-secondary" onClick={cancel} type="button">Back</button>
          <div className="flex gap-3">
            <button className="button-secondary" disabled={state === "requesting"} onClick={() => void requestCamera()} type="button">{state === "ready" ? "Try another camera" : "Enable camera"}</button>
            <button className="button-primary" disabled={state !== "ready"} onClick={continueAssessment} type="button">Continue</button>
          </div>
        </div>
      </section>
    </main>
  );
}
