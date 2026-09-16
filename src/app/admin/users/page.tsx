"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminShell } from "@/components/admin-shell";
import { AccountStatusBadge, FilterSelect, type Notice, Pagination, RoleBadge, SearchField, formatDate, useDebouncedValue } from "@/components/admin-ui";
import { useAuth } from "@/components/auth-provider";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { EmptyState, ErrorState, InlineAlert, PageLoader } from "@/components/ui-states";
import { ADMIN_PAGE_SIZE, ADMIN_ROLE_FILTERS, ADMIN_STATUS_FILTERS, ASSIGNABLE_ROLES, type AssignableRole, listAdminUsers, setUserRole, setUserSuspended } from "@/lib/admin";
import { getErrorMessage } from "@/lib/api";
import type { AdminAccountStatus, AdminPage, AdminUser, UserRole } from "@/lib/types";

type UserFilters = { q: string; role: UserRole | ""; status: AdminAccountStatus | ""; page: number };

export default function AdminUsersPage() {
  const { user } = useAuth();
  return (
    <AdminShell active="users" description="Every account across every workspace. Deactivate, reactivate, or change a role; changes take effect on the person's next request." title="Users">
      <UsersPanel currentUserId={user?.id ?? ""} />
    </AdminShell>
  );
}

function UsersPanel({ currentUserId }: { currentUserId: string }) {
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
