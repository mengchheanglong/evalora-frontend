"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { useAuth } from "@/components/auth-provider";
import { EvaloraLogo } from "@/components/logo";
import { Icon, type IconName } from "@/components/icons";
import { PageLoader } from "@/components/ui-states";
import { ThemeSwitcher } from "@/components/theme-switcher";

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
  const { status, user } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (status === "anonymous") router.replace(`/login?returnTo=${encodeURIComponent(pathname)}`);
  }, [pathname, router, status]);

  if (status !== "authenticated" || !user) {
    return <main className="min-h-screen bg-[#f7f8fa]"><PageLoader label="Opening your workspace" /></main>;
  }

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
