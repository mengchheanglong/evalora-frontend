import { io, type Socket } from "socket.io-client";
import type { IntegrityEvent, InterviewerFollowUp, SessionStatus } from "@/lib/types";

/** Must match the backend contract in modules/realtime/realtime.types.ts. */
export const INTERVIEW_EVENTS = {
  joinSession: "session.join",
  leaveSession: "session.leave",
  ping: "session.ping",

  // WebRTC camera signaling
  cameraOffer: "camera.offer",
  cameraAnswer: "camera.answer",
  cameraIceCandidate: "camera.ice-candidate",
  cameraState: "camera.state",

  presenceUpdated: "presence.updated",
  sessionUpdated: "session.updated",
  responseSaved: "response.saved",
  questionSent: "interviewer-question.sent",
  questionAnswered: "interviewer-question.answered",
  questionCancelled: "interviewer-question.cancelled",
  integrityUpdated: "integrity.updated",
  error: "session.error",
} as const;

/**
 * Server-authored integrity decision broadcast to the authorized session room.
 * Mirrors the backend contract in modules/realtime/realtime.types.ts.
 */
export interface IntegrityUpdatedEvent {
  sessionId: string;
  warningCount: number;
  warningLimit: number;
  status: SessionStatus;
  reason: string;
  event?: IntegrityEvent;
}

export type ParticipantRole = "candidate" | "interviewer";
export type ConnectionState = "connecting" | "live" | "reconnecting" | "offline";

export interface InterviewParticipant {
  userId: string;
  name: string;
  role: ParticipantRole;
}

export interface SessionSnapshot {
  sessionId: string;
  status: string;
  startedAt?: string;
  completedAt?: string;
  participants: InterviewParticipant[];
  followUps: Array<Pick<InterviewerFollowUp, "id" | "questionText" | "required" | "sequence" | "status"> & {
    answerText?: string;
    askedBy: { name: string };
  }>;
  serverTime: number;
}

const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]", "::1"]);

/**
 * The gateway lives on the backend origin, not behind the Next proxy — a
 * WebSocket upgrade cannot be proxied by a route handler.
 *
 * The configured origin is a loopback address in every local setup, which is
 * correct only for a browser on the same machine. The dev server binds 0.0.0.0
 * and assessments are handed out as links, so a candidate on a phone would dial
 * their OWN device and silently fall back to the 30s poll. When the page is being
 * served from somewhere other than loopback, the backend is reachable at that
 * same host — so borrow it and keep the configured port.
 */
export function realtimeUrl(): string {
  const configured = (process.env.NEXT_PUBLIC_BACKEND_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api")
    .replace(/\/api\/?$/, "")
    .replace(/\/$/, "");

  if (typeof window === "undefined") return `${configured}/interview`;

  try {
    const target = new URL(configured);
    const pageHost = window.location.hostname;
    if (LOOPBACK_HOSTS.has(target.hostname) && !LOOPBACK_HOSTS.has(pageHost)) {
      target.hostname = pageHost;
      // A page served over https cannot open an ws:// socket; follow the page.
      if (window.location.protocol === "https:") target.protocol = "https:";
      return `${target.origin}/interview`;
    }
  } catch {
    // A malformed value is left exactly as configured rather than guessed at.
  }
  return `${configured}/interview`;
}

/** Exchanges the httpOnly session cookie for a short-lived socket ticket. */
export async function fetchRealtimeTicket(): Promise<string | null> {
  try {
    const response = await fetch("/api/backend/auth/realtime-ticket", { method: "POST" });
    if (!response.ok) return null;
    const data = (await response.json()) as { ticket?: string };
    return data.ticket ?? null;
  } catch {
    return null;
  }
}

export function createInterviewSocket(auth: { ticket?: string; accessCode?: string; name?: string }): Socket {
  return io(realtimeUrl(), {
    auth,
    transports: ["websocket", "polling"],
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 500,
    reconnectionDelayMax: 5_000,
    timeout: 8_000,
  });
}
