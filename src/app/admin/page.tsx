"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { AppShell } from "@/components/app-shell";
import { useAuth } from "@/components/auth-provider";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Icon, type IconName } from "@/components/icons";
import { OverviewCard } from "@/components/overview-card";
import { EmptyState, ErrorState, InlineAlert, PageLoader } from "@/components/ui-states";
import { getErrorMessage } from "@/lib/api";
import {
  ADMIN_PAGE_SIZE,
  ADMIN_PLANS,
  ADMIN_ROLE_FILTERS,
  ADMIN_STATUS_FILTERS,
  ASSIGNABLE_ROLES,
  type AssignableRole,
  formatLatency,
  formatUptime,
  formatUsd,
  getAdminOverview,
  listAdminOrganizations,
  listAdminUsers,
  planLabel,
  setOrganizationPlan,
  setOrganizationSuspended,
  setUserRole,
  setUserSuspended,
} from "@/lib/admin";
import type {
  AdminAccountStatus,
  AdminOrganization,
  AdminOverview,
  AdminPage,
  AdminUser,
  ServiceHealth,
  ServiceStatus,
  SubscriptionPlan,
  UserRole,
} from "@/lib/types";

type TabKey = "overview" | "organizations" | "users";
type Notice = { tone: "success" | "error"; text: string };

const TABS: Array<{ key: TabKey; label: string; icon: IconName; hint: string }> = [
  { key: "overview", label: "Usage & Cost", icon: "analytics", hint: "Platform totals, AI spend, infrastructure" },
  { key: "organizations", label: "Organizations", icon: "globe", hint: "Workspaces, plans, suspension" },
  { key: "users", label: "Users", icon: "users", hint: "Every account across every workspace" },
];

function isTabKey(value: string): value is TabKey {
  return TABS.some((tab) => tab.key === value);
}

export default function AdminHubPage() {
  const { user, status } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState<TabKey>("overview");
  const isAdmin = user?.role === "admin";

  // Client-side guard for a fast redirect; the backend enforces the role on every /admin call.
  useEffect(() => {
    if (status === "authenticated" && user && user.role !== "admin") router.replace("/dashboard");
  }, [router, status, user]);

  // The hash keeps the selected tab across refreshes and shareable links (#users).
  useEffect(() => {
    const fromHash = window.location.hash.replace(/^#/, "");
    if (isTabKey(fromHash)) setTab(fromHash);
  }, []);

  function selectTab(next: TabKey) {
    setTab(next);
    window.history.replaceState(null, "", `#${next}`);
  }

  if (status !== "authenticated" || !user || !isAdmin) {
    return (
      <AppShell active="admin" title="Admin Hub">
        <PageLoader label="Checking platform access" />
      </AppShell>
    );
  }

  return (
    <AppShell
      active="admin"
      description="Platform-wide view of workspaces, accounts, usage, and infrastructure. Actions here take effect on the target's next request."
      title="Admin Hub"
    >
      <div className="space-y-5">
        <div aria-label="Admin Hub sections" className="flex flex-wrap gap-1.5 rounded-[10px] border border-[var(--theme-border)] bg-[var(--theme-panel)] p-1.5" role="tablist">
          {TABS.map((item) => {
            const selected = item.key === tab;
            return (
              <button
                aria-controls={`admin-panel-${item.key}`}
                aria-selected={selected}
                className={`flex h-10 items-center gap-2 rounded-[8px] px-4 text-sm font-bold transition ${
                  selected
                    ? "bg-[var(--theme-active)] text-[var(--theme-active-text)]"
                    : "text-[var(--theme-muted)] hover:bg-[var(--theme-panel-soft)] hover:text-[var(--theme-heading)]"
                }`}
                id={`admin-tab-${item.key}`}
                key={item.key}
                onClick={() => selectTab(item.key)}
                role="tab"
                title={item.hint}
                type="button"
              >
                <Icon name={item.icon} size={16} />
                {item.label}
              </button>
            );
          })}
        </div>

        <div aria-labelledby={`admin-tab-${tab}`} id={`admin-panel-${tab}`} role="tabpanel">
          {tab === "overview" ? <OverviewTab /> : null}
          {tab === "organizations" ? <OrganizationsTab /> : null}
          {tab === "users" ? <UsersTab currentUserId={user.id} /> : null}
        </div>
      </div>
    </AppShell>
  );
}

/* ------------------------------------------------------------------------ */
/* Tab 1: Usage & Cost                                                       */
/* ------------------------------------------------------------------------ */

function OverviewTab() {
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setOverview(await getAdminOverview());
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading && !overview) return <PageLoader label="Loading platform usage" />;
  if (!overview) return <ErrorState message={error || "Platform usage is unavailable right now."} onRetry={() => void load()} />;

  const { organizations, users, sessions, ai, systemHealth } = overview;
  const providerLabel = ai.provider === "deepseek" ? (ai.model ? `Live model · ${ai.model}` : "Live model") : "Fallback only · nothing billed";

  return (
    <div className="space-y-5">
      {error ? <InlineAlert tone="warning">{error} Showing the last successful snapshot.</InlineAlert> : null}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <OverviewCard
          accent="var(--color-chart-1)"
          detail={`${organizations.active.toLocaleString()} active · ${organizations.suspended.toLocaleString()} suspended · ${organizations.paidSubscriptions.toLocaleString()} paid`}
          icon="globe"
          label="Organizations"
          tone="text-[var(--color-chart-1)]"
          value={organizations.total.toLocaleString()}
        />
        <OverviewCard
          accent="#0ea5e9"
          detail={`${users.byRole.organization.toLocaleString()} owners · ${users.byRole.interviewer.toLocaleString()} interviewers · ${users.byRole.candidate.toLocaleString()} candidates`}
          icon="users"
          label="Users"
          tone="text-sky-600"
          value={users.total.toLocaleString()}
        />
        <OverviewCard
          accent="#8b5cf6"
          detail={`${sessions.completedThisMonth.toLocaleString()} completed · ${sessions.live.toLocaleString()} live now · ${sessions.total.toLocaleString()} all-time`}
          icon="message"
          label="Sessions this month"
          tone="text-violet-600"
          value={sessions.thisMonth.toLocaleString()}
        />
        <OverviewCard
          accent="#f59e0b"
          detail={`${formatUsd(ai.estimatedCostUsd.allTime)} all-time · ${ai.billableTurns.thisMonth.toLocaleString()} billable turns this month`}
          emphasis={ai.provider === "deepseek" ? "default" : "quiet"}
          icon="sparkle"
          label="Estimated DeepSeek cost"
          status={ai.provider === "deepseek" ? "estimate" : "fallback"}
          tone="text-amber-600"
          value={formatUsd(ai.estimatedCostUsd.thisMonth)}
        />
      </section>

      <div className="grid gap-5 xl:grid-cols-[1.45fr_1fr]">
        <SystemHealthPanel health={systemHealth} onRefresh={() => void load()} refreshing={loading} />
        <div className="space-y-5">
          <Panel description={providerLabel} title="AI usage">
            <dl className="divide-y divide-[var(--theme-border)] text-sm">
              <UsageRow label="Interview turns" window={ai.interviewTurns} hint="Every assistant turn persisted for candidate interviews" />
              <UsageRow label="Billable turns" window={ai.billableTurns} hint="Turns the configured model actually generated" />
              <UsageRow label="Template draft generations" window={ai.draftGenerations} hint="AI-assisted drafts produced by the model" />
              <div className="flex items-start justify-between gap-4 py-2.5">
                <dt className="text-[var(--theme-muted)]">Cost per turn</dt>
                <dd className="font-bold tabular-nums text-[var(--theme-heading)]">{formatUsd(ai.costPerTurnUsd)}</dd>
              </div>
            </dl>
            <p className="mt-3 text-xs leading-5 text-[var(--theme-faint)]">{ai.methodology} Month figures start {formatDate(overview.monthStart)}.</p>
          </Panel>

          <Panel description={`${organizations.paidSubscriptions.toLocaleString()} active paid subscriptions · ${organizations.newThisMonth.toLocaleString()} new this month`} title="Subscription plans">
            <div className="grid grid-cols-3 gap-3">
              {ADMIN_PLANS.map((plan) => (
                <div className="rounded-[8px] border border-[var(--theme-border)] bg-[var(--theme-panel-tint)] p-3" key={plan}>
                  <PlanBadge plan={plan} />
                  <p className="mt-2 text-2xl font-extrabold leading-none tabular-nums text-[var(--theme-heading)]">{organizations.byPlan[plan].toLocaleString()}</p>
                  <p className="mt-1 text-xs text-[var(--theme-muted)]">{organizations.byPlan[plan] === 1 ? "workspace" : "workspaces"}</p>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}

function UsageRow({ label, hint, window }: { label: string; hint: string; window: { allTime: number; thisMonth: number } }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5">
      <dt>
        <span className="block text-[var(--theme-text)]">{label}</span>
        <span className="block text-xs text-[var(--theme-faint)]">{hint}</span>
      </dt>
      <dd className="text-right">
        <span className="block font-bold tabular-nums text-[var(--theme-heading)]">{window.thisMonth.toLocaleString()}</span>
        <span className="block text-xs tabular-nums text-[var(--theme-muted)]">{window.allTime.toLocaleString()} all-time</span>
      </dd>
    </div>
  );
}

function SystemHealthPanel({ health, onRefresh, refreshing }: { health: AdminOverview["systemHealth"]; onRefresh: () => void; refreshing: boolean }) {
  const database = health.services.find((service) => service.key === "database");
  const livekit = health.services.find((service) => service.key === "livekit");

  return (
    <Panel
      action={
        <button className="button-secondary h-9 min-h-0 rounded-[7px] px-3 text-xs" disabled={refreshing} onClick={onRefresh} type="button">
          {refreshing ? "Measuring…" : "Measure again"}
        </button>
      }
      description={`Measured on request at ${new Date(health.capturedAt).toLocaleTimeString()}. Nothing here is cached.`}
      title="System health"
    >
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile detail={database ? STATUS_META[database.status].label : "Not reported"} label="Database latency" status={database?.status ?? "unavailable"} value={formatLatency(database?.latencyMs)} />
        <StatTile detail={livekit?.note ?? livekit?.detail ?? "Live video and screen share"} label="LiveKit WebRTC" status={livekit?.status ?? "unavailable"} value={livekit ? STATUS_META[livekit.status].label : "Not reported"} />
        <StatTile detail={`Node ${health.process.nodeVersion} · ${health.process.rssMb} MB RSS · ${health.process.heapUsedMb} MB heap`} label="Server uptime" status="operational" value={formatUptime(health.process.uptimeSeconds)} />
        <StatTile detail={`${health.realtime.activeSessionRooms.toLocaleString()} live room(s) · ${health.realtime.joinSuccessRate}% join success`} label="WebSocket connections" status={health.realtime.rejectedJoins > health.realtime.joins ? "degraded" : "operational"} value={health.realtime.connectedSockets.toLocaleString()} />
      </div>

      <ul className="mt-4 divide-y divide-[var(--theme-border)] overflow-hidden rounded-[8px] border border-[var(--theme-border)]">
        {health.services.map((service) => (
          <ServiceRow key={service.key} service={service} />
        ))}
      </ul>

      <dl className="mt-4 grid gap-3 text-xs sm:grid-cols-3">
        <WorkloadStat label="Live sessions" value={health.workload.liveSessions} />
        <WorkloadStat label="Sessions today" value={`${health.workload.sessionsToday} started · ${health.workload.completedToday} completed`} />
        <WorkloadStat label="Code runs today" value={`${health.workload.codeSubmissionsToday} runs · ${health.workload.interviewerQuestionsToday} interviewer questions`} />
      </dl>
    </Panel>
  );
}

function ServiceRow({ service }: { service: ServiceHealth }) {
  return (
    <li className="flex flex-wrap items-center gap-3 bg-[var(--theme-panel)] px-4 py-3">
      <span aria-hidden="true" className={`size-2.5 shrink-0 rounded-full ${STATUS_META[service.status].dot}`} />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-[var(--theme-heading)]">{service.name}</p>
        <p className="text-xs text-[var(--theme-muted)]">{service.note ?? service.detail}</p>
      </div>
      {typeof service.latencyMs === "number" && service.key !== "realtime" ? (
        <span className="text-xs tabular-nums text-[var(--theme-muted)]">{formatLatency(service.latencyMs)}</span>
      ) : null}
      <StatusPill status={service.status} />
    </li>
  );
}

function WorkloadStat({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-[8px] border border-[var(--theme-border)] px-3 py-2.5">
      <dt className="font-bold text-[var(--theme-muted)]">{label}</dt>
      <dd className="mt-0.5 font-semibold text-[var(--theme-heading)]">{value}</dd>
    </div>
  );
}

/* ------------------------------------------------------------------------ */
/* Tab 2: Organizations                                                      */
/* ------------------------------------------------------------------------ */

type OrganizationFilters = { q: string; plan: SubscriptionPlan | ""; status: AdminAccountStatus | ""; page: number };

function OrganizationsTab() {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);
  const [filters, setFilters] = useState<OrganizationFilters>({ q: "", plan: "", status: "", page: 1 });
  const [data, setData] = useState<AdminPage<AdminOrganization> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState<Notice | null>(null);
  const [busyId, setBusyId] = useState("");
  const [pending, setPending] = useState<AdminOrganization | null>(null);

  useEffect(() => {
    setFilters((current) => (current.q === debouncedSearch ? current : { ...current, q: debouncedSearch, page: 1 }));
  }, [debouncedSearch]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setData(await listAdminOrganizations({ q: filters.q, plan: filters.plan, status: filters.status, page: filters.page, pageSize: ADMIN_PAGE_SIZE }));
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    void load();
  }, [load]);

  function replaceRow(updated: AdminOrganization) {
    setData((current) => (current ? { ...current, items: current.items.map((item) => (item.id === updated.id ? updated : item)) } : current));
  }

  async function changePlan(organization: AdminOrganization, plan: SubscriptionPlan) {
    if (plan === organization.plan) return;
    setBusyId(organization.id);
    setNotice(null);
    try {
      const updated = await setOrganizationPlan(organization.id, plan);
      replaceRow(updated);
      setNotice({ tone: "success", text: `${updated.name} is now on the ${planLabel(plan)} plan.` });
    } catch (requestError) {
      setNotice({ tone: "error", text: getErrorMessage(requestError, "Unable to change the plan.") });
    } finally {
      setBusyId("");
    }
  }

  async function confirmSuspension() {
    if (!pending) return;
    const organization = pending;
    setBusyId(organization.id);
    setNotice(null);
    try {
      const updated = await setOrganizationSuspended(organization.id, !organization.isSuspended);
      replaceRow(updated);
      setNotice({
        tone: "success",
        text: updated.isSuspended
          ? `${updated.name} is suspended. Its owners and interviewers are blocked on their next request.`
          : `${updated.name} is active again.`,
      });
    } catch (requestError) {
      setNotice({ tone: "error", text: getErrorMessage(requestError, "Unable to update the workspace.") });
    } finally {
      setPending(null);
      setBusyId("");
    }
  }

  const activeFilters = Number(Boolean(filters.plan)) + Number(Boolean(filters.status));

  return (
    <div className="space-y-4">
      {notice ? <InlineAlert tone={notice.tone}>{notice.text}</InlineAlert> : null}

      <section className="card overflow-hidden rounded-[10px]">
        <div className="flex flex-wrap items-center gap-3 border-b border-[var(--theme-border)] px-4 py-3 sm:px-5">
          <SearchField label="Search organizations" onChange={setSearch} placeholder="Search by workspace name or owner email…" value={search} />
          <FilterSelect label="Plan" onChange={(value) => setFilters((current) => ({ ...current, plan: value as SubscriptionPlan | "", page: 1 }))} value={filters.plan}>
            <option value="">Any plan</option>
            {ADMIN_PLANS.map((plan) => (
              <option key={plan} value={plan}>{planLabel(plan)}</option>
            ))}
          </FilterSelect>
          <FilterSelect label="Status" onChange={(value) => setFilters((current) => ({ ...current, status: value as AdminAccountStatus | "", page: 1 }))} value={filters.status}>
            {ADMIN_STATUS_FILTERS.map((option) => (
              <option key={option.value || "any"} value={option.value}>{option.label}</option>
            ))}
          </FilterSelect>
          {activeFilters ? (
            <button className="text-xs font-bold text-[var(--color-primary-700)] hover:text-[var(--color-primary-600)]" onClick={() => setFilters((current) => ({ ...current, plan: "", status: "", page: 1 }))} type="button">
              Clear filters
            </button>
          ) : null}
          <span className="ml-auto text-xs font-semibold text-[var(--theme-faint)]">
            {data ? `${data.total.toLocaleString()} ${data.total === 1 ? "workspace" : "workspaces"}` : ""}
          </span>
        </div>

        {loading && !data ? <PageLoader label="Loading organizations" /> : null}
        {!data && !loading ? <ErrorState message={error || "Organizations are unavailable right now."} onRetry={() => void load()} /> : null}
        {data ? (
          <>
            {error ? <div className="px-5 pt-4"><InlineAlert tone="error">{error}</InlineAlert></div> : null}
            {data.items.length === 0 ? (
              <div className="p-6">
                <EmptyState description="No workspace matches this search. Try another name, owner email, or clear the filters." icon="globe" title="No organizations found" />
              </div>
            ) : (
              <div aria-busy={loading} className={`overflow-x-auto transition-opacity ${loading ? "opacity-60" : ""}`}>
                <table className="w-full min-w-[980px] text-left text-sm">
                  <thead className="text-xs font-bold text-[var(--theme-muted)]">
                    <tr className="border-b border-[var(--theme-border)]">
                      <th className="px-5 py-3">Organization</th>
                      <th className="px-3 py-3">Owner</th>
                      <th className="px-3 py-3">Plan</th>
                      <th className="px-3 py-3 text-right">Members</th>
                      <th className="px-3 py-3 text-right">Sessions</th>
                      <th className="px-3 py-3">Joined</th>
                      <th className="px-3 py-3">Status</th>
                      <th className="px-5 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--theme-border)]">
                    {data.items.map((organization) => {
                      const busy = busyId === organization.id;
                      const suspendBlocked = !organization.isSuspended && organization.isCurrentWorkspace;
                      return (
                        <tr className="align-middle" key={organization.id}>
                          <td className="px-5 py-3">
                            <div className="font-bold text-[var(--theme-heading)]">{organization.name}</div>
                            <div className="mt-0.5 text-xs text-[var(--theme-muted)]">
                              {organization.templateCount.toLocaleString()} {organization.templateCount === 1 ? "template" : "templates"}
                              {organization.isCurrentWorkspace ? " · your workspace" : ""}
                            </div>
                          </td>
                          <td className="px-3 py-3">
                            {organization.owner ? (
                              <>
                                <div className="font-medium text-[var(--theme-text)]">{organization.owner.email}</div>
                                <div className="text-xs text-[var(--theme-muted)]">{organization.owner.name}</div>
                              </>
                            ) : (
                              <span className="text-xs text-[var(--theme-faint)]">No owner account</span>
                            )}
                          </td>
                          <td className="px-3 py-3">
                            <div className="flex items-center gap-2">
                              <PlanBadge plan={organization.plan} />
                              <label className="sr-only" htmlFor={`plan-${organization.id}`}>Change plan for {organization.name}</label>
                              <select
                                className="control h-8 min-h-0 w-auto rounded-[6px] px-2 text-xs"
                                disabled={busy}
                                id={`plan-${organization.id}`}
                                onChange={(event) => void changePlan(organization, event.target.value as SubscriptionPlan)}
                                value={organization.plan}
                              >
                                {ADMIN_PLANS.map((plan) => (
                                  <option key={plan} value={plan}>{planLabel(plan)}</option>
                                ))}
                              </select>
                            </div>
                          </td>
                          <td className="px-3 py-3 text-right tabular-nums text-[var(--theme-text)]">{organization.memberCount.toLocaleString()}</td>
                          <td className="px-3 py-3 text-right tabular-nums text-[var(--theme-text)]">{organization.sessionCount.toLocaleString()}</td>
                          <td className="px-3 py-3 text-[var(--theme-muted)]">{formatDate(organization.createdAt)}</td>
                          <td className="px-3 py-3">
                            <AccountStatusBadge since={organization.suspendedAt} suspended={organization.isSuspended} />
                          </td>
                          <td className="px-5 py-3 text-right">
                            <button
                              className={`rounded-[7px] border px-3 py-1.5 text-xs font-bold transition disabled:cursor-not-allowed disabled:opacity-50 ${
                                organization.isSuspended
                                  ? "border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                                  : "border-rose-200 text-rose-600 hover:bg-rose-50"
                              }`}
                              disabled={busy || suspendBlocked}
                              onClick={() => setPending(organization)}
                              title={suspendBlocked ? "You cannot suspend your own workspace." : undefined}
                              type="button"
                            >
                              {busy ? "Working…" : organization.isSuspended ? "Reactivate workspace" : "Suspend workspace"}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            <Pagination disabled={loading} onChange={(page) => setFilters((current) => ({ ...current, page }))} page={data.page} pageSize={data.pageSize} total={data.total} totalPages={data.totalPages} />
          </>
        ) : null}
      </section>

      <ConfirmDialog
        confirmLabel={pending?.isSuspended ? "Reactivate" : "Suspend workspace"}
        icon={pending?.isSuspended ? "check" : "lock"}
        message={
          pending?.isSuspended
            ? `Owners and interviewers of ${pending.name} will be able to sign in again immediately.`
            : `Every owner and interviewer in ${pending?.name ?? "this workspace"} will be blocked on their next request and signed out. Candidates with open invitations are not affected. No data is deleted and you can reactivate at any time.`
        }
        onCancel={() => setPending(null)}
        onConfirm={() => void confirmSuspension()}
        open={Boolean(pending)}
        pending={Boolean(pending && busyId === pending.id)}
        title={pending?.isSuspended ? `Reactivate ${pending.name}?` : `Suspend ${pending?.name ?? "this workspace"}?`}
        tone={pending?.isSuspended ? "primary" : "danger"}
      />
    </div>
  );
}

/* ------------------------------------------------------------------------ */
/* Tab 3: Users                                                              */
/* ------------------------------------------------------------------------ */

type UserFilters = { q: string; role: UserRole | ""; status: AdminAccountStatus | ""; page: number };

function UsersTab({ currentUserId }: { currentUserId: string }) {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);
  const [filters, setFilters] = useState<UserFilters>({ q: "", role: "", status: "", page: 1 });
  const [data, setData] = useState<AdminPage<AdminUser> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState<Notice | null>(null);
  const [busyId, setBusyId] = useState("");
  const [pendingStatus, setPendingStatus] = useState<AdminUser | null>(null);
  const [pendingRole, setPendingRole] = useState<AdminUser | null>(null);

  useEffect(() => {
    setFilters((current) => (current.q === debouncedSearch ? current : { ...current, q: debouncedSearch, page: 1 }));
  }, [debouncedSearch]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setData(await listAdminUsers({ q: filters.q, role: filters.role, status: filters.status, page: filters.page, pageSize: ADMIN_PAGE_SIZE }));
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    void load();
  }, [load]);

  function replaceRow(updated: AdminUser) {
    setData((current) => (current ? { ...current, items: current.items.map((item) => (item.id === updated.id ? updated : item)) } : current));
  }

  async function confirmStatus() {
    if (!pendingStatus) return;
    const target = pendingStatus;
    setBusyId(target.id);
    setNotice(null);
    try {
      const updated = await setUserSuspended(target.id, !target.isSuspended);
      replaceRow(updated);
      setNotice({
        tone: "success",
        text: updated.isSuspended ? `${updated.name} is deactivated and will be signed out on their next request.` : `${updated.name} can sign in again.`,
      });
    } catch (requestError) {
      setNotice({ tone: "error", text: getErrorMessage(requestError, "Unable to update this account.") });
    } finally {
      setPendingStatus(null);
      setBusyId("");
    }
  }

  async function saveRole(role: AssignableRole) {
    if (!pendingRole) return;
    const target = pendingRole;
    setBusyId(target.id);
    setNotice(null);
    try {
      const updated = await setUserRole(target.id, role);
      replaceRow(updated);
      setNotice({ tone: "success", text: `${updated.name} is now ${updated.roleLabel.toLowerCase()}.` });
      setPendingRole(null);
    } catch (requestError) {
      setNotice({ tone: "error", text: getErrorMessage(requestError, "Unable to change this role.") });
      setPendingRole(null);
    } finally {
      setBusyId("");
    }
  }

  return (
    <div className="space-y-4">
      {notice ? <InlineAlert tone={notice.tone}>{notice.text}</InlineAlert> : null}

      <section className="card overflow-hidden rounded-[10px]">
        <div className="flex flex-wrap items-center gap-3 border-b border-[var(--theme-border)] px-4 py-3 sm:px-5">
          <SearchField label="Search users" onChange={setSearch} placeholder="Search by name or email…" value={search} />
          <FilterSelect label="Status" onChange={(value) => setFilters((current) => ({ ...current, status: value as AdminAccountStatus | "", page: 1 }))} value={filters.status}>
            {ADMIN_STATUS_FILTERS.map((option) => (
              <option key={option.value || "any"} value={option.value}>{option.label}</option>
            ))}
          </FilterSelect>
          <span className="ml-auto text-xs font-semibold text-[var(--theme-faint)]">
            {data ? `${data.total.toLocaleString()} ${data.total === 1 ? "account" : "accounts"}` : ""}
          </span>
        </div>
        <div aria-label="Filter by role" className="flex flex-wrap items-center gap-1.5 border-b border-[var(--theme-border)] bg-[var(--theme-panel-soft)]/55 px-4 py-2.5 sm:px-5" role="group">
          <span className="mr-1 text-xs font-bold text-[var(--theme-muted)]">Role</span>
          {ADMIN_ROLE_FILTERS.map((option) => {
            const selected = filters.role === option.value;
            return (
              <button
                aria-pressed={selected}
                className={`h-8 rounded-full border px-3 text-xs font-bold transition ${
                  selected
                    ? "border-[var(--color-primary-400)] bg-[var(--color-primary-50)] text-[var(--color-primary-700)]"
                    : "border-[var(--theme-border)] bg-[var(--theme-panel)] text-[var(--theme-muted)] hover:border-[var(--theme-border-strong)] hover:text-[var(--theme-heading)]"
                }`}
                key={option.value || "all"}
                onClick={() => setFilters((current) => ({ ...current, role: option.value, page: 1 }))}
                type="button"
              >
                {option.label}
              </button>
            );
          })}
        </div>

        {loading && !data ? <PageLoader label="Loading users" /> : null}
        {!data && !loading ? <ErrorState message={error || "Users are unavailable right now."} onRetry={() => void load()} /> : null}
        {data ? (
          <>
            {error ? <div className="px-5 pt-4"><InlineAlert tone="error">{error}</InlineAlert></div> : null}
            {data.items.length === 0 ? (
              <div className="p-6">
                <EmptyState description="No account matches this search. Try another name or email, or widen the role filter." icon="users" title="No users found" />
              </div>
            ) : (
              <div aria-busy={loading} className={`overflow-x-auto transition-opacity ${loading ? "opacity-60" : ""}`}>
                <table className="w-full min-w-[960px] text-left text-sm">
                  <thead className="text-xs font-bold text-[var(--theme-muted)]">
                    <tr className="border-b border-[var(--theme-border)]">
                      <th className="px-5 py-3">Person</th>
                      <th className="px-3 py-3">Workspace</th>
                      <th className="px-3 py-3">Role</th>
                      <th className="px-3 py-3">Joined</th>
                      <th className="px-3 py-3">Status</th>
                      <th className="px-5 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--theme-border)]">
                    {data.items.map((account) => {
                      const isSelf = account.isCurrentUser || account.id === currentUserId;
                      const busy = busyId === account.id;
                      const isCandidate = account.role === "candidate";
                      return (
                        <tr className="align-middle" key={account.id}>
                          <td className="px-5 py-3">
                            <div className="flex min-w-0 items-center gap-2">
                              <span className="truncate font-bold text-[var(--theme-heading)]">{account.name}</span>
                              {isSelf ? <span className="shrink-0 rounded bg-primary-50 px-1.5 py-0.5 text-xs font-bold text-primary-700">You</span> : null}
                            </div>
                            <div className="mt-0.5 text-xs text-[var(--theme-muted)]">
                              {account.email}
                              {!account.emailVerified && !isCandidate ? " · email not verified" : ""}
                            </div>
                          </td>
                          <td className="px-3 py-3">
                            {account.organization ? (
                              <>
                                <div className="font-medium text-[var(--theme-text)]">{account.organization.name}</div>
                                {account.organization.isSuspended ? <div className="text-xs font-semibold text-rose-600">Workspace suspended</div> : null}
                              </>
                            ) : (
                              <span className="text-xs text-[var(--theme-faint)]">{isCandidate ? "Invite-only record" : "No workspace"}</span>
                            )}
                          </td>
                          <td className="px-3 py-3">
                            <RoleBadge label={account.roleLabel} role={account.role} />
                          </td>
                          <td className="px-3 py-3 text-[var(--theme-muted)]">{formatDate(account.createdAt)}</td>
                          <td className="px-3 py-3">
                            <AccountStatusBadge since={account.suspendedAt} suspended={account.isSuspended} />
                          </td>
                          <td className="px-5 py-3 text-right">
                            <div className="flex justify-end gap-2">
                              <button
                                className="rounded-[7px] border border-[var(--theme-border)] px-3 py-1.5 text-xs font-bold text-[var(--theme-text)] transition hover:bg-[var(--theme-panel-soft)] disabled:cursor-not-allowed disabled:opacity-50"
                                disabled={busy || isSelf || isCandidate}
                                onClick={() => setPendingRole(account)}
                                title={isSelf ? "You cannot change your own role." : isCandidate ? "Candidate records are invite-only and have no workspace role." : undefined}
                                type="button"
                              >
                                Change role
                              </button>
                              <button
                                className={`rounded-[7px] border px-3 py-1.5 text-xs font-bold transition disabled:cursor-not-allowed disabled:opacity-50 ${
                                  account.isSuspended
                                    ? "border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                                    : "border-rose-200 text-rose-600 hover:bg-rose-50"
                                }`}
                                disabled={busy || isSelf}
                                onClick={() => setPendingStatus(account)}
                                title={isSelf ? "You cannot deactivate your own account." : undefined}
                                type="button"
                              >
                                {busy ? "Working…" : account.isSuspended ? "Reactivate" : "Deactivate"}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            <Pagination disabled={loading} onChange={(page) => setFilters((current) => ({ ...current, page }))} page={data.page} pageSize={data.pageSize} total={data.total} totalPages={data.totalPages} />
          </>
        ) : null}
      </section>

      <ConfirmDialog
        confirmLabel={pendingStatus?.isSuspended ? "Reactivate" : "Deactivate"}
        icon={pendingStatus?.isSuspended ? "check" : "lock"}
        message={
          pendingStatus?.isSuspended
            ? `${pendingStatus.name} will be able to sign in again immediately.`
            : `${pendingStatus?.name ?? "This person"} will be rejected on their next request, including any session that is already signed in. No data is deleted and you can reactivate at any time.`
        }
        onCancel={() => setPendingStatus(null)}
        onConfirm={() => void confirmStatus()}
        open={Boolean(pendingStatus)}
        pending={Boolean(pendingStatus && busyId === pendingStatus.id)}
        title={pendingStatus?.isSuspended ? `Reactivate ${pendingStatus.name}?` : `Deactivate ${pendingStatus?.name ?? "this account"}?`}
        tone={pendingStatus?.isSuspended ? "primary" : "danger"}
      />

      <RoleDialog onCancel={() => setPendingRole(null)} onConfirm={(role) => void saveRole(role)} pending={Boolean(pendingRole && busyId === pendingRole.id)} user={pendingRole} />
    </div>
  );
}

function RoleDialog({ user, pending, onConfirm, onCancel }: { user: AdminUser | null; pending: boolean; onConfirm: (role: AssignableRole) => void; onCancel: () => void }) {
  const [role, setRole] = useState<AssignableRole>("interviewer");

  useEffect(() => {
    if (user && user.role !== "candidate") setRole(user.role);
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !pending) onCancel();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onCancel, pending, user]);

  if (!user) return null;

  return (
    <div className="fixed inset-0 z-[60] grid place-items-center p-4">
      <button aria-label="Close" className="absolute inset-0 cursor-default bg-neutral-950/55 backdrop-blur-[2px]" disabled={pending} onClick={onCancel} type="button" />
      <div aria-labelledby="admin-role-dialog-title" aria-modal="true" className="card relative z-10 w-full max-w-[460px] rounded-xl border border-[var(--theme-border)] p-6 shadow-2xl" role="dialog">
        <h2 className="text-base font-bold leading-snug text-[var(--theme-heading)]" id="admin-role-dialog-title">Change role for {user.name}</h2>
        <p className="mt-1.5 text-xs leading-5 text-[var(--theme-muted)]">
          Takes effect on their next request. {user.organization ? `Workspace: ${user.organization.name}.` : "This account has no workspace, so only the platform admin role is available."}
        </p>
        <div className="mt-4 space-y-2">
          {ASSIGNABLE_ROLES.map((option) => {
            const disabled = option.value !== "admin" && !user.organization;
            const selected = role === option.value;
            return (
              <label
                className={`flex items-start gap-3 rounded-[8px] border p-3 ${selected ? "border-[var(--color-primary-400)] bg-[var(--color-primary-50)]" : "border-[var(--theme-border)]"} ${disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}
                key={option.value}
              >
                <input checked={selected} className="mt-0.5" disabled={disabled || pending} name="admin-role" onChange={() => setRole(option.value)} type="radio" value={option.value} />
                <span>
                  <span className="block text-sm font-bold text-[var(--theme-heading)]">{option.label}</span>
                  <span className="block text-xs text-[var(--theme-muted)]">{option.description}</span>
                </span>
              </label>
            );
          })}
        </div>
        <div className="mt-6 flex justify-end gap-2.5">
          <button className="button-secondary h-10 rounded-[8px] px-4 text-xs" disabled={pending} onClick={onCancel} type="button">Cancel</button>
          <button className="session-blue-button h-10 px-4 text-xs" disabled={pending || role === user.role} onClick={() => onConfirm(role)} type="button">
            {pending ? "Saving…" : "Save role"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------------ */
/* Shared pieces                                                             */
/* ------------------------------------------------------------------------ */

const STATUS_META: Record<ServiceStatus, { label: string; pill: string; dot: string }> = {
  operational: { label: "Operational", pill: "border-emerald-200 bg-emerald-50 text-emerald-700", dot: "bg-emerald-500" },
  degraded: { label: "Degraded", pill: "border-amber-200 bg-amber-50 text-amber-700", dot: "bg-amber-500" },
  unavailable: { label: "Unavailable", pill: "border-rose-200 bg-rose-50 text-rose-700", dot: "bg-rose-500" },
};

function Panel({ title, description, action, children }: { title: string; description?: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="card rounded-[10px] p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-black text-[var(--theme-heading)]">{title}</h2>
          {description ? <p className="mt-1 text-xs text-[var(--theme-muted)]">{description}</p> : null}
        </div>
        {action}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function StatTile({ label, value, detail, status }: { label: string; value: ReactNode; detail: string; status: ServiceStatus }) {
  return (
    <div className="rounded-[8px] border border-[var(--theme-border)] bg-[var(--theme-panel-tint)] p-3.5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-bold text-[var(--theme-muted)]">{label}</p>
        <span aria-hidden="true" className={`size-2 rounded-full ${STATUS_META[status].dot}`} />
      </div>
      <p className="mt-1.5 text-xl font-extrabold leading-none text-[var(--theme-heading)]">{value}</p>
      <p className="mt-1.5 text-xs leading-4 text-[var(--theme-muted)]">{detail}</p>
    </div>
  );
}

function StatusPill({ status }: { status: ServiceStatus }) {
  return <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-bold ${STATUS_META[status].pill}`}>{STATUS_META[status].label}</span>;
}

function AccountStatusBadge({ suspended, since }: { suspended: boolean; since?: string }) {
  return (
    <span
      className={`inline-flex items-center rounded border px-2 py-0.5 text-xs font-bold ${suspended ? "border-rose-200 bg-rose-50 text-rose-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}
      title={suspended && since ? `Suspended ${formatDate(since)}` : undefined}
    >
      {suspended ? "Suspended" : "Active"}
    </span>
  );
}

function PlanBadge({ plan }: { plan: SubscriptionPlan }) {
  const tone =
    plan === "enterprise"
      ? "border-violet-200 bg-violet-50 text-violet-700"
      : plan === "pro"
        ? "border-sky-200 bg-sky-50 text-sky-700"
        : "border-[var(--theme-border)] bg-[var(--theme-panel-soft)] text-[var(--theme-text)]";
  return <span className={`inline-flex items-center rounded border px-2 py-0.5 text-xs font-bold ${tone}`}>{planLabel(plan)}</span>;
}

function RoleBadge({ role, label }: { role: UserRole; label: string }) {
  const tone =
    role === "admin"
      ? "border-amber-200 bg-amber-50 text-amber-700"
      : role === "organization"
        ? "border-violet-100 bg-violet-50 text-violet-700"
        : role === "interviewer"
          ? "border-sky-100 bg-sky-50 text-sky-700"
          : "border-[var(--theme-border)] bg-[var(--theme-panel-soft)] text-[var(--theme-muted)]";
  return <span className={`inline-flex items-center rounded border px-2 py-0.5 text-xs font-bold ${tone}`}>{label}</span>;
}

function SearchField({ label, placeholder, value, onChange }: { label: string; placeholder: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="group flex h-9 min-w-[220px] flex-1 items-center gap-2 rounded-[7px] border border-[var(--color-primary-300)]/70 bg-[var(--color-primary-50)]/70 px-3 text-[var(--color-primary-700)] transition focus-within:border-[var(--color-primary-500)] focus-within:bg-[var(--theme-panel)] focus-within:ring-4 focus-within:ring-[var(--theme-ring)] sm:max-w-[380px]">
      <span className="sr-only">{label}</span>
      <input
        className="min-w-0 flex-1 border-0 bg-transparent text-xs font-medium text-[var(--theme-text)] outline-none placeholder:text-[var(--theme-muted)]"
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        type="search"
        value={value}
      />
      <Icon className="pointer-events-none shrink-0 text-[var(--color-primary-700)]/70 transition group-focus-within:text-[var(--color-primary-700)]" name="search" size={15} />
    </label>
  );
}

function FilterSelect({ label, value, onChange, children }: { label: string; value: string; onChange: (value: string) => void; children: ReactNode }) {
  return (
    <label className="flex items-center gap-2 text-xs font-bold text-[var(--theme-muted)]">
      <span>{label}</span>
      <select className="control h-9 min-h-0 w-auto rounded-[7px] px-2 text-xs font-semibold" onChange={(event) => onChange(event.target.value)} value={value}>
        {children}
      </select>
    </label>
  );
}

function Pagination({ page, totalPages, total, pageSize, onChange, disabled }: { page: number; totalPages: number; total: number; pageSize: number; onChange: (page: number) => void; disabled: boolean }) {
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--theme-border)] px-5 py-3 text-xs text-[var(--theme-muted)]">
      <span>{total === 0 ? "No results" : `Showing ${from.toLocaleString()}–${to.toLocaleString()} of ${total.toLocaleString()}`}</span>
      <div className="flex items-center gap-2">
        <button className="button-secondary h-8 min-h-0 rounded-[6px] px-3 text-xs" disabled={disabled || page <= 1} onClick={() => onChange(page - 1)} type="button">Previous</button>
        <span className="font-semibold">Page {page} of {totalPages}</span>
        <button className="button-secondary h-8 min-h-0 rounded-[6px] px-3 text-xs" disabled={disabled || page >= totalPages} onClick={() => onChange(page + 1)} type="button">Next</button>
      </div>
    </div>
  );
}

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const handle = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(handle);
  }, [value, delayMs]);
  return debounced;
}

function formatDate(iso?: string): string {
  if (!iso) return "—";
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}
