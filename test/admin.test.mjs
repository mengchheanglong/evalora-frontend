import test from "node:test";
import assert from "node:assert/strict";
import {
  ADMIN_PAGE_SIZE,
  ASSIGNABLE_ROLES,
  buildAdminQuery,
  formatLatency,
  formatUptime,
  formatUsd,
  planLabel,
  roleLabel,
} from "../src/lib/admin.ts";

test("buildAdminQuery drops blank values, trims, and encodes the rest", () => {
  assert.equal(buildAdminQuery({ q: "  acme ", plan: "", status: undefined, page: 2, pageSize: ADMIN_PAGE_SIZE }), "?q=acme&page=2&pageSize=25");
  assert.equal(buildAdminQuery({ q: "", role: null }), "");
  assert.equal(buildAdminQuery({ q: "a&b=c" }), "?q=a%26b%3Dc");
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

test("labels match the backend vocabulary and candidates are never assignable", () => {
  assert.equal(planLabel("free"), "Free");
  assert.equal(planLabel("enterprise"), "Enterprise");
  assert.equal(roleLabel("organization"), "Owner");
  assert.equal(roleLabel("admin"), "Platform admin");
  assert.deepEqual(ASSIGNABLE_ROLES.map((role) => role.value), ["admin", "organization", "interviewer"]);
});
