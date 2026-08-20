import test from "node:test";
import assert from "node:assert/strict";
import { parseLiveCaption, LIVE_CAPTION_TOPIC } from "../src/features/live-video/live-captions.ts";

test("LIVE_CAPTION_TOPIC is defined as expected", () => {
  assert.equal(LIVE_CAPTION_TOPIC, "evalora.live-captions");
});

test("parseLiveCaption correctly parses valid JSON caption payload", () => {
  const payload = JSON.stringify({
    id: "cap-123",
    speaker: "Candidate",
    text: "I have experience with React and TypeScript.",
    timestamp: 1724123456789,
    final: true,
  });

  const parsed = parseLiveCaption(payload);
  assert.ok(parsed);
  assert.equal(parsed.id, "cap-123");
  assert.equal(parsed.speaker, "Candidate");
  assert.equal(parsed.text, "I have experience with React and TypeScript.");
  assert.equal(parsed.timestamp, 1724123456789);
  assert.equal(parsed.final, true);
});

test("parseLiveCaption rejects malformed or incomplete payloads", () => {
  assert.equal(parseLiveCaption("not valid json"), null);
  assert.equal(parseLiveCaption(""), null);
  assert.equal(
    parseLiveCaption(
      JSON.stringify({
        id: "cap-123",
        speaker: "Candidate",
        // missing text, timestamp, final
      }),
    ),
    null,
  );
  assert.equal(
    parseLiveCaption(
      JSON.stringify({
        id: 123, // wrong type
        speaker: "Candidate",
        text: "hello",
        timestamp: "not-a-number",
        final: "true",
      }),
    ),
    null,
  );
});
