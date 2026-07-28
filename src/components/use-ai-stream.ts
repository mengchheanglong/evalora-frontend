"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const GENERIC_FAILURE = "The follow-up question could not be prepared. You can continue without it.";

/** Marks the sentences that were written for a person to read. */
class StreamMessage extends Error {}

export type AiStreamInput = {
  question: string;
  answer: string;
  rubric?: string[];
};

type StreamFrame = {
  delta?: string;
  done?: boolean;
  question?: string;
  /**
   * The server withdrawing what it already sent. It arrives when a truncated
   * question was rewritten, or as "" alongside an error when the question could
   * not be persisted — leaving that half-written text on screen would invite the
   * candidate to answer a question the server has no record of.
   */
  replace?: string;
  error?: string;
};

/**
 * The follow-up goes through the same-origin `/api/backend` proxy, which passes
 * server-sent events straight through. Naming the backend origin instead would
 * point a candidate on a phone at their own device and, on any other host, lose
 * the CORS preflight before the first byte.
 */
const FOLLOW_UP_BASE = "/api/backend/ai/access";

function followUpStreamUrl(accessCode: string): string {
  return `${FOLLOW_UP_BASE}/${encodeURIComponent(accessCode)}/follow-up/stream`;
}

function followUpUrl(accessCode: string): string {
  return `${FOLLOW_UP_BASE}/${encodeURIComponent(accessCode)}/follow-up`;
}

/**
 * Token-by-token AI follow-up. Failures before the first frame arrive as a
 * normal JSON error; after it, as an error frame — either way whatever text
 * already streamed stays on screen so the candidate never watches it vanish.
 */
export function useAiStream(accessCode: string) {
  const [text, setText] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState("");
  const controller = useRef<AbortController | null>(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      controller.current?.abort();
    };
  }, []);

  const reset = useCallback(() => {
    controller.current?.abort();
    controller.current = null;
    setText("");
    setError("");
    setStreaming(false);
  }, []);

  /** Resolves with the authoritative question text, or "" when it could not be prepared. */
  const start = useCallback(async (input: AiStreamInput): Promise<string> => {
    controller.current?.abort();
    const abort = new AbortController();
    controller.current = abort;
    setText("");
    setError("");
    setStreaming(true);

    let accumulated = "";
    // A curated 4xx is a deliberate refusal (dead link, rejected answer, rate
    // limit); asking the plain endpoint again would only repeat it.
    let refused = false;
    const publish = (value: string) => {
      if (mounted.current && !abort.signal.aborted) setText(value);
    };

    try {
      const response = await fetch(followUpStreamUrl(accessCode), {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
        body: JSON.stringify(input),
        cache: "no-store",
        credentials: "same-origin",
        signal: abort.signal,
      });
      // Failures before the first frame come back as an ordinary HTTP error, not SSE.
      if (!response.ok || !response.body) {
        refused = response.status >= 400 && response.status < 500;
        throw new StreamMessage(failureMessage(response.status));
      }

      // The proxy answers from its built-in mock backend when Nest is unreachable,
      // and that reply is plain JSON: take the question instead of waiting for frames.
      if (!isEventStream(response.headers.get("content-type"))) {
        const question = await readQuestion(response);
        if (!question) throw new StreamMessage(GENERIC_FAILURE);
        publish(question);
        if (mounted.current && !abort.signal.aborted) setStreaming(false);
        return question;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let complete = "";

      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        // A chunk is not a frame: hold the trailing partial until its "\n\n" lands.
        buffer += decoder.decode(value, { stream: true });
        let boundary = buffer.indexOf("\n\n");
        while (boundary >= 0) {
          const frame = parseFrame(buffer.slice(0, boundary));
          buffer = buffer.slice(boundary + 2);
          boundary = buffer.indexOf("\n\n");
          if (!frame) continue;
          // Applied before the error check: the withdrawal frame carries both, and
          // the half-written question must come off screen even as we throw.
          if (typeof frame.replace === "string") {
            accumulated = frame.replace;
            publish(accumulated);
          }
          if (frame.error) throw new StreamMessage(frame.error);
          if (frame.delta) {
            accumulated += frame.delta;
            publish(accumulated);
          }
          if (frame.done) {
            // The done frame carries the full text — it wins over the deltas.
            complete = frame.question?.trim() || accumulated.trim();
            publish(complete);
          }
        }
        if (complete) {
          await reader.cancel().catch(() => undefined);
          break;
        }
      }

      if (!complete) throw new StreamMessage(GENERIC_FAILURE);
      if (mounted.current && !abort.signal.aborted) setStreaming(false);
      return complete;
    } catch (streamError) {
      if (abort.signal.aborted || !mounted.current) return "";
      // A candidate who cannot receive the stream must not be stranded on the
      // question, so ask the plain endpoint once before showing the message.
      const recovered = refused ? "" : await requestFollowUp(accessCode, input, abort.signal);
      if (abort.signal.aborted || !mounted.current) return "";
      if (recovered) {
        publish(recovered);
        setStreaming(false);
        return recovered;
      }
      setError(calmMessage(streamError));
      setStreaming(false);
      return "";
    } finally {
      if (controller.current === abort) controller.current = null;
    }
  }, [accessCode]);

  return { text, streaming, error, start, reset };
}

/** The non-streaming twin of the endpoint, used only to rescue a failed stream. */
async function requestFollowUp(accessCode: string, input: AiStreamInput, signal: AbortSignal): Promise<string> {
  try {
    const response = await fetch(followUpUrl(accessCode), {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(input),
      cache: "no-store",
      credentials: "same-origin",
      signal,
    });
    return response.ok ? await readQuestion(response) : "";
  } catch {
    return "";
  }
}

async function readQuestion(response: Response): Promise<string> {
  try {
    const payload = (await response.json()) as { question?: unknown };
    return typeof payload.question === "string" ? payload.question.trim() : "";
  } catch {
    return "";
  }
}

function isEventStream(contentType: string | null): boolean {
  return (contentType ?? "").toLowerCase().includes("text/event-stream");
}

function parseFrame(frame: string): StreamFrame | null {
  const line = frame.trim();
  if (!line.startsWith("data:")) return null;
  try {
    const parsed = JSON.parse(line.slice(5).trim()) as StreamFrame;
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    // Keep-alive comments and half-written frames are skipped, never fatal.
    return null;
  }
}

function failureMessage(status: number): string {
  if (status === 429) return "Too many requests just now. Wait a moment and try again.";
  if (status === 400) return "Your answer could not be sent for a follow-up question.";
  if (status === 403) return "This assessment link is no longer active.";
  return GENERIC_FAILURE;
}

function calmMessage(error: unknown): string {
  // A network or parser message ("Load failed") would tell a candidate nothing,
  // so only deliberately human sentences pass through.
  const message = error instanceof StreamMessage ? error.message.trim() : "";
  return message && message.length <= 200 ? message : GENERIC_FAILURE;
}
