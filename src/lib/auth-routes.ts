import type { UserRole } from "./types";

/**
 * Where each role lands after signing in.
 *
 * Platform admins get their own console at `/admin`, which has its own shell
 * and navigation. Every workspace role (owner, interviewer) lands on the
 * workspace dashboard. The two areas never share a sidebar.
 */
export const ADMIN_HOME = "/admin";
export const WORKSPACE_HOME = "/dashboard";

export function homePathForRole(role?: UserRole | null): string {
  return role === "admin" ? ADMIN_HOME : WORKSPACE_HOME;
}

export function isAdminPath(pathname: string): boolean {
  return pathname === ADMIN_HOME || pathname.startsWith(`${ADMIN_HOME}/`);
}

/**
 * Picks the post-login destination: the in-app `returnTo` when it is a safe
 * same-origin path, otherwise the role's home. Protocol-relative values such
 * as `//evil.example` and absolute URLs are rejected so the login page cannot
 * be used as an open redirect.
 */
export function resolveReturnTo(returnTo: string | null | undefined, role?: UserRole | null): string {
  const target = returnTo?.trim() ?? "";
  if (target.startsWith("/") && !target.startsWith("//") && !target.startsWith("/\\")) return target;
  return homePathForRole(role);
}
