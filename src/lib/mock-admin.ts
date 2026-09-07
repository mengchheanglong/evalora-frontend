import { NextResponse } from "next/server";
import { roleLabel } from "@/lib/admin";
import type {
  AdminAccountStatus,
  AdminOrganization,
  AdminOverview,
  AdminPage,
  AdminUser,
  AuthUser,
  SubscriptionPlan,
  SystemHealth,
  UserRole,
} from "@/lib/types";

/**
 * Mock `/admin/*` handlers so the Admin Hub works offline. Sign in with an
 * `admin@...` email to get the admin role; every other account gets 403 here,
 * exactly like the Nest RolesGuard.
 */

const now = Date.now();
const iso = (offsetHours: number) => new Date(now + offsetHours * 60 * 60 * 1000).toISOString();
const PAGE_SIZE_MAX = 100;

const MESSAGES = {
  forbidden: "You do not have permission to access this resource.",
  userNotFound: "User not found.",
  organizationNotFound: "Organization not found.",
  selfDeactivate: "You cannot deactivate your own account.",
  selfRoleChange: "You cannot change your own role.",
  selfWorkspaceSuspend: "You cannot suspend your own workspace.",
  candidateRole: "Candidate records cannot be assigned a workspace role. Invite them to a workspace instead.",
  noWorkspace: "This user has no workspace. Assign them to a workspace before changing their role.",
  onlyOwner: "This user is the only owner of their workspace. Promote another member first.",
} as const;

type OrganizationRecord = Omit<AdminOrganization, "isCurrentWorkspace">;
type UserRecord = Omit<AdminUser, "isCurrentUser" | "roleLabel" | "organization"> & { organizationId?: string };

const organizations: OrganizationRecord[] = [
  {
    id: "org-demo",
    name: "Evalora Demo Workspace",
    plan: "pro",
    isSuspended: false,
    createdAt: iso(-720),
    updatedAt: iso(-2),
    owner: { id: "user-demo-owner", name: "Maya Chen", email: "maya@evalora.demo" },
    memberCount: 3,
    sessionCount: 42,
    templateCount: 6,
  },
  {
    id: "org-northwind",
    name: "Northwind Talent",
    plan: "free",
    isSuspended: false,
    createdAt: iso(-400),
    updatedAt: iso(-30),
    owner: { id: "user-northwind-owner", name: "Priya Raman", email: "priya@northwind.demo" },
    memberCount: 2,
    sessionCount: 11,
    templateCount: 3,
  },
  {
    id: "org-contoso",
    name: "Contoso Hiring",
    plan: "enterprise",
    isSuspended: true,
    suspendedAt: iso(-48),
    createdAt: iso(-1500),
    updatedAt: iso(-48),
    owner: { id: "user-contoso-owner", name: "Diego Alvarez", email: "diego@contoso.demo" },
    memberCount: 5,
    sessionCount: 88,
    templateCount: 9,
  },
  {
    id: "org-globex",
    name: "Globex Recruiting",
    plan: "free",
    isSuspended: false,
    createdAt: iso(-96),
    updatedAt: iso(-20),
    memberCount: 0,
    sessionCount: 0,
    templateCount: 1,
  },
];

const users: UserRecord[] = [
  { id: "user-demo-owner", name: "Maya Chen", email: "maya@evalora.demo", role: "admin", emailVerified: true, isSuspended: false, createdAt: iso(-720), organizationId: "org-demo" },
  { id: "user-demo-interviewer", name: "Jordan Lee", email: "jordan@evalora.demo", role: "interviewer", emailVerified: true, isSuspended: false, createdAt: iso(-600), organizationId: "org-demo" },
  { id: "user-demo-interviewer-2", name: "Sam Okafor", email: "sam@evalora.demo", role: "interviewer", emailVerified: true, isSuspended: false, createdAt: iso(-300), organizationId: "org-demo" },
  { id: "user-northwind-owner", name: "Priya Raman", email: "priya@northwind.demo", role: "organization", emailVerified: true, isSuspended: false, createdAt: iso(-400), organizationId: "org-northwind" },
  { id: "user-northwind-interviewer", name: "Tomas Berg", email: "tomas@northwind.demo", role: "interviewer", emailVerified: true, isSuspended: true, suspendedAt: iso(-10), createdAt: iso(-380), organizationId: "org-northwind" },
  { id: "user-contoso-owner", name: "Diego Alvarez", email: "diego@contoso.demo", role: "organization", emailVerified: true, isSuspended: false, createdAt: iso(-1500), organizationId: "org-contoso" },
  { id: "user-loner", name: "Riley Park", email: "riley@example.demo", role: "interviewer", emailVerified: false, isSuspended: false, createdAt: iso(-40) },
  { id: "cand-1", name: "Aisha Khan", email: "aisha@example.demo", role: "candidate", emailVerified: false, isSuspended: false, createdAt: iso(-72) },
  { id: "cand-2", name: "Leo Martins", email: "leo@example.demo", role: "candidate", emailVerified: false, isSuspended: false, createdAt: iso(-30) },
];

export function handleMockAdminRequest(input: {
  method: string;
  segments: string[];
  body: unknown;
  searchParams: URLSearchParams;
  currentUser: AuthUser;
}): NextResponse {
  const { method, segments, body, searchParams, currentUser } = input;
  if (currentUser.role !== "admin") return json({ message: MESSAGES.forbidden }, 403);

  const [, resource, id, action] = segments;
  const payload = asRecord(body);

  if (resource === "overview" && !id && method === "GET") return json(buildOverview());

  if (resource === "organizations" && !id && method === "GET") {
    return json(listOrganizations(searchParams, currentUser));
  }
  if (resource === "organizations" && id && action === "status" && method === "PATCH") {
    const organization = organizations.find((row) => row.id === id);
    if (!organization) return json({ message: MESSAGES.organizationNotFound }, 404);
    const isSuspended = payload.isSuspended === true;
    if (isSuspended && currentUser.organizationId === id) return json({ message: MESSAGES.selfWorkspaceSuspend }, 403);
    organization.isSuspended = isSuspended;
    organization.suspendedAt = isSuspended ? new Date().toISOString() : undefined;
    organization.updatedAt = new Date().toISOString();
    return json(toOrganization(organization, currentUser));
  }
  if (resource === "organizations" && id && action === "plan" && method === "PATCH") {
    const organization = organizations.find((row) => row.id === id);
    if (!organization) return json({ message: MESSAGES.organizationNotFound }, 404);
    const plan = String(payload.plan ?? "") as SubscriptionPlan;
    if (!["free", "pro", "enterprise"].includes(plan)) return json({ message: "plan must be one of the following values: free, pro, enterprise" }, 400);
    organization.plan = plan;
    organization.updatedAt = new Date().toISOString();
    return json(toOrganization(organization, currentUser));
  }

  if (resource === "users" && !id && method === "GET") return json(listUsers(searchParams, currentUser));
  if (resource === "users" && id && action === "status" && method === "PATCH") {
    if (id === currentUser.id) return json({ message: MESSAGES.selfDeactivate }, 403);
    const user = users.find((row) => row.id === id);
    if (!user) return json({ message: MESSAGES.userNotFound }, 404);
    const isSuspended = payload.isSuspended === true;
    user.isSuspended = isSuspended;
    user.suspendedAt = isSuspended ? new Date().toISOString() : undefined;
    return json(toUser(user, currentUser));
  }
  if (resource === "users" && id && action === "role" && method === "PATCH") {
    if (id === currentUser.id) return json({ message: MESSAGES.selfRoleChange }, 403);
    const user = users.find((row) => row.id === id);
    if (!user) return json({ message: MESSAGES.userNotFound }, 404);
    const role = String(payload.role ?? "") as UserRole;
    if (!["admin", "organization", "interviewer"].includes(role)) return json({ message: "role must be one of the following values: admin, organization, interviewer" }, 400);
    if (user.role === "candidate") return json({ message: MESSAGES.candidateRole }, 400);
    if (role !== "admin" && !user.organizationId) return json({ message: MESSAGES.noWorkspace }, 400);
    if (user.role === "organization" && role === "interviewer") {
      const owners = users.filter((row) => row.organizationId === user.organizationId && row.role === "organization").length;
      if (owners <= 1) return json({ message: MESSAGES.onlyOwner }, 400);
    }
    user.role = role;
    return json(toUser(user, currentUser));
  }

  return json({ message: "Not found." }, 404);
}

function listOrganizations(searchParams: URLSearchParams, currentUser: AuthUser): AdminPage<AdminOrganization> {
  const q = (searchParams.get("q") ?? "").trim().toLowerCase();
  const plan = searchParams.get("plan") ?? "";
  const status = (searchParams.get("status") ?? "") as AdminAccountStatus | "";
  const rows = organizations
    .filter((row) => !plan || row.plan === plan)
    .filter((row) => matchesStatus(row.isSuspended, status))
    .filter((row) => !q || row.name.toLowerCase().includes(q) || row.owner?.email.toLowerCase().includes(q))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((row) => toOrganization(row, currentUser));
  return paginate(rows, searchParams);
}

function listUsers(searchParams: URLSearchParams, currentUser: AuthUser): AdminPage<AdminUser> {
  const q = (searchParams.get("q") ?? "").trim().toLowerCase();
  const role = searchParams.get("role") ?? "";
  const status = (searchParams.get("status") ?? "") as AdminAccountStatus | "";
  const rows = users
    .map((row) => toUser(row, currentUser))
    .filter((row) => !role || row.role === role)
    .filter((row) => matchesStatus(row.isSuspended, status))
    .filter((row) => !q || row.name.toLowerCase().includes(q) || row.email.toLowerCase().includes(q))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return paginate(rows, searchParams);
}

function buildOverview(): AdminOverview {
  const byPlan: Record<SubscriptionPlan, number> = { free: 0, pro: 0, enterprise: 0 };
  for (const organization of organizations) byPlan[organization.plan] += 1;
  const byRole: Record<UserRole, number> = { admin: 0, organization: 0, interviewer: 0, candidate: 0 };
  for (const user of users) byRole[user.role] += 1;
  const byStatus = { not_started: 30, in_progress: 2, completed: 95, expired: 14 };
  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);

  return {
    asOf: new Date().toISOString(),
    monthStart: monthStart.toISOString(),
    organizations: {
      total: organizations.length,
      active: organizations.filter((row) => !row.isSuspended).length,
      suspended: organizations.filter((row) => row.isSuspended).length,
      newThisMonth: 1,
      byPlan,
      paidSubscriptions: organizations.filter((row) => !row.isSuspended && row.plan !== "free").length,
    },
    users: {
      total: users.length,
      suspended: users.filter((row) => row.isSuspended).length,
      newThisMonth: 3,
      byRole,
    },
    sessions: {
      total: Object.values(byStatus).reduce((sum, count) => sum + count, 0),
      thisMonth: 23,
      completedThisMonth: 15,
      live: byStatus.in_progress,
      byStatus,
    },
    ai: {
      provider: "fallback",
      costPerTurnUsd: 0.002,
      interviewTurns: { allTime: 312, thisMonth: 58 },
      billableTurns: { allTime: 0, thisMonth: 0 },
      draftGenerations: { allTime: 0, thisMonth: 0 },
      estimatedCostUsd: { allTime: 0, thisMonth: 0 },
      methodology:
        "Estimated as (billable interview turns + AI draft generations) x cost per turn. Only work produced by the configured model counts; deterministic fallback output is free.",
    },
    systemHealth: buildSystemHealth(),
  };
}

function buildSystemHealth(): SystemHealth {
  const uptimeSeconds = 2 * 86_400 + 5 * 3_600 + 12 * 60;
  return {
    capturedAt: new Date().toISOString(),
    realtime: {
      connectedSockets: 3,
      activeSessionRooms: 2,
      connections: 41,
      disconnects: 38,
      joins: 39,
      rejectedJoins: 1,
      eventsEmitted: 1_284,
      uptimeSeconds,
      joinSuccessRate: 98,
    },
    workload: { liveSessions: 2, sessionsToday: 6, completedToday: 4, codeSubmissionsToday: 9, interviewerQuestionsToday: 3 },
    services: [
      { key: "realtime", name: "Live session gateway", detail: "WebSocket rooms, presence, and event delivery", status: "operational", latencyMs: 0, note: "3 socket(s) in 2 room(s)" },
      { key: "database", name: "Persistence layer", detail: "Sessions, responses, evaluations, and transcripts", status: "operational", latencyMs: 38 },
      { key: "ai", name: "AI interview service", detail: "Question generation, follow-ups, and evaluation", status: "degraded", note: "Deterministic rubric evaluation is used when no provider is configured." },
      { key: "sandbox", name: "Code execution sandbox", detail: "Isolated compile and test runs", status: "operational" },
      { key: "email", name: "Email delivery", detail: "Invites, verification, and password resets", status: "degraded", note: "Links are surfaced in the UI when email is not configured." },
      { key: "livekit", name: "Live video & WebRTC (LiveKit)", detail: "Candidate live camera, screen share, and interviewer audio", status: "degraded", note: "Set LIVEKIT_URL, LIVEKIT_API_KEY, and LIVEKIT_API_SECRET to enable live video." },
    ],
    process: { uptimeSeconds, heapUsedMb: 91.4, rssMb: 188.2, nodeVersion: "v22.12.0" },
  };
}

function toOrganization(row: OrganizationRecord, currentUser: AuthUser): AdminOrganization {
  return { ...row, isCurrentWorkspace: currentUser.organizationId === row.id };
}

function toUser(row: UserRecord, currentUser: AuthUser): AdminUser {
  const isCurrentUser = row.id === currentUser.id;
  // The signed-in mock account reflects whatever role the login gave it.
  const role = isCurrentUser ? currentUser.role : row.role;
  const organization = organizations.find((candidate) => candidate.id === row.organizationId);
  return {
    id: row.id,
    name: isCurrentUser ? currentUser.name : row.name,
    email: row.email,
    role,
    roleLabel: roleLabel(role),
    emailVerified: row.emailVerified,
    isSuspended: row.isSuspended,
    ...(row.suspendedAt ? { suspendedAt: row.suspendedAt } : {}),
    createdAt: row.createdAt,
    ...(organization ? { organization: { id: organization.id, name: organization.name, isSuspended: organization.isSuspended } } : {}),
    isCurrentUser,
  };
}

function matchesStatus(isSuspended: boolean, status: AdminAccountStatus | ""): boolean {
  if (status === "suspended") return isSuspended;
  if (status === "active") return !isSuspended;
  return true;
}

function paginate<T>(rows: T[], searchParams: URLSearchParams): AdminPage<T> {
  const page = Math.max(1, Number.parseInt(searchParams.get("page") ?? "1", 10) || 1);
  const pageSize = Math.min(PAGE_SIZE_MAX, Math.max(1, Number.parseInt(searchParams.get("pageSize") ?? "25", 10) || 25));
  const start = (page - 1) * pageSize;
  return {
    items: rows.slice(start, start + pageSize),
    page,
    pageSize,
    total: rows.length,
    totalPages: Math.max(1, Math.ceil(rows.length / pageSize)),
  };
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function json<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}
