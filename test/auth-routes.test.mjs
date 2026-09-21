import test from "node:test";
import assert from "node:assert/strict";
import { ADMIN_HOME, WORKSPACE_HOME, homePathForRole, isAdminPath, resolveReturnTo } from "../src/lib/auth-routes.ts";

test("platform admins land on the console, every workspace role lands on the dashboard", () => {
  assert.equal(homePathForRole("admin"), ADMIN_HOME);
  assert.equal(homePathForRole("organization"), WORKSPACE_HOME);
  assert.equal(homePathForRole("interviewer"), WORKSPACE_HOME);
  assert.equal(homePathForRole("candidate"), WORKSPACE_HOME);
  assert.equal(homePathForRole(undefined), WORKSPACE_HOME);
  assert.equal(homePathForRole(null), WORKSPACE_HOME);
});

test("isAdminPath covers the console root and its sections only", () => {
  assert.equal(isAdminPath("/admin"), true);
  assert.equal(isAdminPath("/admin/users"), true);
  assert.equal(isAdminPath("/administration"), false);
  assert.equal(isAdminPath("/dashboard"), false);
});

test("resolveReturnTo keeps in-app paths and falls back to the role's home", () => {
  assert.equal(resolveReturnTo("/admin/users", "admin"), "/admin/users");
  assert.equal(resolveReturnTo("/candidates/abc", "interviewer"), "/candidates/abc");
  assert.equal(resolveReturnTo(null, "admin"), ADMIN_HOME);
  assert.equal(resolveReturnTo("", "organization"), WORKSPACE_HOME);
  assert.equal(resolveReturnTo(undefined, "organization"), WORKSPACE_HOME);
});

test("resolveReturnTo rejects values that would leave the app", () => {
  assert.equal(resolveReturnTo("//evil.example", "admin"), ADMIN_HOME);
  assert.equal(resolveReturnTo("/\\evil.example", "admin"), ADMIN_HOME);
  assert.equal(resolveReturnTo("https://evil.example/", "organization"), WORKSPACE_HOME);
  assert.equal(resolveReturnTo("dashboard", "organization"), WORKSPACE_HOME);
});
