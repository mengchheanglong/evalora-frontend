import { io, type Socket } from "socket.io-client";
import type { InterviewerFollowUp } from "@/lib/types";

/** Must match the backend contract in modules/realtime/realtime.types.ts. */
export const INTERVIEW_EVENTS = {
  joinSession: "session.join",
  leaveSession: "session.leave",
  ping: "session.ping",
  presenceUpdated: "presence.updated",
  sessionUpdated: "session.updated",
  questionSent: "interviewer-question.sent",
  questionAnswered: "interviewer-question.answered",
  questionCancelled: "interviewer-question.cancelled",
  error: "session.error",
} as const;

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

/**
 * The gateway lives on the backend origin, not behind the Next proxy — a
 * WebSocket upgrade cannot be proxied by a route handler.
 */
export function realtimeUrl(): string {
  const base = process.env.NEXT_PUBLIC_BACKEND_URL?.replace(/\/api\/?$/, "") ?? "http://localhost:4000";
  return `${base.replace(/\/$/, "")}/interview`;
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
