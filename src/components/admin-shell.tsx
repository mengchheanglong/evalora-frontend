"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { AdminSearchPalette, useSearchShortcut } from "@/components/admin-search";
import { useAuth } from "@/components/auth-provider";
import { BackendHealthBanner } from "@/components/backend-health-banner";
import { Icon, type IconName } from "@/components/icons";
import { LogoMark } from "@/components/logo";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { PageLoader } from "@/components/ui-states";
import { ADMIN_PAGE_SIZE, buildAdminQuery } from "@/lib/admin";
import { apiGet } from "@/lib/api";
import { ADMIN_HOME, WORKSPACE_HOME } from "@/lib/auth-routes";
import { readUserProfilePhoto, userInitials } from "@/lib/user-profile-photo";

export type AdminSection = "overview" | "organizations" | "users" | "costs" | "health";

type AdminNavigationItem = { key: AdminSection; label: string; href: string; icon: IconName; hint: string };
type AdminNavigationGroup = { heading: string; items: AdminNavigationItem[] };

/**
 * Navigation for the platform console. Designed with Atlassian & shadcn hierarchy:
 * - "Platform" group: Core directory management (Overview, Workspaces, Accounts).
 * - "Operations" group: Mission-critical monitoring (Usage & Cost, System Health).
 */
export const ADMIN_NAVIGATION: AdminNavigationGroup[] = [
  {
    heading: "Platform",
    items: [
      { key: "overview", label: "Overview", href: ADMIN_HOME, icon: "home", hint: "What needs attention, 30-day trends, recent joins" },
      { key: "organizations", label: "Organizations", href: `${ADMIN_HOME}/organizations`, icon: "globe", hint: "Workspaces, subscription plans, suspension" },
      { key: "users", label: "Users", href: `${ADMIN_HOME}/users`, icon: "users", hint: "Every account across every workspace" },
    ],
  },
  {
    heading: "Operations",
    items: [
      { key: "costs", label: "Usage & Cost", href: `${ADMIN_HOME}/costs`, icon: "analytics", hint: "AI spend, what drives it, subscription plans" },
      { key: "health", label: "System health", href: `${ADMIN_HOME}/health`, icon: "waves", hint: "Live service status, latency, workload" },
    ],
  },
];

const FIRST_PAGE_QUERY = buildAdminQuery({ page: 1, pageSize: ADMIN_PAGE_SIZE });
const ADMIN_PREFETCH_PATHS: Record<string, string[]> = {
  [ADMIN_HOME]: ["/admin/overview"],
  [`${ADMIN_HOME}/organizations`]: [`/admin/organizations${FIRST_PAGE_QUERY}`],
  [`${ADMIN_HOME}/users`]: [`/admin/users${FIRST_PAGE_QUERY}`],
  [`${ADMIN_HOME}/costs`]: ["/admin/overview"],
  [`${ADMIN_HOME}/health`]: ["/admin/overview"],
};

type AdminShellProps = {
  active: AdminSection;
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
};

export function AdminShell({ active, title, description, actions, children }: AdminShellProps) {
  const { status, user, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [profilePhoto, setProfilePhoto] = useState("");
  const accountMenuRef = useRef<HTMLDivElement>(null);
  const openSearch = useCallback(() => setSearchOpen(true), []);
  const closeSearch = useCallback(() => setSearchOpen(false), []);
  useSearchShortcut(openSearch);

  useEffect(() => {
    if (status === "anonymous") router.replace(`/login?returnTo=${encodeURIComponent(pathname)}`);
    else if (status === "authenticated" && user && user.role !== "admin") router.replace(WORKSPACE_HOME);
  }, [pathname, router, status, user]);

  useEffect(() => {
    if (!user?.id) return;
    setProfilePhoto(user.profilePhoto || readUserProfilePhoto(user.id));
  }, [user?.id, user?.profilePhoto]);

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

  if (status !== "authenticated" || !user || user.role !== "admin") {
    return (
      <main className="min-h-screen bg-[var(--theme-bg)]">
        <PageLoader label="Checking platform access" />
      </main>
    );
  }

  async function handleLogout() {
    setAccountOpen(false);
    await logout();
    router.replace("/login");
    router.refresh();
  }

  const initials = userInitials(user.name);
  const activeNavItem = ADMIN_NAVIGATION.flatMap((g) => g.items).find((i) => i.key === active);

  return (
    <main className="min-h-screen bg-[var(--theme-bg)] text-[var(--theme-text)] lg:grid lg:grid-cols-[260px_1fr]">
      {/* Desktop Sidebar */}
      <aside className="sticky top-0 hidden h-screen border-r border-[var(--theme-border)] bg-[var(--theme-panel)] lg:flex lg:flex-col shadow-xs">
        <AdminSidebar active={active} />
      </aside>

      {/* Mobile Navigation Drawer */}
      {mobileOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            aria-label="Close navigation"
            className="absolute inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileOpen(false)}
            type="button"
          />
          <aside className="relative h-full w-[280px] border-r border-[var(--theme-border)] bg-[var(--theme-panel)] shadow-2xl">
            <AdminSidebar active={active} onNavigate={() => setMobileOpen(false)} />
          </aside>
        </div>
      ) : null}

      <section className="flex min-w-0 flex-col">
        {/* Sticky Top Header */}
        <header className="sticky top-0 z-30 border-b border-[var(--theme-border)] bg-[var(--theme-panel)]/90 backdrop-blur-md">
          <div className="flex h-16 items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
            {/* Left: Mobile Toggle & Breadcrumbs */}
            <div className="flex items-center gap-3 min-w-0">
              <button
                aria-label="Open navigation"
                className="flex size-9 items-center justify-center rounded-lg border border-[var(--theme-border)] bg-[var(--theme-panel-soft)] text-[var(--theme-text)] transition hover:bg-[var(--theme-panel-tint)] lg:hidden"
                onClick={() => setMobileOpen(true)}
                type="button"
              >
                <Icon name="menu" size={18} />
              </button>

              <div className="flex items-center gap-2 text-xs font-medium text-[var(--theme-muted)] min-w-0">
                <Link className="flex items-center gap-1.5 font-semibold text-[var(--theme-heading)] hover:text-[var(--color-primary-600)] transition" href={ADMIN_HOME}>
                  <LogoMark className="size-5 shrink-0" />
                  <span className="hidden sm:inline">Platform Console</span>
                </Link>
                <span className="text-[var(--theme-border-strong)]">/</span>
                <span className="truncate font-semibold text-[var(--theme-heading)]">{activeNavItem?.label ?? "Overview"}</span>
              </div>
            </div>

            {/* Middle: Command Search Trigger */}
            <div className="hidden md:flex flex-1 max-w-md mx-4">
              <button
                aria-keyshortcuts="Control+K Meta+K"
                className="group flex h-9 w-full items-center gap-2.5 rounded-xl border border-[var(--theme-border)] bg-[var(--theme-panel-tint)] px-3 text-left text-xs text-[var(--theme-muted)] transition hover:border-[var(--theme-border-strong)] hover:bg-[var(--theme-panel)] hover:shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--theme-ring)]"
                onClick={openSearch}
                type="button"
              >
                <Icon className="text-[var(--theme-muted)] transition group-hover:text-[var(--theme-heading)]" name="search" size={15} />
                <span className="flex-1 truncate">Search workspaces, users, metrics…</span>
                <kbd className="inline-flex h-5 items-center gap-0.5 rounded border border-[var(--theme-border)] bg-[var(--theme-panel)] px-1.5 font-mono text-xs font-semibold text-[var(--theme-muted)] shadow-2xs">
                  Ctrl K
                </kbd>
              </button>
            </div>

            {/* Right: Actions, Theme, Account */}
            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              <button
                aria-label="Search"
                className="flex size-9 items-center justify-center rounded-lg border border-[var(--theme-border)] bg-[var(--theme-panel-soft)] text-[var(--theme-muted)] transition hover:text-[var(--theme-heading)] md:hidden"
                onClick={openSearch}
                type="button"
              >
                <Icon name="search" size={16} />
              </button>

              {/* Status Badge */}
              <Link
                className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-emerald-200/80 bg-emerald-50/80 px-2.5 py-1 text-xs font-bold text-emerald-800 hover:bg-emerald-100 transition dark:border-emerald-800/60 dark:bg-emerald-950/40 dark:text-emerald-300 shadow-2xs"
                href={`${ADMIN_HOME}/health`}
              >
                <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Live System</span>
              </Link>

              <ThemeSwitcher compact />

              {/* User Account Menu */}
              <div className="relative" ref={accountMenuRef}>
                <button
                  aria-expanded={accountOpen}
                  aria-haspopup="menu"
                  aria-label="Account menu"
                  className="flex size-9 items-center justify-center overflow-hidden rounded-full border border-[var(--theme-border)] bg-[var(--theme-panel)] shadow-xs transition hover:ring-2 hover:ring-[var(--theme-ring)] hover:border-[var(--color-primary-400)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--theme-ring)]"
                  onClick={() => setAccountOpen((open) => !open)}
                  type="button"
                >
                  {profilePhoto ? (
                    <img alt="" className="size-full object-cover" src={profilePhoto} />
                  ) : (
                    <span className="flex size-full items-center justify-center bg-gradient-to-tr from-sky-600 to-cyan-500 text-xs font-bold text-white tracking-wide">
                      {initials}
                    </span>
                  )}
                </button>

                {accountOpen ? (
                  <div
                    className="absolute right-0 mt-2 w-[280px] overflow-hidden rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-panel)] shadow-xl animate-in fade-in zoom-in-95 duration-100"
                    role="menu"
                  >
                    <div className="border-b border-[var(--theme-border)] bg-[var(--theme-panel-soft)] px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        <span className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[var(--theme-border)] bg-[var(--theme-panel)] shadow-xs">
                          {profilePhoto ? (
                            <img alt="" className="size-full object-cover" src={profilePhoto} />
                          ) : (
                            <span className="flex size-full items-center justify-center bg-gradient-to-tr from-sky-600 to-cyan-500 text-xs font-bold text-white">
                              {initials}
                            </span>
                          )}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold text-[var(--theme-heading)]">{user.name}</p>
                          <p className="truncate text-xs text-[var(--theme-muted)]">{user.email}</p>
                          <span className="mt-1 inline-flex items-center rounded-md border border-amber-200/80 bg-amber-50 px-2 py-0.5 text-xs font-bold text-amber-800 dark:border-amber-800/60 dark:bg-amber-950/40 dark:text-amber-300">
                            Platform Admin
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="p-1.5 space-y-0.5">
                      <Link
                        className="flex h-9 w-full items-center gap-2.5 rounded-lg px-3 text-xs font-medium text-[var(--theme-text)] transition hover:bg-[var(--theme-panel-soft)] hover:text-[var(--theme-heading)]"
                        href={`${ADMIN_HOME}/health`}
                        onClick={() => setAccountOpen(false)}
                        role="menuitem"
                      >
                        <Icon className="text-[var(--theme-muted)]" name="waves" size={15} />
                        System health status
                      </Link>
                      <button
                        className="flex h-9 w-full items-center gap-2.5 rounded-lg px-3 text-xs font-medium text-rose-600 transition hover:bg-rose-50 dark:hover:bg-rose-950/40"
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

        {/* Page Content Canvas */}
        <div className="flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <div className="mx-auto max-w-7xl space-y-6">
            <BackendHealthBanner />

            {/* Page Header Bar */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <h1 className="text-2xl font-extrabold tracking-tight text-[var(--theme-heading)] sm:text-3xl">{title}</h1>
                {description ? <p className="mt-1 max-w-3xl text-sm leading-relaxed text-[var(--theme-muted)]">{description}</p> : null}
              </div>
              {actions ? <div className="flex items-center gap-2.5 shrink-0">{actions}</div> : null}
            </div>

            {children}
          </div>
        </div>
      </section>

      <AdminSearchPalette onClose={closeSearch} open={searchOpen} />
    </main>
  );
}

function AdminSidebar({
  active,
  onNavigate,
}: {
  active: AdminSection;
  onNavigate?: () => void;
}) {
  return (
    <div className="flex h-full flex-col">
      {/* Brand Header */}
      <div className="flex h-16 items-center justify-between border-b border-[var(--theme-border)] px-5">
        <Link className="flex items-center gap-2.5 group" href={ADMIN_HOME} onClick={onNavigate}>
          <LogoMark className="size-8 transition transform group-hover:scale-105" />
          <div className="leading-tight">
            <span className="block text-base font-bold tracking-tight text-[var(--theme-heading)]">Evalora</span>
            <span className="block text-xs font-medium text-[var(--theme-muted)]">Platform Console</span>
          </div>
        </Link>
        <span className="rounded-md border border-sky-200/80 bg-sky-50 px-2 py-0.5 text-xs font-bold uppercase tracking-wider text-sky-800 dark:border-sky-800/60 dark:bg-sky-950/40 dark:text-sky-300">
          Admin
        </span>
      </div>

      {/* Navigation Groups */}
      <nav className="flex-1 overflow-y-auto px-3 py-5 space-y-6">
        {ADMIN_NAVIGATION.map((group) => (
          <div key={group.heading}>
            <p className="px-3 text-xs font-bold uppercase tracking-wider text-[var(--theme-muted)] opacity-80">
              {group.heading}
            </p>
            <div className="mt-1.5 space-y-1">
              {group.items.map((item) => (
                <AdminSidebarLink active={active === item.key} item={item} key={item.key} onNavigate={onNavigate} />
              ))}
            </div>
          </div>
        ))}
      </nav>
    </div>
  );
}

function AdminSidebarLink({
  active,
  item,
  onNavigate,
}: {
  active: boolean;
  item: AdminNavigationItem;
  onNavigate?: () => void;
}) {
  return (
    <Link
      aria-current={active ? "page" : undefined}
      className={`group flex h-9 items-center gap-3 rounded-xl px-3 text-xs font-medium transition ${
        active
          ? "bg-[var(--theme-active)] text-[var(--theme-active-text)] font-semibold shadow-xs"
          : "text-[var(--theme-muted)] hover:bg-[var(--theme-panel-soft)] hover:text-[var(--theme-heading)]"
      }`}
      href={item.href}
      onClick={onNavigate}
      onFocus={() => prefetchAdminPage(item.href)}
      onMouseEnter={() => prefetchAdminPage(item.href)}
      title={item.hint}
    >
      <Icon
        className={`shrink-0 transition ${
          active
            ? "text-[var(--theme-active-text)]"
            : "text-[var(--theme-muted)] group-hover:text-[var(--theme-heading)]"
        }`}
        name={item.icon}
        size={17}
      />
      <span className="truncate">{item.label}</span>
      {active ? <span className="ml-auto size-1.5 rounded-full bg-current opacity-70" /> : null}
    </Link>
  );
}

function prefetchAdminPage(href: string) {
  const paths = ADMIN_PREFETCH_PATHS[href];
  if (!paths) return;
  void Promise.allSettled(paths.map((path) => apiGet<unknown>(path)));
}
