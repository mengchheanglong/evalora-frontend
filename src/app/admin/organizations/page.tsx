"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { AdminShell } from "@/components/admin-shell";
import {
  AccountStatusBadge,
  Avatar,
  CopyButton,
  DetailList,
  DetailStat,
  Drawer,
  DrawerSkeleton,
  FilterSelect,
  type Notice,
  Pagination,
  PlanBadge,
  RelativeTime,
  RoleBadge,
  SearchField,
  SectionTitle,
  SessionStatusBadge,
  SessionStatusBar,
  SkeletonRows,
  SortableHeader,
  formatDate,
  useDebouncedValue,
} from "@/components/admin-ui";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Icon } from "@/components/icons";
import { EmptyState, ErrorState, InlineAlert, PageLoader } from "@/components/ui-states";
import {
  ADMIN_ORGANIZATION_SORTS,
  ADMIN_PAGE_SIZE,
  ADMIN_PLANS,
  ADMIN_STATUS_FILTERS,
  getAdminOrganization,
  listAdminOrganizations,
  planLabel,
  setOrganizationPlan,
  setOrganizationSuspended,
} from "@/lib/admin";
import { getErrorMessage } from "@/lib/api";
import { ADMIN_HOME } from "@/lib/auth-routes";
import type {
  AdminAccountStatus,
  AdminOrganization,
  AdminOrganizationDetail,
  AdminOrganizationSort,
  AdminPage,
  AdminSortOrder,
  SubscriptionPlan,
} from "@/lib/types";

type Filters = {
  q: string;
  plan: SubscriptionPlan | "";
  status: AdminAccountStatus | "";
  sort: AdminOrganizationSort;
  order: AdminSortOrder;
  page: number;
  open: string;
};

const DEFAULT_ORDER: Record<AdminOrganizationSort, AdminSortOrder> = { createdAt: "desc", name: "asc", sessions: "desc" };

export default function AdminOrganizationsPage() {
  return (
    <AdminShell active="organizations" description="Every workspace on the platform. Open a row to see its team and activity, change its plan, or suspend it. Changes take effect on its members' next request." title="Organizations">
      <Suspense fallback={<PageLoader label="Loading organizations" />}>
        <OrganizationsPanel />
      </Suspense>
    </AdminShell>
  );
}

function parseFilters(params: URLSearchParams): Filters {
  const sort = params.get("sort");
  const order = params.get("order");
  const plan = params.get("plan");
  const status = params.get("status");
  const resolvedSort = ADMIN_ORGANIZATION_SORTS.includes(sort as AdminOrganizationSort) ? (sort as AdminOrganizationSort) : "createdAt";
  return {
    q: params.get("q") ?? "",
    plan: ADMIN_PLANS.includes(plan as SubscriptionPlan) ? (plan as SubscriptionPlan) : "",
    status: status === "active" || status === "suspended" ? status : "",
    sort: resolvedSort,
    order: order === "asc" || order === "desc" ? order : DEFAULT_ORDER[resolvedSort],
    page: Math.max(1, Number.parseInt(params.get("page") ?? "1", 10) || 1),
    open: params.get("open") ?? "",
  };
}

/**
 * The URL is the source of truth for filters, sort, page, and the open row, so
 * the browser back button, a shared link, and the overview's attention chips
 * all land on the same view.
 */
function OrganizationsPanel() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const filters = useMemo(() => parseFilters(searchParams), [searchParams]);
  const listKey = `${filters.q}|${filters.plan}|${filters.status}|${filters.sort}|${filters.order}|${filters.page}`;

  const [search, setSearch] = useState(filters.q);
  const debouncedSearch = useDebouncedValue(search.trim(), 300);
  const [data, setData] = useState<AdminPage<AdminOrganization> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState<Notice | null>(null);
  const [busyId, setBusyId] = useState("");
  const [detail, setDetail] = useState<AdminOrganizationDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");
  const [pending, setPending] = useState<AdminOrganization | null>(null);

  const setParams = useCallback(
    (patch: Partial<Record<keyof Filters, string | number | undefined>>) => {
      const next = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(patch)) {
        if (value === undefined || value === "" || value === null) next.delete(key);
        else next.set(key, String(value));
      }
      if (next.get("page") === "1") next.delete("page");
      const query = next.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  // Only the debounced input pushes a new URL; filters.q is read for the comparison.
  useEffect(() => {
    if (debouncedSearch !== filters.q) setParams({ q: debouncedSearch, page: 1 });
  }, [debouncedSearch]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    listAdminOrganizations({ q: filters.q, plan: filters.plan, status: filters.status, sort: filters.sort, order: filters.order, page: filters.page, pageSize: ADMIN_PAGE_SIZE })
      .then((next) => {
        if (!cancelled) setData(next);
      })
      .catch((requestError) => {
        if (!cancelled) setError(getErrorMessage(requestError));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // listKey folds every list-affecting filter into one dependency.
  }, [listKey]);

  useEffect(() => {
    if (!filters.open) {
      setDetail(null);
      setDetailError("");
      return;
    }
    let cancelled = false;
    setDetailLoading(true);
    setDetailError("");
    getAdminOrganization(filters.open)
      .then((next) => {
        if (!cancelled) setDetail(next);
      })
      .catch((requestError) => {
        if (!cancelled) setDetailError(getErrorMessage(requestError, "Unable to load this workspace."));
      })
      .finally(() => {
        if (!cancelled) setDetailLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [filters.open]);

  const reload = () => setParams({ page: filters.page });

  function applyUpdate(updated: AdminOrganization) {
    setData((current) => (current ? { ...current, items: current.items.map((item) => (item.id === updated.id ? { ...item, ...updated } : item)) } : current));
    setDetail((current) => (current && current.id === updated.id ? { ...current, ...updated } : current));
  }

  function onSort(key: AdminOrganizationSort) {
    const order = filters.sort === key ? (filters.order === "asc" ? "desc" : "asc") : DEFAULT_ORDER[key];
    setParams({ sort: key, order, page: 1 });
  }

  async function changePlan(organization: AdminOrganization, plan: SubscriptionPlan) {
    if (plan === organization.plan) return;
    setBusyId(organization.id);
    setNotice(null);
    try {
      const updated = await setOrganizationPlan(organization.id, plan);
      applyUpdate(updated);
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
      applyUpdate(updated);
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

  const activeFilters = Number(Boolean(filters.q)) + Number(Boolean(filters.plan)) + Number(Boolean(filters.status));
  const closeDrawer = useCallback(() => setParams({ open: undefined }), [setParams]);

  return (
    <div className="space-y-4">
      {notice ? <InlineAlert tone={notice.tone}>{notice.text}</InlineAlert> : null}

      <section className="card overflow-hidden rounded-[10px]">
        <div className="flex flex-wrap items-center gap-3 border-b border-[var(--theme-border)] px-4 py-3 sm:px-5">
          <SearchField label="Search organizations" onChange={setSearch} placeholder="Search by workspace name or owner email…" value={search} />
          <FilterSelect label="Plan" onChange={(value) => setParams({ plan: value, page: 1 })} value={filters.plan}>
            <option value="">Any plan</option>
            {ADMIN_PLANS.map((plan) => (
              <option key={plan} value={plan}>{planLabel(plan)}</option>
            ))}
          </FilterSelect>
          <FilterSelect label="Status" onChange={(value) => setParams({ status: value, page: 1 })} value={filters.status}>
            {ADMIN_STATUS_FILTERS.map((option) => (
              <option key={option.value || "any"} value={option.value}>{option.label}</option>
            ))}
          </FilterSelect>
          {activeFilters ? (
            <button
              className="text-xs font-bold text-[var(--color-primary-700)] hover:text-[var(--color-primary-600)]"
              onClick={() => {
                setSearch("");
                setParams({ q: undefined, plan: undefined, status: undefined, page: 1 });
              }}
              type="button"
            >
              Clear {activeFilters === 1 ? "filter" : `${activeFilters} filters`}
            </button>
          ) : null}
          <span aria-live="polite" className="ml-auto text-xs font-semibold text-[var(--theme-faint)]">
            {data ? `${data.total.toLocaleString()} ${data.total === 1 ? "workspace" : "workspaces"}` : ""}
          </span>
        </div>

        {loading && !data ? <SkeletonRows label="Loading organizations" /> : null}
        {!data && !loading ? <ErrorState message={error || "Organizations are unavailable right now."} onRetry={reload} /> : null}
        {data ? (
          <>
            {error ? <div className="px-5 pt-4"><InlineAlert tone="error">{error}</InlineAlert></div> : null}
            {data.items.length === 0 ? (
              <div className="p-6">
                <EmptyState description="No workspace matches this search. Try another name or owner email, or clear the filters." icon="globe" title="No organizations found" />
              </div>
            ) : (
              <div aria-busy={loading} className={`transition-opacity ${loading ? "opacity-60" : ""}`}>
                <div className="hidden overflow-x-auto md:block">
                  <table className="w-full min-w-[900px] text-left text-sm">
                    <thead className="sticky top-0 z-[1] bg-[var(--theme-panel)] text-xs font-bold text-[var(--theme-muted)]">
                      <tr className="border-b border-[var(--theme-border)]">
                        <SortableHeader className="px-5 py-3" label="Organization" onSort={onSort} order={filters.order} sort={filters.sort} sortKey="name" />
                        <th className="px-3 py-3" scope="col">Owner</th>
                        <th className="px-3 py-3" scope="col">Plan</th>
                        <th className="px-3 py-3 text-right" scope="col">Members</th>
                        <SortableHeader align="right" className="px-3 py-3" label="Sessions" onSort={onSort} order={filters.order} sort={filters.sort} sortKey="sessions" />
                        <SortableHeader className="px-3 py-3" label="Joined" onSort={onSort} order={filters.order} sort={filters.sort} sortKey="createdAt" />
                        <th className="px-3 py-3" scope="col">Status</th>
                        <th className="px-5 py-3 text-right" scope="col"><span className="sr-only">Open</span></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--theme-border)]">
                      {data.items.map((organization) => {
                        const selected = filters.open === organization.id;
                        return (
                          <tr
                            aria-selected={selected}
                            className={`cursor-pointer align-middle transition ${selected ? "bg-[var(--theme-active)]/30" : "hover:bg-[var(--theme-panel-tint)]"}`}
                            key={organization.id}
                            onClick={() => setParams({ open: organization.id })}
                          >
                            <td className="px-5 py-3">
                              <button className="text-left font-bold text-[var(--theme-heading)] hover:underline" onClick={(event) => { event.stopPropagation(); setParams({ open: organization.id }); }} type="button">
                                {organization.name}
                              </button>
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
                                <span className="text-xs font-semibold text-amber-700">No owner account</span>
                              )}
                            </td>
                            <td className="px-3 py-3"><PlanBadge plan={organization.plan} /></td>
                            <td className="px-3 py-3 text-right tabular-nums text-[var(--theme-text)]">{organization.memberCount.toLocaleString()}</td>
                            <td className="px-3 py-3 text-right tabular-nums text-[var(--theme-text)]">{organization.sessionCount.toLocaleString()}</td>
                            <td className="px-3 py-3 text-[var(--theme-muted)]"><RelativeTime iso={organization.createdAt} /></td>
                            <td className="px-3 py-3"><AccountStatusBadge since={organization.suspendedAt} suspended={organization.isSuspended} /></td>
                            <td className="px-5 py-3 text-right text-[var(--theme-faint)]"><Icon className="-rotate-90 inline" name="chevron" size={14} /></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <ul className="divide-y divide-[var(--theme-border)] md:hidden">
                  {data.items.map((organization) => (
                    <li key={organization.id}>
                      <button className="flex w-full items-start gap-3 px-4 py-3 text-left" onClick={() => setParams({ open: organization.id })} type="button">
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-2">
                            <span className="truncate text-sm font-bold text-[var(--theme-heading)]">{organization.name}</span>
                            <PlanBadge plan={organization.plan} />
                          </span>
                          <span className="mt-0.5 block truncate text-xs text-[var(--theme-muted)]">{organization.owner?.email ?? "No owner account"}</span>
                          <span className="mt-1 block text-xs text-[var(--theme-faint)]">
                            {organization.memberCount} members · {organization.sessionCount} sessions · joined <RelativeTime iso={organization.createdAt} />
                          </span>
                        </span>
                        <AccountStatusBadge suspended={organization.isSuspended} />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <Pagination disabled={loading} onChange={(page) => setParams({ page })} page={data.page} pageSize={data.pageSize} total={data.total} totalPages={data.totalPages} />
          </>
        ) : null}
      </section>

      <Drawer
        onClose={closeDrawer}
        open={Boolean(filters.open)}
        subtitle={
          detail ? (
            <>
              <PlanBadge plan={detail.plan} />
              <AccountStatusBadge since={detail.suspendedAt} suspended={detail.isSuspended} />
              {detail.isCurrentWorkspace ? <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[11px] font-bold text-amber-700">Your workspace</span> : null}
              <CopyButton label="Copy ID" value={detail.id} />
            </>
          ) : null
        }
        title={detail?.name ?? (detailLoading ? "Loading workspace…" : "Workspace")}
        footer={
          detail ? (
            <OrganizationActions
              busy={busyId === detail.id}
              onChangePlan={(plan) => void changePlan(detail, plan)}
              onToggleSuspension={() => setPending(detail)}
              organization={detail}
            />
          ) : null
        }
      >
        {detailLoading && !detail ? <DrawerSkeleton /> : null}
        {detailError && !detail ? <InlineAlert tone="error">{detailError}</InlineAlert> : null}
        {detail ? <OrganizationDetailBody detail={detail} /> : null}
      </Drawer>

      <ConfirmDialog
        challenge={pending && !pending.isSuspended ? { label: `Type ${pending.name} to confirm`, expected: pending.name } : undefined}
        confirmLabel={pending?.isSuspended ? "Reactivate workspace" : "Suspend workspace"}
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

function OrganizationDetailBody({ detail }: { detail: AdminOrganizationDetail }) {
  const totalSessions = Object.values(detail.sessionsByStatus).reduce((sum, count) => sum + count, 0);
  return (
    <>
      <div className="grid grid-cols-3 gap-3">
        <DetailStat label="Members" value={detail.memberCount.toLocaleString()} hint="owners and interviewers" />
        <DetailStat label="Sessions" value={detail.sessionCount.toLocaleString()} hint="all-time" />
        <DetailStat label="Templates" value={detail.templateCount.toLocaleString()} hint={`${detail.draftCount} AI ${detail.draftCount === 1 ? "draft" : "drafts"}`} />
      </div>

      <DetailList
        items={[
          {
            label: "Owner",
            value: detail.owner ? (
              <Link className="font-semibold text-[var(--color-primary-700)] hover:underline" href={`${ADMIN_HOME}/users?open=${encodeURIComponent(detail.owner.id)}`}>
                {detail.owner.name} · {detail.owner.email}
              </Link>
            ) : (
              <span className="font-semibold text-amber-700">No owner account. Promote a member from the Users page.</span>
            ),
          },
          { label: "Created", value: <>{formatDate(detail.createdAt)} · <RelativeTime className="text-[var(--theme-muted)]" iso={detail.createdAt} /></> },
          { label: "Last activity", value: detail.lastActivityAt ? <RelativeTime iso={detail.lastActivityAt} /> : <span className="text-[var(--theme-muted)]">No sessions yet</span> },
          ...(detail.isSuspended ? [{ label: "Suspended", value: <><RelativeTime iso={detail.suspendedAt} /> · members are blocked on their next request</> }] : []),
        ]}
      />

      <section>
        <SectionTitle>Sessions by state</SectionTitle>
        <div className="mt-3">
          {totalSessions > 0 ? <SessionStatusBar counts={detail.sessionsByStatus} /> : <p className="text-xs text-[var(--theme-muted)]">This workspace has not created a session yet.</p>}
        </div>
      </section>

      <section>
        <SectionTitle>Team</SectionTitle>
        {detail.members.length ? (
          <ul className="mt-3 divide-y divide-[var(--theme-border)] rounded-[8px] border border-[var(--theme-border)]">
            {detail.members.map((member) => (
              <li key={member.id}>
                <Link className="flex items-center gap-3 px-3 py-2.5 transition hover:bg-[var(--theme-panel-tint)]" href={`${ADMIN_HOME}/users?open=${encodeURIComponent(member.id)}`}>
                  <Avatar name={member.name} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold text-[var(--theme-heading)]">{member.name}</span>
                    <span className="block truncate text-xs text-[var(--theme-muted)]">
                      {member.email}
                      {!member.emailVerified ? " · not verified" : ""}
                    </span>
                  </span>
                  <RoleBadge label={member.roleLabel} role={member.role} />
                  {member.isSuspended ? <AccountStatusBadge suspended /> : null}
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-xs text-[var(--theme-muted)]">No staff accounts are attached to this workspace.</p>
        )}
      </section>

      <section>
        <SectionTitle>Recent sessions</SectionTitle>
        {detail.recentSessions.length ? (
          <ul className="mt-3 divide-y divide-[var(--theme-border)] rounded-[8px] border border-[var(--theme-border)]">
            {detail.recentSessions.map((session) => (
              <li className="flex items-center gap-3 px-3 py-2.5" key={session.id}>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-[var(--theme-heading)]">{session.title ?? session.templateTitle}</span>
                  <span className="block truncate text-xs text-[var(--theme-muted)]">
                    {session.candidateName} · {session.templateTitle} · <RelativeTime iso={session.createdAt} />
                  </span>
                </span>
                <SessionStatusBadge status={session.status} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-xs text-[var(--theme-muted)]">No sessions yet.</p>
        )}
      </section>
    </>
  );
}

function OrganizationActions({
  organization,
  busy,
  onChangePlan,
  onToggleSuspension,
}: {
  organization: AdminOrganization;
  busy: boolean;
  onChangePlan: (plan: SubscriptionPlan) => void;
  onToggleSuspension: () => void;
}) {
  const suspendBlocked = !organization.isSuspended && organization.isCurrentWorkspace;
  return (
    <div className="flex flex-wrap items-center gap-3">
      <label className="flex items-center gap-2 text-xs font-bold text-[var(--theme-muted)]">
        Plan
        <select
          className="control h-9 min-h-0 w-auto rounded-[7px] px-2 text-xs font-semibold"
          disabled={busy}
          onChange={(event) => onChangePlan(event.target.value as SubscriptionPlan)}
          value={organization.plan}
        >
          {ADMIN_PLANS.map((plan) => (
            <option key={plan} value={plan}>{planLabel(plan)}</option>
          ))}
        </select>
      </label>
      <button
        className={`ml-auto rounded-[7px] border px-3 py-2 text-xs font-bold transition disabled:cursor-not-allowed disabled:opacity-50 ${
          organization.isSuspended ? "border-emerald-200 text-emerald-700 hover:bg-emerald-50" : "border-rose-200 text-rose-600 hover:bg-rose-50"
        }`}
        disabled={busy || suspendBlocked}
        onClick={onToggleSuspension}
        title={suspendBlocked ? "You cannot suspend your own workspace." : undefined}
        type="button"
      >
        {busy ? "Working…" : organization.isSuspended ? "Reactivate workspace" : "Suspend workspace"}
      </button>
    </div>
  );
}
