"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type CandidateMediaState =
  | "idle"
  | "requesting"
  | "ready"
  | "error";

type CandidateMedia = {
  stream: MediaStream | null;
  state: CandidateMediaState;
  error: string | null;
  requestMedia: () => Promise<MediaStream | null>;
  stopMedia: () => void;
  handoffMedia: () => MediaStream | null;
};

export function useCandidateMedia(): CandidateMedia {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [state, setState] = useState<CandidateMediaState>("idle");
  const [error, setError] = useState<string | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const handedOffRef = useRef(false);

  const stopMedia = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => {
      track.stop();
    });

    streamRef.current = null;
    handedOffRef.current = false;
    setStream(null);

    setState("idle");
  }, []);

  const requestMedia = useCallback(async () => {
    setState("requesting");
    setError(null);

    if (!navigator.mediaDevices?.getUserMedia) {
      const message =
        "Your browser does not support camera access. Please use a modern browser such as Chrome, Safari, or Edge.";

      setError(message);
      setState("error");

      return null;
    }

    try {
      // Stop an old preflight stream before requesting another one.
      streamRef.current?.getTracks().forEach((track) => {
        track.stop();
      });

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: {
            ideal: 1280,
          },
          height: {
            ideal: 720,
          },
          facingMode: "user",
        },
        audio: true,
      });

      streamRef.current = mediaStream;
      handedOffRef.current = false;
      setStream(mediaStream);
      setState("ready");
      setError(null);

      return mediaStream;
    } catch (err) {
      let message = "Unable to access your camera.";

      if (err instanceof DOMException) {
        if (err.name === "NotAllowedError") {
          message =
            "Camera permission was denied. Please allow camera access in your browser settings and try again.";
        } else if (err.name === "NotFoundError") {
          message =
            "No camera was found. Please connect a camera and try again.";
        } else if (err.name === "NotReadableError") {
          message =
            "Your camera is currently being used by another application. Close other apps using the camera and try again.";
        } else if (err.name === "SecurityError") {
          message =
            "Camera access is blocked by your browser security settings.";
        }
      }

      setError(message);
      setState("error");

      return null;
    }
  }, []);

  const handoffMedia = useCallback(() => {
    const currentStream = streamRef.current;

    if (currentStream) {
      // The assessment page now owns this exact stream and its tracks.
      handedOffRef.current = true;
    }

    return currentStream;
  }, []);

  useEffect(() => {
    return () => {
      if (!handedOffRef.current) {
        streamRef.current?.getTracks().forEach((track) => {
          track.stop();
        });
      }

      streamRef.current = null;
    };
  }, []);

  return {
    stream,
    state,
    error,
    requestMedia,
    stopMedia,
    handoffMedia,
  };
}
