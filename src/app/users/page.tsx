"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { useAuth } from "@/components/auth-provider";
import { Icon } from "@/components/icons";
import { EmptyState, InlineAlert, PageLoader } from "@/components/ui-states";
import { apiDelete, apiGet, apiPost, getErrorMessage } from "@/lib/api";
import type { WorkspaceInvite, WorkspaceMember } from "@/lib/types";

export default function UsersAndRolesPage() {
  const { user, status } = useAuth();
  const router = useRouter();
  const isOwner = user?.role === "organization" || user?.role === "admin";

  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [invites, setInvites] = useState<WorkspaceInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviting, setInviting] = useState(false);
  const [lastInviteLink, setLastInviteLink] = useState("");
  const [busyId, setBusyId] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const nextMembers = await apiGet<WorkspaceMember[]>("/organization/members");
      setMembers(nextMembers);
      if (isOwner) {
        const nextInvites = await apiGet<WorkspaceInvite[]>("/organization/invites");
        setInvites(nextInvites);
      } else {
        setInvites([]);
      }
    } catch (requestError) {
      setError(getErrorMessage(requestError, "Unable to load workspace members."));
    } finally {
      setLoading(false);
    }
  }, [isOwner]);

  useEffect(() => {
    if (status === "authenticated") void load();
  }, [status, load]);

  useEffect(() => {
    if (status === "authenticated" && user && user.role === "interviewer") {
      // Interviewers can view the member list but primary nav is owner-focused; allow read-only.
    }
  }, [status, user]);

  const pendingInvites = useMemo(() => invites.filter((invite) => invite.status === "pending"), [invites]);
  const ownerCount = members.filter((member) => member.role === "organization").length;
  const interviewerCount = members.filter((member) => member.role === "interviewer").length;

  async function handleInvite(event: FormEvent) {
    event.preventDefault();
    if (!isOwner) return;
    setInviting(true);
    setActionError("");
    setActionMessage("");
    setLastInviteLink("");
    try {
      const invite = await apiPost<WorkspaceInvite>("/organization/invites", { email: inviteEmail.trim() });
      const link = invite.inviteUrl || `${window.location.origin}${invite.inviteUrlPath}`;
      setLastInviteLink(link);
      const delivery = invite.emailDelivery;
      if (delivery?.status === "sent") {
        setActionMessage(`Invitation emailed to ${invite.email}. You can still copy the link below — it expires in 7 days.`);
      } else if (delivery?.status === "queued") {
        setActionMessage(`Invitation created for ${invite.email}. Email is sending in the background — copy the link below as backup.`);
      } else if (delivery?.status === "failed") {
        setActionMessage(`Invite created for ${invite.email}, but email failed (${delivery.reason ?? "unknown"}). Share the link below.`);
      } else {
        setActionMessage(
          `Invitation created for ${invite.email}. ${delivery?.reason ?? "Email is not configured — share the link below."} Expires in 7 days.`,
        );
      }
      setInviteEmail("");
      await load();
    } catch (requestError) {
      setActionError(getErrorMessage(requestError, "Unable to create invitation."));
    } finally {
      setInviting(false);
    }
  }

  async function handleCancelInvite(inviteId: string) {
    setBusyId(inviteId);
    setActionError("");
    try {
      await apiDelete(`/organization/invites/${encodeURIComponent(inviteId)}`);
      setActionMessage("Invitation cancelled.");
      await load();
    } catch (requestError) {
      setActionError(getErrorMessage(requestError, "Unable to cancel invitation."));
    } finally {
      setBusyId("");
    }
  }

  async function handleRemoveMember(memberId: string) {
    if (!window.confirm("Remove this interviewer from the workspace? They will lose access immediately.")) return;
    setBusyId(memberId);
    setActionError("");
    try {
      await apiDelete(`/organization/members/${encodeURIComponent(memberId)}`);
      setActionMessage("Member removed from the workspace.");
      await load();
    } catch (requestError) {
      setActionError(getErrorMessage(requestError, "Unable to remove member."));
    } finally {
      setBusyId("");
    }
  }

  async function copyLink(link: string) {
    try {
      await navigator.clipboard.writeText(link);
      setActionMessage("Invite link copied to clipboard.");
    } catch {
      setActionError("Could not copy the link. Select and copy it manually.");
    }
  }

  if (status === "loading" || loading) {
    return (
      <AppShell active="users" title="Team" description="Workspace members and invitations.">
        <PageLoader label="Loading team" />
      </AppShell>
    );
  }

  if (error) {
    return (
      <AppShell active="users" title="Team" description="Workspace members and invitations.">
        <InlineAlert tone="error">{error}</InlineAlert>
        <button className="button-secondary mt-4 h-10 px-4 text-[12px]" onClick={() => void load()} type="button">
          Retry
        </button>
      </AppShell>
    );
  }

  return (
    <AppShell
      active="users"
      description="One organization, many people. The owner invites interviewers to share templates, sessions, and reports."
      title="Team"
    >
      <div className="space-y-5">
        <section className="grid gap-3 sm:grid-cols-3">
          <StatCard detail="Workspace accounts" label="Total members" value={String(members.length)} />
          <StatCard detail="Can invite teammates" label="Owners" value={String(ownerCount)} />
          <StatCard detail="Shared workspace access" label="Interviewers" value={String(interviewerCount)} />
        </section>

        {actionError ? <InlineAlert tone="error">{actionError}</InlineAlert> : null}
        {actionMessage ? <InlineAlert tone="success">{actionMessage}</InlineAlert> : null}

        {isOwner ? (
          <section className="card rounded-[10px] p-5">
            <h2 className="text-[15px] font-black text-neutral-900">Invite interviewer</h2>
            <p className="mt-1 text-[12px] text-neutral-600">
              We email a private invite when Resend is configured. They set their own password and join this organization — not a new company workspace. You can always copy the link if email is skipped.
            </p>
            <form className="mt-4 flex flex-col gap-3 sm:flex-row" onSubmit={handleInvite}>
              <input
                className="control h-11 flex-1 rounded-[8px] px-4 text-[13px]"
                onChange={(event) => setInviteEmail(event.target.value)}
                placeholder="colleague@company.com"
                required
                type="email"
                value={inviteEmail}
              />
              <button className="session-blue-button h-11 shrink-0 px-5 text-[12px]" disabled={inviting} type="submit">
                {inviting ? "Creating…" : "Create invite"}
              </button>
            </form>
            {lastInviteLink ? (
              <div className="mt-4 rounded-[8px] border border-primary-100 bg-primary-50/50 p-3">
                <p className="text-[11px] font-bold text-primary-800">Invite link (share securely)</p>
                <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
                  <code className="block flex-1 break-all text-[12px] text-neutral-800">{lastInviteLink}</code>
                  <button className="button-secondary h-9 shrink-0 rounded-[7px] px-3 text-[11px]" onClick={() => void copyLink(lastInviteLink)} type="button">
                    Copy link
                  </button>
                </div>
              </div>
            ) : null}
          </section>
        ) : (
          <InlineAlert tone="info">Only the workspace owner can invite or remove teammates. You can view who shares this organization.</InlineAlert>
        )}

        <section className="card overflow-hidden rounded-[10px]">
          <div className="border-b border-neutral-100 px-5 py-4">
            <h2 className="text-[15px] font-black text-neutral-900">Members</h2>
            <p className="mt-1 text-[11px] text-neutral-500">Everyone listed here shares the same templates, candidates, and reports.</p>
          </div>
          {members.length === 0 ? (
            <div className="p-6">
              <EmptyState title="No members yet" description="Your workspace members will appear here." />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-[12px]">
                <thead className="bg-white text-[11px] font-bold text-neutral-500">
                  <tr className="border-b border-neutral-100">
                    <th className="px-5 py-3">Person</th>
                    <th className="px-3 py-3">Email</th>
                    <th className="px-3 py-3">Role</th>
                    <th className="px-3 py-3">Joined</th>
                    {isOwner ? <th className="px-3 py-3 text-right">Actions</th> : null}
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {members.map((member) => (
                    <tr className="h-[60px]" key={member.id}>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-neutral-900">{member.name}</span>
                          {member.isCurrentUser ? (
                            <span className="rounded bg-primary-50 px-1.5 py-0.5 text-[10px] font-bold text-primary-700">You</span>
                          ) : null}
                        </div>
                      </td>
                      <td className="px-3 py-3 font-medium text-neutral-600">{member.email}</td>
                      <td className="px-3 py-3">
                        <RoleBadge label={member.roleLabel} role={member.role} />
                      </td>
                      <td className="px-3 py-3 text-neutral-500">
                        {member.createdAt ? new Date(member.createdAt).toLocaleDateString() : "—"}
                      </td>
                      {isOwner ? (
                        <td className="px-3 py-3 text-right">
                          {member.role === "interviewer" && !member.isCurrentUser ? (
                            <button
                              className="rounded-[7px] border border-neutral-200 px-3 py-1.5 text-[11px] font-bold text-red-600 transition hover:bg-red-50"
                              disabled={busyId === member.id}
                              onClick={() => void handleRemoveMember(member.id)}
                              type="button"
                            >
                              {busyId === member.id ? "Removing…" : "Remove"}
                            </button>
                          ) : (
                            <span className="text-[11px] text-neutral-400">—</span>
                          )}
                        </td>
                      ) : null}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {isOwner ? (
          <section className="card overflow-hidden rounded-[10px]">
            <div className="border-b border-neutral-100 px-5 py-4">
              <h2 className="text-[15px] font-black text-neutral-900">Pending invitations</h2>
              <p className="mt-1 text-[11px] text-neutral-500">Share the invite link with your colleague. Links expire after 7 days.</p>
            </div>
            {pendingInvites.length === 0 ? (
              <div className="p-6 text-[13px] text-neutral-500">No pending invitations.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-left text-[12px]">
                  <thead className="text-[11px] font-bold text-neutral-500">
                    <tr className="border-b border-neutral-100">
                      <th className="px-5 py-3">Email</th>
                      <th className="px-3 py-3">Expires</th>
                      <th className="px-3 py-3">Link</th>
                      <th className="px-3 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {pendingInvites.map((invite) => {
                      const link = typeof window !== "undefined" ? `${window.location.origin}${invite.inviteUrlPath}` : invite.inviteUrlPath;
                      return (
                        <tr key={invite.id}>
                          <td className="px-5 py-3 font-semibold text-neutral-800">{invite.email}</td>
                          <td className="px-3 py-3 text-neutral-500">{new Date(invite.expiresAt).toLocaleString()}</td>
                          <td className="px-3 py-3">
                            <button className="font-bold text-primary-700 hover:text-primary-600" onClick={() => void copyLink(link)} type="button">
                              Copy link
                            </button>
                          </td>
                          <td className="px-3 py-3 text-right">
                            <button
                              className="rounded-[7px] border border-neutral-200 px-3 py-1.5 text-[11px] font-bold text-neutral-700 hover:bg-neutral-50"
                              disabled={busyId === invite.id}
                              onClick={() => void handleCancelInvite(invite.id)}
                              type="button"
                            >
                              {busyId === invite.id ? "…" : "Cancel"}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        ) : null}

        <section className="card rounded-[10px] p-5">
          <h2 className="text-[15px] font-black text-neutral-900">Roles in this product</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <article className="rounded-[10px] border border-neutral-200 p-4">
              <div className="flex items-center gap-2">
                <Icon name="shield" size={18} />
                <h3 className="text-[13px] font-black text-neutral-900">Owner</h3>
              </div>
              <p className="mt-2 text-[12px] leading-5 text-neutral-600">
                Created at signup. Invites interviewers, manages the team, and has full access to templates, sessions, reports, and analytics.
              </p>
            </article>
            <article className="rounded-[10px] border border-neutral-200 p-4">
              <div className="flex items-center gap-2">
                <Icon className="text-[#D504FF]" name="user" size={18} />
                <h3 className="text-[13px] font-black text-neutral-900">Interviewer</h3>
              </div>
              <p className="mt-2 text-[12px] leading-5 text-neutral-600">
                Joins via invite. Runs assessments and reviews candidates in the same organization. Cannot invite or remove teammates.
              </p>
            </article>
          </div>
          <p className="mt-4 text-[11px] text-neutral-500">
            Candidates never join the workspace — they use a private assessment link only.
          </p>
          {!isOwner ? (
            <button className="button-secondary mt-4 h-9 px-3 text-[11px]" onClick={() => router.push("/dashboard")} type="button">
              Back to dashboard
            </button>
          ) : null}
        </section>
      </div>
    </AppShell>
  );
}

function StatCard({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <article className="card rounded-[10px] px-4 py-4">
      <p className="text-[11px] font-bold text-neutral-700">{label}</p>
      <p className="mt-1 text-[24px] font-black leading-none text-neutral-950">{value}</p>
      <p className="mt-2 text-[10px] font-semibold text-neutral-500">{detail}</p>
    </article>
  );
}

function RoleBadge({ role, label }: { role: string; label: string }) {
  const tone =
    role === "organization"
      ? "bg-violet-50 text-violet-700 border-violet-100"
      : role === "interviewer"
        ? "bg-sky-50 text-sky-700 border-sky-100"
        : "bg-neutral-50 text-neutral-700 border-neutral-200";
  return <span className={`inline-flex items-center rounded border px-2 py-0.5 text-[11px] font-bold ${tone}`}>{label}</span>;
}
