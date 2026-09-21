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
  FilterChips,
  FilterSelect,
  type Notice,
  Pagination,
  RelativeTime,
  RoleBadge,
  SearchField,
  SectionTitle,
  SessionStatusBadge,
  SkeletonRows,
  SortableHeader,
  formatDate,
  useDebouncedValue,
} from "@/components/admin-ui";
import { useAuth } from "@/components/auth-provider";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Icon } from "@/components/icons";
import { EmptyState, ErrorState, InlineAlert, PageLoader } from "@/components/ui-states";
import {
  ADMIN_PAGE_SIZE,
  ADMIN_ROLE_FILTERS,
  ADMIN_STATUS_FILTERS,
  ADMIN_USER_SORTS,
  ASSIGNABLE_ROLES,
  type AssignableRole,
  getAdminUser,
  listAdminUsers,
  setUserRole,
  setUserSuspended,
} from "@/lib/admin";
import { getErrorMessage } from "@/lib/api";
import { ADMIN_HOME } from "@/lib/auth-routes";
import type { AdminAccountStatus, AdminPage, AdminSortOrder, AdminUser, AdminUserDetail, AdminUserSort, UserRole } from "@/lib/types";

type Filters = {
  q: string;
  role: UserRole | "";
  status: AdminAccountStatus | "";
  sort: AdminUserSort;
  order: AdminSortOrder;
  page: number;
  open: string;
};

const DEFAULT_ORDER: Record<AdminUserSort, AdminSortOrder> = { createdAt: "desc", name: "asc", email: "asc" };
const ROLE_VALUES: UserRole[] = ["admin", "organization", "interviewer", "candidate"];

export default function AdminUsersPage() {
  const { user } = useAuth();
  return (
    <AdminShell active="users" description="Every account across every workspace. Open a row to see what the person has done, deactivate or reactivate them, or change their role. Changes take effect on their next request." title="Users">
      <Suspense fallback={<PageLoader label="Loading users" />}>
        <UsersPanel currentUserId={user?.id ?? ""} />
      </Suspense>
    </AdminShell>
  );
}

function parseFilters(params: URLSearchParams): Filters {
  const sort = params.get("sort");
  const order = params.get("order");
  const role = params.get("role");
  const status = params.get("status");
  const resolvedSort = ADMIN_USER_SORTS.includes(sort as AdminUserSort) ? (sort as AdminUserSort) : "createdAt";
  return {
    q: params.get("q") ?? "",
    role: ROLE_VALUES.includes(role as UserRole) ? (role as UserRole) : "",
    status: status === "active" || status === "suspended" ? status : "",
    sort: resolvedSort,
    order: order === "asc" || order === "desc" ? order : DEFAULT_ORDER[resolvedSort],
    page: Math.max(1, Number.parseInt(params.get("page") ?? "1", 10) || 1),
    open: params.get("open") ?? "",
  };
}

function UsersPanel({ currentUserId }: { currentUserId: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const filters = useMemo(() => parseFilters(searchParams), [searchParams]);
  const listKey = `${filters.q}|${filters.role}|${filters.status}|${filters.sort}|${filters.order}|${filters.page}`;

  const [search, setSearch] = useState(filters.q);
  const debouncedSearch = useDebouncedValue(search.trim(), 300);
  const [data, setData] = useState<AdminPage<AdminUser> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState<Notice | null>(null);
  const [busyId, setBusyId] = useState("");
  const [detail, setDetail] = useState<AdminUserDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");
  const [pendingStatus, setPendingStatus] = useState<AdminUser | null>(null);

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
    listAdminUsers({ q: filters.q, role: filters.role, status: filters.status, sort: filters.sort, order: filters.order, page: filters.page, pageSize: ADMIN_PAGE_SIZE })
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
    getAdminUser(filters.open)
      .then((next) => {
        if (!cancelled) setDetail(next);
      })
      .catch((requestError) => {
        if (!cancelled) setDetailError(getErrorMessage(requestError, "Unable to load this account."));
      })
      .finally(() => {
        if (!cancelled) setDetailLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [filters.open]);

  function applyUpdate(updated: AdminUser) {
    setData((current) => (current ? { ...current, items: current.items.map((item) => (item.id === updated.id ? { ...item, ...updated } : item)) } : current));
    setDetail((current) => (current && current.id === updated.id ? { ...current, ...updated } : current));
  }

  function onSort(key: AdminUserSort) {
    const order = filters.sort === key ? (filters.order === "asc" ? "desc" : "asc") : DEFAULT_ORDER[key];
    setParams({ sort: key, order, page: 1 });
  }

  async function confirmStatus() {
    if (!pendingStatus) return;
    const target = pendingStatus;
    setBusyId(target.id);
    setNotice(null);
    try {
      const updated = await setUserSuspended(target.id, !target.isSuspended);
      applyUpdate(updated);
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

  async function saveRole(target: AdminUser, role: AssignableRole) {
    setBusyId(target.id);
    setNotice(null);
    try {
      const updated = await setUserRole(target.id, role);
      applyUpdate(updated);
      setNotice({ tone: "success", text: `${updated.name} is now ${updated.roleLabel.toLowerCase()}.` });
    } catch (requestError) {
      setNotice({ tone: "error", text: getErrorMessage(requestError, "Unable to change this role.") });
    } finally {
      setBusyId("");
    }
  }

  const activeFilters = Number(Boolean(filters.q)) + Number(Boolean(filters.role)) + Number(Boolean(filters.status));
  const closeDrawer = useCallback(() => setParams({ open: undefined }), [setParams]);
  const detailIsSelf = Boolean(detail && (detail.isCurrentUser || detail.id === currentUserId));

  return (
    <div className="space-y-4">
      {notice ? <InlineAlert tone={notice.tone}>{notice.text}</InlineAlert> : null}

      <section className="card overflow-hidden rounded-[10px]">
        <div className="flex flex-wrap items-center gap-3 border-b border-[var(--theme-border)] px-4 py-3 sm:px-5">
          <SearchField label="Search users" onChange={setSearch} placeholder="Search by name or email…" value={search} />
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
                setParams({ q: undefined, role: undefined, status: undefined, page: 1 });
              }}
              type="button"
            >
              Clear {activeFilters === 1 ? "filter" : `${activeFilters} filters`}
            </button>
          ) : null}
          <span aria-live="polite" className="ml-auto text-xs font-semibold text-[var(--theme-faint)]">
            {data ? `${data.total.toLocaleString()} ${data.total === 1 ? "account" : "accounts"}` : ""}
          </span>
        </div>
        <div className="border-b border-[var(--theme-border)] bg-[var(--theme-panel-soft)]/55 px-4 py-2.5 sm:px-5">
          <FilterChips label="Role" onChange={(value) => setParams({ role: value, page: 1 })} options={ADMIN_ROLE_FILTERS} value={filters.role} />
        </div>

        {loading && !data ? <SkeletonRows label="Loading users" /> : null}
        {!data && !loading ? <ErrorState message={error || "Users are unavailable right now."} onRetry={() => setParams({ page: filters.page })} /> : null}
        {data ? (
          <>
            {error ? <div className="px-5 pt-4"><InlineAlert tone="error">{error}</InlineAlert></div> : null}
            {data.items.length === 0 ? (
              <div className="p-6">
                <EmptyState description="No account matches this search. Try another name or email, or widen the role filter." icon="users" title="No users found" />
              </div>
            ) : (
              <div aria-busy={loading} className={`transition-opacity ${loading ? "opacity-60" : ""}`}>
                <div className="hidden overflow-x-auto md:block">
                  <table className="w-full min-w-[860px] text-left text-sm">
                    <thead className="sticky top-0 z-[1] bg-[var(--theme-panel)] text-xs font-bold text-[var(--theme-muted)]">
                      <tr className="border-b border-[var(--theme-border)]">
                        <SortableHeader className="px-5 py-3" label="Person" onSort={onSort} order={filters.order} sort={filters.sort} sortKey="name" />
                        <th className="px-3 py-3" scope="col">Workspace</th>
                        <th className="px-3 py-3" scope="col">Role</th>
                        <SortableHeader className="px-3 py-3" label="Joined" onSort={onSort} order={filters.order} sort={filters.sort} sortKey="createdAt" />
                        <th className="px-3 py-3" scope="col">Status</th>
                        <th className="px-5 py-3 text-right" scope="col"><span className="sr-only">Open</span></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--theme-border)]">
                      {data.items.map((account) => {
                        const isSelf = account.isCurrentUser || account.id === currentUserId;
                        const selected = filters.open === account.id;
                        return (
                          <tr
                            aria-selected={selected}
                            className={`cursor-pointer align-middle transition ${selected ? "bg-[var(--theme-active)]/30" : "hover:bg-[var(--theme-panel-tint)]"}`}
                            key={account.id}
                            onClick={() => setParams({ open: account.id })}
                          >
                            <td className="px-5 py-3">
                              <div className="flex items-center gap-3">
                                <Avatar name={account.name} />
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2">
                                    <button className="truncate text-left font-bold text-[var(--theme-heading)] hover:underline" onClick={(event) => { event.stopPropagation(); setParams({ open: account.id }); }} type="button">
                                      {account.name}
                                    </button>
                                    {isSelf ? <span className="shrink-0 rounded bg-amber-50 px-1.5 py-0.5 text-[11px] font-bold text-amber-700">You</span> : null}
                                  </div>
                                  <div className="truncate text-xs text-[var(--theme-muted)]">
                                    {account.email}
                                    {!account.emailVerified && account.role !== "candidate" ? " · not verified" : ""}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-3 py-3">
                              {account.organization ? (
                                <>
                                  <div className="font-medium text-[var(--theme-text)]">{account.organization.name}</div>
                                  {account.organization.isSuspended ? <div className="text-xs font-semibold text-rose-600">Workspace suspended</div> : null}
                                </>
                              ) : (
                                <span className="text-xs text-[var(--theme-faint)]">{account.role === "candidate" ? "Invite-only record" : "No workspace"}</span>
                              )}
                            </td>
                            <td className="px-3 py-3"><RoleBadge label={account.roleLabel} role={account.role} /></td>
                            <td className="px-3 py-3 text-[var(--theme-muted)]"><RelativeTime iso={account.createdAt} /></td>
                            <td className="px-3 py-3"><AccountStatusBadge since={account.suspendedAt} suspended={account.isSuspended} /></td>
                            <td className="px-5 py-3 text-right text-[var(--theme-faint)]"><Icon className="-rotate-90 inline" name="chevron" size={14} /></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <ul className="divide-y divide-[var(--theme-border)] md:hidden">
                  {data.items.map((account) => (
                    <li key={account.id}>
                      <button className="flex w-full items-center gap-3 px-4 py-3 text-left" onClick={() => setParams({ open: account.id })} type="button">
                        <Avatar name={account.name} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-bold text-[var(--theme-heading)]">{account.name}</span>
                          <span className="block truncate text-xs text-[var(--theme-muted)]">{account.email}</span>
                          <span className="mt-1 flex flex-wrap items-center gap-1.5">
                            <RoleBadge label={account.roleLabel} role={account.role} />
                            <AccountStatusBadge suspended={account.isSuspended} />
                          </span>
                        </span>
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
              <RoleBadge label={detail.roleLabel} role={detail.role} />
              <AccountStatusBadge since={detail.suspendedAt} suspended={detail.isSuspended} />
              {detailIsSelf ? <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[11px] font-bold text-amber-700">You</span> : null}
              <CopyButton label="Copy email" value={detail.email} />
            </>
          ) : null
        }
        title={detail?.name ?? (detailLoading ? "Loading account…" : "Account")}
        footer={
          detail && !detailIsSelf ? (
            <button
              className={`w-full rounded-[7px] border px-3 py-2 text-xs font-bold transition disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto ${
                detail.isSuspended ? "border-emerald-200 text-emerald-700 hover:bg-emerald-50" : "border-rose-200 text-rose-600 hover:bg-rose-50"
              }`}
              disabled={busyId === detail.id}
              onClick={() => setPendingStatus(detail)}
              type="button"
            >
              {busyId === detail.id ? "Working…" : detail.isSuspended ? "Reactivate account" : "Deactivate account"}
            </button>
          ) : detail ? (
            <p className="text-xs text-[var(--theme-muted)]">This is your own account. Another admin has to change its role or status.</p>
          ) : null
        }
      >
        {detailLoading && !detail ? <DrawerSkeleton /> : null}
        {detailError && !detail ? <InlineAlert tone="error">{detailError}</InlineAlert> : null}
        {detail ? <UserDetailBody busy={busyId === detail.id} detail={detail} isSelf={detailIsSelf} onSaveRole={(role) => void saveRole(detail, role)} /> : null}
      </Drawer>

      <ConfirmDialog
        confirmLabel={pendingStatus?.isSuspended ? "Reactivate account" : "Deactivate account"}
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
    </div>
  );
}

function UserDetailBody({ detail, isSelf, busy, onSaveRole }: { detail: AdminUserDetail; isSelf: boolean; busy: boolean; onSaveRole: (role: AssignableRole) => void }) {
  const isCandidate = detail.role === "candidate";
  const [role, setRole] = useState<AssignableRole>(detail.role === "candidate" ? "interviewer" : detail.role);

  useEffect(() => {
    if (detail.role !== "candidate") setRole(detail.role);
  }, [detail.role]);

  return (
    <>
      <div className="grid grid-cols-3 gap-3">
        <DetailStat label="Sessions created" value={detail.createdSessionCount.toLocaleString()} hint="as interviewer or owner" />
        <DetailStat label="Sessions sat" value={detail.candidateSessionCount.toLocaleString()} hint="as candidate" />
        <DetailStat label="Templates" value={detail.templateCount.toLocaleString()} hint="authored" />
      </div>

      <DetailList
        items={[
          {
            label: "Workspace",
            value: detail.organization ? (
              <Link className="font-semibold text-[var(--color-primary-700)] hover:underline" href={`${ADMIN_HOME}/organizations?open=${encodeURIComponent(detail.organization.id)}`}>
                {detail.organization.name}
                {detail.organization.isSuspended ? <span className="ml-2 rounded bg-rose-50 px-1.5 py-0.5 text-[11px] font-bold text-rose-700">Suspended</span> : null}
              </Link>
            ) : (
              <span className="text-[var(--theme-muted)]">{isCandidate ? "Invite-only candidate record" : "No workspace"}</span>
            ),
          },
          { label: "Email", value: <>{detail.email}{isCandidate ? "" : detail.emailVerified ? " · verified" : " · not verified"}</> },
          { label: "Joined", value: <>{formatDate(detail.createdAt)} · <RelativeTime className="text-[var(--theme-muted)]" iso={detail.createdAt} /></> },
          { label: "Last activity", value: detail.lastActivityAt ? <RelativeTime iso={detail.lastActivityAt} /> : <span className="text-[var(--theme-muted)]">No session activity</span> },
          ...(detail.isSuspended ? [{ label: "Deactivated", value: <RelativeTime iso={detail.suspendedAt} /> }] : []),
        ]}
      />

      <section>
        <SectionTitle>Role</SectionTitle>
        {isCandidate ? (
          <p className="mt-3 text-xs leading-5 text-[var(--theme-muted)]">Candidate records are invite-only and carry no workspace role. Invite this person to a workspace to give them a staff account.</p>
        ) : isSelf ? (
          <p className="mt-3 text-xs leading-5 text-[var(--theme-muted)]">You cannot change your own role.</p>
        ) : (
          <div className="mt-3 space-y-2">
            {ASSIGNABLE_ROLES.map((option) => {
              const disabled = option.value !== "admin" && !detail.organization;
              const selected = role === option.value;
              return (
                <label
                  className={`flex items-start gap-3 rounded-[8px] border p-3 ${selected ? "border-[var(--color-primary-400)] bg-[var(--color-primary-50)]" : "border-[var(--theme-border)]"} ${disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}
                  key={option.value}
                >
                  <input checked={selected} className="mt-0.5" disabled={disabled || busy} name="admin-role" onChange={() => setRole(option.value)} type="radio" value={option.value} />
                  <span>
                    <span className="block text-sm font-bold text-[var(--theme-heading)]">{option.label}</span>
                    <span className="block text-xs text-[var(--theme-muted)]">{option.description}</span>
                  </span>
                </label>
              );
            })}
            {!detail.organization ? <p className="text-xs text-[var(--theme-faint)]">This account has no workspace, so only the platform admin role is available.</p> : null}
            <button className="session-blue-button h-9 px-4 text-xs" disabled={busy || role === detail.role} onClick={() => onSaveRole(role)} type="button">
              {busy ? "Saving…" : "Save role"}
            </button>
          </div>
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
          <p className="mt-3 text-xs text-[var(--theme-muted)]">No sessions involve this account yet.</p>
        )}
      </section>
    </>
  );
}
