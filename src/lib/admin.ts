import { apiGet, apiPatch } from "./api";
import type {
  AdminAccountStatus,
  AdminOrganization,
  AdminOrganizationDetail,
  AdminOrganizationSort,
  AdminOverview,
  AdminPage,
  AdminSortOrder,
  AdminUser,
  AdminUserDetail,
  AdminUserSort,
  SubscriptionPlan,
  UserRole,
} from "./types";

/**
 * Client for the platform admin routes (`/admin/*`). Every call requires the
 * signed-in account to hold the `admin` role; the backend re-checks that on
 * each request, so a demoted admin sees these calls start failing immediately.
 */

export const ADMIN_PAGE_SIZE = 25;
/** Enough rows for the command palette to be useful without turning into a list page. */
export const ADMIN_SEARCH_LIMIT = 5;

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

export const ADMIN_ORGANIZATION_SORTS: AdminOrganizationSort[] = ["createdAt", "name", "sessions"];
export const ADMIN_USER_SORTS: AdminUserSort[] = ["createdAt", "name", "email"];

export type AdminListParams = {
  q?: string;
  status?: AdminAccountStatus | "";
  order?: AdminSortOrder | "";
  page?: number;
  pageSize?: number;
};

export type AdminOrganizationParams = AdminListParams & { plan?: SubscriptionPlan | ""; sort?: AdminOrganizationSort | "" };
export type AdminUserParams = AdminListParams & { role?: UserRole | ""; sort?: AdminUserSort | "" };

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

export function formatCompactNumber(value: number): string {
  const safe = Number.isFinite(value) ? value : 0;
  return new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(safe);
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

/**
 * Coarse, monotonic relative time for list rows ("3 days ago"). Coarse on
 * purpose: an operator scanning a table needs recency, not precision, and the
 * exact timestamp stays on the element's title.
 */
export function formatRelativeTime(iso: string, now: number = Date.now()): string {
  const time = new Date(iso).getTime();
  if (!Number.isFinite(time)) return "—";
  const seconds = Math.max(0, Math.round((now - time) / 1_000));
  if (seconds < 45) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return days === 1 ? "yesterday" : `${days} days ago`;
  if (days < 30) return `${Math.round(days / 7)} wk ago`;
  if (days < 365) return `${Math.round(days / 30)} mo ago`;
  return `${Math.round(days / 365)} yr ago`;
}

/** "+12.5%", "-8%", "0%"; null means there was nothing to compare against. */
export function formatPercentChange(changePct: number | null): string {
  if (changePct === null || !Number.isFinite(changePct)) return "n/a";
  const rounded = Math.round(changePct * 10) / 10;
  const text = Number.isInteger(rounded) ? String(Math.abs(rounded)) : Math.abs(rounded).toFixed(1);
  if (rounded > 0) return `+${text}%`;
  if (rounded < 0) return `-${text}%`;
  return "0%";
}

export function sumSeries(values: number[]): number {
  return values.reduce((total, value) => total + (Number.isFinite(value) ? value : 0), 0);
}

export function getAdminOverview() {
  return apiGet<AdminOverview>("/admin/overview");
}

export function listAdminOrganizations(params: AdminOrganizationParams = {}) {
  return apiGet<AdminPage<AdminOrganization>>(`/admin/organizations${buildAdminQuery(params)}`);
}

export function getAdminOrganization(organizationId: string) {
  return apiGet<AdminOrganizationDetail>(`/admin/organizations/${encodeURIComponent(organizationId)}`);
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

export function getAdminUser(userId: string) {
  return apiGet<AdminUserDetail>(`/admin/users/${encodeURIComponent(userId)}`);
}

export function setUserSuspended(userId: string, isSuspended: boolean) {
  return apiPatch<AdminUser>(`/admin/users/${encodeURIComponent(userId)}/status`, { isSuspended });
}

export function setUserRole(userId: string, role: AssignableRole) {
  return apiPatch<AdminUser>(`/admin/users/${encodeURIComponent(userId)}/role`, { role });
}

export interface AdminSearchResults {
  organizations: AdminOrganization[];
  users: AdminUser[];
  organizationTotal: number;
  userTotal: number;
}

/** One query, both directories; the palette shows a handful of each and links to the full lists. */
export async function searchAdminDirectory(q: string): Promise<AdminSearchResults> {
  const [organizations, users] = await Promise.all([
    listAdminOrganizations({ q, pageSize: ADMIN_SEARCH_LIMIT }),
    listAdminUsers({ q, pageSize: ADMIN_SEARCH_LIMIT }),
  ]);
  return {
    organizations: organizations.items,
    users: users.items,
    organizationTotal: organizations.total,
    userTotal: users.total,
  };
}
