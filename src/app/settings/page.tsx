import { AppShell } from "@/components/app-shell";
import { Icon, type IconName } from "@/components/icons";
import Link from "next/link";
import React from "react";

function SettingsSidebarSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <h3 className="mb-2 px-3 text-[11px] font-bold uppercase tracking-wider text-neutral-400">{title}</h3>
      <nav className="space-y-1">{children}</nav>
    </div>
  );
}

function SettingsSidebarLink({ active, icon, label }: { active?: boolean; icon: IconName | React.ReactNode; label: string }) {
  return (
    <Link
      href="#"
      className={`flex items-center gap-3 rounded-md px-3 py-2 text-[13px] font-medium transition ${
        active 
          ? "bg-purple-50 text-purple-700 font-bold" 
          : "text-neutral-700 hover:bg-neutral-100/70 hover:text-neutral-900"
      }`}
    >
      {typeof icon === 'string' ? (
        <Icon name={icon as IconName} size={18} className={active ? "text-purple-700" : "text-neutral-500"} />
      ) : (
        <span className={active ? "text-purple-700" : "text-neutral-500"}>{icon}</span>
      )}
      {label}
    </Link>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange?: () => void }) {
  return (
    <button
      type="button"
      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-600 focus:ring-offset-2 ${
        checked ? "bg-primary-600" : "bg-neutral-200"
      }`}
      onClick={onChange}
    >
      <span
        aria-hidden="true"
        className={`pointer-events-none inline-block size-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
          checked ? "translate-x-4" : "translate-x-0"
        }`}
      />
    </button>
  );
}

export default function SettingsPage() {
  return (
    <AppShell
      active="settings"
      title="Settings"
      description="Manage your account, organization, and application preferences."
      actions={
        <button className="flex items-center gap-2 rounded-md border border-neutral-200 bg-white px-4 py-2 text-[13px] font-bold text-neutral-700 shadow-sm transition hover:bg-neutral-50">
          <svg className="size-[16px] text-neutral-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Reset to default
        </button>
      }
    >
      <div className="grid lg:grid-cols-[240px_1fr] gap-8 mt-2">
        {/* Inner Sidebar */}
        <aside className="hidden lg:block">
          <SettingsSidebarSection title="General">
            <SettingsSidebarLink active label="Organization Profile" icon="building" />
            <SettingsSidebarLink label="Account Settings" icon="user" />
            <SettingsSidebarLink label="Preferences" icon={
              <svg className="size-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
              </svg>
            } />
            <SettingsSidebarLink label="Notifications" icon="bell" />
          </SettingsSidebarSection>

          <SettingsSidebarSection title="Assessment">
            <SettingsSidebarLink label="Assessment Settings" icon="clipboard" />
            <SettingsSidebarLink label="Score & Rating" icon="star" />
            <SettingsSidebarLink label="AI Settings" icon="sparkle" />
          </SettingsSidebarSection>

          <SettingsSidebarSection title="Security">
            <SettingsSidebarLink label="Authentication" icon="lock" />
            <SettingsSidebarLink label="Password Policy" icon={
              <svg className="size-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
            } />
            <SettingsSidebarLink label="Sessions" icon={
              <svg className="size-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            } />
            <SettingsSidebarLink label="API Keys" icon="code" />
          </SettingsSidebarSection>

          <SettingsSidebarSection title="Billing">
            <SettingsSidebarLink label="Subscription" icon={
              <svg className="size-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
            } />
            <SettingsSidebarLink label="Billing & Invoices" icon="file" />
          </SettingsSidebarSection>
        </aside>

        {/* Main Settings Content */}
        <div className="space-y-6">
          {/* Organization Profile Card */}
          <div className="card">
            <div className="border-b border-neutral-100 p-6 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div>
                <h2 className="text-[16px] font-bold text-neutral-900">Organization Profile</h2>
                <p className="mt-1 text-[13px] text-neutral-500">Update your organization information. This will be shown to your team members.</p>
              </div>
              <button className="text-[13px] font-bold text-primary-600 hover:text-primary-700 transition whitespace-nowrap">
                Change Logo
              </button>
            </div>
            
            <div className="p-6">
              <div className="flex flex-col md:flex-row gap-8">
                {/* Logo Section */}
                <div className="w-full md:w-[160px] shrink-0">
                  <p className="text-[13px] font-bold text-neutral-900 mb-3">Organization Logo</p>
                  <div className="flex aspect-square w-full items-center justify-center rounded-xl border border-neutral-200 bg-white shadow-sm overflow-hidden">
                    {/* Placeholder for the Evalora 'E' Logo */}
                    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-indigo-50 to-white">
                      <div className="flex h-16 w-16 items-center justify-center rounded bg-gradient-to-br from-[#1b75d0] to-[#7f1dff] text-white text-4xl font-black italic shadow-inner">
                        E
                      </div>
                    </div>
                  </div>
                  <p className="mt-3 text-[11px] text-neutral-500 leading-relaxed">
                    JPG, PNG or SVG. Max size 2MB.
                  </p>
                </div>

                {/* Form Fields Section */}
                <div className="flex-1 grid gap-x-6 gap-y-5 md:grid-cols-2">
                  <div className="space-y-1.5">
                    <label className="text-[13px] font-bold text-neutral-900">Organization Name</label>
                    <input 
                      type="text" 
                      defaultValue="Evalora Inc." 
                      className="w-full rounded-md border border-neutral-200 px-3 py-2 text-[13px] text-neutral-900 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500" 
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[13px] font-bold text-neutral-900">Organization Email</label>
                    <input 
                      type="email" 
                      defaultValue="hello@evalora.com" 
                      className="w-full rounded-md border border-neutral-200 px-3 py-2 text-[13px] text-neutral-900 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500" 
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[13px] font-bold text-neutral-900">Industry</label>
                    <div className="relative">
                      <select className="w-full appearance-none rounded-md border border-neutral-200 bg-white px-3 py-2 pr-8 text-[13px] text-neutral-900 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500">
                        <option>Human Resources / Hiring Tech</option>
                        <option>Software Development</option>
                        <option>Financial Services</option>
                      </select>
                      <Icon name="chevron" size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 pointer-events-none" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[13px] font-bold text-neutral-900">Company Size</label>
                    <div className="relative">
                      <select className="w-full appearance-none rounded-md border border-neutral-200 bg-white px-3 py-2 pr-8 text-[13px] text-neutral-900 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500">
                        <option>51 - 200 employees</option>
                        <option>201 - 500 employees</option>
                        <option>501+ employees</option>
                      </select>
                      <Icon name="chevron" size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 pointer-events-none" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[13px] font-bold text-neutral-900">Website</label>
                    <input 
                      type="url" 
                      defaultValue="https://www.evalora.com" 
                      className="w-full rounded-md border border-neutral-200 px-3 py-2 text-[13px] text-neutral-900 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500" 
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[13px] font-bold text-neutral-900">Country</label>
                    <div className="relative">
                      <select className="w-full appearance-none rounded-md border border-neutral-200 bg-white px-3 py-2 pr-8 text-[13px] text-neutral-900 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500">
                        <option>United States</option>
                        <option>United Kingdom</option>
                        <option>Canada</option>
                      </select>
                      <Icon name="chevron" size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 pointer-events-none" />
                    </div>
                  </div>
                  <div className="md:col-span-2 space-y-1.5">
                    <label className="text-[13px] font-bold text-neutral-900">Organization Description</label>
                    <textarea 
                      rows={3}
                      defaultValue="Evalora is an AI-powered candidate assessment platform that helps organizations streamline their hiring process with intelligent evaluations and data-driven insights."
                      className="w-full resize-none rounded-md border border-neutral-200 px-3 py-2 text-[13px] text-neutral-900 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                    ></textarea>
                    <div className="text-right text-[11px] font-medium text-neutral-400">142/300</div>
                  </div>
                </div>
              </div>
            </div>
            <div className="border-t border-neutral-100 bg-neutral-50/50 p-4 px-6 flex justify-end">
              <button className="rounded-md bg-[#4f14ff] px-4 py-2.5 text-[13px] font-bold text-white shadow-sm transition hover:bg-[#430ce6]">
                Save Changes
              </button>
            </div>
          </div>

          {/* Bottom 3-Column Grid */}
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Preferences */}
            <div className="card flex flex-col h-full">
              <div className="p-5 flex-1">
                <h3 className="text-[14px] font-bold text-neutral-900">Preferences</h3>
                <p className="mt-1 text-[12px] text-neutral-500 mb-5">Configure how the platform works for you.</p>
                
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[12px] font-bold text-neutral-900">Timezone</label>
                    <div className="relative">
                      <select className="w-full appearance-none rounded-md border border-neutral-200 bg-white px-3 py-2 pr-8 text-[13px] text-neutral-900 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500">
                        <option>(GMT+07:00) Bangkok, Hanoi, Jakarta</option>
                      </select>
                      <Icon name="chevron" size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 pointer-events-none" />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-[12px] font-bold text-neutral-900">Date Format</label>
                      <div className="relative">
                        <select className="w-full appearance-none rounded-md border border-neutral-200 bg-white px-3 py-2 pr-8 text-[13px] text-neutral-900 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500">
                          <option>May 31, 2026</option>
                        </select>
                        <Icon name="chevron" size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 pointer-events-none" />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[12px] font-bold text-neutral-900">Time Format</label>
                      <div className="relative">
                        <select className="w-full appearance-none rounded-md border border-neutral-200 bg-white px-3 py-2 pr-8 text-[13px] text-neutral-900 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500">
                          <option>12-Hour (AM/PM)</option>
                        </select>
                        <Icon name="chevron" size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 pointer-events-none" />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[12px] font-bold text-neutral-900">Language</label>
                    <div className="relative">
                      <select className="w-full appearance-none rounded-md border border-neutral-200 bg-white px-3 py-2 pr-8 text-[13px] text-neutral-900 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500">
                        <option>English (US)</option>
                      </select>
                      <Icon name="chevron" size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 pointer-events-none" />
                    </div>
                  </div>
                </div>
              </div>
              <div className="border-t border-neutral-100 p-4 flex justify-center">
                <button className="rounded-md border border-neutral-200 bg-white px-4 py-2 text-[13px] font-bold text-primary-600 shadow-sm transition hover:bg-neutral-50">
                  Save Preferences
                </button>
              </div>
            </div>

            {/* Email Notifications */}
            <div className="card flex flex-col h-full">
              <div className="p-5 flex-1">
                <h3 className="text-[14px] font-bold text-neutral-900">Email Notifications</h3>
                <p className="mt-1 text-[12px] text-neutral-500 mb-5">Choose what you want to be notified about.</p>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] font-bold text-neutral-800">New interview session assigned</span>
                    <Toggle checked={true} />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] font-bold text-neutral-800">Assessment completed</span>
                    <Toggle checked={true} />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] font-bold text-neutral-800">Candidate status updated</span>
                    <Toggle checked={true} />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] font-bold text-neutral-800">New user invited</span>
                    <Toggle checked={true} />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] font-medium text-neutral-600">Weekly performance summary</span>
                    <Toggle checked={false} />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] font-medium text-neutral-600">Marketing & product updates</span>
                    <Toggle checked={false} />
                  </div>
                </div>
              </div>
              <div className="border-t border-neutral-100 p-4 flex justify-center">
                <button className="rounded-md border border-neutral-200 bg-white px-4 py-2 text-[13px] font-bold text-primary-600 shadow-sm transition hover:bg-neutral-50">
                  Save Notification Settings
                </button>
              </div>
            </div>

            {/* Data & Privacy */}
            <div className="card flex flex-col h-full">
              <div className="p-5 flex-1">
                <h3 className="text-[14px] font-bold text-neutral-900">Data & Privacy</h3>
                <p className="mt-1 text-[12px] text-neutral-500 mb-5">Manage your data and privacy settings.</p>
                
                <div className="space-y-1">
                  <Link href="#" className="group flex items-center justify-between py-2 border-b border-neutral-100 last:border-0">
                    <div>
                      <p className="text-[13px] font-bold text-neutral-800 group-hover:text-primary-600 transition">Export Organization Data</p>
                      <p className="text-[11px] text-neutral-500">Download all your organization data</p>
                    </div>
                    <Icon name="chevron" size={14} className="-rotate-90 text-neutral-400" />
                  </Link>
                  <Link href="#" className="group flex items-center justify-between py-2 border-b border-neutral-100 last:border-0">
                    <div>
                      <p className="text-[13px] font-bold text-neutral-800 group-hover:text-primary-600 transition">Data Retention</p>
                      <p className="text-[11px] text-neutral-500">Manage how long we keep your data</p>
                    </div>
                    <Icon name="chevron" size={14} className="-rotate-90 text-neutral-400" />
                  </Link>
                  <Link href="#" className="group flex items-center justify-between py-2 pt-3">
                    <div>
                      <p className="text-[13px] font-bold text-red-600">Delete Organization Data</p>
                      <p className="text-[11px] text-neutral-500">Permanently delete all organization data</p>
                    </div>
                    <Icon name="chevron" size={14} className="-rotate-90 text-neutral-400" />
                  </Link>
                </div>
                
                <div className="mt-8 space-y-3">
                  <Link href="#" className="flex items-center justify-between text-[13px] font-bold text-neutral-600 hover:text-neutral-900 transition">
                    Privacy Policy
                    <svg className="size-4 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </Link>
                  <Link href="#" className="flex items-center justify-between text-[13px] font-bold text-neutral-600 hover:text-neutral-900 transition">
                    Terms of Service
                    <svg className="size-4 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </Link>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </AppShell>
  );
}
