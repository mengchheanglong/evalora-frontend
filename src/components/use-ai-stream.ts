"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const GENERIC_FAILURE = "The follow-up question could not be prepared. You can continue without it.";

class StreamMessage extends Error {}

export type AiStreamInput = {
  questionId?: string;
  moduleId?: string;
  question: string;
  answer: string;
  rubric?: string[];
};

export type AiFollowUpDecision = {
  shouldAsk: boolean;
  question: string;
};

type StreamFrame = {
  delta?: string;
  done?: boolean;
  shouldAsk?: boolean;
  question?: string;
  replace?: string;
  error?: string;
};

const FOLLOW_UP_BASE = "/api/backend/ai/access";

function followUpStreamUrl(accessCode: string): string {
  return `${FOLLOW_UP_BASE}/${encodeURIComponent(accessCode)}/follow-up/stream`;
}

function followUpUrl(accessCode: string): string {
  return `${FOLLOW_UP_BASE}/${encodeURIComponent(accessCode)}/follow-up`;
}

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

  /** Resolves with the server's decision, or null when it could not be prepared. */
  const start = useCallback(async (input: AiStreamInput): Promise<AiFollowUpDecision | null> => {
    controller.current?.abort();
    const abort = new AbortController();
    controller.current = abort;
    setText("");
    setError("");
    setStreaming(true);

    let accumulated = "";
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
      if (!response.ok || !response.body) {
        refused = response.status >= 400 && response.status < 500;
        throw new StreamMessage(failureMessage(response.status));
      }

      if (!isEventStream(response.headers.get("content-type"))) {
        const decision = await readDecision(response);
        if (!decision) throw new StreamMessage(GENERIC_FAILURE);
        publish(decision.question);
        if (mounted.current && !abort.signal.aborted) setStreaming(false);
        return decision;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let complete = "";
      let decisionReceived = false;
      let shouldAsk = false;

      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let boundary = buffer.indexOf("\n\n");
        while (boundary >= 0) {
          const frame = parseFrame(buffer.slice(0, boundary));
          buffer = buffer.slice(boundary + 2);
          boundary = buffer.indexOf("\n\n");
          if (!frame) continue;
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
            shouldAsk = frame.shouldAsk !== false;
            complete = shouldAsk ? frame.question?.trim() || accumulated.trim() : "";
            decisionReceived = true;
            publish(complete);
          }
        }
        if (decisionReceived) {
          await reader.cancel().catch(() => undefined);
          break;
        }
      }

      if (!decisionReceived || (shouldAsk && !complete)) throw new StreamMessage(GENERIC_FAILURE);
      if (mounted.current && !abort.signal.aborted) setStreaming(false);
      return { shouldAsk, question: complete };
    } catch (streamError) {
      if (abort.signal.aborted || !mounted.current) return null;
      const recovered = refused ? null : await requestFollowUp(accessCode, input, abort.signal);
      if (abort.signal.aborted || !mounted.current) return null;
      if (recovered) {
        publish(recovered.question);
        setStreaming(false);
        return recovered;
      }
      setError(calmMessage(streamError));
      setStreaming(false);
      return null;
    } finally {
      if (controller.current === abort) controller.current = null;
    }
  }, [accessCode]);

  return { text, streaming, error, start, reset };
}

async function requestFollowUp(
  accessCode: string,
  input: AiStreamInput,
  signal: AbortSignal,
): Promise<AiFollowUpDecision | null> {
  try {
    const response = await fetch(followUpUrl(accessCode), {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(input),
      cache: "no-store",
      credentials: "same-origin",
      signal,
    });
    return response.ok ? await readDecision(response) : null;
  } catch {
    return null;
  }
}

async function readDecision(response: Response): Promise<AiFollowUpDecision | null> {
  try {
    const payload = (await response.json()) as { shouldAsk?: unknown; question?: unknown };
    const question = typeof payload.question === "string" ? payload.question.trim() : "";
    const shouldAsk = payload.shouldAsk === undefined ? Boolean(question) : payload.shouldAsk === true;
    if (shouldAsk && !question) return null;
    return { shouldAsk, question: shouldAsk ? question : "" };
  } catch {
    return null;
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
  const message = error instanceof StreamMessage ? error.message.trim() : "";
  return message && message.length <= 200 ? message : GENERIC_FAILURE;
}
