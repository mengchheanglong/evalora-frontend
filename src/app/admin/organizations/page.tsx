"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminShell } from "@/components/admin-shell";
import { AccountStatusBadge, FilterSelect, type Notice, Pagination, PlanBadge, SearchField, formatDate, useDebouncedValue } from "@/components/admin-ui";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { EmptyState, ErrorState, InlineAlert, PageLoader } from "@/components/ui-states";
import { ADMIN_PAGE_SIZE, ADMIN_PLANS, ADMIN_STATUS_FILTERS, listAdminOrganizations, planLabel, setOrganizationPlan, setOrganizationSuspended } from "@/lib/admin";
import { getErrorMessage } from "@/lib/api";
import type { AdminAccountStatus, AdminOrganization, AdminPage, SubscriptionPlan } from "@/lib/types";

type OrganizationFilters = { q: string; plan: SubscriptionPlan | ""; status: AdminAccountStatus | ""; page: number };

export default function AdminOrganizationsPage() {
  return (
    <AdminShell active="organizations" description="Every workspace on the platform. Change a plan or suspend and reactivate a workspace; changes take effect on its members' next request." title="Organizations">
      <OrganizationsPanel />
    </AdminShell>
  );
}

function OrganizationsPanel() {
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
