import Link from "next/link";
import type { ReactNode } from "react";
import { EvaloraLogo } from "@/components/logo";
import { Icon, type IconName } from "@/components/icons";

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

const adminNavigation: Array<{ label: string; href: string; key: string; icon: IconName }> = [
  { label: "User & Roles", href: "/users", key: "users", icon: "users" },
  { label: "Setting", href: "/settings", key: "settings", icon: "settings" },
];

export function AppShell({ active, title, description, actions, children, showPageHeader = true, breadcrumbs, hideSidebar = false }: AppShellProps) {
  return (
    <main className={`min-h-screen bg-neutral-50/30 text-neutral-950 ${hideSidebar ? "" : "lg:grid lg:grid-cols-[280px_1fr]"}`}>
      {!hideSidebar && <aside className="hidden border-r border-neutral-200 bg-white lg:flex lg:h-screen lg:flex-col sticky top-0 overflow-y-auto">
        <div className="px-[24px] pt-[24px] pb-[12px] border-b border-transparent">
          <EvaloraLogo href="/dashboard" />
        </div>

        <div className="flex-1 px-[16px] py-[12px]">
          <nav className="space-y-[4px]">
            {navigation.map((item) => (
              <SidebarLink active={active === item.key} href={item.href} icon={item.icon} key={item.key} label={item.label} />
            ))}
          </nav>
          <div className="mt-[28px]">
            <p className="px-[12px] text-[11px] font-bold uppercase tracking-wider text-neutral-400">Admin</p>
            <nav className="mt-[12px] space-y-[4px]">
              {adminNavigation.map((item) => (
                <SidebarLink active={active === item.key} href={item.href} icon={item.icon} key={item.key} label={item.label} />
              ))}
            </nav>
          </div>
        </div>


      </aside>}

      <section className="min-w-0 flex flex-col min-h-screen">
        <header className="sticky top-0 z-20 border-b border-neutral-200 bg-white">
          <div className="flex h-[72px] items-center gap-4 px-[24px] lg:px-[32px]">
            <div className="flex items-center gap-3 lg:hidden">
              <button aria-label="Open navigation" className="inline-flex size-10 items-center justify-center rounded-[8px] border border-neutral-200 text-neutral-800" type="button">
                <Icon name="menu" size={20} />
              </button>
              <EvaloraLogo compact href="/dashboard" />
            </div>

            <button aria-label="Open navigation" className="hidden text-neutral-800 lg:inline-flex" type="button">
              <Icon name="menu" size={24} />
            </button>

            <label className="relative ml-[16px] hidden w-full max-w-[400px] sm:block">
              <span className="sr-only">Search</span>
              <Icon className="absolute left-[14px] top-1/2 -translate-y-1/2 text-neutral-500" name="search" size={18} />
              <input
                className="h-[44px] w-full rounded-[8px] border border-transparent bg-neutral-100 pl-[40px] pr-4 text-[14px] outline-none transition placeholder:text-neutral-500 focus:border-sky-300 focus:bg-white focus:ring-4 focus:ring-sky-100"
                placeholder="Search candidates, assessments, templates..."
                type="search"
              />
            </label>

            <div className="ml-auto flex items-center gap-5">
              {actions}
              <button aria-label="Notifications" className="text-neutral-600 hover:text-neutral-950 transition relative" type="button">
                <span className="absolute top-0 right-0 size-2 bg-red-500 rounded-full border border-white"></span>
                <Icon name="bell" size={22} />
              </button>
              <button aria-label="Help" className="text-neutral-600 hover:text-neutral-950 transition hidden sm:block" type="button">
                <Icon name="question" size={22} />
              </button>
              <button aria-label="Open profile" className="flex items-center gap-3 pl-2 border-l border-neutral-200" type="button">
                <div className="flex size-[36px] items-center justify-center rounded-full bg-primary text-white font-bold overflow-hidden">
                  <img src="https://ui-avatars.com/api/?name=Bo+Tey&background=2fb2e4&color=fff" alt="Profile" className="w-full h-full object-cover" />
                </div>
                <div className="text-left hidden sm:block">
                  <p className="text-[14px] font-bold leading-tight text-neutral-900">BoTey</p>
                  <p className="text-[12px] font-medium text-neutral-500">Admin</p>
                </div>
              </button>
            </div>
          </div>
        </header>

        <div className="flex-1 px-5 py-8 sm:px-8 xl:px-[40px]">
          {showPageHeader && (
            <div className="mb-[24px]">
              {breadcrumbs && (
                <div className="flex items-center gap-2 text-[13px] font-semibold text-neutral-500 mb-4">
                  {breadcrumbs.map((crumb, i) => (
                    <div key={i} className="flex items-center gap-2">
                      {crumb.href ? (
                        <Link href={crumb.href} className="hover:text-primary-600 transition">{crumb.label}</Link>
                      ) : (
                        <span className="text-neutral-900">{crumb.label}</span>
                      )}
                      {i < breadcrumbs.length - 1 && <Icon name="chevron" size={14} className="-rotate-90 text-neutral-400" />}
                    </div>
                  ))}
                </div>
              )}
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <h1 className="text-[28px] font-bold tracking-tight text-neutral-950">{title}</h1>
                  {description && <p className="mt-2 text-[15px] leading-relaxed text-neutral-500">{description}</p>}
                </div>
              </div>
            </div>
          )}
          {children}
        </div>
      </section>
    </main>
  );
}

type SidebarLinkProps = {
  active: boolean;
  href: string;
  icon: IconName;
  label: string;
};

function SidebarLink({ active, href, icon, label }: SidebarLinkProps) {
  return (
    <Link
      className={`flex h-[46px] w-full items-center gap-[14px] rounded-[10px] px-[14px] text-[14px] transition ${
        active
          ? "bg-[#d5effe] text-[#1b75d0] font-bold"
          : "text-neutral-700 font-medium hover:bg-neutral-100/70 hover:text-neutral-900"
      }`}
      href={href}
    >
      <Icon className={`shrink-0 ${active ? "text-[#1b75d0]" : "text-neutral-900"}`} name={icon} size={20} />
      <span>{label}</span>
    </Link>
  );
}
