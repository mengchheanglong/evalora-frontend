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

export type AdminSection = "overview" | "organizations" | "users";

type AdminNavigationItem = { key: AdminSection; label: string; href: string; icon: IconName; hint: string };

/**
 * Navigation for the platform console. It is deliberately independent of the
 * workspace shell: nothing from the workspace sidebar appears here, and the
 * workspace sidebar never links here.
 */
export const ADMIN_NAVIGATION: AdminNavigationItem[] = [
  { key: "overview", label: "Usage & Cost", href: ADMIN_HOME, icon: "analytics", hint: "Platform totals, AI spend, infrastructure" },
  { key: "organizations", label: "Organizations", href: `${ADMIN_HOME}/organizations`, icon: "globe", hint: "Workspaces, plans, suspension" },
  { key: "users", label: "Users", href: `${ADMIN_HOME}/users`, icon: "users", hint: "Every account across every workspace" },
];

// Keys match each page's first request exactly so hovering a link warms the GET cache.
const FIRST_PAGE_QUERY = buildAdminQuery({ page: 1, pageSize: ADMIN_PAGE_SIZE });
const ADMIN_PREFETCH_PATHS: Record<string, string[]> = {
  [ADMIN_HOME]: ["/admin/overview"],
  [`${ADMIN_HOME}/organizations`]: [`/admin/organizations${FIRST_PAGE_QUERY}`],
  [`${ADMIN_HOME}/users`]: [`/admin/users${FIRST_PAGE_QUERY}`],
};

type AdminShellProps = {
  active: AdminSection;
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
};

/**
 * Layout for the platform console (`/admin/*`). Separate from `AppShell` on
 * purpose: its own sidebar, header, branding, and access rule. Anonymous
 * visitors go to `/login`; signed-in non-admins go to the workspace dashboard.
 * The backend enforces the same role on every `/admin/*` call.
 */
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

  return (
    <main className="min-h-screen bg-[var(--theme-bg)] text-[var(--theme-text)] lg:grid lg:grid-cols-[244px_1fr]">
      <aside className="sticky top-0 hidden h-screen border-r border-[var(--theme-border)] bg-[var(--theme-panel)] lg:flex lg:flex-col">
        <AdminSidebar active={active} />
      </aside>
      {mobileOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button aria-label="Close navigation" className="absolute inset-0 bg-[var(--theme-heading)]/35 backdrop-blur-[2px]" onClick={() => setMobileOpen(false)} type="button" />
          <aside className="relative h-full w-[284px] border-r border-[var(--theme-border)] bg-[var(--theme-panel)] shadow-2xl">
            <AdminSidebar active={active} onNavigate={() => setMobileOpen(false)} />
          </aside>
        </div>
      ) : null}

      <section className="min-w-0">
        <header className="sticky top-0 z-30 border-b border-[var(--theme-border)] bg-[var(--theme-panel)] backdrop-blur-xl">
          <div className="flex h-[68px] items-center gap-3 px-4 sm:px-6 xl:px-8">
            <button aria-label="Open navigation" className="flex size-9 items-center justify-center rounded-[6px] border border-[var(--theme-border)] text-[var(--theme-text)] lg:hidden" onClick={() => setMobileOpen(true)} type="button">
              <Icon name="menu" size={19} />
            </button>
            <Link className="flex items-center gap-2 lg:hidden" href={ADMIN_HOME}>
              <LogoMark className="size-[36px]" />
              <span className="text-sm font-bold text-[var(--theme-heading)]">Platform console</span>
            </Link>

            <button
              aria-keyshortcuts="Control+K Meta+K"
              className="ml-2 hidden h-10 w-full max-w-[420px] items-center gap-3 rounded-[8px] border border-[var(--theme-border)] bg-[var(--theme-panel-tint)] px-3 text-left text-sm text-[var(--theme-muted)] transition hover:border-[var(--theme-border-strong)] hover:bg-[var(--theme-panel)] md:flex"
              onClick={openSearch}
              type="button"
            >
              <Icon name="search" size={16} />
              <span className="flex-1 truncate">Search workspaces and people…</span>
              <kbd className="rounded border border-[var(--theme-border)] bg-[var(--theme-panel)] px-1.5 py-0.5 text-[10px] font-bold text-[var(--theme-faint)]">Ctrl K</kbd>
            </button>

            <div className="ml-auto flex items-center gap-2 sm:gap-3">
              <button aria-label="Search" className="flex size-9 items-center justify-center rounded-[6px] border border-[var(--theme-border)] text-[var(--theme-text)] md:hidden" onClick={openSearch} type="button">
                <Icon name="search" size={17} />
              </button>
              {actions}
              <div className="hidden md:block">
                <ThemeSwitcher compact />
              </div>

              <div className="relative" ref={accountMenuRef}>
                <button
                  aria-expanded={accountOpen}
                  aria-haspopup="menu"
                  aria-label="Account menu"
                  className="flex size-10 items-center justify-center overflow-hidden rounded-full border border-amber-300 bg-[var(--theme-panel)] shadow-sm transition hover:ring-2 hover:ring-amber-200"
                  onClick={() => setAccountOpen((open) => !open)}
                  type="button"
                >
                  {profilePhoto ? (
                    <img alt="" className="size-full object-cover" src={profilePhoto} />
                  ) : (
                    <span className="flex size-full items-center justify-center bg-amber-500 text-xs font-black text-white">{initials}</span>
                  )}
                </button>

                {accountOpen ? (
                  <div
                    className="absolute right-0 mt-2 w-[300px] overflow-hidden rounded-[12px] border border-[var(--theme-border)] bg-[var(--theme-panel)] shadow-[0_18px_50px_rgba(15,23,42,0.16)]"
                    role="menu"
                  >
                    <div className="border-b border-[var(--theme-border)] bg-[var(--theme-panel-soft)] px-4 py-4">
                      <div className="flex items-center gap-3">
                        <span className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-full border border-amber-300 bg-[var(--theme-panel)]">
                          {profilePhoto ? (
                            <img alt="" className="size-full object-cover" src={profilePhoto} />
                          ) : (
                            <span className="flex size-full items-center justify-center bg-amber-500 text-sm font-black text-white">{initials}</span>
                          )}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold text-[var(--theme-heading)]">{user.name}</p>
                          <p className="mt-0.5 truncate text-xs text-[var(--theme-muted)]">{user.email}</p>
                          <p className="mt-0.5 text-xs font-semibold text-amber-700">Platform admin</p>
                        </div>
                      </div>
                    </div>

                    <div className="p-1.5">
                      {user.organizationId ? (
                        <Link
                          className="flex h-10 w-full items-center gap-2.5 rounded-[8px] px-3 text-left text-xs font-semibold text-[var(--theme-text)] transition hover:bg-[var(--theme-panel-soft)]"
                          href={WORKSPACE_HOME}
                          onClick={() => setAccountOpen(false)}
                          role="menuitem"
                        >
                          <Icon name="home" size={15} />
                          Open my workspace
                        </Link>
                      ) : null}
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
          <BackendHealthBanner />
          <div className="mb-6">
            <h1 className="text-2xl font-extrabold leading-tight text-[var(--theme-heading)] sm:text-3xl">{title}</h1>
            {description ? <p className="mt-2 max-w-3xl text-sm leading-5 text-[var(--theme-muted)]">{description}</p> : null}
          </div>
          {children}
        </div>
      </section>

      <AdminSearchPalette onClose={closeSearch} open={searchOpen} />
    </main>
  );
}

function AdminSidebar({ active, onNavigate }: { active: AdminSection; onNavigate?: () => void }) {
  return (
    <div className="flex h-full flex-col">
      <Link className="flex h-[82px] items-center gap-3 px-5" href={ADMIN_HOME} onClick={onNavigate}>
        <LogoMark className="size-[42px]" />
        <span className="leading-tight">
          <span className="block text-xl font-bold leading-none tracking-[-0.02em] text-[var(--theme-heading)]">Evalora</span>
          <span className="mt-1 inline-flex items-center rounded-[5px] border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[10px] font-black uppercase tracking-[0.08em] text-amber-700">Platform console</span>
        </span>
      </Link>
      <nav className="flex-1 px-3.5 py-4">
        <p className="px-4 text-xs font-bold uppercase text-[var(--theme-muted)]">Platform</p>
        <div className="mt-3 space-y-2">
          {ADMIN_NAVIGATION.map((item) => <AdminSidebarLink active={active === item.key} item={item} key={item.key} onNavigate={onNavigate} />)}
        </div>
      </nav>
      <div className="border-t border-[var(--theme-border)] px-5 py-4 text-xs leading-5 text-[var(--theme-faint)]">
        <p>Changes made here apply across every workspace and take effect on the target&apos;s next request.</p>
        <p className="mt-2">
          Press <kbd className="rounded border border-[var(--theme-border)] px-1 text-[10px] font-bold">/</kbd> to search.
        </p>
      </div>
    </div>
  );
}

function AdminSidebarLink({ active, item, onNavigate }: { active: boolean; item: AdminNavigationItem; onNavigate?: () => void }) {
  return (
    <Link
      aria-current={active ? "page" : undefined}
      className={`flex h-[48px] items-center gap-4 rounded-xl px-4 text-sm font-semibold transition ${active ? "bg-[var(--theme-active)] text-[var(--theme-active-text)]" : "text-[var(--theme-muted)] hover:bg-[var(--theme-panel-soft)] hover:text-[var(--theme-heading)]"}`}
      href={item.href}
      onClick={onNavigate}
      onFocus={() => prefetchAdminPage(item.href)}
      onMouseEnter={() => prefetchAdminPage(item.href)}
      title={item.hint}
    >
      <Icon className={active ? "text-[var(--theme-active-text)]" : "text-[var(--theme-heading)]"} name={item.icon} size={21} />
      <span>{item.label}</span>
    </Link>
  );
}

function prefetchAdminPage(href: string) {
  const paths = ADMIN_PREFETCH_PATHS[href];
  if (!paths) return;
  void Promise.allSettled(paths.map((path) => apiGet<unknown>(path)));
}
