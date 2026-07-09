import type { ReactNode } from "react";
import { EvaloraLogo } from "@/components/logo";
import { Icon } from "@/components/icons";

type AuthLayoutProps = {
  children: ReactNode;
  lead: string;
  panelClassName?: string;
};

const trustItems = [
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

export function AuthLayout({ children, lead, panelClassName = "max-w-[430px] pt-[283px] lg:ml-[154px]" }: AuthLayoutProps) {
  return (
    <main className="grid min-h-screen bg-white text-neutral-950 lg:grid-cols-2">
      <aside className="relative hidden min-h-screen bg-[#eef4ff] lg:block">
        <EvaloraLogo className="absolute left-[108px] top-[44px]" href="/" />

        <div className="absolute left-[108px] top-[330px] max-w-xl">
          <p className="max-w-[420px] text-[16px] leading-[20px] text-neutral-600">{lead}</p>
          <div className="mt-[31px] space-y-[31px]">
            <span className="inline-flex size-[74px] items-center justify-center rounded-full bg-pink-200 text-fuchsia-500">
              <Icon name="sparkle" size={34} />
            </span>

            {trustItems.map((item) => (
              <div className="flex items-center gap-[22px]" key={item.title}>
                <span className={`inline-flex size-[74px] shrink-0 items-center justify-center rounded-full ${item.tint}`}>
                  <Icon name={item.icon} size={34} />
                </span>
                <div>
                  <h2 className="text-[16px] font-bold leading-5">{item.title}</h2>
                  <p className="mt-[12px] text-[16px] leading-5 text-neutral-950">{item.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="absolute bottom-[22px] left-0 right-0 text-center text-[16px] text-neutral-500">&copy; 2026 Evalora. All rights reserved.</p>
      </aside>

      <section className="min-h-screen px-5 py-10 sm:px-8 lg:px-0 lg:py-0">
        <div className={`w-full ${panelClassName}`}>{children}</div>
      </section>
    </main>
  );
}

export function AuthDivider() {
  return (
    <div className="flex items-center gap-[19px] text-[16px] text-neutral-500">
      <span className="h-px flex-1 bg-neutral-400" />
      <span>or continue with</span>
      <span className="h-px flex-1 bg-neutral-400" />
    </div>
  );
}
