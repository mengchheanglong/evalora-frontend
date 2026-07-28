"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Socket } from "socket.io-client";
import {
  createInterviewSocket,
  fetchRealtimeTicket,
  INTERVIEW_EVENTS,
  type ConnectionState,
  type InterviewParticipant,
  type SessionSnapshot,
} from "@/lib/realtime";

type Options = {
  /** Workspace side: the session being watched. */
  sessionId?: string;
  /** Candidate side: their private access code (also the credential). */
  accessCode?: string;
  enabled?: boolean;
  displayName?: string;
  onEvent?: (event: string, payload: unknown) => void;
};

/**
 * Live session channel. Owns connection lifecycle, re-joins automatically after
 * a drop, and surfaces the snapshot so callers can resume without losing state.
 * REST stays authoritative — this only accelerates delivery.
 */
export function useInterviewSocket({ sessionId, accessCode, enabled = true, displayName, onEvent }: Options) {
  const [connection, setConnection] = useState<ConnectionState>("connecting");
  const [participants, setParticipants] = useState<InterviewParticipant[]>([]);
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const socketRef = useRef<Socket | null>(null);
  // Kept in a ref so re-renders never tear down and rebuild the connection.
  const handlerRef = useRef(onEvent);
  handlerRef.current = onEvent;

  const join = useCallback(async (socket: Socket) => {
    const payload = accessCode ? { accessCode } : { sessionId };
    try {
      const result = (await socket.emitWithAck(INTERVIEW_EVENTS.joinSession, payload)) as {
        ok: boolean;
        snapshot?: SessionSnapshot;
      };
      if (result?.ok && result.snapshot) {
        setParticipants(result.snapshot.participants ?? []);
        // Resume: hand the snapshot to the caller so it can reconcile whatever
        // it missed while disconnected.
        handlerRef.current?.("snapshot", result.snapshot);
      }
    } catch {
      // A failed join is retried by the next reconnect cycle.
    }
  }, [accessCode, sessionId]);

  useEffect(() => {
    if (!enabled || (!sessionId && !accessCode)) return;
    let cancelled = false;
    let socket: Socket | null = null;

    (async () => {
      // Candidates authenticate with the access code; staff need a ticket
      // because their JWT is in an httpOnly cookie.
      const ticket = accessCode ? undefined : await fetchRealtimeTicket();
      if (cancelled || (!accessCode && !ticket)) {
        if (!cancelled) setConnection("offline");
        return;
      }

      socket = createInterviewSocket({ ticket: ticket ?? undefined, accessCode, name: displayName });
      socketRef.current = socket;

      socket.on("connect", () => {
        setConnection("live");
        void join(socket!);
      });
      socket.io.on("reconnect_attempt", () => setConnection("reconnecting"));
      socket.on("disconnect", () => setConnection("reconnecting"));
      socket.on("connect_error", () => setConnection("reconnecting"));
      socket.on(INTERVIEW_EVENTS.error, () => setConnection("offline"));
      socket.on(INTERVIEW_EVENTS.presenceUpdated, (payload: { participants?: InterviewParticipant[] }) => {
        setParticipants(payload?.participants ?? []);
      });

      for (const event of [INTERVIEW_EVENTS.questionSent, INTERVIEW_EVENTS.questionAnswered, INTERVIEW_EVENTS.questionCancelled, INTERVIEW_EVENTS.sessionUpdated]) {
        socket.on(event, (payload: unknown) => handlerRef.current?.(event, payload));
      }
    })();

    return () => {
      cancelled = true;
      socket?.removeAllListeners();
      socket?.disconnect();
      socketRef.current = null;
    };
  }, [enabled, sessionId, accessCode, displayName, join]);

  // Periodic latency probe — also proves the channel is genuinely alive.
  useEffect(() => {
    if (!enabled) return;
    const timer = window.setInterval(async () => {
      const socket = socketRef.current;
      if (!socket?.connected) return;
      const sentAt = Date.now();
      try {
        await socket.emitWithAck(INTERVIEW_EVENTS.ping, { sentAt });
        setLatencyMs(Date.now() - sentAt);
      } catch {
        setLatencyMs(null);
      }
    }, 10_000);
    return () => window.clearInterval(timer);
  }, [enabled]);

  return { connection, participants, latencyMs, socket: socketRef };
}
