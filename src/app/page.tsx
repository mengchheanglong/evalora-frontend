import Link from "next/link";
import { ButtonLink } from "@/components/button-link";
import { Icon } from "@/components/icons";
import { EvaloraLogo, LogoMark } from "@/components/logo";
import { howItWorks, landingFeatures, landingStats, testimonials } from "@/lib/mock-data";

const customerLogos = ["KiriromTech", "FutureSoft", "TechVision", "NEXORA", "BrightHire"];

const footerLinks = {
  Product: [
    { label: "Features", href: "#features" },
    { label: "Assessment", href: "#workflow" },
    { label: "AI Interview", href: "#features" },
    { label: "Coding Test", href: "#features" },
    { label: "Reports", href: "#features" },
  ],
  Company: [
    { label: "About Us", href: "#" },
    { label: "Careers", href: "#" },
    { label: "Blog", href: "#" },
    { label: "Contact Us", href: "#" },
    { label: "Partners", href: "#" },
  ],
  Resources: [
    { label: "Help Center", href: "#" },
    { label: "Guides", href: "#" },
    { label: "Templates", href: "#" },
    { label: "API Docs", href: "#" },
    { label: "Security", href: "#" },
  ],
  Legal: [
    { label: "Privacy Policy", href: "#" },
    { label: "Terms of Service", href: "#" },
    { label: "Cookie Policy", href: "#" },
    { label: "GDPR", href: "#" },
    { label: "Security", href: "#" },
  ],
};

export default function HomePage() {
  return (
    <main className="bg-white text-neutral-950 font-sans">
      {/* HEADER */}
      <header className="mx-auto flex max-w-[1220px] items-center justify-between gap-6 px-5 pt-[36px] pb-[56px] sm:px-0">
        <Link className="inline-flex items-center gap-3 sm:hidden" href="/">
          <LogoMark className="size-10" />
          <span className="text-xl font-bold text-neutral-950">Evalora</span>
        </Link>
        <span className="hidden sm:inline-flex">
          <EvaloraLogo href="/" size="auth" />
        </span>
        <nav className="hidden items-center gap-[37px] text-[13px] font-medium text-neutral-600 md:flex">
          <a className="hover:text-neutral-950 transition-colors" href="#features">Features</a>
          <a className="hover:text-neutral-950 transition-colors" href="#workflow">How it works</a>
          <a className="hover:text-neutral-950 transition-colors" href="#teams">For Teams</a>
          <a className="hover:text-neutral-950 transition-colors" href="#resources">Resources</a>
        </nav>
        <div className="flex items-center gap-3">
          <span className="hidden sm:inline-flex">
            <ButtonLink className="h-[38px] min-w-[100px] px-5 py-0 text-[13px] font-bold" href="/login" variant="secondary">
              Log in
            </ButtonLink>
          </span>
          <ButtonLink className="h-[38px] min-w-[120px] px-5 py-0 text-[13px] font-bold" href="/register">
            Get Started
          </ButtonLink>
        </div>
      </header>

      {/* HERO SECTION */}
      <section className="mx-auto grid max-w-[1220px] items-center gap-[88px] px-5 sm:px-0 lg:grid-cols-[580px_1fr] pb-[60px]">
        <div>
          <h1 className="max-w-[580px] text-5xl font-black leading-[1.08] tracking-[-0.02em] text-neutral-950 sm:text-[64px]">
            Smarter Hiring
            <span className="block mt-1">
              <span className="text-primary">Better</span> Decisions
            </span>
          </h1>
          <p className="mt-[24px] max-w-[540px] text-[18px] leading-[26px] text-neutral-600">
            Evalora uses AI to evaluate candidates across technical skills, behavior, leadership, and communication skills helping you find the right talent faster and with confidence.
          </p>
          <div className="mt-[32px] flex flex-wrap gap-[13px]">
            <ButtonLink className="h-[46px] min-w-[130px] px-6 py-0 text-[14px] font-bold rounded-lg" href="/register">
              Get Started
            </ButtonLink>
            <ButtonLink className="h-[46px] min-w-[130px] px-6 py-0 text-[14px] font-bold rounded-lg" href="/assessment/demo-session" variant="secondary">
              Watch Demo
            </ButtonLink>
          </div>
          <div className="mt-[36px] flex flex-wrap gap-x-[36px] gap-y-4 text-[13px] font-semibold text-neutral-600">
            {["AI-Powered Evaluation", "Save Time & Reduce Bias", "Data-Driven Insights"].map((item) => (
              <span className="inline-flex items-center gap-2" key={item}>
                <span className="inline-flex size-[20px] items-center justify-center rounded-full bg-primary text-white shrink-0">
                  <Icon name="check" size={12} />
                </span>
                <span>{item}</span>
              </span>
            ))}
          </div>
        </div>

        <div className="flex justify-end">
          <HeroDashboardPreview />
        </div>
      </section>

      {/* TRUSTED BY LOGOS */}
      <section className="mx-auto max-w-[890px] px-5 pt-[40px] pb-[80px] text-center sm:px-0">
        <p className="text-[13px] font-bold text-neutral-400 uppercase tracking-wider">Trusted by innovative teams around the world</p>
        <div className="mt-[32px] flex flex-wrap items-center justify-center gap-x-[73px] gap-y-5 text-[14px] font-bold text-neutral-400">
          {customerLogos.map((logo) => (
            <span className="opacity-70 hover:opacity-100 transition-opacity" key={logo}>{logo}</span>
          ))}
        </div>
      </section>

      {/* FEATURES SECTION */}
      <section className="mx-auto max-w-[1220px] px-5 pt-[80px] pb-[80px] sm:px-0" id="features">
        <div className="text-center">
          <h2 className="text-[36px] font-bold leading-[43px] tracking-tight text-neutral-950">Everything you need to evaluate with confidence</h2>
          <p className="mt-[16px] text-[18px] leading-[26px] text-neutral-500 max-w-[700px] mx-auto">Comprehensive assessment tools powered by AI to help you make better hiring decisions.</p>
        </div>
        <div className="mt-[48px] grid gap-[24px] sm:grid-cols-2 lg:grid-cols-5">
          {landingFeatures.map((feature) => (
            <article className="soft-card flex min-h-[310px] flex-col items-center px-[20px] py-[36px] text-center rounded-[12px] border border-neutral-100" key={feature.title}>
              <span className="inline-flex size-[56px] items-center justify-center rounded-[10px] bg-primary-50 text-primary-700 shrink-0">
                <Icon name={feature.icon} size={28} />
              </span>
              <h3 className="mt-[20px] text-[15px] font-bold leading-5 text-neutral-900">{feature.title}</h3>
              <p className="mt-[12px] text-[12px] leading-[17px] text-neutral-500">{feature.description}</p>
              <a className="mt-auto pt-6 text-[12px] font-bold text-primary-700 hover:underline" href="#workflow">
                Learn more &rarr;
              </a>
            </article>
          ))}
        </div>
      </section>

      {/* WORKFLOW SECTION */}
      <section className="mx-auto max-w-[1220px] px-5 pt-[80px] pb-[80px] sm:px-0" id="workflow">
        <div className="text-center">
          <h2 className="text-[36px] font-bold leading-[43px] text-neutral-950 tracking-tight">How Evalora works</h2>
          <p className="mt-[16px] text-[18px] leading-[26px] text-neutral-500 max-w-[600px] mx-auto">Simple steps to evaluate candidates smarter and faster.</p>
        </div>
        <div className="mt-[56px] grid gap-10 sm:grid-cols-2 md:grid-cols-4">
          {howItWorks.map((step) => {
            let tintClass: string = step.tint;
            if (step.title.includes("Create")) tintClass = "bg-primary-50 text-primary-700";
            if (step.title.includes("Invite")) tintClass = "bg-emerald-50 text-emerald-600";
            if (step.title.includes("Evaluates")) tintClass = "bg-fuchsia-50 text-fuchsia-600";
            if (step.title.includes("Review")) tintClass = "bg-amber-50 text-amber-600";

            return (
              <article className="text-center" key={step.title}>
                <span className={`mx-auto inline-flex size-[72px] items-center justify-center rounded-full shadow-sm ${tintClass} shrink-0`}>
                  <Icon name={step.icon} size={32} />
                </span>
                <h3 className="mt-[24px] text-[16px] font-bold text-neutral-900">{step.title}</h3>
                <p className="mx-auto mt-[12px] max-w-[200px] text-[12px] leading-[18px] text-neutral-500">{step.description}</p>
              </article>
            );
          })}
        </div>
      </section>

      {/* STATS SECTION */}
      <section className="mx-auto max-w-[1220px] px-5 pt-[40px] pb-[80px] sm:px-0" id="teams">
        <div className="grid min-h-[220px] gap-8 rounded-[16px] bg-navy px-8 py-[48px] text-white sm:grid-cols-2 lg:grid-cols-4 shadow-xl">
          {landingStats.map((stat) => (
            <article className="text-center" key={stat.label}>
              <Icon className="mx-auto text-fuchsia-400" name={stat.icon} size={36} />
              <p className="mt-4 text-[32px] font-extrabold leading-none">{stat.value}</p>
              <p className="mt-3 text-[13px] font-bold text-slate-300">{stat.label}</p>
              <p className="text-[11px] text-slate-400 mt-1">{stat.detail}</p>
            </article>
          ))}
        </div>
      </section>

      {/* TESTIMONIALS SECTION */}
      <section className="mx-auto max-w-[1220px] px-5 pt-[60px] pb-[80px] sm:px-0" id="resources">
        <div className="text-center">
          <h2 className="text-[36px] font-bold leading-[43px] text-neutral-950 tracking-tight">Loved by hiring teams</h2>
          <p className="mt-[16px] text-[18px] leading-[26px] text-neutral-500 max-w-[600px] mx-auto">See what our customers have to say about Evalora.</p>
        </div>
        <div className="mt-[48px] grid gap-[33px] md:grid-cols-3">
          {testimonials.map((testimonial) => (
            <article className="soft-card flex min-h-[260px] flex-col justify-between p-[32px] rounded-[12px] border border-neutral-100" key={testimonial.name}>
              <div>
                <p className="text-[56px] font-extrabold leading-none text-primary-700 select-none">“</p>
                <p className="mt-1 text-[14px] leading-[22px] text-neutral-600">{testimonial.quote}</p>
              </div>
              <div className="mt-[26px] flex items-end justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="inline-flex size-[48px] items-center justify-center rounded-full border border-neutral-200 bg-white text-neutral-500 shrink-0">
                    <Icon name="user" size={24} />
                  </span>
                  <div>
                    <p className="font-bold text-[14px] text-neutral-950">{testimonial.name}</p>
                    <p className="text-[12px] text-neutral-500 mt-[2px]">{testimonial.role}</p>
                  </div>
                </div>
                <span className="flex gap-[2px] text-amber-400" aria-label="Five star rating">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Icon fill="currentColor" key={star} name="star" size={14} />
                  ))}
                </span>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* CTA SECTION */}
      <section className="mx-auto max-w-[1220px] px-5 pt-[40px] pb-[100px] sm:px-0">
        <div className="flex min-h-[181px] flex-col gap-6 rounded-[16px] bg-lavender-50 px-[61px] py-[38px] md:flex-row md:items-center md:justify-between shadow-sm">
          <div className="flex items-center gap-8">
            <div className="hidden text-indigo-500 sm:block shrink-0">
              <Icon name="paperPlane" size={54} />
            </div>
            <div>
              <h2 className="text-[24px] font-bold text-neutral-950 leading-7">Ready to hire smarter?</h2>
              <p className="mt-[6px] text-[15px] leading-6 text-neutral-500">Join thousands of teams using Evalora to find and hire the best talent.</p>
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap gap-3">
            <ButtonLink className="h-[42px] min-w-[110px] px-6 py-0 text-[13px] font-bold rounded-lg" href="/assessment/demo-session" variant="secondary">
              Demo
            </ButtonLink>
            <ButtonLink className="h-[42px] min-w-[130px] px-6 py-0 text-[13px] font-bold rounded-lg" href="/register">
              Get Started
            </ButtonLink>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-neutral-200 bg-white pt-[60px] pb-[40px]">
        <div className="mx-auto max-w-[1220px] px-5 sm:px-0">
          <div className="grid grid-cols-2 gap-8 md:grid-cols-6 lg:grid-cols-6 pb-[48px]">
            <div className="col-span-2 space-y-4">
              <EvaloraLogo href="/" size="auth" />
              <p className="text-[13px] leading-[20px] text-neutral-500 max-w-[240px]">
                AI-powered assessments for modern hiring teams.
              </p>
            </div>

            {Object.entries(footerLinks).map(([category, links]) => (
              <div key={category}>
                <h4 className="text-[12px] font-bold tracking-wider text-neutral-900 uppercase">{category}</h4>
                <ul className="mt-4 space-y-[10px]">
                  {links.map((link) => (
                    <li key={link.label}>
                      <a className="text-[13px] text-neutral-600 hover:text-primary hover:underline transition-colors" href={link.href}>
                        {link.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}

            <div className="col-span-2 md:col-span-2 lg:col-span-2 space-y-3">
              <h4 className="text-[12px] font-bold tracking-wider text-neutral-900 uppercase">Newsletter</h4>
              <p className="text-[13px] text-neutral-500 leading-[20px]">
                Stay updated with the latest features and insights.
              </p>
              <div className="flex flex-col gap-2 pt-1">
                <input
                  className="form-field h-[40px] text-[13px] bg-neutral-50 border border-neutral-200 rounded-lg placeholder-neutral-400 focus:bg-white"
                  placeholder="Enter your email"
                  type="email"
                />
                <button
                  className="h-[40px] w-full rounded-lg bg-primary hover:bg-primary-600 text-white font-bold text-[13px] transition-colors cursor-pointer"
                  type="submit"
                >
                  Subscribe
                </button>
              </div>
            </div>
          </div>

          <div className="border-t border-neutral-100 pt-6 flex flex-col md:flex-row items-center justify-between gap-4">
            <span className="text-[12px] text-neutral-400">
              &copy; 2026 Evalora. All rights reserved.
            </span>
          </div>
        </div>
      </footer>
    </main>
  );
}

function HeroDashboardPreview() {
  const navItems = ["Dashboard", "Assessment Templates", "Interview Sessions", "Candidates", "Candidate Reports", "Analytics", "AI Tools", "Settings", "Users & Roles"];
  const statCards = [
    { label: "Total Candidates", value: "1,256", change: "+12%", tint: "bg-violet-100 text-violet-700", icon: "users" as const },
    { label: "Completed", value: "832", change: "+8%", tint: "bg-emerald-100 text-emerald-600", icon: "check" as const },
    { label: "Average Score", value: "78%", change: "+5%", tint: "bg-blue-100 text-blue-600", icon: "star" as const },
    { label: "In Progress", value: "334", change: "-4%", tint: "bg-orange-100 text-orange-500", icon: "clock" as const },
  ];
  const activity = [
    { title: "David Lee completed", detail: "Frontend Developer Interview", time: "2h ago", tint: "bg-emerald-100 text-emerald-600", icon: "check" as const },
    { title: "Emma Johnson started", detail: "Backend Developer Interview", time: "6h ago", tint: "bg-violet-100 text-violet-700", icon: "user" as const },
    { title: "New assessment template", detail: "created by you", time: "1d ago", tint: "bg-orange-100 text-orange-500", icon: "file" as const },
    { title: "Report generated for", detail: "Sophia Wilson", time: "2d ago", tint: "bg-rose-100 text-rose-500", icon: "report" as const },
  ];

  return (
    <div className="mt-[2px] w-[560px] max-w-full rounded-xl border border-neutral-200 bg-white shadow-[0_20px_50px_rgba(0,0,0,0.08)] overflow-hidden">
      <div className="grid h-[322px] grid-cols-[105px_1fr] overflow-hidden">
        <aside className="border-r border-neutral-200 bg-surface-tint px-[10px] py-[10px]">
          <div className="flex items-center gap-[5px]">
            <LogoMark className="size-[25px]" />
            <span className="text-[6px] font-black tracking-[0.08em]">EVALORA</span>
          </div>
          <div className="mt-[14px] space-y-[4px]">
            {navItems.map((item, index) => (
              <div className={`flex h-[20px] items-center gap-[7px] rounded-[4px] px-[6px] text-[6px] font-semibold ${index === 0 ? "bg-primary-100 text-primary-700" : "text-neutral-700"}`} key={item}>
                <Icon name={index === 0 ? "home" : index === 1 ? "clipboard" : index === 2 ? "clock" : index === 3 ? "user" : index === 4 ? "report" : index === 5 ? "analytics" : index === 6 ? "sparkle" : index === 7 ? "settings" : "users"} size={8} />
                <span className="truncate">{item}</span>
              </div>
            ))}
          </div>
        </aside>
        <section className="bg-white p-[14px]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[9px] font-black">Welcome back, Sophia! 👋</p>
              <p className="mt-[3px] text-[6px] text-neutral-500">Here&apos;s what&apos;s happening with your assessments today.</p>
            </div>
            <span className="rounded-[4px] border border-neutral-200 bg-white px-[8px] py-[5px] text-[6px] font-bold text-neutral-700">May 1, 2026 - May 31, 2026</span>
          </div>
          <div className="mt-[14px] grid grid-cols-4 gap-[7px]">
            {statCards.map((stat) => (
              <div className="rounded-[6px] border border-neutral-200 bg-white px-[8px] py-[9px]" key={stat.label}>
                <div className="flex items-center gap-[6px]">
                  <span className={`inline-flex size-[18px] items-center justify-center rounded-full ${stat.tint}`}>
                    <Icon name={stat.icon} size={9} />
                  </span>
                  <span className="text-[6px] font-semibold text-neutral-600">{stat.label}</span>
                </div>
                <p className="mt-[6px] text-[15px] font-black leading-none">{stat.value}</p>
                <p className={`mt-[5px] text-[6px] font-bold ${stat.change.startsWith("-") ? "text-rose-500" : "text-emerald-600"}`}>{stat.change} vs last month</p>
              </div>
            ))}
          </div>
          <div className="mt-[11px] grid gap-[9px] lg:grid-cols-[1fr_0.78fr]">
            <div className="rounded-[6px] border border-neutral-200 bg-white p-[11px]">
              <p className="text-[8px] font-black">Assessment Performance Trend</p>
              <div className="mt-[10px] grid grid-cols-[26px_1fr] gap-[4px]">
                <div className="flex h-[116px] flex-col justify-between text-right text-[6px] text-neutral-500">
                  <span>100%</span><span>75%</span><span>50%</span><span>25%</span><span>0%</span>
                </div>
                <svg className="h-[116px] w-full overflow-visible" viewBox="0 0 184 116" role="img" aria-label="Assessment performance line chart">
                  <defs>
                    <linearGradient id="hero-chart-fill" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor="#15c7a8" stopOpacity="0.18" />
                      <stop offset="100%" stopColor="#15c7a8" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  {[18, 42, 66, 90].map((y) => <line key={y} x1="0" x2="184" y1={y} y2={y} stroke="#eceff3" strokeWidth="1" />)}
                  <path d="M0 88 L13 62 L25 75 L38 67 L51 72 L64 58 L76 65 L89 50 L102 38 L115 46 L128 28 L141 42 L154 21 L167 55 L184 32 L184 116 L0 116 Z" fill="url(#hero-chart-fill)" />
                  <path d="M0 88 L13 62 L25 75 L38 67 L51 72 L64 58 L76 65 L89 50 L102 38 L115 46 L128 28 L141 42 L154 21 L167 55 L184 32" fill="none" stroke="#00a98f" strokeWidth="2" />
                  {[0,13,25,38,51,64,76,89,102,115,128,141,154,167,184].map((x, index) => <circle cx={x} cy={[88,62,75,67,72,58,65,50,38,46,28,42,21,55,32][index]} fill="#00a98f" key={x} r="2" />)}
                  <line x1="0" x2="184" y1="116" y2="116" stroke="#d9dee8" />
                </svg>
              </div>
            </div>
            <div className="rounded-[6px] border border-neutral-200 bg-white p-[11px]">
              <div className="flex items-center justify-between">
                <p className="text-[8px] font-black">Recent Activity</p>
                <p className="text-[6px] font-bold text-emerald-600">View all</p>
              </div>
              <div className="mt-[10px] space-y-[9px]">
                {activity.map((item) => (
                  <div className="grid grid-cols-[18px_1fr_auto] items-center gap-[7px] text-[6px]" key={`${item.title}-${item.time}`}>
                    <span className={`inline-flex size-[18px] items-center justify-center rounded-full ${item.tint}`}>
                      <Icon name={item.icon} size={9} />
                    </span>
                    <span>
                      <span className="block font-bold leading-[8px]">{item.title}</span>
                      <span className="block text-neutral-500">{item.detail}</span>
                    </span>
                    <span className="text-neutral-500">{item.time}</span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  </div>
);
}
