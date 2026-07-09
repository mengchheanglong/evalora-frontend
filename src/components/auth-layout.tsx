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
  {
    title: "AI-Powered",
    body: "Smart evaluations and insights driven by advanced AI.",
    icon: "sparkle" as const,
    tint: "bg-pink-200 text-fuchsia-500",
  },
  {
    title: "Secure & Reliable",
    body: "Enterprise-grade security to protect your data.",
    icon: "shield" as const,
    tint: "bg-emerald-200 text-emerald-600",
  },
  {
    title: "Insights & Analytics",
    body: "Data-driven reports to help you make the right hiring decisions.",
    icon: "trend" as const,
    tint: "bg-yellow-100 text-amber-400",
  },
];

export function AuthLayout({ children, headline, lead, panelClassName = "max-w-[250px] pt-[70px] lg:ml-[88px]" }: AuthLayoutProps) {
  return (
    <main className="grid min-h-screen bg-white text-neutral-950 lg:grid-cols-2">
      <aside className="relative hidden min-h-screen bg-primary-50 lg:block">
        <EvaloraLogo className="absolute left-[60px] top-[26px]" href="/" size="auth" />

        <div className="absolute left-[60px] top-[106px] max-w-[315px]">
          {headline && <div className="mb-[23px] text-[25px] font-black leading-[39px] tracking-[-0.02em] text-neutral-950">{headline}</div>}
          <p className="max-w-[265px] text-[10px] leading-[12px] text-neutral-600">{lead}</p>
          <div className="mt-[19px] space-y-[20px]">
            {trustItems.map((item) => (
              <div className="flex items-center gap-[14px]" key={item.title}>
                <span className={`inline-flex size-[44px] shrink-0 items-center justify-center rounded-full ${item.tint}`}>
                  <Icon name={item.icon} size={20} />
                </span>
                <div>
                  <h2 className="text-[10px] font-bold leading-[13px]">{item.title}</h2>
                  <p className="mt-[7px] text-[10px] leading-[12px] text-neutral-950">{item.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="absolute bottom-[9px] left-0 right-0 text-center text-[10px] text-neutral-500">&copy; 2026 Evalora. All rights reserved.</p>
      </aside>

      <section className="min-h-screen px-5 py-8 sm:px-8 lg:px-0 lg:py-0">
        <div className={`w-full ${panelClassName}`}>{children}</div>
      </section>
    </main>
  );
}

export function AuthDivider() {
  return (
    <div className="flex items-center gap-[14px] text-[10px] text-neutral-500">
      <span className="h-px flex-1 bg-neutral-400" />
      <span>or continue with</span>
      <span className="h-px flex-1 bg-neutral-400" />
    </div>
  );
}
