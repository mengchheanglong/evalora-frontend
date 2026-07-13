"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { useAuth } from "@/components/auth-provider";
import { EvaloraLogo } from "@/components/logo";
import { Icon, type IconName } from "@/components/icons";
import { PageLoader } from "@/components/ui-states";

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

type ThemeName = "light" | "dark" | "ocean";

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
  const { logout, status, user } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileImage, setProfileImage] = useState("");
  const [theme, setTheme] = useState<ThemeName>("light");

  useEffect(() => {
    if (status === "anonymous") router.replace(`/login?returnTo=${encodeURIComponent(pathname)}`);
  }, [pathname, router, status]);

  useEffect(() => {
    setProfileImage(window.localStorage.getItem("evalora-profile-image") ?? "");
    const savedTheme = window.localStorage.getItem("evalora-theme");
    if (savedTheme === "dark" || savedTheme === "ocean") setTheme(savedTheme);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme === "dark" ? "dark" : "light";
    window.localStorage.setItem("evalora-theme", theme);
  }, [theme]);

  if (status !== "authenticated" || !user) {
    return <main className="min-h-screen bg-[#f7f8fa]"><PageLoader label="Opening your workspace" /></main>;
  }

  async function handleLogout() {
    await logout();
    router.replace("/login");
    router.refresh();
  }

  function handleProfileImage(file?: File) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const image = typeof reader.result === "string" ? reader.result : "";
      setProfileImage(image);
      window.localStorage.setItem("evalora-profile-image", image);
    };
    reader.readAsDataURL(file);
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

            <form action="/candidates" className="relative ml-1 hidden w-full max-w-[470px] md:block">
              <Icon className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" name="search" size={16} />
              <input aria-label="Search candidates" className="h-10 w-full rounded-[7px] border border-transparent bg-[#f3f4f6] pl-9 pr-3 text-[13px] outline-none transition focus:border-primary-300 focus:bg-white focus:ring-4 focus:ring-primary-50" name="q" placeholder="Search candidates by name, email, position..." type="search" />
            </form>

            <div className="ml-auto flex items-center gap-2 sm:gap-3">
              {actions}
              <div className="relative">
                <button aria-expanded={profileOpen} aria-haspopup="menu" className="flex h-10 items-center gap-2 rounded-[6px] border border-neutral-200 bg-white px-2 transition hover:bg-neutral-50" onClick={() => setProfileOpen((open) => !open)} type="button">
                  <span className="flex size-7 items-center justify-center overflow-hidden rounded-[5px] bg-neutral-950 text-[10px] font-black text-white">
                    {profileImage ? <img alt="" className="size-full object-cover" src={profileImage} /> : initials(user.name)}
                  </span>
                  <span className="hidden max-w-[150px] text-left sm:block">
                    <span className="block truncate text-[12px] font-bold text-neutral-900">{user.name}</span>
                    <span className="block truncate text-[10px] capitalize text-neutral-500">{user.role}</span>
                  </span>
                  <Icon className={`hidden text-neutral-400 transition sm:block ${profileOpen ? "rotate-180" : ""}`} name="chevron" size={13} />
                </button>
                {profileOpen ? (
                  <div className="absolute right-0 mt-2 w-56 rounded-[8px] border border-neutral-200 bg-white p-1.5 shadow-[0_18px_50px_rgba(15,23,42,0.16)]" role="menu">
                    <div className="border-b border-neutral-100 px-3 py-2.5">
                      <p className="truncate text-xs font-bold text-neutral-900">{user.name}</p>
                      <p className="mt-0.5 truncate text-[11px] text-neutral-500">{user.email}</p>
                    </div>
                    <label className="mt-1 flex h-9 w-full cursor-pointer items-center gap-2 rounded-[5px] px-3 text-left text-xs font-semibold text-neutral-700 hover:bg-neutral-50" role="menuitem">
                      <Icon name="file" size={15} /> Upload photo
                      <input accept="image/*" className="sr-only" onChange={(event) => handleProfileImage(event.target.files?.[0])} type="file" />
                    </label>
                    <div className="mt-1 border-t border-neutral-100 px-2 py-2">
                      <p className="px-1 text-[10px] font-black uppercase text-neutral-400">Theme</p>
                      <div className="mt-2 grid grid-cols-3 gap-1">
                        {(["light", "dark", "ocean"] as const).map((item) => (
                          <button
                            className={`h-8 rounded-[5px] text-[11px] font-bold capitalize transition ${theme === item ? "bg-primary-700 text-white" : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200"}`}
                            key={item}
                            onClick={() => setTheme(item)}
                            type="button"
                          >
                            {item}
                          </button>
                        ))}
                      </div>
                    </div>
                    <button className="mt-1 grid h-9 w-full grid-cols-[18px_1fr] items-center gap-2 rounded-[5px] px-3 text-left text-xs font-semibold text-red-600 hover:bg-red-50" onClick={() => void handleLogout()} role="menuitem" type="button">
                      <Icon className="justify-self-start" name="lock" size={15} />
                      <span>Sign out</span>
                    </button>
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

function initials(name: string): string {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "EV";
}
