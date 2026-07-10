import { AppShell } from "@/components/app-shell";
import { Icon } from "@/components/icons";
import Link from "next/link";

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
  "Admin": "bg-blue-50 text-blue-600 border-blue-100",
  "Interviewer": "bg-sky-50 text-sky-600 border-sky-100",
  "Assessor": "bg-orange-50 text-orange-600 border-orange-100",
  "View Only": "bg-indigo-50 text-indigo-600 border-indigo-100",
};

export default function UsersAndRolesPage() {
  return (
    <AppShell
      active="users"
      title="Users & Roles"
      description="Manage platform users, roles, and permissions."
      actions={
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 rounded-md border border-neutral-200 bg-white px-3 py-2 text-[13px] font-bold text-neutral-700 shadow-sm transition hover:bg-neutral-50">
            <svg className="size-[16px] text-neutral-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Import Users
          </button>
          <button className="flex items-center gap-2 rounded-md bg-primary-600 px-3 py-2 text-[13px] font-bold text-white shadow-sm transition hover:bg-primary-700">
            <Icon name="plus" size={16} />
            Invite User
          </button>
        </div>
      }
    >
      {/* 5-Column Stats Grid */}
      <section className="mb-6 grid gap-4 grid-cols-2 lg:grid-cols-5">
        <article className="card p-5">
          <div className="flex items-center gap-3">
            <span className="flex size-[40px] shrink-0 items-center justify-center rounded-[8px] bg-purple-100 text-purple-600">
              <Icon name="users" size={20} />
            </span>
            <div>
              <p className="text-[12px] font-bold text-neutral-900">Total Users</p>
              <p className="text-[24px] font-black tracking-tight text-neutral-900">24</p>
            </div>
          </div>
          <div className="mt-2 text-[11px] font-semibold text-emerald-600 flex items-center gap-1">
            <Icon name="trend" size={12} className="-rotate-90" />
            3 new this month
          </div>
        </article>

        <article className="card p-5">
          <div className="flex items-center gap-3">
            <span className="flex size-[40px] shrink-0 items-center justify-center rounded-[8px] bg-emerald-100 text-emerald-600">
              <Icon name="check" size={20} />
            </span>
            <div>
              <p className="text-[12px] font-bold text-neutral-900">Admin Users</p>
              <p className="text-[24px] font-black tracking-tight text-neutral-900">6</p>
            </div>
          </div>
          <div className="mt-2 text-[11px] font-semibold text-neutral-400">
            25% of total
          </div>
        </article>

        <article className="card p-5">
          <div className="flex items-center gap-3">
            <span className="flex size-[40px] shrink-0 items-center justify-center rounded-[8px] bg-sky-100 text-sky-600">
              <Icon name="users" size={20} />
            </span>
            <div>
              <p className="text-[12px] font-bold text-neutral-900">Interviewers</p>
              <p className="text-[24px] font-black tracking-tight text-neutral-900">11</p>
            </div>
          </div>
          <div className="mt-2 text-[11px] font-semibold text-neutral-400">
            45.8% of total
          </div>
        </article>

        <article className="card p-5">
          <div className="flex items-center gap-3">
            <span className="flex size-[40px] shrink-0 items-center justify-center rounded-[8px] bg-orange-100 text-orange-600">
              <Icon name="users" size={20} />
            </span>
            <div>
              <p className="text-[12px] font-bold text-neutral-900">Assessors</p>
              <p className="text-[24px] font-black tracking-tight text-neutral-900">5</p>
            </div>
          </div>
          <div className="mt-2 text-[11px] font-semibold text-neutral-400">
            20.8% of total
          </div>
        </article>

        <article className="card p-5">
          <div className="flex items-center gap-3">
            <span className="flex size-[40px] shrink-0 items-center justify-center rounded-[8px] bg-indigo-100 text-indigo-600">
              <Icon name="eye" size={20} />
            </span>
            <div>
              <p className="text-[12px] font-bold text-neutral-900">View Only</p>
              <p className="text-[24px] font-black tracking-tight text-neutral-900">2</p>
            </div>
          </div>
          <div className="mt-2 text-[11px] font-semibold text-neutral-400">
            8.4% of total
          </div>
        </article>
      </section>

      {/* Main Layout: 2 Columns */}
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        
        {/* Left Column: Users Table */}
        <div className="card flex flex-col">
          {/* Tabs */}
          <div className="flex items-center gap-6 border-b border-neutral-100 px-6 pt-4">
            <button className="flex items-center gap-2 border-b-2 border-primary-600 pb-3 text-[13px] font-bold text-primary-600">
              <Icon name="users" size={16} /> Users
            </button>
            <button className="flex items-center gap-2 border-b-2 border-transparent pb-3 text-[13px] font-bold text-neutral-500 hover:text-neutral-800 transition">
              <Icon name="users" size={16} /> Roles & Permissions
            </button>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3 border-b border-neutral-100 p-4">
            <div className="relative min-w-[240px] flex-1">
              <Icon name="search" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input 
                type="text" 
                placeholder="Search users by name, email, or role..." 
                className="h-[38px] w-full rounded-md border border-neutral-200 pl-9 pr-3 text-[13px] outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-100" 
              />
            </div>
            <select className="h-[38px] min-w-[140px] rounded-md border border-neutral-200 bg-white px-3 text-[13px] font-medium text-neutral-700 outline-none focus:border-primary-500 transition appearance-none">
              <option>All Roles</option>
            </select>
            <select className="h-[38px] min-w-[140px] rounded-md border border-neutral-200 bg-white px-3 text-[13px] font-medium text-neutral-700 outline-none focus:border-primary-500 transition appearance-none">
              <option>All Statuses</option>
            </select>
            <button className="flex h-[38px] items-center gap-2 rounded-md border border-neutral-200 bg-white px-3 text-[13px] font-bold text-neutral-700 transition hover:bg-neutral-50">
              <svg className="size-[14px] text-neutral-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              Filters
            </button>
          </div>

          {/* Table */}
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left text-[13px]">
              <thead className="bg-white">
                <tr className="border-b border-neutral-100 text-neutral-800">
                  <th className="py-3 pl-6 pr-2 w-[40px]">
                    <input type="checkbox" className="rounded border-neutral-300 text-primary-600 focus:ring-primary-500" />
                  </th>
                  <th className="py-3 px-2 font-bold">User</th>
                  <th className="py-3 px-2 font-bold">Email</th>
                  <th className="py-3 px-2 font-bold">Role</th>
                  <th className="py-3 px-2 font-bold">Status</th>
                  <th className="py-3 px-2 font-bold">Last Active</th>
                  <th className="py-3 pl-2 pr-6 text-right font-bold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-50">
                {usersData.map((user) => (
                  <tr key={user.id} className="hover:bg-neutral-50/50 transition">
                    <td className="py-3.5 pl-6 pr-2">
                      <input type="checkbox" className="rounded border-neutral-300 text-primary-600 focus:ring-primary-500" />
                    </td>
                    <td className="py-3.5 px-2">
                      <div className="flex items-center gap-3">
                        <img src={user.avatarUrl} alt="" className="size-8 rounded-full object-cover" />
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-neutral-900">{user.name}</span>
                          {user.isYou && (
                            <span className="rounded bg-purple-100 px-1.5 py-0.5 text-[10px] font-bold text-purple-700">You</span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-2 font-medium text-neutral-600">{user.email}</td>
                    <td className="py-3.5 px-2">
                      <span className={`inline-flex items-center rounded px-2 py-0.5 text-[11px] font-bold border ${roleBadges[user.role]}`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="py-3.5 px-2">
                      <div className="flex items-center gap-1.5">
                        <span className={`size-1.5 rounded-full ${user.status === 'Active' ? 'bg-emerald-500' : 'bg-neutral-400'}`}></span>
                        <span className={`font-semibold ${user.status === 'Active' ? 'text-emerald-700' : 'text-neutral-500'}`}>{user.status}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-2 text-neutral-500 font-medium whitespace-pre-line">{user.lastActive}</td>
                    <td className="py-3.5 pl-2 pr-6 text-right">
                      <button className="inline-flex size-[28px] items-center justify-center rounded-md border border-neutral-200 text-neutral-500 hover:bg-neutral-100 transition">
                        <Icon name="more" size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between border-t border-neutral-100 px-6 py-4">
            <span className="text-[13px] font-medium text-neutral-500">Showing 1 to 8 of 24 users</span>
            <div className="flex items-center gap-1">
              <button className="flex size-[32px] items-center justify-center rounded-md border border-neutral-200 text-neutral-500 hover:bg-neutral-50 transition">
                <Icon name="chevron" size={14} className="rotate-90" />
              </button>
              <button className="flex size-[32px] items-center justify-center rounded-md bg-primary-600 text-[13px] font-bold text-white transition hover:bg-primary-700">1</button>
              <button className="flex size-[32px] items-center justify-center rounded-md border border-transparent text-[13px] font-bold text-neutral-700 transition hover:bg-neutral-100">2</button>
              <button className="flex size-[32px] items-center justify-center rounded-md border border-transparent text-[13px] font-bold text-neutral-700 transition hover:bg-neutral-100">3</button>
              <span className="px-1 text-neutral-400">...</span>
              <button className="flex size-[32px] items-center justify-center rounded-md border border-transparent text-[13px] font-bold text-neutral-700 transition hover:bg-neutral-100">3</button>
              <button className="flex size-[32px] items-center justify-center rounded-md border border-neutral-200 text-neutral-500 hover:bg-neutral-50 transition">
                <Icon name="chevron" size={14} className="-rotate-90" />
              </button>
            </div>
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="space-y-6">
          {/* Roles Overview */}
          <div className="card p-5">
            <h2 className="text-[14px] font-bold text-neutral-900 mb-5">Roles Overview</h2>
            <div className="space-y-4">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md bg-purple-50 text-purple-600">
                    <Icon name="shield" size={16} />
                  </span>
                  <div>
                    <p className="text-[13px] font-bold text-neutral-900">Super Admin</p>
                    <p className="text-[11px] font-medium text-neutral-500 mt-0.5">Full access to all features and settings</p>
                  </div>
                </div>
                <span className="text-[13px] font-bold text-neutral-900">1</span>
              </div>

              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md bg-blue-50 text-blue-600">
                    <Icon name="shield" size={16} />
                  </span>
                  <div>
                    <p className="text-[13px] font-bold text-neutral-900">Admin</p>
                    <p className="text-[11px] font-medium text-neutral-500 mt-0.5">Manage users, templates, and reports</p>
                  </div>
                </div>
                <span className="text-[13px] font-bold text-neutral-900">5</span>
              </div>

              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md bg-sky-50 text-sky-600">
                    <Icon name="users" size={16} />
                  </span>
                  <div>
                    <p className="text-[13px] font-bold text-neutral-900">Interviewer</p>
                    <p className="text-[11px] font-medium text-neutral-500 mt-0.5">Conduct interviews and manage sessions</p>
                  </div>
                </div>
                <span className="text-[13px] font-bold text-neutral-900">11</span>
              </div>

              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md bg-orange-50 text-orange-600">
                    <Icon name="clipboard" size={16} />
                  </span>
                  <div>
                    <p className="text-[13px] font-bold text-neutral-900">Assessor</p>
                    <p className="text-[11px] font-medium text-neutral-500 mt-0.5">Evaluate candidates and assessments</p>
                  </div>
                </div>
                <span className="text-[13px] font-bold text-neutral-900">5</span>
              </div>

              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md bg-indigo-50 text-indigo-600">
                    <Icon name="eye" size={16} />
                  </span>
                  <div>
                    <p className="text-[13px] font-bold text-neutral-900">View Only</p>
                    <p className="text-[11px] font-medium text-neutral-500 mt-0.5">View dashboards and reports only</p>
                  </div>
                </div>
                <span className="text-[13px] font-bold text-neutral-900">2</span>
              </div>
            </div>
            
            <div className="mt-5 border-t border-neutral-100 pt-4">
              <Link href="#" className="flex items-center justify-between text-[12px] font-bold text-neutral-700 hover:text-primary-600 transition">
                Manage roles and permissions
                <Icon name="chevron" size={14} className="-rotate-90 text-neutral-400" />
              </Link>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-[14px] font-bold text-neutral-900">Recent Activity</h2>
              <Link href="#" className="text-[12px] font-bold text-primary-600 hover:underline">View all</Link>
            </div>

            <div className="space-y-5">
              <div className="flex gap-3">
                <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md bg-emerald-50 text-emerald-600">
                  <Icon name="user" size={16} />
                </span>
                <div className="flex-1 min-w-0 flex items-start justify-between gap-2">
                  <div>
                    <p className="text-[13px] font-bold text-neutral-900">New user invited</p>
                    <p className="text-[11px] font-medium text-neutral-500 mt-0.5">Emma Johnson was invited as Interviewer</p>
                  </div>
                  <div className="text-right whitespace-nowrap">
                    <p className="text-[11px] font-semibold text-neutral-400">May 31, 2026</p>
                    <p className="text-[10px] text-neutral-400">9:30 AM</p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md bg-blue-50 text-blue-600">
                  <Icon name="shield" size={16} />
                </span>
                <div className="flex-1 min-w-0 flex items-start justify-between gap-2">
                  <div>
                    <p className="text-[13px] font-bold text-neutral-900">Role updated</p>
                    <p className="text-[11px] font-medium text-neutral-500 mt-0.5">Daniel Lee's role changed to Assessor</p>
                  </div>
                  <div className="text-right whitespace-nowrap">
                    <p className="text-[11px] font-semibold text-neutral-400">May 30, 2026</p>
                    <p className="text-[10px] text-neutral-400">4:25 PM</p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md bg-orange-50 text-orange-600">
                  <Icon name="user" size={16} /> {/* Placeholder for user-minus */}
                </span>
                <div className="flex-1 min-w-0 flex items-start justify-between gap-2">
                  <div>
                    <p className="text-[13px] font-bold text-neutral-900">User deactivated</p>
                    <p className="text-[11px] font-medium text-neutral-500 mt-0.5">Ava Davis was deactivated</p>
                  </div>
                  <div className="text-right whitespace-nowrap">
                    <p className="text-[11px] font-semibold text-neutral-400">May 29, 2026</p>
                    <p className="text-[10px] text-neutral-400">6:45 PM</p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md bg-purple-50 text-purple-600">
                  <Icon name="users" size={16} /> {/* Placeholder for user-plus */}
                </span>
                <div className="flex-1 min-w-0 flex items-start justify-between gap-2">
                  <div>
                    <p className="text-[13px] font-bold text-neutral-900">New user added</p>
                    <p className="text-[11px] font-medium text-neutral-500 mt-0.5">Noah Williams was added as View Only</p>
                  </div>
                  <div className="text-right whitespace-nowrap">
                    <p className="text-[11px] font-semibold text-neutral-400">May 29, 2026</p>
                    <p className="text-[10px] text-neutral-400">10:15 AM</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
