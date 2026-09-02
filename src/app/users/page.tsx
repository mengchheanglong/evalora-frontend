"use client";

import { useCallback, useEffect, useMemo, useState, type ClipboardEvent, type FormEvent, type KeyboardEvent } from "react";
import { AppShell } from "@/components/app-shell";
import { useAuth } from "@/components/auth-provider";
import { Icon } from "@/components/icons";
import { OverviewCard } from "@/components/overview-card";
import { EmptyState, InlineAlert, PageLoader } from "@/components/ui-states";
import { apiDelete, apiGet, apiPost, getErrorMessage } from "@/lib/api";
import type { WorkspaceInvite, WorkspaceMember } from "@/lib/types";
import { readUserProfilePhoto, userInitials } from "@/lib/user-profile-photo";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface InviteOutcome {
  email: string;
  ok: boolean;
  /** Failure reason when the invite could not be created. */
  reason: string;
  /** Whether the invite email was sent or queued for a created invite. */
  emailQueued: boolean;
  /** Invite link to share manually when the email could not be delivered. */
  link: string;
}

export default function UsersAndRolesPage() {
  const { user, status } = useAuth();
  const isOwner = user?.role === "organization" || user?.role === "admin";

  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [invites, setInvites] = useState<WorkspaceInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const [inviteEmails, setInviteEmails] = useState<string[]>([]);
  const [inviteEmailInput, setInviteEmailInput] = useState("");
  const [inviteEmailError, setInviteEmailError] = useState("");
  const [inviting, setInviting] = useState(false);
  const [failedInvites, setFailedInvites] = useState<{ email: string; reason: string }[]>([]);
  const [undeliveredInvites, setUndeliveredInvites] = useState<{ email: string; link: string }[]>([]);
  const [busyId, setBusyId] = useState("");
  const [currentUserPhoto, setCurrentUserPhoto] = useState("");

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
    if (!user?.id) return;
    setCurrentUserPhoto(user.profilePhoto || readUserProfilePhoto(user.id));
  }, [user?.id, user?.profilePhoto]);

  const pendingInvites = useMemo(() => invites.filter((invite) => invite.status === "pending"), [invites]);
  const ownerCount = members.filter((member) => member.role === "organization").length;
  const interviewerCount = members.filter((member) => member.role === "interviewer").length;
  const expiringSoonInvites = pendingInvites.filter((invite) => {
    const remainingMs = new Date(invite.expiresAt).getTime() - Date.now();
    return remainingMs >= 0 && remainingMs <= 48 * 60 * 60 * 1000;
  }).length;

  /** Splits raw text into email tokens and merges valid ones into the chip list. Returns the merged list, or null when a token is invalid. */
  function mergeInviteEmails(raw: string): string[] | null {
    const tokens = raw.split(/[\s,;]+/).map((token) => token.trim()).filter(Boolean);
    const invalid = tokens.filter((token) => !EMAIL_PATTERN.test(token));
    if (invalid.length) {
      setInviteEmailError(`Not a valid email: ${invalid.join(", ")}`);
      return null;
    }
    setInviteEmailError("");
    const seen = new Set(inviteEmails.map((item) => item.toLowerCase()));
    const merged = [...inviteEmails];
    for (const token of tokens) {
      const normalized = token.toLowerCase();
      if (seen.has(normalized)) continue;
      seen.add(normalized);
      merged.push(token);
    }
    return merged;
  }

  function commitInviteEmails(raw: string) {
    const merged = mergeInviteEmails(raw);
    if (!merged) return;
    setInviteEmails(merged);
    setInviteEmailInput("");
  }

  function handleInviteEmailKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === "," || e.key === " ") {
      e.preventDefault();
      commitInviteEmails(inviteEmailInput);
      return;
    }
    if (e.key === "Backspace" && !inviteEmailInput && inviteEmails.length) {
      setInviteEmails((current) => current.slice(0, -1));
    }
  }

  function handleInviteEmailPaste(e: ClipboardEvent<HTMLInputElement>) {
    const text = e.clipboardData.getData("text");
    if (!/[\s,;]/.test(text.trim())) return;
    e.preventDefault();
    commitInviteEmails(`${inviteEmailInput} ${text}`);
  }

  function removeInviteEmail(email: string) {
    setInviteEmails((current) => current.filter((item) => item !== email));
  }

  async function handleInvite(event: FormEvent) {
    event.preventDefault();
    if (!isOwner) return;

    // Fold anything still typed in the email input into the chip list before validating.
    const emails = mergeInviteEmails(inviteEmailInput);
    if (!emails) return;
    setInviteEmails(emails);
    setInviteEmailInput("");

    if (!emails.length) {
      setActionError("Add at least one email.");
      return;
    }

    setInviting(true);
    setActionError("");
    setActionMessage("");
    setFailedInvites([]);
    setUndeliveredInvites([]);

    const results = await Promise.all(
      emails.map(async (email): Promise<InviteOutcome> => {
        try {
          const invite = await apiPost<WorkspaceInvite>("/organization/invites", { email });
          const link = invite.inviteUrl || `${window.location.origin}${invite.inviteUrlPath}`;
          const delivery = invite.emailDelivery;
          return { email: invite.email, ok: true, reason: "", emailQueued: delivery?.status === "sent" || delivery?.status === "queued", link };
        } catch (requestError) {
          return { email, ok: false, reason: getErrorMessage(requestError, "Unable to create invitation."), emailQueued: false, link: "" };
        }
      }),
    );

    const failed = results.filter((result) => !result.ok);
    const created = results.filter((result) => result.ok);
    const undelivered = created.filter((result) => !result.emailQueued);

    setFailedInvites(failed.map(({ email, reason }) => ({ email, reason })));
    setUndeliveredInvites(undelivered.map(({ email, link }) => ({ email, link })));

    if (!failed.length) {
      setInviteEmails([]);
      setActionMessage(
        created.length === 1
          ? `Invitation emailed to ${created[0].email}.`
          : `Invitations sent to all ${created.length} colleagues.`,
      );
    } else {
      // Keep only the failed emails in the field so the user can retry them.
      setInviteEmails(failed.map((result) => result.email));
      if (created.length) {
        setActionMessage(`Invitations created and sent for ${created.length} of ${results.length} colleagues.`);
      }
      setActionError(
        failed.length === 1
          ? "1 invitation failed. The failed email was kept in the form — fix the issue and create again."
          : `${failed.length} invitations failed. The failed emails were kept in the form — fix the issue and create again.`,
      );
    }

    await load();
    setInviting(false);
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
      setActionError("Could not copy the invitation link. Try again.");
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
        <button className="button-secondary mt-4 h-10 px-4 text-sm" onClick={() => void load()} type="button">
          Retry
        </button>
      </AppShell>
    );
  }

  return (
    <AppShell
      active="users"
      description={isOwner ? "One organization, many people. The owner invites interviewers to share templates, sessions, and reports." : "People who share this organization and can work with the same templates, candidates, and reports."}
      title="Team"
    >
      <div className="space-y-5">
        {isOwner ? (
          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <OverviewCard detail={`${ownerCount} workspace ${ownerCount === 1 ? "owner" : "owners"}`} icon="users" label="Members" value={members.length.toLocaleString()} tone="text-[var(--color-chart-1)]" accent="var(--color-chart-1)" />
            <OverviewCard detail="Can run assessments and review reports" icon="user" label="Interviewers" value={interviewerCount.toLocaleString()} tone="text-sky-600" accent="#0ea5e9" />
            <OverviewCard detail="Invitations awaiting acceptance" icon="plusUser" label="Pending invites" value={pendingInvites.length.toLocaleString()} tone="text-amber-600" accent="#f59e0b" />
            <OverviewCard detail="Pending links expiring within 48 hours" emphasis={expiringSoonInvites > 0 ? "attention" : "quiet"} icon="clock" label="Expiring soon" value={expiringSoonInvites.toLocaleString()} tone="text-amber-600" accent="#f59e0b" />
          </section>
        ) : null}

        {actionError ? (
          <InlineAlert tone="error">
            {actionError}
            {failedInvites.length ? (
              <ul className="mt-2 list-disc space-y-0.5 pl-5">
                {failedInvites.map((invite) => (
                  <li key={invite.email}>
                    <strong>{invite.email}</strong> — {invite.reason}
                  </li>
                ))}
              </ul>
            ) : null}
          </InlineAlert>
        ) : null}
        {actionMessage ? <InlineAlert tone="success">{actionMessage}</InlineAlert> : null}

        {isOwner ? (
          <section className="card rounded-[10px] p-5">
            <h2 className="text-lg font-black text-neutral-900">Invite interviewer</h2>
            <p className="mt-1 text-sm text-neutral-600">
              We email a private invite. They set their own password and join this organization — not a new company workspace.
            </p>
            <form className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-start" onSubmit={handleInvite}>
              <div className="flex-1">
                <div className="flex min-h-11 flex-wrap items-center gap-1.5 rounded-[8px] border border-neutral-300 bg-neutral-50 px-2.5 py-1.5 transition hover:border-neutral-400 focus-within:border-sky-500 focus-within:bg-white focus-within:ring-4 focus-within:ring-sky-500/15">
                  {inviteEmails.map((email) => (
                    <span
                      className="inline-flex h-7 items-center gap-1.5 rounded-md border border-sky-200 bg-sky-50 px-2 text-xs font-medium text-sky-800"
                      key={email}
                    >
                      {email}
                      <button
                        aria-label={`Remove ${email}`}
                        className="text-sky-500 transition hover:text-sky-800"
                        onClick={() => removeInviteEmail(email)}
                        type="button"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                  <input
                    autoComplete="off"
                    className="h-7 min-w-[220px] flex-1 bg-transparent px-1 text-sm text-neutral-900 outline-none placeholder:text-neutral-400"
                    onBlur={() => { if (inviteEmailInput.trim()) commitInviteEmails(inviteEmailInput); }}
                    onChange={(event) => {
                      setInviteEmailInput(event.target.value);
                      if (inviteEmailError) setInviteEmailError("");
                    }}
                    onKeyDown={handleInviteEmailKeyDown}
                    onPaste={handleInviteEmailPaste}
                    placeholder={inviteEmails.length ? "Add another email…" : "interviewer@gmail.com"}
                    type="text"
                    value={inviteEmailInput}
                  />
                </div>
                <p className={inviteEmailError ? "mt-1.5 text-xs text-red-600" : "mt-1.5 text-xs text-neutral-500"}>
                  {inviteEmailError ||
                    (inviteEmails.length
                      ? `${inviteEmails.length} colleague${inviteEmails.length === 1 ? "" : "s"} will be invited.`
                      : "Type an email and press Enter, or paste a comma-separated list to invite several colleagues at once.")}
                </p>
              </div>
              <button className="session-blue-button h-11 shrink-0 px-5 text-sm" disabled={inviting} type="submit">
                {inviting ? "Creating…" : inviteEmails.length > 1 ? `Create ${inviteEmails.length} invites` : "Create invite"}
              </button>
            </form>
            {undeliveredInvites.length ? (
              <div className="mt-4 space-y-2 border-t border-neutral-100 pt-4">
                <p className="text-xs text-neutral-500">
                  {undeliveredInvites.length === 1
                    ? "Email delivery was unavailable for this invite:"
                    : "Email delivery was unavailable for these invites:"}
                </p>
                {undeliveredInvites.map((invite) => (
                  <div className="flex flex-wrap items-center justify-between gap-3" key={invite.email}>
                    <span className="text-sm font-medium text-neutral-700">{invite.email}</span>
                    <button className="button-secondary h-9 shrink-0 rounded-[7px] px-3 text-xs" onClick={() => void copyLink(invite.link)} type="button">
                      Copy invitation link
                    </button>
                  </div>
                ))}
              </div>
            ) : null}
          </section>
        ) : null}

        <section className="card overflow-hidden rounded-[10px]">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-neutral-100 px-5 py-4">
            <div>
              <h2 className="text-lg font-black text-neutral-900">Members</h2>
              <p className="mt-1 text-sm text-neutral-500">Everyone listed here shares the same templates, candidates, and reports.</p>
            </div>
            {!isOwner ? <span className="rounded-full bg-[var(--theme-panel-soft)] px-2.5 py-1 text-xs font-bold text-[var(--theme-muted)]">View only</span> : null}
          </div>
          {members.length === 0 ? (
            <div className="p-6">
              <EmptyState title="No members yet" description="Your workspace members will appear here." />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="bg-white text-xs font-bold text-neutral-500">
                  <tr className="border-b border-neutral-100">
                    <th className="px-5 py-3">Person</th>
                    <th className="px-3 py-3">Email</th>
                    <th className="px-3 py-3">Role</th>
                    <th className="px-3 py-3">Joined</th>
                    {isOwner ? <th className="px-3 py-3 text-right">Actions</th> : null}
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {members.map((member) => {
                    const isCurrentUser = member.isCurrentUser || member.id === user?.id;
                    return (
                      <tr className="h-[60px]" key={member.id}>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-3">
                            <span className="grid size-9 shrink-0 place-items-center overflow-hidden rounded-full border border-neutral-200 bg-primary-50 text-xs font-black text-primary-700">
                              {member.profilePhoto || (isCurrentUser && currentUserPhoto) ? (
                                <img alt="" className="size-full object-cover" src={member.profilePhoto || currentUserPhoto} />
                              ) : (
                                userInitials(member.name)
                              )}
                            </span>
                            <div className="flex min-w-0 items-center gap-2">
                              <span className="truncate font-bold text-neutral-900">{member.name}</span>
                              {isCurrentUser ? (
                                <span className="shrink-0 rounded bg-primary-50 px-1.5 py-0.5 text-xs font-bold text-primary-700">You</span>
                              ) : null}
                            </div>
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
                            {member.role === "interviewer" && !isCurrentUser ? (
                              <button
                                className="rounded-[7px] border border-neutral-200 px-3 py-1.5 text-sm font-bold text-red-600 transition hover:bg-red-50"
                                disabled={busyId === member.id}
                                onClick={() => void handleRemoveMember(member.id)}
                                type="button"
                              >
                                {busyId === member.id ? "Removing…" : "Remove"}
                              </button>
                            ) : (
                              <span className="text-sm text-neutral-400">—</span>
                            )}
                          </td>
                        ) : null}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {isOwner ? (
          <section className="card overflow-hidden rounded-[10px]">
            <div className="border-b border-neutral-100 px-5 py-4">
              <h2 className="text-lg font-black text-neutral-900">Pending invitations</h2>
              <p className="mt-1 text-sm text-neutral-500">Share the invite link with your colleague. Links expire after 7 days.</p>
            </div>
            {pendingInvites.length === 0 ? (
              <div className="p-6 text-sm text-neutral-500">No pending invitations.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-left text-sm">
                  <thead className="text-xs font-bold text-neutral-500">
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
                              className="rounded-[7px] border border-neutral-200 px-3 py-1.5 text-sm font-bold text-neutral-700 hover:bg-neutral-50"
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

        {isOwner ? <section className="card rounded-[10px] p-5">
          <h2 className="text-lg font-black text-neutral-900">Roles in this product</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <article className="rounded-[10px] border border-neutral-200 p-4">
              <div className="flex items-center gap-2">
                <Icon name="shield" size={18} />
                <h3 className="text-base font-black text-neutral-900">Owner</h3>
              </div>
              <p className="mt-2 text-sm text-neutral-600">
                Created at signup. Invites interviewers, manages the team, and has full access to templates, sessions, reports, and analytics.
              </p>
            </article>
            <article className="rounded-[10px] border border-neutral-200 p-4">
              <div className="flex items-center gap-2">
                <Icon className="text-[#D504FF]" name="user" size={18} />
                <h3 className="text-base font-black text-neutral-900">Interviewer</h3>
              </div>
              <p className="mt-2 text-sm text-neutral-600">
                Joins via invite. Runs assessments and reviews candidates in the same organization. Cannot invite or remove teammates.
              </p>
            </article>
          </div>
          <p className="mt-4 text-xs text-neutral-500">
            Candidates never join the workspace — they use a private assessment link only.
          </p>
        </section> : null}
      </div>
    </AppShell>
  );
}

function RoleBadge({ role, label }: { role: string; label: string }) {
  const tone =
    role === "organization"
      ? "bg-violet-50 text-violet-700 border-violet-100"
      : role === "interviewer"
        ? "bg-sky-50 text-sky-700 border-sky-100"
        : "bg-neutral-50 text-neutral-700 border-neutral-200";
  return <span className={`inline-flex items-center rounded border px-2 py-0.5 text-xs font-bold ${tone}`}>{label}</span>;
}
