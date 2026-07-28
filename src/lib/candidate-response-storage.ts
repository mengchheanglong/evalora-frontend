import type { JsonValue } from "@/lib/types";

export type StoredFollowUp = { question: string; answer: string };

const AI_FOLLOW_UP_MARKER = "\n\nAI follow-up: ";
const FOLLOW_UP_ANSWER_MARKER = "\nFollow-up response: ";

/**
 * Reads the exact legacy shape the old app wrote. Any repeated or incomplete
 * marker sequence remains one untouched candidate answer, matching the backend's
 * conservative parser and preventing the next autosave from truncating it.
 */
export function parseSavedResponse(value: string): { answer: string; followUp?: StoredFollowUp } {
  const start = value.indexOf(AI_FOLLOW_UP_MARKER);
  if (start === -1 || value.includes(AI_FOLLOW_UP_MARKER, start + 1)) return { answer: value };

  const remainder = value.slice(start + AI_FOLLOW_UP_MARKER.length);
  const split = remainder.indexOf(FOLLOW_UP_ANSWER_MARKER);
  if (split === -1) return { answer: value };

  const question = remainder.slice(0, split).trim();
  if (!question) return { answer: value };

  return {
    answer: value.slice(0, start).trim(),
    followUp: {
      question,
      answer: remainder.slice(split + FOLLOW_UP_ANSWER_MARKER.length).trim(),
    },
  };
}

export function readStructuredFollowUp(value: JsonValue | undefined): Partial<StoredFollowUp> | undefined {
  if (!isRecord(value) || !isRecord(value.aiFollowUp)) return undefined;
  const question = text(value.aiFollowUp.question);
  const answer = text(value.aiFollowUp.answer);
  return question || answer ? { question, answer } : undefined;
}

export function withStructuredFollowUp(
  value: JsonValue | undefined,
  followUp?: StoredFollowUp,
): JsonValue | undefined {
  const question = followUp?.question.trim();
  const answer = followUp?.answer.trim();
  if (!question && !answer) return value;
  const existing = isRecord(value) ? value : {};
  const storedFollowUp: Record<string, JsonValue> = {};
  if (question) storedFollowUp.question = question;
  if (answer) storedFollowUp.answer = answer;
  return { ...existing, aiFollowUp: storedFollowUp };
}

function text(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function isRecord(value: unknown): value is Record<string, JsonValue | undefined> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
