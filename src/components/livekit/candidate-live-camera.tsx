"use client";

import { useEffect, useRef, useState } from "react";
import type { RefObject } from "react";
import type { Socket } from "socket.io-client";
import { INTERVIEW_EVENTS, type ConnectionState } from "@/lib/realtime";

type CandidateLiveCameraProps = {
  sessionId: string;
  socket: RefObject<Socket | null>;
  connection: ConnectionState;
  /** When true, renders just the video (no header/card wrapper). */
  compact?: boolean;
  /** External video ref to attach tracks to instead of the internal one. */
  externalVideoRef?: RefObject<HTMLVideoElement | null>;
};

type CameraStatus =
  | "waiting"
  | "connecting"
  | "connected"
  | "error"
  | "offline";

/** ICE servers for WebRTC. Google public STUN works for local / same-network. */
const ICE_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];

/**
 * Interviewer-side camera panel.
 *
 * Listens for a WebRTC offer from the candidate through the existing
 * Socket.IO interview gateway, establishes a peer connection, and
 * displays the candidate's live video.
 */
export function CandidateLiveCamera({
  sessionId,
  socket: socketRef,
  connection,
  compact,
  externalVideoRef,
}: CandidateLiveCameraProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  /** Use external ref if provided, otherwise internal. */
  const targetVideoRef = externalVideoRef ?? videoRef;
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const [status, setStatus] = useState<CameraStatus>("waiting");
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    let pc: RTCPeerConnection | null = null;

    function cleanup() {
      if (pc) {
        pc.close();
        pc = null;
      }
      pcRef.current = null;            if (targetVideoRef.current) {
              targetVideoRef.current.srcObject = null;
            }
    }

    function handleOffer(payload: {
      sessionId?: string;
      fromUserId?: string;
      offer?: RTCSessionDescriptionInit;
    }) {
      if (cancelled) return;
      if (payload.sessionId !== sessionId) return;
      if (!payload.offer) return;

      console.log("[CandidateLiveCamera] Received offer from", payload.fromUserId);

      // A working connection must not be torn down by a stale or duplicate
      // offer — that is what makes the video flip back to "Connecting…".
      if (pcRef.current) {
        const existingState = pcRef.current.connectionState;
        if (existingState === "connected") {
          return;
        }
      }

      // Close any existing connection
      cleanup();

      pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
      pcRef.current = pc;

      setStatus("connecting");

      pc.onicecandidate = (event) => {
        if (event.candidate && !cancelled) {
          const socket = socketRef.current;
          if (socket?.connected) {
            socket.emit(INTERVIEW_EVENTS.cameraIceCandidate, {
              sessionId,
              targetUserId: payload.fromUserId,
              candidate: event.candidate.toJSON(),
            });
          }
        }
      };

      pc.ontrack = (event) => {
        if (cancelled) return;
        console.log("[CandidateLiveCamera] Got remote track", event.track.kind);

        if (targetVideoRef.current && event.streams?.[0]) {
          targetVideoRef.current.srcObject = event.streams[0];
          // autoplay attribute covers most cases; play() explicitly so the
          // widget never sits on "Connecting…" waiting for the event loop.
          void targetVideoRef.current.play().catch(() => undefined);
        }

        setStatus("connected");
      };

      pc.onconnectionstatechange = () => {
        if (cancelled) return;
        const state = pc?.connectionState;
        console.log("[CandidateLiveCamera] Connection state:", state);

        if (state === "failed" || state === "disconnected") {
          setStatus("error");
          setError("Connection lost. The candidate may have disconnected.");
        } else if (state === "closed") {
          setStatus("waiting");
        }
      };

      // Handle the offer
      pc.setRemoteDescription(new RTCSessionDescription(payload.offer))
        .then(() => pc!.createAnswer())
        .then((answer) => pc!.setLocalDescription(answer))
        .then(() => {
          if (cancelled || !pc?.localDescription) return;
          const socket = socketRef.current;
          if (socket?.connected) {
            socket.emit(INTERVIEW_EVENTS.cameraAnswer, {
              sessionId,
              targetUserId: payload.fromUserId,
              answer: pc.localDescription.toJSON(),
            });
            console.log("[CandidateLiveCamera] Sent answer to", payload.fromUserId);
          }
        })
        .catch((err) => {
          if (!cancelled) {
            console.error("[CandidateLiveCamera] Error handling offer:", err);
            setStatus("error");
            setError(err instanceof Error ? err.message : "Failed to establish connection.");
          }
        });
    }

    function handleIceCandidate(payload: {
      sessionId?: string;
      fromUserId?: string;
      candidate?: RTCIceCandidateInit;
    }) {
      if (cancelled) return;
      if (payload.sessionId !== sessionId) return;
      if (!payload.candidate || !pc) return;

      pc.addIceCandidate(new RTCIceCandidate(payload.candidate)).catch((err) => {
        console.warn("[CandidateLiveCamera] ICE candidate error:", err);
      });
    }

    function handleCameraState(payload: {
      sessionId?: string;
      userId?: string;
      state?: "enabled" | "disabled";
    }) {
      if (cancelled) return;
      if (payload.sessionId !== sessionId) return;

      if (payload.state === "disabled") {
        // Candidate turned off camera
        if (targetVideoRef.current) {
          targetVideoRef.current.srcObject = null;
        }
        setStatus("waiting");
        setError("");
        cleanup();
      }
    }

    const socket = socketRef.current;
    if (!socket) {
      // Socket not created yet — wait for connection state change to re-run.
      if (connection === "live" || connection === "reconnecting") {
        // Socket should exist by now but ref may lag a tick — bail and let
        // the next re-render (triggered by connection change) pick it up.
      }
      return;
    }

    // Register listeners
    socket.on(INTERVIEW_EVENTS.cameraOffer, handleOffer);
    socket.on(INTERVIEW_EVENTS.cameraIceCandidate, handleIceCandidate);
    socket.on(INTERVIEW_EVENTS.cameraState, handleCameraState);

    // If the socket is already connected, we're ready to receive offers
    if (socket.connected) {
      setStatus("waiting");
    } else {
      // Wait for the socket to connect
      const onConnect = () => { if (!cancelled) setStatus("waiting"); };
      const onDisconnect = () => { if (!cancelled) setStatus("offline"); };
      socket.on("connect", onConnect);
      socket.on("disconnect", onDisconnect);
      return () => {
        cancelled = true;
        socket.off(INTERVIEW_EVENTS.cameraOffer, handleOffer);
        socket.off(INTERVIEW_EVENTS.cameraIceCandidate, handleIceCandidate);
        socket.off(INTERVIEW_EVENTS.cameraState, handleCameraState);
        socket.off("connect", onConnect);
        socket.off("disconnect", onDisconnect);
        cleanup();
      };
    }

    return () => {
      cancelled = true;
      socket.off(INTERVIEW_EVENTS.cameraOffer, handleOffer);
      socket.off(INTERVIEW_EVENTS.cameraIceCandidate, handleIceCandidate);
      socket.off(INTERVIEW_EVENTS.cameraState, handleCameraState);
      cleanup();
    };
  }, [sessionId, socketRef, connection]);

  if (compact) {
    // The live room renders the visible draggable video element. Keep this
    // component mounted for its signaling effect, but do not attach the same
    // ref to a second hidden <video> element.
    if (externalVideoRef) return null;

    return (
      <div className="relative size-full bg-[#0b0f17]">
        <video
          ref={targetVideoRef}
          autoPlay
          playsInline
          muted
          className="size-full object-cover"
        />

        {status !== "connected" ? (
          <div className="absolute inset-0 flex items-center justify-center px-6 text-center">
            <div>
              <div className="mx-auto mb-3 flex size-10 items-center justify-center rounded-full bg-white/10">
                <span
                  className={`size-3 rounded-full ${
                    status === "error"
                      ? "bg-red-400"
                      : "bg-amber-400"
                  }`}
                />
              </div>

              <p className="text-sm font-semibold text-white">
                {status === "waiting"
                  ? "Waiting for candidate camera..."
                  : status === "connecting"
                    ? "Connecting to candidate..."
                    : status === "offline"
                      ? "Live camera disconnected"
                      : "Unable to connect to camera"}
              </p>

              {error ? (
                <p className="mt-2 max-w-md text-xs leading-5 text-white/60">
                  {error}
                </p>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <section className="overflow-hidden rounded-xl border border-[var(--theme-border)] bg-black shadow-[var(--shadow-card)]">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 bg-[#111827] px-4 py-3">
        <div>
          <p className="text-sm font-bold text-white">
            Candidate Camera
          </p>

          <p className="mt-0.5 text-xs text-white/60">
            Live interview video
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-semibold">
          <span
            className={`size-2 rounded-full ${
              status === "connected"
                ? "bg-emerald-400"
                : status === "error"
                  ? "bg-red-400"
                  : "bg-amber-400"
            }`}
          />

          <span className="text-white/80">
            {status === "connected"
              ? "Live"
              : status === "waiting"
                ? "Waiting for candidate"
                : status === "connecting"
                  ? "Connecting..."
                  : status === "offline"
                    ? "Offline"
                    : "Connection error"}
          </span>
        </div>
      </div>

      {/* Video */}
      <div className="relative aspect-video w-full bg-[#0b0f17]">
        <video
          ref={targetVideoRef}
          autoPlay
          playsInline
          muted
          className="h-full w-full object-cover"
        />

        {status !== "connected" ? (
          <div className="absolute inset-0 flex items-center justify-center px-6 text-center">
            <div>
              <div className="mx-auto mb-3 flex size-10 items-center justify-center rounded-full bg-white/10">
                <span
                  className={`size-3 rounded-full ${
                    status === "error"
                      ? "bg-red-400"
                      : "bg-amber-400"
                  }`}
                />
              </div>

              <p className="text-sm font-semibold text-white">
                {status === "waiting"
                  ? "Waiting for candidate camera..."
                  : status === "connecting"
                    ? "Connecting to candidate..."
                    : status === "offline"
                      ? "Live camera disconnected"
                      : "Unable to connect to camera"}
              </p>

              {error ? (
                <p className="mt-2 max-w-md text-xs leading-5 text-white/60">
                  {error}
                </p>
              ) : null}
            </div>
          </div>
        ) : null}

        <div className="pointer-events-none absolute bottom-3 left-3 rounded-full bg-black/60 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur">
          {status === "connected"
            ? "● Candidate live"
            : "Candidate camera"}
        </div>
      </div>
    </section>
  );
}
