import test from "node:test";
import assert from "node:assert/strict";
import { handleMockAdminRequest } from "../src/lib/mock-admin.ts";

const admin = { id: "user-demo-owner", name: "Maya Chen", email: "maya@evalora.demo", emailVerified: true, role: "admin", organizationId: "org-demo" };
const owner = { ...admin, role: "organization" };

function call(method, path, { body, user = admin } = {}) {
  const url = new URL(`http://mock.local/${path}`);
  const segments = url.pathname.split("/").filter(Boolean);
  return handleMockAdminRequest({ method, segments, body, searchParams: url.searchParams, currentUser: user });
}

test("non-admin accounts get 403 from every mock admin route, like the Nest RolesGuard", async () => {
  const response = call("GET", "admin/overview", { user: owner });
  assert.equal(response.status, 403);
  assert.equal((await response.json()).message, "You do not have permission to access this resource.");
  assert.equal(call("PATCH", "admin/users/cand-1/status", { body: { isSuspended: true }, user: owner }).status, 403);
});

test("overview totals are consistent with the mock directory", async () => {
  const overview = await call("GET", "admin/overview").json();
  assert.equal(overview.organizations.total, 4);
  assert.equal(overview.organizations.suspended, 1);
  assert.equal(overview.organizations.byPlan.free + overview.organizations.byPlan.pro + overview.organizations.byPlan.enterprise, 4);
  assert.equal(overview.users.byRole.candidate, 2);
  assert.ok(Array.isArray(overview.systemHealth.services) && overview.systemHealth.services.length >= 5);
  assert.equal(overview.ai.estimatedCostUsd.thisMonth, 0);
  assert.equal(overview.sessions.total, Object.values(overview.sessions.byStatus).reduce((sum, count) => sum + count, 0));
});

test("organization search, filters, and pagination mirror the API contract", async () => {
  const byName = await call("GET", "admin/organizations?q=contoso").json();
  assert.deepEqual(byName.items.map((item) => item.id), ["org-contoso"]);
  const byOwner = await call("GET", "admin/organizations?q=priya@northwind").json();
  assert.deepEqual(byOwner.items.map((item) => item.id), ["org-northwind"]);
  const suspended = await call("GET", "admin/organizations?status=suspended").json();
  assert.ok(suspended.items.length > 0 && suspended.items.every((item) => item.isSuspended));
  const page = await call("GET", "admin/organizations?pageSize=2&page=2").json();
  assert.equal(page.page, 2);
  assert.equal(page.totalPages, 2);
  assert.equal(page.items.length, 2);
  const own = (await call("GET", "admin/organizations?q=evalora demo").json()).items[0];
  assert.equal(own.isCurrentWorkspace, true);
});

test("guardrails: self-deactivation, own workspace, candidates, last owner, unknown ids", () => {
  assert.equal(call("PATCH", `admin/users/${admin.id}/status`, { body: { isSuspended: true } }).status, 403);
  assert.equal(call("PATCH", `admin/users/${admin.id}/role`, { body: { role: "organization" } }).status, 403);
  assert.equal(call("PATCH", "admin/organizations/org-demo/status", { body: { isSuspended: true } }).status, 403);
  assert.equal(call("PATCH", "admin/users/cand-1/role", { body: { role: "interviewer" } }).status, 400);
  assert.equal(call("PATCH", "admin/users/user-northwind-owner/role", { body: { role: "interviewer" } }).status, 400);
  assert.equal(call("PATCH", "admin/users/user-loner/role", { body: { role: "organization" } }).status, 400);
  assert.equal(call("PATCH", "admin/users/missing/status", { body: { isSuspended: true } }).status, 404);
  assert.equal(call("PATCH", "admin/organizations/missing/plan", { body: { plan: "pro" } }).status, 404);
  assert.equal(call("PATCH", "admin/organizations/org-northwind/plan", { body: { plan: "gold" } }).status, 400);
});

test("suspension, reactivation, plan, and role changes round-trip through the lists", async () => {
  const suspended = await call("PATCH", "admin/users/user-demo-interviewer/status", { body: { isSuspended: true } }).json();
  assert.equal(suspended.isSuspended, true);
  assert.ok(suspended.suspendedAt);
  const listed = await call("GET", "admin/users?status=suspended").json();
  assert.ok(listed.items.some((item) => item.id === "user-demo-interviewer"));

  const restored = await call("PATCH", "admin/users/user-demo-interviewer/status", { body: { isSuspended: false } }).json();
  assert.equal(restored.isSuspended, false);
  assert.equal(restored.suspendedAt, undefined);

  const plan = await call("PATCH", "admin/organizations/org-northwind/plan", { body: { plan: "enterprise" } }).json();
  assert.equal(plan.plan, "enterprise");

  const promoted = await call("PATCH", "admin/users/user-demo-interviewer/role", { body: { role: "organization" } }).json();
  assert.equal(promoted.role, "organization");
  assert.equal(promoted.roleLabel, "Owner");

  const orgSuspended = await call("PATCH", "admin/organizations/org-northwind/status", { body: { isSuspended: true } }).json();
  assert.equal(orgSuspended.isSuspended, true);
  const members = await call("GET", "admin/users?q=northwind").json();
  assert.ok(members.items.length > 0 && members.items.every((item) => item.organization?.isSuspended === true));

  const me = (await call("GET", `admin/users?q=${encodeURIComponent(admin.email)}`).json()).items[0];
  assert.equal(me.isCurrentUser, true);
  assert.equal(me.role, "admin");
});
