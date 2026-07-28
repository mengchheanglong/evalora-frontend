import assert from "node:assert/strict";
import test from "node:test";
import {
  parseSavedResponse,
  readStructuredFollowUp,
  withStructuredFollowUp,
} from "../src/lib/candidate-response-storage.ts";

const answer = "I isolated the issue and verified the fix.";
const question = "What did you monitor after release?";
const followUpAnswer = "Error rate, latency, and support volume.";

test("an exact legacy follow-up exchange is restored", () => {
  assert.deepEqual(
    parseSavedResponse(`${answer}\n\nAI follow-up: ${question}\nFollow-up response: ${followUpAnswer}`),
    { answer, followUp: { question, answer: followUpAnswer } },
  );
});

test("ambiguous legacy markers remain untouched", () => {
  const values = [
    `${answer}\n\nAI follow-up: quoted by candidate\n\nAI follow-up: ${question}\nFollow-up response: ${followUpAnswer}`,
    `${answer}\n\nAI follow-up: ${question}`,
    `${answer}\n\nAI follow-up: \nFollow-up response: ${followUpAnswer}`,
  ];

  for (const value of values) assert.deepEqual(parseSavedResponse(value), { answer: value });
});

test("structured follow-ups preserve both the issued question and candidate answer", () => {
  const stored = withStructuredFollowUp(
    { selectedOption: "structured" },
    { question, answer: followUpAnswer },
  );
  assert.deepEqual(stored, {
    selectedOption: "structured",
    aiFollowUp: { question, answer: followUpAnswer },
  });
  assert.deepEqual(readStructuredFollowUp(stored), { question, answer: followUpAnswer });
});
