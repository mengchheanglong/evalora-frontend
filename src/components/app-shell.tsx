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
};

const navigation: Array<{ label: string; href: string; key: string; icon: IconName }> = [
  { label: "Dashboard", href: "/dashboard", key: "dashboard", icon: "home" },
  { label: "Assessment Templates", href: "/templates", key: "templates", icon: "clipboard" },
  { label: "Candidates", href: "/candidates", key: "candidates", icon: "user" },
  { label: "Candidates Reports", href: "/reports/demo-session", key: "reports", icon: "report" },
  { label: "Analytics", href: "/analytics", key: "analytics", icon: "analytics" },
  { label: "AI Tools", href: "/assessment/demo-session", key: "ai-tools", icon: "sparkle" },
];

const adminNavigation: Array<{ label: string; href: string; key: string; icon: IconName }> = [
  { label: "User & Roles", href: "/dashboard", key: "users", icon: "users" },
  { label: "Setting", href: "/dashboard", key: "settings", icon: "settings" },
];

export function AppShell({ active, title, description, actions, children, showPageHeader = true }: AppShellProps) {
  return (
    <main className="min-h-screen bg-white text-neutral-950 lg:grid lg:grid-cols-[380px_1fr]">
      <aside className="hidden border-r border-neutral-200 bg-white px-[26px] py-[28px] lg:flex lg:min-h-screen lg:flex-col">
        <EvaloraLogo href="/dashboard" />
        <nav className="mt-[29px] space-y-[2px]">
          {navigation.map((item) => (
            <SidebarLink active={active === item.key} href={item.href} icon={item.icon} key={item.key} label={item.label} />
          ))}
        </nav>
        <div className="mt-[22px]">
          <p className="px-[5px] text-[16px] font-medium uppercase text-neutral-500">Admin</p>
          <nav className="mt-[22px] space-y-[2px]">
            {adminNavigation.map((item) => (
              <SidebarLink active={active === item.key} href={item.href} icon={item.icon} key={item.key} label={item.label} />
            ))}
          </nav>
        </div>
      </aside>

      <section className="min-w-0">
        <header className="sticky top-0 z-20 bg-white">
          <div className="flex min-h-[88px] items-center gap-4 px-[27px] py-0 pr-[101px]">
            <div className="flex items-center gap-3 lg:hidden">
              <button aria-label="Open navigation" className="inline-flex size-10 items-center justify-center rounded-[8px] border border-neutral-200 text-neutral-800" type="button">
                <Icon name="menu" size={20} />
              </button>
              <EvaloraLogo compact href="/dashboard" />
            </div>

            <button aria-label="Open navigation" className="hidden text-neutral-800 lg:inline-flex" type="button">
              <Icon name="menu" size={27} />
            </button>

            <label className="relative ml-[8px] hidden w-[335px] sm:block">
              <span className="sr-only">Search</span>
              <Icon className="absolute left-[12px] top-1/2 -translate-y-1/2 text-neutral-500" name="search" size={17} />
              <input
                className="h-[41px] w-full rounded-[8px] border border-transparent bg-neutral-100 pl-[36px] pr-4 text-[12px] outline-none transition placeholder:text-neutral-500 focus:border-sky-300 focus:bg-white"
                placeholder="Search candidates, assessments, templates..."
                type="search"
              />
            </label>

            <div className="ml-auto flex items-center gap-3">
              {actions}
              <button aria-label="Open profile" className="inline-flex size-[30px] items-center justify-center rounded-full text-neutral-950 ring-[3px] ring-neutral-950" type="button">
                <Icon name="user" size={21} />
              </button>
            </div>
          </div>
        </header>

        <div className="px-5 py-8 sm:px-8 xl:px-10">
          {showPageHeader && (
            <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold tracking-normal text-neutral-950 sm:text-4xl">{title}</h1>
                {description && <p className="mt-2 max-w-3xl text-base leading-7 text-neutral-600">{description}</p>}
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
      className={`flex h-[55px] w-[268px] items-center gap-[30px] rounded-[8px] px-[20px] text-[16px] font-medium transition ${
        active ? "bg-[#bfeeff] text-[#005cff]" : "text-neutral-700 hover:bg-neutral-100 hover:text-neutral-950"
      }`}
      href={href}
    >
      <Icon className={`shrink-0 ${active ? "text-neutral-950" : "text-neutral-950"}`} name={icon} size={25} />
      <span>{label}</span>
    </Link>
  );
}
