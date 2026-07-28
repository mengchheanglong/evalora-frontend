"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useAuth } from "@/components/auth-provider";
import { EvaloraLogo } from "@/components/logo";
import { Icon, type IconName } from "@/components/icons";
import { PageLoader } from "@/components/ui-states";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { apiGet } from "@/lib/api";
import { ORG_LOGO_CHANGED_EVENT, orgInitials, readOrgLogo } from "@/lib/org-logo";
import {
  readUserProfilePhoto,
  USER_PROFILE_PHOTO_CHANGED_EVENT,
  userInitials,
} from "@/lib/user-profile-photo";
import type { WorkspaceProfile } from "@/lib/types";

type AppShellProps = {
  active: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  showPageHeader?: boolean;
  breadcrumbs?: Array<{ label: string; href?: string }>;
  hideSidebar?: boolean;
};

type NavigationItem = { label: string; href: string; key: string; icon: IconName };

const navigation: NavigationItem[] = [
  { label: "Overview", href: "/dashboard", key: "dashboard", icon: "home" },
  { label: "Assessment Templates", href: "/templates", key: "templates", icon: "clipboard" },
  { label: "Interview Session", href: "/assessment", key: "session", icon: "message" },
  { label: "Candidates", href: "/candidates", key: "candidates", icon: "user" },
  { label: "Analytics", href: "/analytics", key: "analytics", icon: "analytics" },
];

const workspaceNavigation: NavigationItem[] = [
  { label: "Team", href: "/users", key: "users", icon: "users" },
];

const sharedSecondaryNavigation: NavigationItem[] = [
  { label: "Settings", href: "/settings", key: "settings", icon: "settings" },
];

export function AppShell({
  active,
  title,
  description,
  actions,
  children,
  showPageHeader = true,
  breadcrumbs,
  hideSidebar = false,
}: AppShellProps) {
  const { status, user, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [workspaceName, setWorkspaceName] = useState("");
  const [orgLogo, setOrgLogo] = useState("");
  const [profilePhoto, setProfilePhoto] = useState("");
  const accountMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (status === "anonymous") router.replace(`/login?returnTo=${encodeURIComponent(pathname)}`);
  }, [pathname, router, status]);

  useEffect(() => {
    if (status !== "authenticated" || !user?.organizationId) return;
    let cancelled = false;
    setOrgLogo(readOrgLogo(user.organizationId));
    void apiGet<WorkspaceProfile>("/organization")
      .then((workspace) => {
        if (cancelled) return;
        setWorkspaceName(workspace.name);
        setOrgLogo(readOrgLogo(workspace.id));
      })
      .catch(() => {
        if (!cancelled) setWorkspaceName("");
      });
    return () => {
      cancelled = true;
    };
  }, [status, user?.organizationId]);

  useEffect(() => {
    if (!user?.id) return;
    setProfilePhoto(readUserProfilePhoto(user.id));
  }, [user?.id]);

  useEffect(() => {
    function onLogoChange(event: Event) {
      const detail = (event as CustomEvent<{ organizationId?: string; logo?: string }>).detail;
      if (!user?.organizationId || detail?.organizationId !== user.organizationId) return;
      setOrgLogo(detail.logo ?? readOrgLogo(user.organizationId));
    }
    window.addEventListener(ORG_LOGO_CHANGED_EVENT, onLogoChange);
    return () => window.removeEventListener(ORG_LOGO_CHANGED_EVENT, onLogoChange);
  }, [user?.organizationId]);

  useEffect(() => {
    function onProfilePhotoChange(event: Event) {
      const detail = (event as CustomEvent<{ userId?: string; photo?: string }>).detail;
      if (!user?.id || detail?.userId !== user.id) return;
      setProfilePhoto(detail.photo ?? readUserProfilePhoto(user.id));
    }
    window.addEventListener(USER_PROFILE_PHOTO_CHANGED_EVENT, onProfilePhotoChange);
    return () => window.removeEventListener(USER_PROFILE_PHOTO_CHANGED_EVENT, onProfilePhotoChange);
  }, [user?.id]);

  useEffect(() => {
    if (!accountOpen) return;
    function onPointerDown(event: MouseEvent) {
      if (!accountMenuRef.current?.contains(event.target as Node)) setAccountOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setAccountOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [accountOpen]);

  if (status !== "authenticated" || !user) {
    return <main className="min-h-screen bg-[var(--theme-bg)]"><PageLoader label="Opening your workspace" /></main>;
  }

  async function handleLogout() {
    setAccountOpen(false);
    await logout();
    router.replace("/login");
    router.refresh();
  }

  const displayOrgName = workspaceName || "Workspace";
  const isOwner = user.role === "organization" || user.role === "admin";
  const accountImage = isOwner ? orgLogo : profilePhoto;
  const accountLabel = isOwner ? orgInitials(displayOrgName) : userInitials(user.name);
  const accountName = isOwner ? displayOrgName : user.name;

  return (
    <main className={`min-h-screen bg-[var(--theme-bg)] text-[var(--theme-text)] ${hideSidebar ? "" : "lg:grid lg:grid-cols-[244px_1fr]"}`}>
      {!hideSidebar ? (
        <>
          <aside className="sticky top-0 hidden h-screen border-r border-[var(--theme-border)] bg-[var(--theme-panel)] lg:flex lg:flex-col">
            <Sidebar active={active} />
          </aside>
          {mobileOpen ? (
            <div className="fixed inset-0 z-50 lg:hidden">
              <button aria-label="Close navigation" className="absolute inset-0 bg-[var(--theme-heading)]/35 backdrop-blur-[2px]" onClick={() => setMobileOpen(false)} type="button" />
              <aside className="relative h-full w-[284px] border-r border-[var(--theme-border)] bg-[var(--theme-panel)] shadow-2xl">
                <Sidebar active={active} onNavigate={() => setMobileOpen(false)} />
              </aside>
            </div>
          ) : null}
        </>
      ) : null}

      <section className="min-w-0">
        <header className="sticky top-0 z-30 border-b border-[var(--theme-border)] bg-[var(--theme-panel)] backdrop-blur-xl">
          <div className="flex h-[68px] items-center gap-3 px-4 sm:px-6 xl:px-8">
            {!hideSidebar ? (
              <button aria-label="Open navigation" className="flex size-9 items-center justify-center rounded-[6px] border border-[var(--theme-border)] text-[var(--theme-text)] lg:hidden" onClick={() => setMobileOpen(true)} type="button">
                <Icon name="menu" size={19} />
              </button>
            ) : null}
            <div className="lg:hidden"><EvaloraLogo compact href="/dashboard" /></div>

            <div className="ml-auto flex items-center gap-2 sm:gap-3">
              {actions}
              <div className="hidden md:block">
                <ThemeSwitcher compact />
              </div>

              <div className="relative" ref={accountMenuRef}>
                <button
                  aria-expanded={accountOpen}
                  aria-haspopup="menu"
                  aria-label="Account menu"
                  className="flex size-10 items-center justify-center overflow-hidden rounded-full border border-[var(--theme-border)] bg-[var(--theme-panel)] shadow-sm transition hover:ring-2 hover:ring-primary-200"
                  onClick={() => setAccountOpen((open) => !open)}
                  type="button"
                >
                  {accountImage ? (
                    <img alt="" className="size-full object-cover" src={accountImage} />
                  ) : (
                    <span className="flex size-full items-center justify-center bg-[var(--theme-heading)] text-xs font-black text-white">
                      {accountLabel}
                    </span>
                  )}
                </button>

                {accountOpen ? (
                  <div
                    className="absolute right-0 mt-2 w-[300px] overflow-hidden rounded-[12px] border border-[var(--theme-border)] bg-[var(--theme-panel)] shadow-[0_18px_50px_rgba(15,23,42,0.16)]"
                    role="menu"
                  >
                    <div className="border-b border-[var(--theme-border)] bg-[var(--theme-panel-soft)] px-4 py-4">
                      <div className="flex items-center gap-3">
                        <span className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[var(--theme-border)] bg-[var(--theme-panel)]">
                          {accountImage ? (
                            <img alt="" className="size-full object-cover" src={accountImage} />
                          ) : (
                            <span className="flex size-full items-center justify-center bg-[var(--theme-heading)] text-sm font-black text-white">
                              {accountLabel}
                            </span>
                          )}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold text-[var(--theme-heading)]">{accountName}</p>
                          <p className="mt-0.5 truncate text-xs text-[var(--theme-muted)]">{user.email}</p>
                          <p className="mt-0.5 text-xs font-semibold capitalize text-[var(--theme-faint)]">{user.role === "organization" ? "Workspace owner" : user.role}</p>
                        </div>
                      </div>
                    </div>

                    <div className="p-1.5">
                      <button
                        className="flex h-10 w-full items-center gap-2.5 rounded-[8px] px-3 text-left text-xs font-semibold text-red-600 transition hover:bg-red-50"
                        onClick={() => void handleLogout()}
                        role="menuitem"
                        type="button"
                      >
                        <Icon name="lock" size={15} />
                        Sign out
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </header>

        <div className="px-4 py-6 sm:px-6 lg:py-7 xl:px-8">
          {showPageHeader ? (
            <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
              <div>
                {breadcrumbs?.length ? (
                  <div className="mb-3 flex items-center gap-2 text-xs font-semibold text-[var(--theme-muted)]">
                    {breadcrumbs.map((crumb, index) => (
                      <span className="flex items-center gap-2" key={`${crumb.label}-${index}`}>
                        {crumb.href ? <Link className="hover:text-[var(--theme-heading)]" href={crumb.href}>{crumb.label}</Link> : <span className="text-[var(--theme-text)]">{crumb.label}</span>}
                        {index < breadcrumbs.length - 1 ? <Icon className="-rotate-90 text-[var(--theme-faint)]" name="chevron" size={12} /> : null}
                      </span>
                    ))}
                  </div>
                ) : null}
                <h1 className="text-2xl font-extrabold leading-tight text-[var(--theme-heading)] sm:text-3xl">{title}</h1>
                {description ? <p className="mt-2 max-w-3xl text-sm leading-5 text-[var(--theme-muted)] sm:text-sm">{description}</p> : null}
              </div>
            </div>
          ) : null}
          {children}
        </div>
      </section>
    </main>
  );
}

function Sidebar({ active, onNavigate }: { active: string; onNavigate?: () => void }) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex h-[82px] items-center px-5">
        <EvaloraLogo href="/dashboard" />
      </div>
      <nav className="flex-1 px-3.5 py-4">
        <div className="space-y-2">
          {navigation.map((item) => <SidebarLink active={active === item.key} item={item} key={item.key} onNavigate={onNavigate} />)}
        </div>
        <p className="mt-7 px-4 text-xs font-bold uppercase text-[var(--theme-muted)]">Workspace</p>
        <div className="mt-3 space-y-2">
          {workspaceNavigation.map((item) => <SidebarLink active={active === item.key} item={item} key={item.key} onNavigate={onNavigate} />)}
        </div>
        <p className="mt-7 px-4 text-xs font-bold uppercase text-[var(--theme-muted)]">Account</p>
        <div className="mt-3 space-y-2">
          {sharedSecondaryNavigation.map((item) => <SidebarLink active={active === item.key} item={item} key={item.key} onNavigate={onNavigate} />)}
        </div>
      </nav>
    </div>
  );
}

function SidebarLink({ active, item, onNavigate }: { active: boolean; item: { label: string; href: string; icon: IconName }; onNavigate?: () => void }) {
  return (
    <Link className={`flex h-[48px] items-center gap-4 rounded-xl px-4 text-sm font-semibold transition ${active ? "bg-[var(--theme-active)] text-[var(--theme-active-text)]" : "text-[var(--theme-muted)] hover:bg-[var(--theme-panel-soft)] hover:text-[var(--theme-heading)]"}`} href={item.href} onClick={onNavigate} onFocus={() => prefetchWorkspacePage(item.href)} onMouseEnter={() => prefetchWorkspacePage(item.href)}>
      <Icon className={active ? "text-[var(--theme-active-text)]" : "text-[var(--theme-heading)]"} name={item.icon} size={21} />
      <span>{item.label}</span>
    </Link>
  );
}

function prefetchWorkspacePage(href: string) {
  const paths = WORKSPACE_PREFETCH_PATHS[href];
  if (!paths) return;
  void Promise.allSettled(paths.map((path) => apiGet<unknown>(path)));
}

const WORKSPACE_PREFETCH_PATHS: Record<string, string[]> = {
  "/dashboard": ["/analytics/summary", "/analytics/activity", "/analytics/ready-reports", "/analytics/upcoming"],
  "/templates": ["/templates/catalog", "/templates"],
  "/assessment": ["/sessions", "/analytics/summary"],
  "/candidates": ["/sessions", "/analytics/summary"],
  "/analytics": ["/analytics/summary", "/analytics/template-usage"],
  "/users": ["/organization/members"],
  "/settings": ["/organization", "/organization/privacy"],
};
