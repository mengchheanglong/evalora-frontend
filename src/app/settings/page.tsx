"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { AppShell } from "@/components/app-shell";
import { useAuth } from "@/components/auth-provider";
import { Icon } from "@/components/icons";
import { EmptyState, InlineAlert, PageLoader } from "@/components/ui-states";
import { apiDelete, apiGet, apiPut, getErrorMessage } from "@/lib/api";
import { clearOrgLogo, orgInitials, readOrgLogo, writeOrgLogo } from "@/lib/org-logo";
import type {
  DeleteWorkspaceDataResult,
  WorkspaceExportPayload,
  WorkspacePrivacySummary,
  WorkspaceProfile,
} from "@/lib/types";

const THEME_KEY = "evalora-theme";
const MAX_ORG_LOGO_BYTES = 2 * 1024 * 1024;

type ThemeName = "light" | "dark" | "ocean";
type NotificationKey =
  | "sessionAssigned"
  | "assessmentCompleted"
  | "candidateUpdated"
  | "userInvited"
  | "weeklySummary"
  | "productUpdates";

type UserPreferences = {
  timezone: string;
  dateFormat: "medium" | "iso" | "us";
  timeFormat: "12h" | "24h";
  language: "en-US";
  notifications: Record<NotificationKey, boolean>;
};

const NOTIFICATION_ROWS: Array<{ key: NotificationKey; label: string; hint: string }> = [
  { key: "sessionAssigned", label: "New interview session assigned", hint: "When a teammate creates a session in your workspace" },
  { key: "assessmentCompleted", label: "Assessment completed", hint: "When a candidate finishes an invite" },
  { key: "candidateUpdated", label: "Candidate status updated", hint: "Progress changes on assigned sessions" },
  { key: "userInvited", label: "New teammate invited", hint: "Workspace owner invite activity" },
  { key: "weeklySummary", label: "Weekly performance summary", hint: "Digest of assessment progress and report readiness" },
  { key: "productUpdates", label: "Product updates", hint: "Occasional Evalora product notes" },
];

const DEFAULT_PREFERENCES: UserPreferences = {
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
  dateFormat: "medium",
  timeFormat: "12h",
  language: "en-US",
  notifications: {
    sessionAssigned: true,
    assessmentCompleted: true,
    candidateUpdated: true,
    userInvited: true,
    weeklySummary: false,
    productUpdates: false,
  },
};

function preferencesKey(userId: string) {
  return `evalora-settings:${userId}`;
}

function readPreferences(userId: string): UserPreferences {
  if (typeof window === "undefined") return DEFAULT_PREFERENCES;
  try {
    const raw = window.localStorage.getItem(preferencesKey(userId));
    if (!raw) return { ...DEFAULT_PREFERENCES, notifications: { ...DEFAULT_PREFERENCES.notifications } };
    const parsed = JSON.parse(raw) as Partial<UserPreferences>;
    return {
      ...DEFAULT_PREFERENCES,
      ...parsed,
      notifications: { ...DEFAULT_PREFERENCES.notifications, ...(parsed.notifications ?? {}) },
    };
  } catch {
    return { ...DEFAULT_PREFERENCES, notifications: { ...DEFAULT_PREFERENCES.notifications } };
  }
}

function writePreferences(userId: string, value: UserPreferences) {
  window.localStorage.setItem(preferencesKey(userId), JSON.stringify(value));
}

/** Full IANA timezone list (all zones), with a broad fallback when Intl.supportedValuesOf is missing. */
function listAllTimeZones(): string[] {
  const local = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  try {
    if (typeof Intl.supportedValuesOf === "function") {
      const zones = Intl.supportedValuesOf("timeZone");
      if (zones.length) return Array.from(new Set([...zones, local, "UTC"])).sort((a, b) => a.localeCompare(b));
    }
  } catch {
    // fall through
  }
  return Array.from(new Set([...FALLBACK_TIME_ZONES, local, "UTC"])).sort((a, b) => a.localeCompare(b));
}

function ensureTimezoneInList(zones: string[], current: string): string[] {
  if (!current || zones.includes(current)) return zones;
  return [...zones, current].sort((a, b) => a.localeCompare(b));
}

/** Used only on older runtimes without Intl.supportedValuesOf("timeZone"). */
const FALLBACK_TIME_ZONES = [
  "Africa/Cairo", "Africa/Casablanca", "Africa/Johannesburg", "Africa/Lagos", "Africa/Nairobi",
  "America/Anchorage", "America/Argentina/Buenos_Aires", "America/Bogota", "America/Caracas",
  "America/Chicago", "America/Denver", "America/Halifax", "America/Los_Angeles", "America/Mexico_City",
  "America/New_York", "America/Phoenix", "America/Santiago", "America/Sao_Paulo", "America/Toronto",
  "America/Vancouver", "Asia/Bangkok", "Asia/Colombo", "Asia/Dhaka", "Asia/Dubai", "Asia/Hong_Kong",
  "Asia/Jakarta", "Asia/Jerusalem", "Asia/Karachi", "Asia/Kolkata", "Asia/Kuala_Lumpur", "Asia/Manila",
  "Asia/Phnom_Penh", "Asia/Qatar", "Asia/Riyadh", "Asia/Seoul", "Asia/Shanghai", "Asia/Singapore",
  "Asia/Taipei", "Asia/Tokyo", "Asia/Yangon", "Atlantic/Reykjavik", "Australia/Adelaide",
  "Australia/Brisbane", "Australia/Melbourne", "Australia/Perth", "Australia/Sydney", "Europe/Amsterdam",
  "Europe/Athens", "Europe/Berlin", "Europe/Brussels", "Europe/Budapest", "Europe/Copenhagen",
  "Europe/Dublin", "Europe/Helsinki", "Europe/Istanbul", "Europe/Lisbon", "Europe/London",
  "Europe/Madrid", "Europe/Moscow", "Europe/Oslo", "Europe/Paris", "Europe/Prague", "Europe/Rome",
  "Europe/Stockholm", "Europe/Vienna", "Europe/Warsaw", "Europe/Zurich", "Pacific/Auckland",
  "Pacific/Fiji", "Pacific/Guam", "Pacific/Honolulu", "Pacific/Port_Moresby", "UTC",
];

function formatDate(value: string | undefined, prefs: UserPreferences) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  if (prefs.dateFormat === "iso") return date.toISOString().slice(0, 10);
  if (prefs.dateFormat === "us") {
    return date.toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric", timeZone: prefs.timezone });
  }
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: prefs.timezone,
  });
}

function formatNow(prefs: UserPreferences) {
  const now = new Date();
  const date = formatDate(now.toISOString(), prefs);
  const time = now.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: prefs.timeFormat === "12h",
    timeZone: prefs.timezone,
  });
  return `${date} · ${time}`;
}

export default function SettingsPage() {
  const { user, status, refresh } = useAuth();
  const isOwner = user?.role === "organization" || user?.role === "admin";

  const [workspace, setWorkspace] = useState<WorkspaceProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [orgName, setOrgName] = useState("");
  const [savingOrg, setSavingOrg] = useState(false);
  const [preferences, setPreferences] = useState<UserPreferences>(DEFAULT_PREFERENCES);
  const [prefNotice, setPrefNotice] = useState("");
  const [notifNotice, setNotifNotice] = useState("");
  const [theme, setTheme] = useState<ThemeName>("light");
  const [timezoneOptions, setTimezoneOptions] = useState<string[]>([DEFAULT_PREFERENCES.timezone]);
  const [privacy, setPrivacy] = useState<WorkspacePrivacySummary | null>(null);
  const [privacyPanel, setPrivacyPanel] = useState<"none" | "retention" | "delete">("none");
  const [exporting, setExporting] = useState(false);
  const [deletingData, setDeletingData] = useState(false);
  const [deleteConfirmName, setDeleteConfirmName] = useState("");
  const [privacyError, setPrivacyError] = useState("");
  const [orgLogo, setOrgLogo] = useState("");

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError("");
    try {
      const [nextWorkspace, nextPrivacy] = await Promise.all([
        apiGet<WorkspaceProfile>("/organization"),
        apiGet<WorkspacePrivacySummary>("/organization/privacy"),
      ]);
      setWorkspace(nextWorkspace);
      setOrgName(nextWorkspace.name);
      setPrivacy(nextPrivacy);
      setOrgLogo(readOrgLogo(nextWorkspace.id));
      setPreferences(readPreferences(user.id));
    } catch (requestError) {
      setError(getErrorMessage(requestError, "Unable to load workspace settings."));
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (status === "authenticated" && user) void load();
  }, [status, user, load]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const savedTheme = window.localStorage.getItem(THEME_KEY);
    if (savedTheme === "dark" || savedTheme === "ocean" || savedTheme === "light") setTheme(savedTheme);
    setTimezoneOptions(listAllTimeZones());
  }, []);

  const previewStamp = useMemo(() => formatNow(preferences), [preferences]);

  async function saveOrganization(event: FormEvent) {
    event.preventDefault();
    if (!isOwner) return;
    setSavingOrg(true);
    setNotice("");
    setError("");
    try {
      const updated = await apiPut<WorkspaceProfile>("/organization", { name: orgName.trim() });
      setWorkspace(updated);
      setOrgName(updated.name);
      setNotice("Workspace updated.");
      await refresh();
    } catch (requestError) {
      setError(getErrorMessage(requestError, "Unable to update workspace."));
    } finally {
      setSavingOrg(false);
    }
  }

  function handleOrgLogoUpload(file?: File) {
    if (!file || !workspace?.id) return;
    if (!isOwner) {
      setError("Only the workspace owner can change the organization logo.");
      return;
    }
    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file (JPG, PNG, or WebP).");
      return;
    }
    if (file.size > MAX_ORG_LOGO_BYTES) {
      setError("Organization logo must be 2MB or smaller.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = typeof reader.result === "string" ? reader.result : "";
      if (!dataUrl) return;
      writeOrgLogo(workspace.id, dataUrl);
      setOrgLogo(dataUrl);
      setError("");
      setNotice("Organization logo updated. It appears in the header for this workspace.");
    };
    reader.readAsDataURL(file);
  }

  function handleOrgLogoRemove() {
    if (!workspace?.id || !isOwner) return;
    clearOrgLogo(workspace.id);
    setOrgLogo("");
    setNotice("Organization logo removed.");
  }

  function savePreferences() {
    if (!user) return;
    writePreferences(user.id, preferences);
    setPrefNotice("Preferences saved on this device.");
    window.setTimeout(() => setPrefNotice(""), 2500);
  }

  function saveNotifications() {
    if (!user) return;
    writePreferences(user.id, preferences);
    setNotifNotice("Notification preferences saved on this device.");
    window.setTimeout(() => setNotifNotice(""), 2500);
  }

  function updateNotification(key: NotificationKey, checked: boolean) {
    setPreferences((current) => ({
      ...current,
      notifications: { ...current.notifications, [key]: checked },
    }));
  }

  function handleThemeChange(next: ThemeName) {
    setTheme(next);
    document.documentElement.dataset.theme = next;
    document.documentElement.style.colorScheme = next === "dark" ? "dark" : "light";
    window.localStorage.setItem(THEME_KEY, next);
  }

  async function exportWorkspaceData() {
    if (!isOwner) {
      setError("Only the workspace owner can export organization data.");
      return;
    }
    setExporting(true);
    setError("");
    setNotice("");
    try {
      const payload = await apiGet<WorkspaceExportPayload>("/organization/export");
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      const stamp = new Date().toISOString().slice(0, 10);
      const safeName = (workspace?.name || "workspace").replace(/[^\w\-]+/g, "_").slice(0, 40);
      anchor.href = url;
      anchor.download = `evalora-export-${safeName}-${stamp}.json`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      setNotice(
        `Exported ${payload.templates.length} template(s), ${payload.sessions.length} session(s), and ${payload.reports.length} report(s).`,
      );
    } catch (requestError) {
      setError(getErrorMessage(requestError, "Unable to export workspace data."));
    } finally {
      setExporting(false);
    }
  }

  async function confirmDeleteWorkspaceData() {
    if (!isOwner || !workspace) return;
    setDeletingData(true);
    setPrivacyError("");
    setError("");
    setNotice("");
    try {
      const result = await apiDelete<DeleteWorkspaceDataResult>("/organization/data", {
        confirmName: deleteConfirmName.trim(),
      });
      setPrivacyPanel("none");
      setDeleteConfirmName("");
      setNotice(result.message);
      await load();
    } catch (requestError) {
      setPrivacyError(getErrorMessage(requestError, "Unable to delete workspace data."));
    } finally {
      setDeletingData(false);
    }
  }

  if (status === "loading" || loading) {
    return (
      <AppShell active="settings" title="Settings" description="Workspace details and device preferences.">
        <PageLoader label="Loading settings" />
      </AppShell>
    );
  }

  if (!user) {
    return (
      <AppShell active="settings" title="Settings" description="Workspace details and device preferences.">
        <EmptyState description="Sign in to manage workspace settings." icon="settings" title="Not signed in" />
      </AppShell>
    );
  }

  if (error && !workspace) {
    return (
      <AppShell active="settings" title="Settings" description="Workspace details and device preferences.">
        <InlineAlert tone="error">{error}</InlineAlert>
        <button className="button-secondary mt-4 h-10 px-4 text-[12px]" onClick={() => void load()} type="button">
          Retry
        </button>
      </AppShell>
    );
  }

  return (
    <AppShell
      active="settings"
      description="Workspace details, preferences, and data controls."
      title="Settings"
    >
      <div className="mx-auto max-w-[1100px] space-y-4">
        {error ? <InlineAlert tone="error">{error}</InlineAlert> : null}
        {notice ? <InlineAlert tone="success">{notice}</InlineAlert> : null}

        {/* Workspace */}
        <section className="card p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase text-[#087aa4]">Workspace</p>
              <h2 className="mt-1 text-[15px] font-extrabold text-[#151922]">Organization</h2>
              <p className="mt-1 text-[12px] leading-5 text-neutral-500">
                {isOwner
                  ? "Owners can rename the workspace and set the logo shown in the header."
                  : "Interviewers can view workspace details. Only the owner can edit name and logo."}
              </p>
            </div>
            <Link className="button-secondary h-9 rounded-[6px] px-3 text-[11px]" href="/users">
              Open team
            </Link>
          </div>

          <form className="mt-6 grid gap-6 lg:grid-cols-[160px_1fr]" onSubmit={(event) => void saveOrganization(event)}>
            <div>
              <p className="mb-2 text-[12px] font-bold text-neutral-800">Organization logo</p>
              <div className="grid aspect-square w-[132px] place-items-center overflow-hidden rounded-full border border-neutral-200 bg-neutral-50 shadow-sm">
                {orgLogo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img alt={`${orgName || "Organization"} logo`} className="size-full object-cover" src={orgLogo} />
                ) : (
                  <span className="text-[28px] font-black text-neutral-700">{orgInitials(orgName || workspace?.name || "E")}</span>
                )}
              </div>
              {isOwner ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  <label className="button-secondary h-8 cursor-pointer rounded-[6px] px-3 text-[11px]">
                    Upload
                    <input
                      accept="image/png,image/jpeg,image/webp,image/gif"
                      className="sr-only"
                      onChange={(event) => handleOrgLogoUpload(event.target.files?.[0])}
                      type="file"
                    />
                  </label>
                  {orgLogo ? (
                    <button
                      className="h-8 rounded-[6px] border border-red-200 px-3 text-[11px] font-bold text-red-600 hover:bg-red-50"
                      onClick={handleOrgLogoRemove}
                      type="button"
                    >
                      Remove
                    </button>
                  ) : null}
                </div>
              ) : null}
              <p className="mt-2 max-w-[140px] text-[10px] leading-4 text-neutral-500">
                JPG, PNG, or WebP. Max 2MB. Shown in the header for this workspace on this device.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block sm:col-span-2">
                <span className="mb-2 block text-[12px] font-bold text-neutral-800">Organization name</span>
                <input
                  className="control h-11 rounded-[6px] px-3 text-[13px]"
                  disabled={!isOwner || savingOrg}
                  onChange={(event) => setOrgName(event.target.value)}
                  required
                  value={orgName}
                />
              </label>
              <ReadOnlyField label="Organization ID" value={workspace?.id ?? user.organizationId ?? "—"} mono />
              <ReadOnlyField label="Members" value={workspace ? String(workspace.memberCount) : "—"} />
              <ReadOnlyField label="Owner" value={workspace?.ownerName ?? "—"} />
              <ReadOnlyField label="Owner email" value={workspace?.ownerEmail ?? "—"} />
              <ReadOnlyField label="Created" value={formatDate(workspace?.createdAt, preferences)} />
              <ReadOnlyField label="Last updated" value={formatDate(workspace?.updatedAt, preferences)} />

              {isOwner ? (
                <div className="sm:col-span-2 flex justify-end">
                  <button
                    className="button-primary h-10 rounded-[6px] !bg-primary-500 px-4 text-[12px] hover:!bg-primary-600"
                    disabled={savingOrg || !orgName.trim()}
                    type="submit"
                  >
                    {savingOrg ? "Saving…" : "Save workspace"}
                  </button>
                </div>
              ) : null}
            </div>
          </form>
        </section>

        <section className="grid gap-4 lg:grid-cols-3">
          {/* Preferences */}
          <article className="card flex flex-col p-5">
            <h2 className="text-[15px] font-extrabold text-[#151922]">Preferences</h2>
            <p className="mt-1 text-[12px] leading-5 text-neutral-500">Saved on this device for your account.</p>

            <div className="mt-5 space-y-4">
              <SelectField
                label="Theme"
                onChange={(value) => handleThemeChange(value as ThemeName)}
                options={[
                  { value: "light", label: "Light" },
                  { value: "dark", label: "Dark" },
                  { value: "ocean", label: "Ocean" },
                ]}
                value={theme}
              />
              <SelectField
                label="Timezone"
                onChange={(value) => setPreferences((current) => ({ ...current, timezone: value }))}
                options={ensureTimezoneInList(timezoneOptions, preferences.timezone).map((zone) => ({
                  value: zone,
                  label: zone.replaceAll("_", " "),
                }))}
                value={preferences.timezone}
              />
              <SelectField
                label="Date format"
                onChange={(value) => setPreferences((current) => ({ ...current, dateFormat: value as UserPreferences["dateFormat"] }))}
                options={[
                  { value: "medium", label: "May 31, 2026" },
                  { value: "us", label: "05/31/2026" },
                  { value: "iso", label: "2026-05-31" },
                ]}
                value={preferences.dateFormat}
              />
              <SelectField
                label="Time format"
                onChange={(value) => setPreferences((current) => ({ ...current, timeFormat: value as UserPreferences["timeFormat"] }))}
                options={[
                  { value: "12h", label: "12-hour (AM/PM)" },
                  { value: "24h", label: "24-hour" },
                ]}
                value={preferences.timeFormat}
              />
              <div className="rounded-[6px] border border-neutral-200 bg-neutral-50 px-3 py-2.5">
                <p className="text-[10px] font-bold uppercase text-neutral-400">Preview</p>
                <p className="mt-1 text-[12px] font-semibold text-neutral-800">{previewStamp}</p>
              </div>
            </div>

            {prefNotice ? <p className="mt-3 text-[11px] font-semibold text-emerald-700">{prefNotice}</p> : null}
            <div className="mt-auto flex justify-end pt-5">
              <button className="button-secondary h-9 rounded-[6px] px-4 text-[11px] !text-primary-700" onClick={savePreferences} type="button">
                Save preferences
              </button>
            </div>
          </article>

          {/* Notifications */}
          <article className="card flex flex-col p-5">
            <h2 className="text-[15px] font-extrabold text-[#151922]">Email notifications</h2>
            <p className="mt-1 text-[12px] leading-5 text-neutral-500">
              Preferences are stored on this device. Delivery still depends on workspace email configuration.
            </p>
            <div className="mt-5 space-y-3">
              {NOTIFICATION_ROWS.map((row) => (
                <div className="flex items-start justify-between gap-3" key={row.key}>
                  <div className="min-w-0">
                    <p className="text-[12px] font-semibold text-neutral-800">{row.label}</p>
                    <p className="mt-0.5 text-[11px] leading-4 text-neutral-500">{row.hint}</p>
                  </div>
                  <Toggle checked={preferences.notifications[row.key]} onChange={(checked) => updateNotification(row.key, checked)} />
                </div>
              ))}
            </div>
            {notifNotice ? <p className="mt-3 text-[11px] font-semibold text-emerald-700">{notifNotice}</p> : null}
            <div className="mt-auto flex justify-end pt-5">
              <button className="button-secondary h-9 rounded-[6px] px-4 text-[11px] !text-primary-700" onClick={saveNotifications} type="button">
                Save notifications
              </button>
            </div>
          </article>

          {/* Data & Privacy */}
          <article className="card flex flex-col overflow-hidden">
            <div className="p-5">
              <h2 className="text-[15px] font-extrabold text-[#151922]">Data &amp; Privacy</h2>
              <p className="mt-1 text-[12px] leading-5 text-neutral-500">
                Live workspace counts and owner-only export/delete controls.
              </p>
              {privacy ? (
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <PrivacyStat label="Templates" value={privacy.templateCount} />
                  <PrivacyStat label="Sessions" value={privacy.sessionCount} />
                  <PrivacyStat label="Reports" value={privacy.reportCount} />
                  <PrivacyStat label="Members" value={privacy.memberCount} />
                </div>
              ) : null}
            </div>
            <div className="divide-y divide-neutral-100 border-t border-neutral-100">
              <PrivacyRow
                title={exporting ? "Exporting…" : "Export organization data"}
                body="Download JSON of templates, sessions, members, and reports"
                disabled={exporting || !isOwner}
                onClick={() => void exportWorkspaceData()}
              />
              <PrivacyRow
                title="Data retention"
                body={
                  privacy
                    ? `${privacy.completedSessionCount} completed · ${privacy.inviteCount} invite(s)`
                    : "View how long assessment data is kept"
                }
                onClick={() => {
                  setPrivacyError("");
                  setPrivacyPanel("retention");
                }}
              />
              <PrivacyRow
                danger
                title="Delete organization data"
                body="Wipe sessions, templates, and invites (keeps your account)"
                disabled={!isOwner}
                onClick={() => {
                  setPrivacyError("");
                  setDeleteConfirmName("");
                  setPrivacyPanel("delete");
                }}
              />
            </div>
            <div className="mt-auto space-y-3 border-t border-neutral-100 p-5">
              <p className="text-[11px] font-semibold leading-5 text-neutral-600">
                {privacy?.advisoryNotice ??
                  "AI feedback in Evalora is advisory and must be reviewed by a human interviewer. Behavioral results are not medical or mental-health diagnoses."}
              </p>
              {!isOwner ? (
                <p className="text-[11px] leading-5 text-neutral-500">Export and delete require workspace owner access.</p>
              ) : null}
              <FooterLink href="/privacy" label="Privacy Policy" />
              <FooterLink href="/terms" label="Terms of Service" />
            </div>
          </article>
        </section>

        {privacyPanel === "retention" && privacy ? (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <button aria-label="Close" className="absolute inset-0 bg-neutral-950/35 backdrop-blur-[2px]" onClick={() => setPrivacyPanel("none")} type="button" />
            <div className="card relative z-10 w-full max-w-[440px] p-5 shadow-[0_18px_50px_rgba(15,23,42,0.16)]" role="dialog">
              <p className="text-[10px] font-bold uppercase text-[#087aa4]">Data retention</p>
              <h3 className="mt-1 text-[17px] font-extrabold text-[#151922]">{privacy.organizationName}</h3>
              <p className="mt-3 text-[13px] leading-5 text-neutral-600">{privacy.retentionPolicy}</p>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <PrivacyStat label="Templates" value={privacy.templateCount} />
                <PrivacyStat label="Sessions" value={privacy.sessionCount} />
                <PrivacyStat label="Completed" value={privacy.completedSessionCount} />
                <PrivacyStat label="Reports" value={privacy.reportCount} />
              </div>
              <div className="mt-4 space-y-2 rounded-[6px] border border-neutral-200 bg-neutral-50 px-3.5 py-3 text-[12px] text-neutral-700">
                <p>
                  <span className="font-bold text-neutral-900">Oldest session:</span>{" "}
                  {formatDate(privacy.oldestSessionAt, preferences)}
                </p>
                <p>
                  <span className="font-bold text-neutral-900">Newest session:</span>{" "}
                  {formatDate(privacy.newestSessionAt, preferences)}
                </p>
                <p>
                  <span className="font-bold text-neutral-900">Pending/other invites:</span> {privacy.inviteCount}
                </p>
              </div>
              <div className="mt-5 flex justify-end">
                <button className="button-secondary h-10 rounded-[6px] px-4 text-[12px]" onClick={() => setPrivacyPanel("none")} type="button">
                  Close
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {privacyPanel === "delete" && workspace ? (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <button
              aria-label="Close"
              className="absolute inset-0 bg-neutral-950/35 backdrop-blur-[2px]"
              disabled={deletingData}
              onClick={() => !deletingData && setPrivacyPanel("none")}
              type="button"
            />
            <div className="card relative z-10 w-full max-w-[440px] p-5 shadow-[0_18px_50px_rgba(15,23,42,0.16)]" role="dialog">
              <p className="text-[10px] font-bold uppercase text-red-600">Danger zone</p>
              <h3 className="mt-1 text-[17px] font-extrabold text-[#151922]">Delete organization data?</h3>
              <p className="mt-3 text-[13px] leading-5 text-neutral-600">
                This permanently removes <strong>templates</strong>, <strong>interview sessions</strong> (including responses, code, and reports), and{" "}
                <strong>invites</strong>. Your owner account and workspace name stay so you can continue using Evalora.
              </p>
              <label className="mt-4 block">
                <span className="mb-2 block text-[12px] font-bold text-neutral-800">
                  Type <span className="text-red-600">{workspace.name}</span> to confirm
                </span>
                <input
                  className="control h-11 rounded-[6px] px-3 text-[13px]"
                  disabled={deletingData}
                  onChange={(event) => setDeleteConfirmName(event.target.value)}
                  placeholder={workspace.name}
                  value={deleteConfirmName}
                />
              </label>
              {privacyError ? (
                <div className="mt-3">
                  <InlineAlert tone="error">{privacyError}</InlineAlert>
                </div>
              ) : null}
              <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button
                  className="button-secondary h-10 rounded-[6px] px-4 text-[12px]"
                  disabled={deletingData}
                  onClick={() => setPrivacyPanel("none")}
                  type="button"
                >
                  Cancel
                </button>
                <button
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-[6px] bg-red-600 px-4 text-[12px] font-bold text-white hover:bg-red-700 disabled:opacity-60"
                  disabled={deletingData || deleteConfirmName.trim() !== workspace.name}
                  onClick={() => void confirmDeleteWorkspaceData()}
                  type="button"
                >
                  {deletingData ? "Deleting…" : "Delete data"}
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </AppShell>
  );
}

function ReadOnlyField({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <label className="block">
      <span className="mb-2 block text-[12px] font-bold text-neutral-800">{label}</span>
      <div className={`control flex h-11 items-center rounded-[6px] bg-neutral-50 px-3 text-[13px] text-neutral-700 ${mono ? "font-mono text-[11px]" : ""}`}>
        <span className="truncate">{value}</span>
      </div>
    </label>
  );
}

function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-[12px] font-bold text-neutral-800">{label}</span>
      <span className="relative block">
        <select
          className="control h-10 appearance-none rounded-[6px] bg-white pr-9 text-[12px]"
          onChange={(event) => onChange(event.target.value)}
          value={value}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <Icon className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500" name="chevron" size={13} />
      </span>
    </label>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <button
      aria-pressed={checked}
      className={`relative inline-flex h-5 w-9 shrink-0 rounded-full transition ${checked ? "bg-primary-500" : "bg-neutral-300"}`}
      onClick={() => onChange(!checked)}
      type="button"
    >
      <span className={`mt-0.5 size-4 rounded-full bg-white shadow transition ${checked ? "translate-x-[18px]" : "translate-x-0.5"}`} />
    </button>
  );
}

function PrivacyStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-[6px] border border-neutral-200 bg-neutral-50 px-2.5 py-2">
      <p className="text-[10px] font-bold uppercase text-neutral-400">{label}</p>
      <p className="mt-0.5 text-[15px] font-extrabold text-neutral-900">{value}</p>
    </div>
  );
}

function PrivacyRow({
  title,
  body,
  danger = false,
  disabled = false,
  onClick,
}: {
  title: string;
  body: string;
  danger?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50"
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      <span>
        <span className={`block text-[12px] font-bold ${danger ? "text-red-600" : "text-neutral-800"}`}>{title}</span>
        <span className="mt-1 block text-[11px] text-neutral-500">{body}</span>
      </span>
      <Icon className={`-rotate-90 ${danger ? "text-red-500" : "text-neutral-400"}`} name="chevron" size={14} />
    </button>
  );
}

function FooterLink({ href, label }: { href: string; label: string }) {
  return (
    <Link className="flex items-center justify-between text-[12px] font-bold text-neutral-700 hover:text-neutral-950" href={href}>
      {label}
      <Icon className="-rotate-90 text-neutral-400" name="chevron" size={13} />
    </Link>
  );
}
