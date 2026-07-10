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

export function AuthLayout({ children, headline, lead, panelClassName = "max-w-[420px]" }: AuthLayoutProps) {
  return (
    <main className="grid min-h-screen bg-white text-neutral-950 lg:grid-cols-[minmax(360px,0.92fr)_minmax(520px,1.08fr)]">
      <aside className="flex bg-primary-50 px-7 py-8 sm:px-10 lg:min-h-screen lg:px-[58px] lg:py-[34px]">
        <div className="flex w-full flex-col lg:max-w-[400px]">
          <EvaloraLogo href="/" size="auth" />

          <div className="mt-12 max-w-[360px] lg:mt-[54px]">
            {headline && <div className="mb-5 text-[28px] font-black leading-[1.35] tracking-[-0.01em] text-neutral-950 sm:text-[30px]">{headline}</div>}
            <p className="max-w-[315px] text-[12px] leading-[15px] text-neutral-600">{lead}</p>
          </div>

          <div className="mt-6 space-y-5 lg:mt-[22px] lg:space-y-[20px]">
            {trustItems.map((item) => (
              <div className="flex items-center gap-[15px]" key={item.title}>
                <span className={`inline-flex size-[50px] shrink-0 items-center justify-center rounded-full ${item.tint}`}>
                  <Icon name={item.icon} size={22} />
                </span>
                <div>
                  <h2 className="text-[12px] font-bold leading-[15px]">{item.title}</h2>
                  <p className="mt-[6px] text-[12px] leading-[15px] text-neutral-950">{item.body}</p>
                </div>
              </div>
            ))}
          </div>

          <p className="mt-10 text-center text-[11px] text-neutral-500 lg:mt-auto">&copy; 2026 Evalora. All rights reserved.</p>
        </div>
      </aside>

      <section className="flex min-h-[620px] items-center justify-center px-6 py-10 sm:px-8 lg:min-h-screen lg:px-10 lg:py-12">
        <div className={`w-full ${panelClassName}`}>{children}</div>
      </section>
    </main>
  );
}

export function AuthDivider() {
  return (
    <div className="flex items-center gap-[16px] text-[12px] text-neutral-500">
      <span className="h-px flex-1 bg-neutral-400" />
      <span>or continue with</span>
      <span className="h-px flex-1 bg-neutral-400" />
    </div>
  );
}
