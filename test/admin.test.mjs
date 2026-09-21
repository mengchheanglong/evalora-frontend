import test from "node:test";
import assert from "node:assert/strict";
import {
  ADMIN_PAGE_SIZE,
  ASSIGNABLE_ROLES,
  buildAdminQuery,
  formatCompactNumber,
  formatLatency,
  formatPercentChange,
  formatRelativeTime,
  formatUptime,
  formatUsd,
  planLabel,
  roleLabel,
  sumSeries,
} from "../src/lib/admin.ts";

test("buildAdminQuery drops blank values, trims, and encodes the rest", () => {
  assert.equal(buildAdminQuery({ q: "  acme ", plan: "", status: undefined, page: 2, pageSize: ADMIN_PAGE_SIZE }), "?q=acme&page=2&pageSize=25");
  assert.equal(buildAdminQuery({ q: "", role: null }), "");
  assert.equal(buildAdminQuery({ q: "a&b=c" }), "?q=a%26b%3Dc");
  assert.equal(buildAdminQuery({ sort: "sessions", order: "desc", open: "org-1" }), "?sort=sessions&order=desc&open=org-1");
});

test("formatUsd keeps sub-cent AI estimates visible instead of rounding them away", () => {
  assert.equal(formatUsd(0), "$0.00");
  assert.equal(formatUsd(0.026), "$0.026");
  assert.equal(formatUsd(0.0004), "$0.0004");
  assert.equal(formatUsd(12.5), "$12.50");
  assert.equal(formatUsd(1234.567), "$1,234.57");
  assert.equal(formatUsd(Number.NaN), "$0.00");
});

test("formatUptime picks the two most significant units", () => {
  assert.equal(formatUptime(45), "45s");
  assert.equal(formatUptime(125), "2m 5s");
  assert.equal(formatUptime(3_600 * 4 + 60 * 12), "4h 12m");
  assert.equal(formatUptime(86_400 * 3 + 3_600 * 4), "3d 4h");
  assert.equal(formatUptime(-5), "0s");
});

test("formatLatency reports a dash when the service did not answer", () => {
  assert.equal(formatLatency(undefined), "—");
  assert.equal(formatLatency(41.6), "42 ms");
});

test("formatRelativeTime is coarse and never negative", () => {
  const now = Date.parse("2026-09-16T12:00:00Z");
  const at = (offsetMs) => new Date(now - offsetMs).toISOString();
  assert.equal(formatRelativeTime(at(10_000), now), "just now");
  assert.equal(formatRelativeTime(at(5 * 60_000), now), "5 min ago");
  assert.equal(formatRelativeTime(at(3 * 3_600_000), now), "3 h ago");
  assert.equal(formatRelativeTime(at(26 * 3_600_000), now), "yesterday");
  assert.equal(formatRelativeTime(at(3 * 86_400_000), now), "3 days ago");
  assert.equal(formatRelativeTime(at(15 * 86_400_000), now), "2 wk ago");
  assert.equal(formatRelativeTime(at(95 * 86_400_000), now), "3 mo ago");
  assert.equal(formatRelativeTime(at(800 * 86_400_000), now), "2 yr ago");
  assert.equal(formatRelativeTime(new Date(now + 60_000).toISOString(), now), "just now");
  assert.equal(formatRelativeTime("not-a-date", now), "—");
});

test("formatPercentChange signs, rounds, and names a missing baseline", () => {
  assert.equal(formatPercentChange(12.34), "+12.3%");
  assert.equal(formatPercentChange(-8), "-8%");
  assert.equal(formatPercentChange(0), "0%");
  assert.equal(formatPercentChange(100), "+100%");
  assert.equal(formatPercentChange(null), "n/a");
});

test("compact numbers and series sums", () => {
  assert.equal(formatCompactNumber(1234), "1.2K");
  assert.equal(formatCompactNumber(12), "12");
  assert.equal(sumSeries([1, 2, 3, Number.NaN]), 6);
  assert.equal(sumSeries([]), 0);
});

test("labels match the backend vocabulary and candidates are never assignable", () => {
  assert.equal(planLabel("free"), "Free");
  assert.equal(planLabel("enterprise"), "Enterprise");
  assert.equal(roleLabel("organization"), "Owner");
  assert.equal(roleLabel("admin"), "Platform admin");
  assert.deepEqual(ASSIGNABLE_ROLES.map((role) => role.value), ["admin", "organization", "interviewer"]);
});
