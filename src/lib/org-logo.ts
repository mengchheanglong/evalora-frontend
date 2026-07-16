/** Device-local organization logo used in Settings and the app header. */

const PREFIX = "evalora-org-logo:";
export const ORG_LOGO_CHANGED_EVENT = "evalora-org-logo-changed";

export function orgLogoKey(organizationId: string) {
  return `${PREFIX}${organizationId}`;
}

export function readOrgLogo(organizationId?: string | null): string {
  if (!organizationId || typeof window === "undefined") return "";
  try {
    return window.localStorage.getItem(orgLogoKey(organizationId)) ?? "";
  } catch {
    return "";
  }
}

export function writeOrgLogo(organizationId: string, dataUrl: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(orgLogoKey(organizationId), dataUrl);
  window.dispatchEvent(new CustomEvent(ORG_LOGO_CHANGED_EVENT, { detail: { organizationId, logo: dataUrl } }));
}

export function clearOrgLogo(organizationId: string) {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(orgLogoKey(organizationId));
  window.dispatchEvent(new CustomEvent(ORG_LOGO_CHANGED_EVENT, { detail: { organizationId, logo: "" } }));
}

export function orgInitials(name: string) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("") || "E"
  );
}
