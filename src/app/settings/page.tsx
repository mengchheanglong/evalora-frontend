import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { Icon } from "@/components/icons";
import { LogoMark } from "@/components/logo";

function Toggle({ checked }: { checked: boolean }) {
  return (
    <button
      aria-pressed={checked}
      className={`relative inline-flex h-5 w-9 shrink-0 rounded-full transition ${checked ? "bg-primary-500" : "bg-neutral-300"}`}
      type="button"
    >
      <span className={`mt-0.5 size-4 rounded-full bg-white shadow transition ${checked ? "translate-x-[18px]" : "translate-x-0.5"}`} />
    </button>
  );
}

export default function SettingsPage() {
  return (
    <AppShell
      active="settings"
      actions={<button className="button-secondary h-9 rounded-[7px] px-3 text-[12px]" type="button"><Icon name="clock" size={14} />Reset to default</button>}
      description="Manage your account, organization, and application preferences."
      title="Settings"
    >
      <div className="mx-auto max-w-[1100px] space-y-4">
        <section className="card rounded-[10px] p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-[15px] font-black text-neutral-900">Organization profile</h2>
              <p className="mt-1 text-[11px] font-medium text-neutral-500">Manage your account, organization, and application preferences.</p>
            </div>
            <button className="text-[12px] font-bold text-primary-700 hover:text-primary-600" type="button">Change logo</button>
          </div>

          <div className="mt-8 grid gap-7 lg:grid-cols-[190px_1fr]">
            <div>
              <p className="mb-3 text-[12px] font-bold text-neutral-900">Change Logo</p>
              <div className="grid aspect-square w-[150px] place-items-center rounded-[8px] border border-neutral-200 bg-white">
                <LogoMark className="size-[70px]" />
              </div>
              <p className="mt-3 text-[10px] leading-4 text-neutral-500">JPG, PNG or SVG. Max size 2MB.</p>
            </div>

            <div className="grid gap-x-8 gap-y-5 md:grid-cols-2">
              <Field defaultValue="Evalora Inc." label="Organization Name" />
              <Field defaultValue="admin@evalora.com" label="Organization Email" type="email" />
              <Field defaultValue="Human Resources / Hiring Tech" label="Industry" />
              <Field defaultValue="51 - 200 employees" label="Company Size" />
              <Field defaultValue="https://www.evalora.com" label="Website" type="url" />
              <Field defaultValue="United States" label="Country" />
              <label className="block md:col-span-2">
                <span className="mb-2 block text-[12px] font-bold text-neutral-800">Organization Description</span>
                <textarea
                  className="control min-h-[88px] rounded-[8px] px-4 py-3 text-[12px] leading-5"
                  defaultValue="Evalora is an AI-powered candidate assessment platform that helps organizations streamline their hiring process with intelligent evaluations and data-driven insights."
                />
                <span className="mt-1 block text-right text-[11px] font-semibold text-neutral-500">142/200</span>
              </label>
              <div className="md:col-span-2 flex justify-end">
                <button className="button-primary h-9 rounded-[7px] !bg-primary-500 px-4 text-[11px] hover:!bg-primary-600" type="button">Save Changes</button>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-3 lg:grid-cols-3">
          <PreferencesCard />
          <NotificationsCard />
          <PrivacyCard />
        </section>
      </div>
    </AppShell>
  );
}

function Field({ label, defaultValue, type = "text" }: { label: string; defaultValue: string; type?: string }) {
  return (
    <label className="block">
      <span className="mb-2 block text-[12px] font-bold text-neutral-800">{label}</span>
      <input className="control h-11 rounded-[8px] px-4 text-[12px]" defaultValue={defaultValue} type={type} />
    </label>
  );
}

function SelectField({ label, value }: { label: string; value: string }) {
  return (
    <label className="block">
      <span className="mb-2 block text-[12px] font-bold text-neutral-800">{label}</span>
      <span className="relative block">
        <select className="control h-10 appearance-none rounded-[8px] bg-neutral-100 pr-9 text-[11px]" defaultValue={value}>
          <option>{value}</option>
        </select>
        <Icon className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500" name="chevron" size={13} />
      </span>
    </label>
  );
}

function PreferencesCard() {
  return (
    <article className="card flex min-h-[355px] flex-col rounded-[10px] p-5">
      <h2 className="text-[15px] font-black text-neutral-900">Preferences</h2>
      <p className="mt-2 text-[12px] font-medium text-neutral-500">Configure how the platform works for you.</p>
      <div className="mt-5 space-y-4">
        <SelectField label="Timezone" value="(GMT+07:00) Phnom Penh, Hanoi, Jakarta" />
        <SelectField label="Date Format" value="May 31, 2026" />
        <SelectField label="Time Format" value="12-Hour (AM/PM)" />
        <SelectField label="Language" value="English (US)" />
      </div>
      <div className="mt-auto flex justify-end pt-5">
        <button className="button-secondary h-9 rounded-[7px] px-4 text-[11px] !text-primary-700" type="button">Save Preference</button>
      </div>
    </article>
  );
}

function NotificationsCard() {
  const rows = ["New interview session assigned", "Assessment completed", "Candidate status updated", "New user invited", "Weekly performance summary", "Marketing & product updates"];
  return (
    <article className="card flex min-h-[355px] flex-col rounded-[10px] p-5">
      <h2 className="text-[15px] font-black text-neutral-900">Email Notifications</h2>
      <p className="mt-2 text-[12px] font-medium text-neutral-500">Choose what you want to be notified about.</p>
      <div className="mt-6 space-y-4">
        {rows.map((row) => <div className="flex items-center justify-between gap-4 text-[12px] font-semibold text-neutral-700" key={row}><span>{row}</span><Toggle checked /></div>)}
      </div>
      <div className="mt-auto flex justify-end pt-5">
        <button className="button-secondary h-9 rounded-[7px] px-4 text-[11px] !text-primary-700" type="button">Save Notification Settings</button>
      </div>
    </article>
  );
}

function PrivacyCard() {
  return (
    <article className="card flex min-h-[355px] flex-col overflow-hidden rounded-[10px]">
      <div className="p-5">
        <h2 className="text-[15px] font-black text-neutral-900">Data & Privacy</h2>
        <p className="mt-2 text-[12px] font-medium text-neutral-500">Manage your data and privacy settings.</p>
      </div>
      <div className="divide-y divide-neutral-100 border-t border-neutral-100">
        <PrivacyLink title="Export Organization Data" body="Download all your organization data" />
        <PrivacyLink title="Data Retention" body="Manage how long we keep your data" />
        <PrivacyLink danger title="Delete Organization Data" body="Permanently delete all organization data" />
      </div>
      <div className="mt-auto space-y-3 border-t border-neutral-100 p-5">
        <FooterLink label="Privacy Policy" />
        <FooterLink label="Terms of Service" />
      </div>
    </article>
  );
}

function PrivacyLink({ title, body, danger = false }: { title: string; body: string; danger?: boolean }) {
  return (
    <Link className="flex items-center justify-between gap-4 px-5 py-4 hover:bg-neutral-50" href="#">
      <span>
        <span className={`block text-[12px] font-bold ${danger ? "text-red-600" : "text-neutral-800"}`}>{title}</span>
        <span className="mt-1 block text-[11px] text-neutral-500">{body}</span>
      </span>
      <Icon className={`-rotate-90 ${danger ? "text-red-500" : "text-neutral-400"}`} name="chevron" size={14} />
    </Link>
  );
}

function FooterLink({ label }: { label: string }) {
  return (
    <Link className="flex items-center justify-between text-[12px] font-bold text-neutral-700 hover:text-neutral-950" href="#">
      {label}
      <Icon className="-rotate-90 text-neutral-400" name="chevron" size={13} />
    </Link>
  );
}
