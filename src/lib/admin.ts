import { apiGet, apiPatch } from "./api";
import type {
  AdminAccountStatus,
  AdminOrganization,
  AdminOverview,
  AdminPage,
  AdminUser,
  SubscriptionPlan,
  UserRole,
} from "./types";

/**
 * Client for the platform admin routes (`/admin/*`). Every call requires the
 * signed-in account to hold the `admin` role; the backend re-checks that on
 * each request, so a demoted admin sees these calls start failing immediately.
 */

export const ADMIN_PAGE_SIZE = 25;

export const ADMIN_PLANS: SubscriptionPlan[] = ["free", "pro", "enterprise"];

export type AssignableRole = Exclude<UserRole, "candidate">;

export const ASSIGNABLE_ROLES: Array<{ value: AssignableRole; label: string; description: string }> = [
  { value: "admin", label: "Platform admin", description: "Sees every workspace and manages the platform. Does not need a workspace." },
  { value: "organization", label: "Workspace owner", description: "Manages one workspace: team, templates, sessions, and billing." },
  { value: "interviewer", label: "Interviewer", description: "Runs assessments and reviews candidates inside their workspace." },
];

export const ADMIN_ROLE_FILTERS: Array<{ value: UserRole | ""; label: string }> = [
  { value: "", label: "All" },
  { value: "admin", label: "Admin" },
  { value: "organization", label: "Organization" },
  { value: "interviewer", label: "Interviewer" },
  { value: "candidate", label: "Candidate" },
];

export const ADMIN_STATUS_FILTERS: Array<{ value: AdminAccountStatus | ""; label: string }> = [
  { value: "", label: "Any status" },
  { value: "active", label: "Active" },
  { value: "suspended", label: "Suspended" },
];

export type AdminListParams = {
  q?: string;
  status?: AdminAccountStatus | "";
  page?: number;
  pageSize?: number;
};

export type AdminOrganizationParams = AdminListParams & { plan?: SubscriptionPlan | "" };
export type AdminUserParams = AdminListParams & { role?: UserRole | "" };

/** Builds a query string, dropping blank/undefined values so the URL stays readable and cache keys stay stable. */
export function buildAdminQuery(params: Record<string, string | number | undefined | null>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue;
    const text = String(value).trim();
    if (!text) continue;
    search.set(key, text);
  }
  const query = search.toString();
  return query ? `?${query}` : "";
}

export function planLabel(plan: SubscriptionPlan): string {
  if (plan === "pro") return "Pro";
  if (plan === "enterprise") return "Enterprise";
  return "Free";
}

export function roleLabel(role: UserRole): string {
  if (role === "admin") return "Platform admin";
  if (role === "organization") return "Owner";
  if (role === "interviewer") return "Interviewer";
  return "Candidate";
}

/** Sub-dollar estimates keep four decimals so a $0.026 month does not render as $0.03. */
export function formatUsd(value: number): string {
  const safe = Number.isFinite(value) ? value : 0;
  const maximumFractionDigits = safe > 0 && safe < 1 ? 4 : 2;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits,
  }).format(safe);
}

export function formatUptime(totalSeconds: number): string {
  const seconds = Math.max(0, Math.floor(Number.isFinite(totalSeconds) ? totalSeconds : 0));
  const days = Math.floor(seconds / 86_400);
  const hours = Math.floor((seconds % 86_400) / 3_600);
  const minutes = Math.floor((seconds % 3_600) / 60);
  const rest = seconds % 60;
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${rest}s`;
  return `${rest}s`;
}

export function formatLatency(latencyMs: number | undefined): string {
  if (typeof latencyMs !== "number" || !Number.isFinite(latencyMs)) return "—";
  return `${Math.round(latencyMs)} ms`;
}

export function getAdminOverview() {
  return apiGet<AdminOverview>("/admin/overview");
}

export function listAdminOrganizations(params: AdminOrganizationParams = {}) {
  return apiGet<AdminPage<AdminOrganization>>(`/admin/organizations${buildAdminQuery(params)}`);
}

export function setOrganizationSuspended(organizationId: string, isSuspended: boolean) {
  return apiPatch<AdminOrganization>(`/admin/organizations/${encodeURIComponent(organizationId)}/status`, { isSuspended });
}

export function setOrganizationPlan(organizationId: string, plan: SubscriptionPlan) {
  return apiPatch<AdminOrganization>(`/admin/organizations/${encodeURIComponent(organizationId)}/plan`, { plan });
}

export function listAdminUsers(params: AdminUserParams = {}) {
  return apiGet<AdminPage<AdminUser>>(`/admin/users${buildAdminQuery(params)}`);
}

export function setUserSuspended(userId: string, isSuspended: boolean) {
  return apiPatch<AdminUser>(`/admin/users/${encodeURIComponent(userId)}/status`, { isSuspended });
}

export function setUserRole(userId: string, role: AssignableRole) {
  return apiPatch<AdminUser>(`/admin/users/${encodeURIComponent(userId)}/role`, { role });
}
