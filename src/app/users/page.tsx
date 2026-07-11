import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { Icon } from "@/components/icons";

const usersData = [
  { id: 1, name: "Sophia Kim", email: "sophia.kim@evalora.com", role: "Super Admin", status: "Active", lastActive: "May 31, 2026\n10:30 AM", isYou: true, avatarUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=150&h=150" },
  { id: 2, name: "Michael Chen", email: "michael.chen@evalora.com", role: "Admin", status: "Active", lastActive: "May 31, 2026\n9:15 AM", avatarUrl: "https://images.unsplash.com/photo-1599566150163-29194dcaad36?auto=format&fit=crop&q=80&w=150&h=150" },
  { id: 3, name: "Emma Johnson", email: "emma.johnson@evalora.com", role: "Interviewer", status: "Active", lastActive: "May 31, 2026\n8:45 AM", avatarUrl: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&q=80&w=150&h=150" },
  { id: 4, name: "Daniel Lee", email: "daniel.lee@evalora.com", role: "Assessor", status: "Active", lastActive: "May 30, 2026\n4:20 PM", avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=150&h=150" },
  { id: 5, name: "Olivia Smith", email: "olivia.smith@evalora.com", role: "Interviewer", status: "Active", lastActive: "May 30, 2026\n3:10 PM", avatarUrl: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=150&h=150" },
  { id: 6, name: "James Brown", email: "james.brown@evalora.com", role: "Assessor", status: "Active", lastActive: "May 30, 2026\n11:05 AM", avatarUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=150&h=150" },
  { id: 7, name: "Noah Williams", email: "noah.williams@evalora.com", role: "View Only", status: "Active", lastActive: "May 29, 2026\n6:30 PM", avatarUrl: "https://images.unsplash.com/photo-1527980965255-d3b416303d12?auto=format&fit=crop&q=80&w=150&h=150" },
  { id: 8, name: "Ava Davis", email: "ava.davis@evalora.com", role: "Interviewer", status: "Inactive", lastActive: "May 25, 2026\n2:10 PM", avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150&h=150" },
];

const roleBadges: Record<string, string> = {
  "Super Admin": "bg-purple-50 text-purple-600 border-purple-100",
  Admin: "bg-blue-50 text-blue-600 border-blue-100",
  Interviewer: "bg-sky-50 text-sky-600 border-sky-100",
  Assessor: "bg-orange-50 text-orange-600 border-orange-100",
  "View Only": "bg-indigo-50 text-indigo-600 border-indigo-100",
};

const statCards = [
  { label: "Total Users", value: "24", detail: "3 new this month", icon: "users" as const, tone: "bg-purple-100 text-purple-600" },
  { label: "Admin Users", value: "6", detail: "25% of total", icon: "check" as const, tone: "bg-emerald-100 text-emerald-600" },
  { label: "Interviewers", value: "11", detail: "45.8% of total", icon: "users" as const, tone: "bg-sky-100 text-sky-600" },
  { label: "Assessors", value: "5", detail: "20.8% of total", icon: "clipboard" as const, tone: "bg-orange-100 text-orange-600" },
  { label: "View Only", value: "2", detail: "8.4% of total", icon: "eye" as const, tone: "bg-indigo-100 text-indigo-600" },
];

const roleOverview = [
  { title: "Super Admin", detail: "Full access to all features and settings", count: 1, icon: "shield" as const, tone: "bg-purple-50 text-purple-600" },
  { title: "Admin", detail: "Manage users, templates, and reports", count: 5, icon: "shield" as const, tone: "bg-blue-50 text-blue-600" },
  { title: "Interviewer", detail: "Conduct interviews and manage sessions", count: 11, icon: "users" as const, tone: "bg-sky-50 text-sky-600" },
  { title: "Assessor", detail: "Evaluate candidates and assessments", count: 5, icon: "clipboard" as const, tone: "bg-orange-50 text-orange-600" },
  { title: "View Only", detail: "View dashboards and reports only", count: 2, icon: "eye" as const, tone: "bg-indigo-50 text-indigo-600" },
];

const recentActivity = [
  { title: "New user invited", detail: "Emma Johnson was invited as Interviewer", date: "May 31, 2026", time: "9:30 AM", icon: "user" as const, tone: "bg-emerald-50 text-emerald-600" },
  { title: "Role updated", detail: "Daniel Lee's role changed to Assessor", date: "May 30, 2026", time: "4:25 PM", icon: "shield" as const, tone: "bg-blue-50 text-blue-600" },
  { title: "User deactivated", detail: "Ava Davis was deactivated", date: "May 29, 2026", time: "6:45 PM", icon: "user" as const, tone: "bg-orange-50 text-orange-600" },
  { title: "New user added", detail: "Noah Williams was added as View Only", date: "May 29, 2026", time: "10:15 AM", icon: "users" as const, tone: "bg-purple-50 text-purple-600" },
];

const roles = [
  { title: "Admin", description: "Full access to all features and system settings.", users: 3, icon: "shield" as const, tone: "bg-violet-100 text-violet-700" },
  { title: "Interviewer", description: "Access to interview sessions, candidates, and assessments.", users: 12, icon: "user" as const, tone: "bg-sky-100 text-sky-700" },
  { title: "Reviewer", description: "Can review and evaluate candidate assessments.", users: 7, icon: "clipboard" as const, tone: "bg-emerald-100 text-emerald-700" },
  { title: "Candidate", description: "Can take assessments and view their results.", users: 0, icon: "user" as const, tone: "bg-amber-100 text-amber-700" },
];

const permissionGroups = [
  {
    title: "User Management",
    rows: [
      ["View Users", "full", "view", "view", "none"],
      ["Create Users", "full", "none", "none", "none"],
      ["Edit Users", "full", "none", "none", "none"],
      ["Delete Users", "full", "none", "none", "none"],
      ["Manage Roles & Permissions", "full", "none", "none", "none"],
    ],
  },
  {
    title: "Assessment Management",
    rows: [
      ["Create Assessment Templates", "full", "view", "none", "none"],
      ["Edit Assessment Templates", "full", "view", "none", "none"],
      ["Delete Assessment Templates", "full", "none", "none", "none"],
    ],
  },
] as const;

const roleColumns = ["Admin", "Interviewer", "Reviewer", "Candidate"];

type UsersPageProps = {
  searchParams?: Promise<{ tab?: string }>;
};

export default async function UsersAndRolesPage({ searchParams }: UsersPageProps) {
  const params = await searchParams;
  const isRoles = params?.tab === "roles";

  return (
    <AppShell
      active={isRoles ? "roles" : "users"}
      actions={
        <div className="hidden items-center gap-3 sm:flex">
          {isRoles ? (
            <>
              <button className="button-secondary h-10 rounded-[8px] border-neutral-200 px-4 text-[12px]" type="button"><Icon name="plusUser" size={15} /> Invite User</button>
              <button className="button-primary h-10 rounded-[8px] !bg-primary-700 px-4 text-[12px] hover:!bg-primary-600" type="button"><Icon name="plus" size={15} /> Create Role</button>
            </>
          ) : (
            <>
              <button className="button-secondary h-10 rounded-[8px] border-neutral-200 px-4 text-[12px]" type="button"><Icon name="file" size={15} /> Import Users</button>
              <button className="button-primary h-10 rounded-[8px] !bg-primary-700 px-4 text-[12px] hover:!bg-primary-600" type="button"><Icon name="plus" size={15} /> Invite User</button>
            </>
          )}
        </div>
      }
      description={isRoles ? "Manage user roles and their access permissions." : "Manage platform users, roles, and permissions."}
      title={isRoles ? "Roles & Permissions" : "Users & Roles"}
    >
      {isRoles ? <RolesPermissionsView /> : <UsersView />}
    </AppShell>
  );
}

function UsersView() {
  return (
      <div className="space-y-5">
        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {statCards.map((stat) => (
            <article className="card rounded-[10px] px-4 py-4 shadow-[0_10px_28px_rgba(15,23,42,0.04)]" key={stat.label}>
              <div className="flex items-start gap-3">
                <span className={`flex size-10 shrink-0 items-center justify-center rounded-[9px] ${stat.tone}`}>
                  <Icon name={stat.icon} size={19} />
                </span>
                <div>
                  <p className="text-[11px] font-bold text-neutral-700">{stat.label}</p>
                  <p className="mt-1 text-[24px] font-black leading-none text-neutral-950">{stat.value}</p>
                  <p className="mt-2 text-[10px] font-semibold text-neutral-500">{stat.detail}</p>
                </div>
              </div>
            </article>
          ))}
        </section>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
          <section className="card overflow-hidden rounded-[10px]">
            <div className="flex items-center gap-6 border-b border-neutral-100 px-5 pt-4">
              <Link className="flex items-center gap-2 border-b-2 border-primary-700 pb-3 text-[13px] font-bold text-primary-700" href="/users">
                <Icon name="users" size={16} /> Users
              </Link>
              <Link className="flex items-center gap-2 border-b-2 border-transparent pb-3 text-[13px] font-bold text-neutral-500 transition hover:text-neutral-800" href="/users?tab=roles">
                <Icon name="shield" size={16} /> Roles & Permissions
              </Link>
            </div>

            <div className="flex flex-col gap-4 border-b border-neutral-100 p-4 lg:flex-row lg:items-center">
              <label className="relative w-full lg:flex-1">
                <Icon className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" name="search" size={17} />
                <input className="h-12 w-full rounded-xl border border-neutral-200 bg-white pl-12 pr-4 text-[13px] text-neutral-900 outline-none transition placeholder:text-neutral-400 focus:border-primary-300 focus:ring-4 focus:ring-primary-50" placeholder="Search users by name, email, or role..." type="search" />
              </label>
              <div className="flex w-full flex-col gap-4 sm:flex-row lg:w-auto lg:shrink-0">
                <select className="h-12 w-full rounded-xl border border-neutral-200 bg-white px-4 text-[13px] font-medium text-neutral-800 outline-none transition focus:border-primary-300 focus:ring-4 focus:ring-primary-50 sm:w-[160px]"><option>All Roles</option></select>
                <select className="h-12 w-full rounded-xl border border-neutral-200 bg-white px-4 text-[13px] font-medium text-neutral-800 outline-none transition focus:border-primary-300 focus:ring-4 focus:ring-primary-50 sm:w-[170px]"><option>All Statuses</option></select>
                <button className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-neutral-200 bg-white px-5 text-[13px] font-bold text-neutral-700 transition hover:bg-neutral-50 sm:w-auto" type="button"><Icon name="settings" size={15} /> Filters</button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] text-left text-[12px]">
                <thead className="bg-white text-[11px] font-bold text-neutral-500">
                  <tr className="border-b border-neutral-100">
                    <th className="w-10 px-4 py-3"><input aria-label="Select all users" className="size-4 rounded border-neutral-200" type="checkbox" /></th>
                    <th className="px-3 py-3">User</th>
                    <th className="px-3 py-3">Email</th>
                    <th className="px-3 py-3">Role</th>
                    <th className="px-3 py-3">Status</th>
                    <th className="px-3 py-3 whitespace-nowrap">Last Active</th>
                    <th className="px-3 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {usersData.map((user) => (
                    <tr className="h-[64px] transition hover:bg-neutral-50/70" key={user.id}>
                      <td className="px-4 py-3"><input aria-label={`Select ${user.name}`} className="size-4 rounded border-neutral-200" type="checkbox" /></td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-3">
                          <img alt="" className="size-8 rounded-full object-cover" src={user.avatarUrl} />
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-neutral-900">{user.name}</span>
                            {user.isYou ? <span className="rounded bg-purple-100 px-1.5 py-0.5 text-[10px] font-bold text-purple-700">You</span> : null}
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3 font-medium text-neutral-600">{user.email}</td>
                      <td className="px-3 py-3"><span className={`inline-flex items-center rounded border px-2 py-0.5 text-[11px] font-bold ${roleBadges[user.role]}`}>{user.role}</span></td>
                      <td className="px-3 py-3">
                        <span className="inline-flex items-center gap-1.5 font-semibold text-neutral-700">
                          <span className={`size-1.5 rounded-full ${user.status === "Active" ? "bg-emerald-500" : "bg-neutral-400"}`} />
                          {user.status}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 font-medium text-neutral-500">{user.lastActive.replace("\n", " ")}</td>
                      <td className="px-3 py-3 text-right">
                        <button aria-label={`More actions for ${user.name}`} className="inline-flex size-8 items-center justify-center rounded-[7px] border border-neutral-200 text-neutral-500 transition hover:bg-neutral-50" type="button"><Icon name="more" size={15} /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-neutral-100 px-5 py-4">
              <p className="text-[12px] font-semibold text-neutral-500">Showing 1 to 8 of 24 users</p>
              <div className="flex items-center gap-2">
                <button aria-label="Previous page" className="flex size-9 items-center justify-center rounded-[8px] border border-neutral-200 bg-white text-neutral-400 transition hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50" disabled type="button"><Icon className="rotate-90" name="chevron" size={15} /></button>
                <button aria-label="Next page" className="flex size-9 items-center justify-center rounded-[8px] border border-neutral-200 bg-white text-neutral-700 transition hover:border-primary-200 hover:bg-primary-50 hover:text-primary-700" type="button"><Icon className="-rotate-90" name="chevron" size={15} /></button>
              </div>
            </div>
          </section>

          <aside className="space-y-5">
            <section className="card rounded-[10px] p-5">
              <h2 className="mb-5 text-[14px] font-black text-neutral-900">Roles Overview</h2>
              <div className="space-y-4">
                {roleOverview.map((role) => (
                  <div className="flex items-start justify-between gap-3" key={role.title}>
                    <div className="flex items-start gap-3">
                      <span className={`mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md ${role.tone}`}><Icon name={role.icon} size={16} /></span>
                      <div>
                        <p className="text-[13px] font-bold text-neutral-900">{role.title}</p>
                        <p className="mt-0.5 text-[11px] font-medium text-neutral-500">{role.detail}</p>
                      </div>
                    </div>
                    <span className="text-[13px] font-black text-neutral-900">{role.count}</span>
                  </div>
                ))}
              </div>
              <div className="mt-5 border-t border-neutral-100 pt-4">
                <Link className="flex items-center justify-between text-[12px] font-bold text-neutral-700 transition hover:text-primary-700" href="/users?tab=roles">
                  Manage roles and permissions
                  <Icon className="-rotate-90 text-neutral-400" name="chevron" size={14} />
                </Link>
              </div>
            </section>

            <section className="card rounded-[10px] p-5">
              <div className="mb-5 flex items-center justify-between gap-3">
                <h2 className="text-[14px] font-black text-neutral-900">Recent Activity</h2>
                <Link className="text-[12px] font-bold text-primary-700 hover:underline" href="#">View all</Link>
              </div>
              <div className="space-y-5">
                {recentActivity.map((item) => (
                  <div className="flex gap-3" key={`${item.title}-${item.time}`}>
                    <span className={`mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md ${item.tone}`}><Icon name={item.icon} size={16} /></span>
                    <div className="flex min-w-0 flex-1 items-start justify-between gap-2">
                      <div>
                        <p className="text-[13px] font-bold text-neutral-900">{item.title}</p>
                        <p className="mt-0.5 text-[11px] font-medium text-neutral-500">{item.detail}</p>
                      </div>
                      <div className="whitespace-nowrap text-right">
                        <p className="text-[11px] font-semibold text-neutral-400">{item.date}</p>
                        <p className="text-[10px] text-neutral-400">{item.time}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </aside>
        </div>
      </div>
  );
}

function RolesPermissionsView() {
  return (
    <div className="space-y-5">
      <section className="card rounded-[10px] p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-[15px] font-black text-neutral-900">Roles</h2>
          <label className="relative w-full sm:w-[260px]">
            <Icon className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400" name="search" size={15} />
            <input className="control h-9 rounded-[7px] pr-9 text-[12px]" placeholder="Search roles..." type="search" />
          </label>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {roles.map((role) => (
            <article className="rounded-[10px] border border-neutral-200 bg-white p-5 shadow-[0_10px_28px_rgba(15,23,42,0.03)]" key={role.title}>
              <div className="flex items-start justify-between gap-3">
                <span className={`flex size-11 items-center justify-center rounded-full ${role.tone}`}>
                  <Icon name={role.icon} size={21} />
                </span>
                <button aria-label={`More actions for ${role.title}`} className="text-neutral-400 hover:text-neutral-700" type="button">
                  <Icon name="more" size={17} />
                </button>
              </div>
              <h3 className="mt-4 text-[15px] font-black text-neutral-950">{role.title}</h3>
              <p className="mt-2 min-h-10 text-[12px] leading-5 text-neutral-600">{role.description}</p>
              <p className="mt-4 text-[12px] font-black text-primary-700">{role.users} users</p>
            </article>
          ))}
        </div>
      </section>

      <section className="card overflow-hidden rounded-[10px]">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-neutral-200 px-5 py-4">
          <div>
            <h2 className="text-[15px] font-black text-neutral-900">Permissions</h2>
            <p className="mt-1 text-[11px] text-neutral-500">Configure what each role can access.</p>
          </div>
          <div className="flex flex-wrap items-center gap-5 text-[11px] font-semibold text-neutral-600">
            <LegendItem kind="full" label="Full Access" />
            <LegendItem kind="view" label="View Only" />
            <LegendItem kind="none" label="No Access" />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-[12px]">
            <thead className="bg-white">
              <tr className="border-b border-neutral-200">
                <th className="w-[300px] px-5 py-3 font-black text-neutral-900">Permission</th>
                {roleColumns.map((column) => (
                  <th className="px-5 py-3 text-center font-black text-neutral-900" key={column}>{column}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {permissionGroups.map((group) => (
                <PermissionGroup group={group} key={group.title} />
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function PermissionGroup({ group }: { group: (typeof permissionGroups)[number] }) {
  return (
    <>
      <tr className="border-b border-neutral-100 bg-neutral-50/70">
        <td className="px-5 py-3 font-black text-neutral-900" colSpan={5}>
          <span className="inline-flex items-center gap-2">
            <Icon name="chevron" size={12} />
            {group.title}
          </span>
        </td>
      </tr>
      {group.rows.map(([label, admin, interviewer, reviewer, candidate]) => (
        <tr className="border-b border-neutral-100 last:border-b-0" key={label}>
          <td className="px-8 py-3 font-semibold text-neutral-800">{label}</td>
          {[admin, interviewer, reviewer, candidate].map((value, index) => (
            <td className="px-5 py-3 text-center" key={`${label}-${index}`}>
              <PermissionIcon kind={value} />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

function LegendItem({ kind, label }: { kind: "full" | "view" | "none"; label: string }) {
  return <span className="inline-flex items-center gap-2"><PermissionIcon kind={kind} />{label}</span>;
}

function PermissionIcon({ kind }: { kind: "full" | "view" | "none" }) {
  const styles = {
    full: "border-emerald-500 text-emerald-600",
    view: "border-primary-700 text-primary-700",
    none: "border-neutral-400 text-neutral-500",
  }[kind];
  const icon = kind === "full" ? "check" : kind === "view" ? "eye" : "more";
  return (
    <span className={`mx-auto flex size-4 items-center justify-center rounded-full border ${styles}`}>
      <Icon name={icon} size={10} />
    </span>
  );
}
