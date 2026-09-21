import { NextResponse } from "next/server";
import { roleLabel } from "@/lib/admin";
import type {
  AdminAccountStatus,
  AdminOrganization,
  AdminOrganizationDetail,
  AdminOverview,
  AdminPage,
  AdminSessionSummary,
  AdminUser,
  AdminUserDetail,
  AuthUser,
  Comparison,
  SessionStatus,
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
const DAY_MS = 24 * 60 * 60 * 1000;
const iso = (offsetHours: number) => new Date(now + offsetHours * 60 * 60 * 1000).toISOString();
const PAGE_SIZE_MAX = 100;
const ACTIVITY_DAYS = 30;

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

type OrganizationRecord = Omit<AdminOrganization, "isCurrentWorkspace" | "memberCount" | "sessionCount">;
type UserRecord = Omit<AdminUser, "isCurrentUser" | "roleLabel" | "organization"> & { organizationId?: string };
type SessionRecord = {
  id: string;
  organizationId: string;
  createdById?: string;
  candidateId?: string;
  title?: string;
  candidateName: string;
  templateTitle: string;
  status: SessionStatus;
  createdAt: string;
  completedAt?: string;
  updatedAt: string;
};

const organizations: OrganizationRecord[] = [
  { id: "org-demo", name: "Evalora Demo Workspace", plan: "pro", isSuspended: false, createdAt: iso(-720), updatedAt: iso(-2), owner: { id: "user-demo-owner", name: "Maya Chen", email: "maya@evalora.demo" }, templateCount: 6 },
  { id: "org-northwind", name: "Northwind Talent", plan: "free", isSuspended: false, createdAt: iso(-400), updatedAt: iso(-30), owner: { id: "user-northwind-owner", name: "Priya Raman", email: "priya@northwind.demo" }, templateCount: 3 },
  { id: "org-contoso", name: "Contoso Hiring", plan: "enterprise", isSuspended: true, suspendedAt: iso(-48), createdAt: iso(-1500), updatedAt: iso(-48), owner: { id: "user-contoso-owner", name: "Diego Alvarez", email: "diego@contoso.demo" }, templateCount: 9 },
  { id: "org-globex", name: "Globex Recruiting", plan: "free", isSuspended: false, createdAt: iso(-96), updatedAt: iso(-20), templateCount: 1 },
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

const sessions: SessionRecord[] = buildSessions();

function buildSessions(): SessionRecord[] {
  const templates = ["Frontend Engineer", "Backend Engineer", "Product Designer", "Data Analyst", "Team Lead"];
  const candidates = [
    ["cand-1", "Aisha Khan"],
    ["cand-2", "Leo Martins"],
    ["cand-3", "Noor Haddad"],
    ["cand-4", "Ethan Wu"],
    ["cand-5", "Sofia Rossi"],
  ] as const;
  const statuses: SessionStatus[] = ["completed", "completed", "in_progress", "not_started", "completed", "expired"];
  const owners: Record<string, string> = { "org-demo": "user-demo-interviewer", "org-northwind": "user-northwind-owner", "org-contoso": "user-contoso-owner" };
  const list: SessionRecord[] = [];
  let index = 0;
  for (const [organizationId, count] of [["org-demo", 26], ["org-northwind", 9], ["org-contoso", 14]] as const) {
    for (let i = 0; i < count; i += 1) {
      const daysAgo = Math.round((i * 53) % 58);
      const createdAt = new Date(now - daysAgo * DAY_MS - (index % 5) * 3_600_000);
      const status = statuses[index % statuses.length];
      const candidate = candidates[index % candidates.length];
      const completed = status === "completed" ? new Date(createdAt.getTime() + 2 * 3_600_000) : undefined;
      list.push({
        id: `session-${index + 1}`,
        organizationId,
        createdById: owners[organizationId],
        candidateId: candidate[0],
        title: index % 3 === 0 ? `${templates[index % templates.length]} loop` : undefined,
        candidateName: candidate[1],
        templateTitle: templates[index % templates.length],
        status,
        createdAt: createdAt.toISOString(),
        ...(completed ? { completedAt: completed.toISOString() } : {}),
        updatedAt: (completed ?? createdAt).toISOString(),
      });
      index += 1;
    }
  }
  return list;
}

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

  if (resource === "organizations" && !id && method === "GET") return json(listOrganizations(searchParams, currentUser));
  if (resource === "organizations" && id && !action && method === "GET") {
    const organization = organizations.find((row) => row.id === id);
    if (!organization) return json({ message: MESSAGES.organizationNotFound }, 404);
    return json(toOrganizationDetail(organization, currentUser));
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
  if (resource === "users" && id && !action && method === "GET") {
    const user = users.find((row) => row.id === id);
    if (!user) return json({ message: MESSAGES.userNotFound }, 404);
    return json(toUserDetail(user, currentUser));
  }
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
  const sort = searchParams.get("sort") ?? "createdAt";
  const order = searchParams.get("order") ?? (sort === "name" ? "asc" : "desc");
  const direction = order === "asc" ? 1 : -1;
  const rows = organizations
    .filter((row) => !plan || row.plan === plan)
    .filter((row) => matchesStatus(row.isSuspended, status))
    .filter((row) => !q || row.name.toLowerCase().includes(q) || row.owner?.email.toLowerCase().includes(q))
    .map((row) => toOrganization(row, currentUser))
    .sort((a, b) => {
      if (sort === "name") return direction * a.name.localeCompare(b.name);
      if (sort === "sessions") return direction * (a.sessionCount - b.sessionCount) || b.createdAt.localeCompare(a.createdAt);
      return direction * a.createdAt.localeCompare(b.createdAt);
    });
  return paginate(rows, searchParams);
}

function listUsers(searchParams: URLSearchParams, currentUser: AuthUser): AdminPage<AdminUser> {
  const q = (searchParams.get("q") ?? "").trim().toLowerCase();
  const role = searchParams.get("role") ?? "";
  const status = (searchParams.get("status") ?? "") as AdminAccountStatus | "";
  const sort = searchParams.get("sort") ?? "createdAt";
  const order = searchParams.get("order") ?? (sort === "name" || sort === "email" ? "asc" : "desc");
  const direction = order === "asc" ? 1 : -1;
  const rows = users
    .map((row) => toUser(row, currentUser))
    .filter((row) => !role || row.role === role)
    .filter((row) => matchesStatus(row.isSuspended, status))
    .filter((row) => !q || row.name.toLowerCase().includes(q) || row.email.toLowerCase().includes(q))
    .sort((a, b) => {
      if (sort === "name") return direction * a.name.localeCompare(b.name) || a.email.localeCompare(b.email);
      if (sort === "email") return direction * a.email.localeCompare(b.email);
      return direction * a.createdAt.localeCompare(b.createdAt) || a.email.localeCompare(b.email);
    });
  return paginate(rows, searchParams);
}

function buildOverview(): AdminOverview {
  const byPlan: Record<SubscriptionPlan, number> = { free: 0, pro: 0, enterprise: 0 };
  for (const organization of organizations) byPlan[organization.plan] += 1;
  const byRole: Record<UserRole, number> = { admin: 0, organization: 0, interviewer: 0, candidate: 0 };
  for (const user of users) byRole[user.role] += 1;
  const byStatus: Record<SessionStatus, number> = { not_started: 0, in_progress: 0, completed: 0, expired: 0 };
  for (const session of sessions) byStatus[session.status] += 1;

  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);
  const asOf = new Date();
  const todayStart = new Date(Date.UTC(asOf.getUTCFullYear(), asOf.getUTCMonth(), asOf.getUTCDate()));
  const currentStart = new Date(todayStart.getTime() - (ACTIVITY_DAYS - 1) * DAY_MS);
  const previousStart = new Date(currentStart.getTime() - ACTIVITY_DAYS * DAY_MS);
  const windows = { currentStart, previousStart };

  const sessionsStarted = bucket(sessions.map((session) => session.createdAt), windows);
  const sessionsCompleted = bucket(sessions.map((session) => session.completedAt).filter((value): value is string => Boolean(value)), windows);
  const newUsers = bucket(users.map((user) => user.createdAt), windows);
  const newOrganizations = bucket(organizations.map((organization) => organization.createdAt), windows);
  // The demo runs on the fallback provider, so billable turns stay at zero.
  const billableTurns = { series: new Array<number>(ACTIVITY_DAYS).fill(0), comparison: { current: 0, previous: 0, changePct: 0 } };

  const thisMonth = sessions.filter((session) => new Date(session.createdAt) >= monthStart);
  const completedThisMonth = sessions.filter((session) => session.completedAt && new Date(session.completedAt) >= monthStart).length;

  return {
    asOf: asOf.toISOString(),
    monthStart: monthStart.toISOString(),
    activity: {
      days: Array.from({ length: ACTIVITY_DAYS }, (_, index) => new Date(currentStart.getTime() + index * DAY_MS).toISOString().slice(0, 10)),
      sessionsStarted: sessionsStarted.series,
      sessionsCompleted: sessionsCompleted.series,
      newUsers: newUsers.series,
      newOrganizations: newOrganizations.series,
      billableTurns: billableTurns.series,
    },
    comparisons: {
      sessionsStarted: sessionsStarted.comparison,
      sessionsCompleted: sessionsCompleted.comparison,
      newUsers: newUsers.comparison,
      newOrganizations: newOrganizations.comparison,
      billableTurns: billableTurns.comparison,
    },
    attention: {
      suspendedOrganizations: organizations.filter((row) => row.isSuspended).length,
      suspendedUsers: users.filter((row) => row.isSuspended).length,
      unverifiedStaff: users.filter((row) => row.role !== "candidate" && !row.emailVerified).length,
      workspacesWithoutOwner: organizations.filter((row) => !row.owner).length,
      liveSessions: byStatus.in_progress,
    },
    organizations: {
      total: organizations.length,
      active: organizations.filter((row) => !row.isSuspended).length,
      suspended: organizations.filter((row) => row.isSuspended).length,
      newThisMonth: organizations.filter((row) => new Date(row.createdAt) >= monthStart).length,
      byPlan,
      paidSubscriptions: organizations.filter((row) => !row.isSuspended && row.plan !== "free").length,
    },
    users: {
      total: users.length,
      suspended: users.filter((row) => row.isSuspended).length,
      newThisMonth: users.filter((row) => new Date(row.createdAt) >= monthStart).length,
      byRole,
    },
    sessions: {
      total: sessions.length,
      thisMonth: thisMonth.length,
      completedThisMonth,
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
      projectedMonthCostUsd: 0,
      methodology:
        "Estimated as (billable interview turns + AI draft generations) x cost per turn. Only work produced by the configured model counts; deterministic fallback output is free.",
    },
    systemHealth: buildSystemHealth(byStatus.in_progress),
  };
}

function buildSystemHealth(liveSessions: number): SystemHealth {
  const uptimeSeconds = 2 * 86_400 + 5 * 3_600 + 12 * 60;
  const latencyMs = 32 + Math.round(Math.abs(Math.sin(Date.now() / 20_000)) * 18);
  return {
    capturedAt: new Date().toISOString(),
    realtime: {
      connectedSockets: 3,
      activeSessionRooms: liveSessions,
      connections: 41,
      disconnects: 38,
      joins: 39,
      rejectedJoins: 1,
      eventsEmitted: 1_284,
      uptimeSeconds,
      joinSuccessRate: 98,
    },
    workload: { liveSessions, sessionsToday: 6, completedToday: 4, codeSubmissionsToday: 9, interviewerQuestionsToday: 3 },
    services: [
      { key: "realtime", name: "Live session gateway", detail: "WebSocket rooms, presence, and event delivery", status: "operational", latencyMs: 0, note: `3 socket(s) in ${liveSessions} room(s)` },
      { key: "database", name: "Persistence layer", detail: "Sessions, responses, evaluations, and transcripts", status: "operational", latencyMs },
      { key: "ai", name: "AI interview service", detail: "Question generation, follow-ups, and evaluation", status: "degraded", note: "Deterministic rubric evaluation is used when no provider is configured." },
      { key: "sandbox", name: "Code execution sandbox", detail: "Isolated compile and test runs", status: "operational" },
      { key: "email", name: "Email delivery", detail: "Invites, verification, and password resets", status: "degraded", note: "Links are surfaced in the UI when email is not configured." },
      { key: "livekit", name: "Live video & WebRTC (LiveKit)", detail: "Candidate live camera, screen share, and interviewer audio", status: "degraded", note: "Set LIVEKIT_URL, LIVEKIT_API_KEY, and LIVEKIT_API_SECRET to enable live video." },
    ],
    process: { uptimeSeconds, heapUsedMb: 91.4, rssMb: 188.2, nodeVersion: "v22.12.0" },
  };
}

function toOrganization(row: OrganizationRecord, currentUser: AuthUser): AdminOrganization {
  return {
    ...row,
    memberCount: users.filter((user) => user.organizationId === row.id && user.role !== "candidate").length,
    sessionCount: sessions.filter((session) => session.organizationId === row.id).length,
    isCurrentWorkspace: currentUser.organizationId === row.id,
  };
}

function toOrganizationDetail(row: OrganizationRecord, currentUser: AuthUser): AdminOrganizationDetail {
  const own = sessions.filter((session) => session.organizationId === row.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const sessionsByStatus: Record<SessionStatus, number> = { not_started: 0, in_progress: 0, completed: 0, expired: 0 };
  for (const session of own) sessionsByStatus[session.status] += 1;
  const latest = [...own].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
  return {
    ...toOrganization(row, currentUser),
    members: users
      .filter((user) => user.organizationId === row.id && user.role !== "candidate")
      .map((user) => {
        const role = user.id === currentUser.id ? currentUser.role : user.role;
        return { id: user.id, name: user.name, email: user.email, role, roleLabel: roleLabel(role), emailVerified: user.emailVerified, isSuspended: user.isSuspended, createdAt: user.createdAt };
      }),
    sessionsByStatus,
    recentSessions: own.slice(0, 5).map(toSessionSummary),
    draftCount: row.id === "org-demo" ? 2 : 0,
    ...(latest ? { lastActivityAt: latest.updatedAt } : {}),
  };
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

function toUserDetail(row: UserRecord, currentUser: AuthUser): AdminUserDetail {
  const touched = sessions
    .filter((session) => session.createdById === row.id || session.candidateId === row.id)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  return {
    ...toUser(row, currentUser),
    updatedAt: row.createdAt,
    createdSessionCount: sessions.filter((session) => session.createdById === row.id).length,
    candidateSessionCount: sessions.filter((session) => session.candidateId === row.id).length,
    templateCount: row.role === "candidate" ? 0 : row.role === "organization" ? 3 : 1,
    recentSessions: touched.slice(0, 5).map(toSessionSummary),
    ...(touched[0] ? { lastActivityAt: touched[0].updatedAt } : {}),
  };
}

function toSessionSummary(session: SessionRecord): AdminSessionSummary {
  return {
    id: session.id,
    ...(session.title ? { title: session.title } : {}),
    candidateName: session.candidateName,
    templateTitle: session.templateTitle,
    status: session.status,
    createdAt: session.createdAt,
    ...(session.completedAt ? { completedAt: session.completedAt } : {}),
  };
}

function bucket(timestamps: string[], windows: { currentStart: Date; previousStart: Date }): { series: number[]; comparison: Comparison } {
  const series = new Array<number>(ACTIVITY_DAYS).fill(0);
  let previous = 0;
  for (const timestamp of timestamps) {
    const time = new Date(timestamp).getTime();
    if (time >= windows.currentStart.getTime()) {
      series[Math.min(ACTIVITY_DAYS - 1, Math.floor((time - windows.currentStart.getTime()) / DAY_MS))] += 1;
    } else if (time >= windows.previousStart.getTime()) {
      previous += 1;
    }
  }
  const current = series.reduce((sum, value) => sum + value, 0);
  const changePct = previous === 0 ? (current === 0 ? 0 : null) : Math.round(((current - previous) / previous) * 1_000) / 10;
  return { series, comparison: { current, previous, changePct } };
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
