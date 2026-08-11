import test from "node:test";
import assert from "node:assert/strict";
import { mergeSignal, interpretIntegrityResult, INTEGRITY_DEBOUNCE_MS } from "../src/features/integrity/integrity-signals.ts";

test("a single blur signal opens a supporting-only detection", () => {
  const merged = mergeSignal(null, "blur", 1_000);
  assert.ok(merged);
  assert.equal(merged.type, "blur");
  assert.equal(merged.detectedAt, new Date(1_000).toISOString());
  assert.equal(merged.returnedAt, undefined);
  assert.ok(merged.clientEventId.length > 0);
});

test("nearby signals collapse into ONE detection with one clientEventId", () => {
  const first = mergeSignal(null, "blur", 1_000);
  const second = mergeSignal(first, "hidden", 1_050);
  const third = mergeSignal(second, "pagehide", 1_100);

  assert.equal(third.clientEventId, first.clientEventId, "one merged violation keeps one id");
  assert.equal(third.type, "visibilitychange", "a hidden transition upgrades the window");
  assert.equal(third.detectedAt, first.detectedAt, "detectedAt keeps the first signal time");
});

test("a hidden transition makes the whole window a counted visibilitychange", () => {
  const merged = mergeSignal(null, "blur", 1_000);
  const counted = mergeSignal(merged, "hidden", 1_050);
  assert.equal(counted.type, "visibilitychange");
});

test("returning to the tab records returnedAt and durationMs", () => {
  const hidden = mergeSignal(null, "hidden", 1_000);
  const returned = mergeSignal(hidden, "visible", 10_000);
  assert.equal(returned.type, "visibilitychange");
  assert.equal(returned.returnedAt, new Date(10_000).toISOString());
  assert.equal(returned.durationMs, 9_000);
});

test("an isolated visible event is not a violation", () => {
  assert.equal(mergeSignal(null, "visible", 1_000), null);
});

test("debounce window is sane for human interaction", () => {
  // Fires fast enough to catch a tab switch, long enough to merge the burst.
  assert.ok(INTEGRITY_DEBOUNCE_MS >= 300 && INTEGRITY_DEBOUNCE_MS <= 2_000);
});

test("first counted event (1 of 2, session active) maps to a dismissable warning", () => {
  const outcome = interpretIntegrityResult({
    sessionId: "s1",
    clientEventId: "evt-1",
    counted: true,
    warningCount: 1,
    warningLimit: 2,
    sessionStatus: "in_progress",
    action: "warned",
    reason: "Possible tab switching detected.",
    event: {
      id: "e1",
      sessionId: "s1",
      clientEventId: "evt-1",
      type: "visibilitychange",
      detectedAt: "2026-07-06T13:05:00.000Z",
      counted: true,
      reason: "Possible tab switching detected.",
    },
  });
  assert.equal(outcome, "warning");
});

test("second counted event (2 of 2) maps to the forced-exit state", () => {
  const outcome = interpretIntegrityResult({
    sessionId: "s1",
    clientEventId: "evt-2",
    counted: true,
    warningCount: 2,
    warningLimit: 2,
    sessionStatus: "expired",
    action: "terminated",
    reason: "Possible tab switching detected.",
    event: {
      id: "e2",
      sessionId: "s1",
      clientEventId: "evt-2",
      type: "visibilitychange",
      detectedAt: "2026-07-06T13:10:00.000Z",
      counted: true,
      reason: "Possible tab switching detected.",
    },
  });
  assert.equal(outcome, "terminated");
});

test("a duplicate or supporting event never triggers a warning", () => {
  const duplicate = interpretIntegrityResult({
    sessionId: "s1",
    clientEventId: "evt-1",
    counted: false,
    warningCount: 1,
    warningLimit: 2,
    sessionStatus: "in_progress",
    action: "duplicate",
    reason: "Duplicate integrity event.",
    event: {
      id: "e1",
      sessionId: "s1",
      clientEventId: "evt-1",
      type: "visibilitychange",
      detectedAt: "2026-07-06T13:05:00.000Z",
      counted: true,
      reason: "Possible tab switching detected.",
    },
  });
  assert.equal(duplicate, "none");

  const supporting = interpretIntegrityResult({
    sessionId: "s1",
    clientEventId: "evt-3",
    counted: false,
    warningCount: 0,
    warningLimit: 2,
    sessionStatus: "in_progress",
    action: "recorded",
    reason: "Supporting signal: the browser window lost focus.",
    event: {
      id: "e3",
      sessionId: "s1",
      clientEventId: "evt-3",
      type: "blur",
      detectedAt: "2026-07-06T13:06:00.000Z",
      counted: false,
      reason: "Supporting signal: the browser window lost focus.",
    },
  });
  assert.equal(supporting, "none");
});

test("a counted event on an ended session still maps to the forced-exit state", () => {
  const outcome = interpretIntegrityResult({
    sessionId: "s1",
    clientEventId: "evt-4",
    counted: true,
    warningCount: 2,
    warningLimit: 2,
    sessionStatus: "expired",
    action: "warned",
    reason: "Possible tab switching detected.",
    event: {
      id: "e4",
      sessionId: "s1",
      clientEventId: "evt-4",
      type: "visibilitychange",
      detectedAt: "2026-07-06T13:15:00.000Z",
      counted: true,
      reason: "Possible tab switching detected.",
    },
  });
  assert.equal(outcome, "terminated");
});
