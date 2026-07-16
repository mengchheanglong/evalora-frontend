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

const navigation: Array<{ label: string; href: string; key: string; icon: IconName }> = [
  { label: "Dashboard", href: "/dashboard", key: "dashboard", icon: "home" },
  { label: "Assessment Templates", href: "/templates", key: "templates", icon: "clipboard" },
  { label: "Interview Session", href: "/assessment", key: "session", icon: "message" },
  { label: "Candidates", href: "/candidates", key: "candidates", icon: "user" },
  { label: "Analytics", href: "/analytics", key: "analytics", icon: "analytics" },
];

const ownerNavigation: Array<{ label: string; href: string; key: string; icon: IconName }> = [
  { label: "Team", href: "/users", key: "users", icon: "users" },
];

const sharedSecondaryNavigation: Array<{ label: string; href: string; key: string; icon: IconName }> = [
  { label: "Setting", href: "/settings", key: "settings", icon: "settings" },
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
    function onLogoChange(event: Event) {
      const detail = (event as CustomEvent<{ organizationId?: string; logo?: string }>).detail;
      if (!user?.organizationId || detail?.organizationId !== user.organizationId) return;
      setOrgLogo(detail.logo ?? readOrgLogo(user.organizationId));
    }
    window.addEventListener(ORG_LOGO_CHANGED_EVENT, onLogoChange);
    return () => window.removeEventListener(ORG_LOGO_CHANGED_EVENT, onLogoChange);
  }, [user?.organizationId]);

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
    return <main className="min-h-screen bg-[#f7f8fa]"><PageLoader label="Opening your workspace" /></main>;
  }

  async function handleLogout() {
    setAccountOpen(false);
    await logout();
    router.replace("/login");
    router.refresh();
  }

  const displayOrgName = workspaceName || "Workspace";
  const avatarLabel = orgInitials(displayOrgName);

  return (
    <main className={`min-h-screen bg-[#f7f8fa] text-[#171b24] ${hideSidebar ? "" : "lg:grid lg:grid-cols-[244px_1fr]"}`}>
      {!hideSidebar ? (
        <>
          <aside className="sticky top-0 hidden h-screen border-r border-[#e5e7eb] bg-white lg:flex lg:flex-col">
            <Sidebar active={active} />
          </aside>
          {mobileOpen ? (
            <div className="fixed inset-0 z-50 lg:hidden">
              <button aria-label="Close navigation" className="absolute inset-0 bg-neutral-950/35 backdrop-blur-[2px]" onClick={() => setMobileOpen(false)} type="button" />
              <aside className="relative h-full w-[284px] border-r border-neutral-200 bg-white shadow-2xl">
                <Sidebar active={active} onNavigate={() => setMobileOpen(false)} />
              </aside>
            </div>
          ) : null}
        </>
      ) : null}

      <section className="min-w-0">
        <header className="sticky top-0 z-30 border-b border-[#e5e7eb] bg-white/95 backdrop-blur-xl">
          <div className="flex h-[68px] items-center gap-3 px-4 sm:px-6 xl:px-8">
            {!hideSidebar ? (
              <button aria-label="Open navigation" className="flex size-9 items-center justify-center rounded-[6px] border border-neutral-200 text-neutral-700 lg:hidden" onClick={() => setMobileOpen(true)} type="button">
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
                  aria-label="Organization account menu"
                  className="flex size-10 items-center justify-center overflow-hidden rounded-full border border-neutral-200 bg-white shadow-sm transition hover:ring-2 hover:ring-primary-200"
                  onClick={() => setAccountOpen((open) => !open)}
                  type="button"
                >
                  {orgLogo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img alt="" className="size-full object-cover" src={orgLogo} />
                  ) : (
                    <span className="flex size-full items-center justify-center bg-neutral-950 text-[11px] font-black text-white">
                      {avatarLabel}
                    </span>
                  )}
                </button>

                {accountOpen ? (
                  <div
                    className="absolute right-0 mt-2 w-[300px] overflow-hidden rounded-[12px] border border-neutral-200 bg-white shadow-[0_18px_50px_rgba(15,23,42,0.16)]"
                    role="menu"
                  >
                    <div className="border-b border-neutral-100 bg-neutral-50 px-4 py-4">
                      <div className="flex items-center gap-3">
                        <span className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-full border border-neutral-200 bg-white">
                          {orgLogo ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img alt="" className="size-full object-cover" src={orgLogo} />
                          ) : (
                            <span className="flex size-full items-center justify-center bg-neutral-950 text-[13px] font-black text-white">
                              {avatarLabel}
                            </span>
                          )}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-[13px] font-bold text-neutral-900">{displayOrgName}</p>
                          <p className="mt-0.5 truncate text-[11px] text-neutral-500">{user.email}</p>
                          <p className="mt-0.5 text-[10px] font-semibold capitalize text-neutral-400">{user.role === "organization" ? "Workspace owner" : user.role}</p>
                        </div>
                      </div>
                    </div>

                    <div className="p-1.5">
                      <button
                        className="flex h-10 w-full items-center gap-2.5 rounded-[8px] px-3 text-left text-[12px] font-semibold text-red-600 transition hover:bg-red-50"
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
                  <div className="mb-3 flex items-center gap-2 text-[12px] font-semibold text-neutral-500">
                    {breadcrumbs.map((crumb, index) => (
                      <span className="flex items-center gap-2" key={`${crumb.label}-${index}`}>
                        {crumb.href ? <Link className="hover:text-neutral-900" href={crumb.href}>{crumb.label}</Link> : <span className="text-neutral-800">{crumb.label}</span>}
                        {index < breadcrumbs.length - 1 ? <Icon className="-rotate-90 text-neutral-300" name="chevron" size={12} /> : null}
                      </span>
                    ))}
                  </div>
                ) : null}
                <h1 className="text-[26px] font-extrabold leading-tight text-[#151922] sm:text-[30px]">{title}</h1>
                {description ? <p className="mt-2 max-w-3xl text-[13px] leading-5 text-neutral-600 sm:text-sm">{description}</p> : null}
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
  const { user } = useAuth();
  const isOwner = user?.role === "organization" || user?.role === "admin";

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-[82px] items-center px-5">
        <EvaloraLogo href="/dashboard" />
      </div>
      <nav className="flex-1 px-3.5 py-4">
        <div className="space-y-2">
          {navigation.map((item) => <SidebarLink active={active === item.key} item={item} key={item.key} onNavigate={onNavigate} />)}
        </div>
        {isOwner ? (
          <>
            <p className="mt-7 px-4 text-[12px] font-bold uppercase text-neutral-500">Workspace</p>
            <div className="mt-3 space-y-2">
              {ownerNavigation.map((item) => <SidebarLink active={active === item.key} item={item} key={item.key} onNavigate={onNavigate} />)}
            </div>
          </>
        ) : null}
        <p className="mt-7 px-4 text-[12px] font-bold uppercase text-neutral-500">Account</p>
        <div className="mt-3 space-y-2">
          {sharedSecondaryNavigation.map((item) => <SidebarLink active={active === item.key} item={item} key={item.key} onNavigate={onNavigate} />)}
        </div>
      </nav>
    </div>
  );
}

function SidebarLink({ active, item, onNavigate }: { active: boolean; item: { label: string; href: string; icon: IconName }; onNavigate?: () => void }) {
  return (
    <Link className={`flex h-[48px] items-center gap-4 rounded-xl px-4 text-[14px] font-semibold transition ${active ? "bg-[#bfeeff] text-primary-700" : "text-neutral-600 hover:bg-neutral-50 hover:text-neutral-950"}`} href={item.href} onClick={onNavigate}>
      <Icon className={active ? "text-[#0b5f78]" : "text-neutral-950"} name={item.icon} size={21} />
      <span>{item.label}</span>
    </Link>
  );
}
