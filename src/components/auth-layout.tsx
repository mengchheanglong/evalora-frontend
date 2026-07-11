import type { ReactNode } from "react";
import { EvaloraLogo } from "@/components/logo";
import { Icon } from "@/components/icons";

type AuthLayoutProps = {
  children: ReactNode;
  lead: string;
  headline?: ReactNode;
  panelClassName?: string;
};

const trustItems = [
  { title: "Structured evidence", body: "Compare response-backed signals across every assessment module.", icon: "report" as const, tint: "bg-sky-100 text-sky-700" },
  { title: "Private by design", body: "Role-based access keeps candidate reports inside your workspace.", icon: "shield" as const, tint: "bg-emerald-100 text-emerald-700" },
  { title: "Human-led decisions", body: "AI feedback supports reviewers and never makes the final hiring decision.", icon: "users" as const, tint: "bg-amber-100 text-amber-700" },
];

export function AuthLayout({ children, headline, lead, panelClassName = "max-w-[440px]" }: AuthLayoutProps) {
  return (
    <main className="grid min-h-screen bg-white text-neutral-950 lg:grid-cols-[minmax(420px,0.92fr)_minmax(560px,1.08fr)]">
      <aside className="auth-visual-panel relative hidden min-h-screen overflow-hidden border-r border-[#dce5e9] bg-[#eff7f9] lg:flex lg:flex-col lg:justify-between lg:p-10 xl:p-14">
        <div className="auth-visual-grid absolute inset-0 opacity-50" />
        <div className="auth-visual-glow absolute -left-24 top-28 h-72 w-72 rounded-full opacity-70 blur-3xl" />
        <div className="relative"><EvaloraLogo href="/" size="auth" /></div>
        <div className="relative max-w-[500px] py-14">
          {headline ? <div className="max-w-[460px] text-[42px] font-black leading-[1.08] text-neutral-950 xl:text-[50px]">{headline}</div> : null}
          <p className="mt-5 max-w-[470px] text-[15px] leading-6 text-neutral-600">{lead}</p>
          <div className="mt-10 space-y-5">
            {trustItems.map((item) => (
              <div className="auth-trust-row flex items-center gap-4 rounded-[10px] p-2" key={item.title}>
                <span className={`inline-flex size-10 shrink-0 items-center justify-center rounded-[7px] ${item.tint}`}><Icon name={item.icon} size={18} /></span>
                <div>
                  <h2 className="text-[13px] font-bold text-neutral-950">{item.title}</h2>
                  <p className="mt-1 max-w-[390px] text-[12px] leading-5 text-neutral-600">{item.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        <p className="relative text-center text-[11px] text-neutral-500">&copy; 2026 Evalora. All rights reserved.</p>
      </aside>

      <section className="flex min-h-screen items-center justify-center px-5 py-10 sm:px-8 lg:px-14 xl:px-20">
        <div className={`w-full ${panelClassName}`}>
          <div className="mb-10 lg:hidden"><EvaloraLogo href="/" size="auth" /></div>
          {children}
        </div>
      </section>
    </main>
  );
}

export function AuthDivider({ label = "or" }: { label?: string }) {
  return (
    <div className="flex items-center gap-4 text-[11px] text-neutral-400">
      <span className="h-px flex-1 bg-neutral-200" />
      <span>{label}</span>
      <span className="h-px flex-1 bg-neutral-200" />
    </div>
  );
}
