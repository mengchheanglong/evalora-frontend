import test from "node:test";
import assert from "node:assert/strict";
import { mergeSignal, INTEGRITY_DEBOUNCE_MS } from "../src/features/integrity/integrity-signals.ts";

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
