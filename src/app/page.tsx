import Link from "next/link";
import { ButtonLink } from "@/components/button-link";
import { Icon, type IconName } from "@/components/icons";
import { EvaloraLogo, LogoMark } from "@/components/logo";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { howItWorks, landingFeatures, landingStats, testimonials } from "@/lib/mock-data";

const navLinks = [
  { label: "Features", href: "#features" },
  { label: "How it works", href: "#workflow" },
  { label: "Security", href: "#security" },
  { label: "Customers", href: "#customers" },
  { label: "Pricing", href: "#pricing" },
];

const customerLogos = ["KiriromTech", "FutureSoft", "TechVision", "NEXORA", "BrightHire"];

const securityItems: Array<{ icon: IconName; title: string; description: string }> = [
  {
    icon: "shield",
    title: "Role-based access control",
    description: "Owners, admins, and interviewers each see exactly what their role allows.",
  },
  {
    icon: "lock",
    title: "Secure candidate data",
    description: "Responses are encrypted in transit and scoped to your workspace.",
  },
  {
    icon: "user",
    title: "Private candidate links",
    description: "Tokenized invites — candidates never need a platform account.",
  },
  {
    icon: "report",
    title: "Evidence-backed reports",
    description: "Every score links back to transcripts, code runs, and rubric evidence.",
  },
  {
    icon: "eye",
    title: "Reviewer audit trail",
    description: "Notes and decisions stay attributable across your hiring team.",
  },
  {
    icon: "sparkle",
    title: "Advisory AI by design",
    description: "AI suggests and summarizes; your team makes every final decision.",
  },
];

const pricingIncluded = [
  "Unlimited candidates",
  "AI interview assessment",
  "Coding assessment",
  "Behavioral assessment",
  "Leadership & communication scenarios",
  "Custom assessment templates",
  "Interview session management",
  "Candidate reports & reviewer notes",
  "Analytics dashboard",
  "Role-based access control",
  "Secure candidate data",
  "Team onboarding & support",
];

const footerLinks = {
  Product: [
    { label: "Features", href: "#features" },
    { label: "How it works", href: "#workflow" },
    { label: "Security", href: "#security" },
    { label: "Customers", href: "#customers" },
    { label: "Pricing", href: "#pricing" },
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
  ],
};

export default function HomePage() {
  return (
    <main className="bg-white font-sans text-neutral-950">
      {/* HEADER */}
      <header className="sticky top-0 z-50 border-b border-neutral-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between gap-6 px-5 sm:px-8">
          <Link className="inline-flex items-center gap-2.5" href="/">
            <LogoMark className="size-9" />
            <span className="text-[18px] font-extrabold tracking-[-0.01em] text-neutral-950">Evalora</span>
          </Link>
          <nav className="hidden items-center gap-8 text-[13px] font-medium text-neutral-600 lg:flex">
            {navLinks.map((link) => (
              <a className="transition-colors hover:text-neutral-950" href={link.href} key={link.label}>
                {link.label}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-2.5">
            <span className="hidden xl:inline-flex">
              <ThemeSwitcher compact />
            </span>
            <ButtonLink className="hidden h-10 px-4 text-[13px] sm:inline-flex" href="/login" variant="ghost">
              Log in
            </ButtonLink>
            <ButtonLink className="h-10 !rounded-lg px-5 text-[13px]" href="/register">
              Get started
            </ButtonLink>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="relative overflow-hidden">
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-[620px]">
          <div className="auth-visual-grid absolute inset-0 opacity-30" />
          <div className="absolute -top-48 left-1/2 h-[440px] w-[880px] -translate-x-1/2 rounded-full bg-primary-300/25 blur-3xl" />
        </div>

        <div className="relative mx-auto grid max-w-[1200px] items-center gap-16 px-5 pb-24 pt-16 sm:px-8 lg:grid-cols-[540px_1fr] lg:pt-20">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-white py-1 pl-1.5 pr-3.5 text-[12px] font-semibold text-neutral-600 shadow-sm">
              <span className="rounded-full bg-primary-50 px-2 py-0.5 text-[11px] font-bold text-primary-700">New</span>
              Adaptive follow-up questions in AI interviews
            </span>
            <h1 className="mt-6 text-[44px] font-extrabold leading-[1.06] tracking-[-0.03em] text-neutral-950 sm:text-[60px]">
              Smarter hiring.
              <span className="block bg-gradient-to-r from-primary-700 via-primary-500 to-primary-400 bg-clip-text pb-1.5 text-transparent">
                Better decisions.
              </span>
            </h1>
            <p className="mt-6 max-w-[500px] text-[17px] leading-[27px] text-neutral-600">
              Evalora runs structured AI interviews, coding assessments, and behavioral evaluations — then hands your
              team evidence-backed reports. AI feedback is advisory: your reviewers make the final call.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <ButtonLink className="h-12 !rounded-lg px-7 text-[14px]" href="/register">
                Get started
              </ButtonLink>
              <ButtonLink className="h-12 !rounded-lg px-7 text-[14px]" href="/assessment/demo-session" variant="outline">
                Watch demo
              </ButtonLink>
            </div>
            <div className="mt-9 flex flex-wrap items-center gap-x-6 gap-y-3 text-[13px] font-medium text-neutral-500">
              {["Free pilot workspace", "Private candidate links", "Humans make final decisions"].map((item) => (
                <span className="inline-flex items-center gap-2" key={item}>
                  <Icon className="shrink-0 text-primary-600" name="check" size={15} />
                  {item}
                </span>
              ))}
            </div>
          </div>

          <HeroPreview />
        </div>

        {/* TRUSTED BY */}
        <div className="relative mx-auto max-w-[1200px] border-t border-neutral-100 px-5 py-10 sm:px-8">
          <p className="text-center text-[12px] font-bold uppercase tracking-[0.14em] text-neutral-400">
            Trusted by hiring teams worldwide
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-14 gap-y-4 text-[15px] font-extrabold tracking-tight text-neutral-400">
            {customerLogos.map((logo) => (
              <span className="opacity-80 transition-opacity hover:opacity-100" key={logo}>
                {logo}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* STATS BAND */}
      <section className="border-y border-neutral-200 bg-neutral-50">
        <div className="mx-auto grid max-w-[1200px] grid-cols-2 gap-y-10 px-5 py-12 sm:px-8 md:grid-cols-4 md:divide-x md:divide-neutral-200">
          {landingStats.map((stat) => (
            <article className="px-4 text-center md:px-8" key={stat.label}>
              <p className="text-[26px] font-extrabold tracking-tight text-neutral-950 md:text-[28px]">{stat.value}</p>
              <p className="mt-2 text-[13px] font-semibold text-neutral-700">{stat.label}</p>
              <p className="mt-1 text-[12px] text-neutral-400">{stat.detail}</p>
            </article>
          ))}
        </div>
      </section>

      {/* FEATURES */}
      <section className="mx-auto max-w-[1200px] scroll-mt-24 px-5 py-24 sm:px-8" id="features">
        <div className="mx-auto max-w-[680px] text-center">
          <p className="text-[12px] font-bold uppercase tracking-[0.14em] text-primary-700">Platform</p>
          <h2 className="mt-3 text-[32px] font-extrabold leading-[1.15] tracking-[-0.02em] text-neutral-950 sm:text-[38px]">
            Everything you need to evaluate with confidence
          </h2>
          <p className="mt-4 text-[16px] leading-[26px] text-neutral-500">
            Comprehensive assessment modules powered by AI, built to support — not replace — your hiring team.
          </p>
        </div>
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-6">
          {landingFeatures.map((feature, index) => {
            const large = index < 2;
            return (
              <article
                className={`group flex flex-col rounded-2xl border border-neutral-200 bg-white p-7 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_20px_44px_-20px_rgba(15,23,42,0.18)] ${
                  large ? "lg:col-span-3" : "lg:col-span-2"
                } ${index === 4 ? "sm:col-span-2 lg:col-span-2" : ""}`}
                key={feature.title}
              >
                <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-700">
                  <Icon name={feature.icon} size={22} />
                </span>
                <h3 className="mt-5 text-[16px] font-bold text-neutral-900">{feature.title}</h3>
                <p className="mt-2 text-[14px] leading-[22px] text-neutral-500">{feature.description}</p>
                {index === 0 && <InterviewMock />}
                {index === 1 && <CodingMock />}
              </article>
            );
          })}
        </div>
      </section>

      {/* WORKFLOW */}
      <section className="scroll-mt-24 border-y border-neutral-100 bg-[#fafbfc]" id="workflow">
        <div className="mx-auto max-w-[1200px] px-5 py-24 sm:px-8">
          <div className="mx-auto max-w-[640px] text-center">
            <p className="text-[12px] font-bold uppercase tracking-[0.14em] text-primary-700">Workflow</p>
            <h2 className="mt-3 text-[32px] font-extrabold leading-[1.15] tracking-[-0.02em] text-neutral-950 sm:text-[38px]">
              How Evalora works
            </h2>
            <p className="mt-4 text-[16px] leading-[26px] text-neutral-500">
              From template to hiring decision in four structured steps.
            </p>
          </div>
          <ol className="mt-14 grid gap-10 sm:grid-cols-2 md:grid-cols-4">
            {howItWorks.map((step, index) => (
              <li key={step.title}>
                <div className="flex items-center gap-3">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-full border border-neutral-200 bg-white text-[13px] font-extrabold text-primary-700 shadow-sm">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  {index < howItWorks.length - 1 && <span aria-hidden="true" className="hidden h-px flex-1 bg-neutral-200 md:block" />}
                </div>
                <h3 className="mt-5 text-[16px] font-bold text-neutral-900">{step.title}</h3>
                <p className="mt-2 max-w-[240px] text-[13px] leading-[20px] text-neutral-500">{step.description}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* SECURITY */}
      <section className="scroll-mt-24" id="security">
        <div className="mx-auto grid max-w-[1200px] items-start gap-12 px-5 py-24 sm:px-8 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
          <div>
            <p className="text-[12px] font-bold uppercase tracking-[0.14em] text-primary-700">Trust &amp; security</p>
            <h2 className="mt-3 text-[32px] font-extrabold leading-[1.15] tracking-[-0.02em] text-neutral-950 sm:text-[38px]">
              Enterprise controls. Human decisions.
            </h2>
            <p className="mt-4 max-w-[440px] text-[16px] leading-[26px] text-neutral-500">
              Evalora is built for teams that take candidate data and fair review seriously — access is scoped, links
              are private, and AI never makes the hiring call.
            </p>
            <div className="mt-8 flex items-start gap-3 rounded-xl border border-neutral-200 bg-neutral-50 p-4 text-[13px] leading-[20px] text-neutral-600">
              <Icon className="mt-0.5 shrink-0 text-primary-700" name="shield" size={16} />
              <span>
                <strong className="font-bold text-neutral-900">Advisory by design.</strong> AI feedback supports
                reviewers — it never auto-rejects or auto-hires a candidate.
              </span>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {securityItems.map((item) => (
              <article className="rounded-xl border border-neutral-200 bg-white p-5" key={item.title}>
                <span className="inline-flex size-9 items-center justify-center rounded-lg bg-primary-50 text-primary-700">
                  <Icon name={item.icon} size={17} />
                </span>
                <h3 className="mt-3.5 text-[14px] font-bold text-neutral-900">{item.title}</h3>
                <p className="mt-1.5 text-[13px] leading-[20px] text-neutral-500">{item.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="scroll-mt-24 border-y border-neutral-100 bg-[#fafbfc]" id="customers">
        <div className="mx-auto max-w-[1200px] px-5 py-24 sm:px-8">
          <div className="mx-auto max-w-[640px] text-center">
            <p className="text-[12px] font-bold uppercase tracking-[0.14em] text-primary-700">Customers</p>
            <h2 className="mt-3 text-[32px] font-extrabold leading-[1.15] tracking-[-0.02em] text-neutral-950 sm:text-[38px]">
              Loved by hiring teams
            </h2>
            <p className="mt-4 text-[16px] leading-[26px] text-neutral-500">
              See what teams using Evalora have to say.
            </p>
          </div>
          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {testimonials.map((testimonial) => (
              <figure className="flex flex-col rounded-2xl border border-neutral-200 bg-white p-7 shadow-sm" key={testimonial.name}>
                <div aria-label="Five star rating" className="flex gap-1 text-amber-400">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Icon fill="currentColor" key={star} name="star" size={13} />
                  ))}
                </div>
                <blockquote className="mt-4 text-[15px] leading-[24px] text-neutral-700">
                  &ldquo;{testimonial.quote}&rdquo;
                </blockquote>
                <figcaption className="mt-auto flex items-center gap-3 border-t border-neutral-100 pt-5">
                  <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-primary-50 text-[12px] font-extrabold text-primary-700">
                    {testimonial.name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase()}
                  </span>
                  <span>
                    <span className="block text-[14px] font-bold text-neutral-950">{testimonial.name}</span>
                    <span className="mt-0.5 block text-[12px] text-neutral-500">{testimonial.role}</span>
                  </span>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section className="mx-auto max-w-[1200px] scroll-mt-24 px-5 py-24 sm:px-8" id="pricing">
        <div className="mx-auto max-w-[640px] text-center">
          <p className="text-[12px] font-bold uppercase tracking-[0.14em] text-primary-700">Pricing</p>
          <h2 className="mt-3 text-[32px] font-extrabold leading-[1.15] tracking-[-0.02em] text-neutral-950 sm:text-[38px]">
            Simple private pricing for every team
          </h2>
          <p className="mt-4 text-[16px] leading-[26px] text-neutral-500">
            One plan, every module included — scoped to your hiring volume and review standards.
          </p>
        </div>

        <div className="mx-auto mt-12 max-w-[1000px] overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-[0_24px_60px_-24px_rgba(15,23,42,0.18)] lg:grid lg:grid-cols-[1.05fr_1fr]">
          <div className="p-8 sm:p-10">
            <span className="inline-flex rounded-full bg-primary-50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.08em] text-primary-700">
              For all teams
            </span>
            <h3 className="mt-5 text-[38px] font-extrabold tracking-[-0.02em] text-neutral-950">Let&apos;s talk</h3>
            <p className="mt-3 max-w-[400px] text-[14px] leading-[22px] text-neutral-500">
              Build the assessment workflow that fits your hiring process, team size, and review standards — with
              guided onboarding from day one.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <ButtonLink className="h-11 !rounded-lg px-6 text-[13px]" href="/register">
                Contact sales
              </ButtonLink>
              <ButtonLink className="h-11 !rounded-lg px-6 text-[13px]" href="/assessment/demo-session" variant="outline">
                Try the live demo
              </ButtonLink>
            </div>
            <p className="mt-5 text-[12px] text-neutral-400">Pilot-friendly — start with a single role.</p>
          </div>
          <div className="border-t border-neutral-200 bg-neutral-50 p-8 sm:p-10 lg:border-l lg:border-t-0">
            <p className="text-[12px] font-bold uppercase tracking-[0.12em] text-neutral-500">Everything included</p>
            <ul className="mt-5 grid gap-x-6 gap-y-3 sm:grid-cols-2">
              {pricingIncluded.map((item) => (
                <li className="flex items-start gap-2.5 text-[13px] font-medium leading-[19px] text-neutral-700" key={item}>
                  <Icon className="mt-0.5 shrink-0 text-primary-600" name="check" size={15} />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-[1200px] px-5 pb-24 sm:px-8">
        <div className="relative overflow-hidden rounded-3xl bg-navy px-6 py-16 text-center sm:px-16">
          <div aria-hidden="true" className="pointer-events-none absolute -top-28 left-1/2 h-64 w-[560px] -translate-x-1/2 rounded-full bg-primary/25 blur-3xl" />
          <div aria-hidden="true" className="pointer-events-none absolute -bottom-32 right-0 h-64 w-[420px] rounded-full bg-indigo-500/20 blur-3xl" />
          <h2 className="relative text-[30px] font-extrabold leading-[1.15] tracking-[-0.02em] text-white sm:text-[36px]">
            Ready to hire smarter?
          </h2>
          <p className="relative mx-auto mt-4 max-w-[520px] text-[15px] leading-[24px] text-slate-300">
            Set up your workspace, invite your team, and run your first structured assessment today.
          </p>
          <div className="relative mt-8 flex flex-wrap justify-center gap-3">
            <ButtonLink className="h-12 !rounded-lg px-7 text-[14px]" href="/register">
              Get started
            </ButtonLink>
            <Link
              className="inline-flex h-12 items-center justify-center rounded-lg border border-white/25 px-7 text-[14px] font-bold text-white transition-colors hover:bg-white/10"
              href="/assessment/demo-session"
            >
              Watch demo
            </Link>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-neutral-200 bg-white">
        <div className="mx-auto max-w-[1200px] px-5 py-16 sm:px-8">
          <div className="flex flex-col justify-between gap-10 border-b border-neutral-100 pb-12 md:flex-row md:items-start">
            <div className="max-w-[280px] space-y-4">
              <EvaloraLogo href="/" size="auth" />
              <p className="text-[13px] leading-[20px] text-neutral-500">
                AI-powered assessments for modern hiring teams. Advisory feedback, human decisions.
              </p>
            </div>
            <div className="w-full max-w-[400px]">
              <h4 className="text-[12px] font-bold uppercase tracking-[0.1em] text-neutral-900">Product updates</h4>
              <p className="mt-2 text-[13px] leading-[20px] text-neutral-500">
                Stay updated with the latest features and insights.
              </p>
              <form className="mt-4 flex gap-2">
                <input
                  className="h-10 w-full rounded-lg border border-neutral-200 bg-neutral-50 px-3.5 text-[13px] text-neutral-900 outline-none transition-colors placeholder:text-neutral-400 focus:border-primary-300 focus:bg-white"
                  placeholder="Enter your email"
                  type="email"
                />
                <button
                  className="h-10 shrink-0 cursor-pointer rounded-lg bg-primary px-4 text-[13px] font-bold text-white transition-colors hover:bg-primary-600"
                  type="submit"
                >
                  Subscribe
                </button>
              </form>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8 pt-12 sm:grid-cols-4">
            {Object.entries(footerLinks).map(([category, links]) => (
              <div key={category}>
                <h4 className="text-[12px] font-bold uppercase tracking-[0.1em] text-neutral-900">{category}</h4>
                <ul className="mt-4 space-y-2.5">
                  {links.map((link) => (
                    <li key={link.label}>
                      <a className="text-[13px] text-neutral-500 transition-colors hover:text-neutral-950" href={link.href}>
                        {link.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="mt-14 flex flex-col items-center justify-between gap-3 border-t border-neutral-100 pt-6 sm:flex-row">
            <span className="text-[12px] text-neutral-400">&copy; 2026 Evalora. All rights reserved.</span>
            <div className="flex items-center gap-5 text-[12px] text-neutral-400">
              <a className="transition-colors hover:text-neutral-700" href="#">Privacy</a>
              <a className="transition-colors hover:text-neutral-700" href="#">Terms</a>
              <a className="transition-colors hover:text-neutral-700" href="#security">Security</a>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}

function InterviewMock() {
  return (
    <div className="mt-6 space-y-2.5 rounded-xl border border-neutral-100 bg-neutral-50 p-4">
      <div className="max-w-[85%] rounded-lg rounded-tl-sm border border-neutral-200 bg-white px-3 py-2 text-[12px] leading-[18px] text-neutral-600 shadow-sm">
        How would you roll back a failed deployment with zero downtime?
      </div>
      <div className="ml-auto max-w-[85%] rounded-lg rounded-tr-sm bg-primary-50 px-3 py-2 text-[12px] leading-[18px] text-neutral-700">
        I&apos;d shift traffic back to the previous release with a blue-green swap, then…
      </div>
      <p className="inline-flex items-center gap-1.5 pt-1 text-[11px] font-semibold text-primary-700">
        <Icon name="sparkle" size={12} /> Follow-up generated from this answer
      </p>
    </div>
  );
}

function CodingMock() {
  return (
    <div className="mt-6 rounded-xl bg-neutral-950 p-4">
      <div className="font-mono text-[11px] leading-[19px]">
        <p><span className="text-fuchsia-300">function</span> <span className="text-sky-300">maxProfit</span><span className="text-slate-300">(prices) {"{"}</span></p>
        <p className="pl-4 text-slate-400">let low = Infinity, best = 0;</p>
        <p className="pl-4 text-slate-400">for (const p of prices) {"{ … }"}</p>
        <p className="text-slate-300">{"}"}</p>
      </div>
      <p className="mt-3 inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-400">
        <Icon name="check" size={12} /> 12/12 hidden tests passed
      </p>
    </div>
  );
}

function HeroPreview() {
  const navItems: Array<{ label: string; icon: IconName }> = [
    { label: "Dashboard", icon: "home" },
    { label: "Templates", icon: "clipboard" },
    { label: "Sessions", icon: "clock" },
    { label: "Candidates", icon: "user" },
    { label: "Reports", icon: "report" },
    { label: "Analytics", icon: "analytics" },
    { label: "Settings", icon: "settings" },
    { label: "Users & Roles", icon: "users" },
  ];
  const statCards = [
    { label: "Total Candidates", value: "1,256", change: "+12%", tint: "bg-violet-100 text-violet-700", icon: "user" as const },
    { label: "Completed", value: "832", change: "+8%", tint: "bg-emerald-100 text-emerald-600", icon: "check" as const },
    { label: "Average Score", value: "78%", change: "+5%", tint: "bg-blue-100 text-blue-600", icon: "star" as const },
    { label: "In Progress", value: "334", change: "-4%", tint: "bg-orange-100 text-orange-500", icon: "clock" as const },
  ];
  const activity = [
    { title: "David Lee completed", detail: "Frontend Developer Interview", time: "2h", tint: "bg-emerald-100 text-emerald-600", icon: "check" as const },
    { title: "Emma Johnson started", detail: "Backend Developer Interview", time: "6h", tint: "bg-violet-100 text-violet-700", icon: "user" as const },
    { title: "New assessment template", detail: "created by you", time: "1d", tint: "bg-orange-100 text-orange-500", icon: "file" as const },
    { title: "Report generated for", detail: "Sophia Wilson", time: "2d", tint: "bg-rose-100 text-rose-500", icon: "report" as const },
  ];

  return (
    <div className="relative w-full max-w-[600px] lg:justify-self-end">
      <div aria-hidden="true" className="pointer-events-none absolute -right-10 -top-14 size-[320px] rounded-full bg-primary-300/30 blur-3xl" />
      <div aria-hidden="true" className="pointer-events-none absolute -bottom-12 -left-8 size-[260px] rounded-full bg-indigo-300/20 blur-3xl" />

      <div className="relative overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-[0_32px_80px_-24px_rgba(15,23,42,0.3)]">
        {/* Browser chrome */}
        <div className="flex items-center gap-3 border-b border-neutral-200 bg-neutral-50 px-4 py-2.5">
          <span aria-hidden="true" className="flex gap-1.5">
            <span className="size-2.5 rounded-full bg-rose-400/80" />
            <span className="size-2.5 rounded-full bg-amber-400/80" />
            <span className="size-2.5 rounded-full bg-emerald-400/80" />
          </span>
          <span className="mx-auto flex h-6 w-[210px] items-center justify-center gap-1.5 rounded-md border border-neutral-200 bg-white text-[10px] font-medium text-neutral-400">
            <Icon name="lock" size={9} /> app.evalora.com/dashboard
          </span>
          <span aria-hidden="true" className="w-10" />
        </div>

        <div className="grid h-[330px] grid-cols-[118px_1fr]">
          <aside className="border-r border-neutral-200 bg-surface-tint px-2.5 py-3">
            <div className="flex items-center gap-1.5 px-1">
              <LogoMark className="size-[22px]" />
              <span className="text-[7px] font-black tracking-[0.08em]">EVALORA</span>
            </div>
            <div className="mt-3.5 space-y-1">
              {navItems.map((item, index) => (
                <div
                  className={`flex h-[22px] items-center gap-2 rounded-[5px] px-2 text-[7px] font-semibold ${
                    index === 0 ? "bg-primary-100 text-primary-700" : "text-neutral-600"
                  }`}
                  key={item.label}
                >
                  <Icon name={item.icon} size={9} />
                  <span className="truncate">{item.label}</span>
                </div>
              ))}
            </div>
          </aside>

          <section className="bg-white p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-extrabold">Welcome back, Sophia 👋</p>
                <p className="mt-0.5 text-[7px] text-neutral-500">Here&apos;s what&apos;s happening with your assessments today.</p>
              </div>
              <span className="rounded-[5px] border border-neutral-200 bg-white px-2 py-1 text-[7px] font-bold text-neutral-600">
                May 1 – May 31, 2026
              </span>
            </div>

            <div className="mt-3.5 grid grid-cols-4 gap-2">
              {statCards.map((stat) => (
                <div className="rounded-lg border border-neutral-200 bg-white px-2 py-2" key={stat.label}>
                  <div className="flex items-center gap-1.5">
                    <span className={`inline-flex size-[16px] shrink-0 items-center justify-center rounded-full ${stat.tint}`}>
                      <Icon name={stat.icon} size={8} />
                    </span>
                    <span className="truncate text-[7px] font-semibold text-neutral-500">{stat.label}</span>
                  </div>
                  <p className="mt-1.5 text-[15px] font-extrabold leading-none">{stat.value}</p>
                  <p className={`mt-1 text-[7px] font-bold ${stat.change.startsWith("-") ? "text-rose-500" : "text-emerald-600"}`}>
                    {stat.change} vs last month
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-3 grid gap-2 lg:grid-cols-[1fr_0.8fr]">
              <div className="rounded-lg border border-neutral-200 bg-white p-3">
                <p className="text-[9px] font-extrabold">Assessment Performance Trend</p>
                <div className="mt-2 grid grid-cols-[24px_1fr] gap-1">
                  <div className="flex h-[110px] flex-col justify-between text-right text-[6.5px] text-neutral-400">
                    <span>100%</span><span>75%</span><span>50%</span><span>25%</span><span>0%</span>
                  </div>
                  <svg aria-label="Assessment performance line chart" className="h-[110px] w-full overflow-visible" role="img" viewBox="0 0 184 116">
                    <defs>
                      <linearGradient id="hero-chart-fill" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="0%" stopColor="#15c7a8" stopOpacity="0.18" />
                        <stop offset="100%" stopColor="#15c7a8" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    {[18, 42, 66, 90].map((y) => <line key={y} stroke="#eceff3" strokeWidth="1" x1="0" x2="184" y1={y} y2={y} />)}
                    <path d="M0 88 L13 62 L25 75 L38 67 L51 72 L64 58 L76 65 L89 50 L102 38 L115 46 L128 28 L141 42 L154 21 L167 55 L184 32 L184 116 L0 116 Z" fill="url(#hero-chart-fill)" />
                    <path d="M0 88 L13 62 L25 75 L38 67 L51 72 L64 58 L76 65 L89 50 L102 38 L115 46 L128 28 L141 42 L154 21 L167 55 L184 32" fill="none" stroke="#00a98f" strokeWidth="2" />
                    {[0, 13, 25, 38, 51, 64, 76, 89, 102, 115, 128, 141, 154, 167, 184].map((x, index) => (
                      <circle cx={x} cy={[88, 62, 75, 67, 72, 58, 65, 50, 38, 46, 28, 42, 21, 55, 32][index]} fill="#00a98f" key={x} r="2" />
                    ))}
                    <line stroke="#d9dee8" x1="0" x2="184" y1="116" y2="116" />
                  </svg>
                </div>
              </div>

              <div className="rounded-lg border border-neutral-200 bg-white p-3">
                <div className="flex items-center justify-between">
                  <p className="text-[9px] font-extrabold">Recent Activity</p>
                  <p className="text-[7px] font-bold text-primary-600">View all</p>
                </div>
                <div className="mt-2.5 space-y-2.5">
                  {activity.map((item) => (
                    <div className="grid grid-cols-[16px_1fr_auto] items-center gap-2 text-[7px]" key={`${item.title}-${item.time}`}>
                      <span className={`inline-flex size-[16px] items-center justify-center rounded-full ${item.tint}`}>
                        <Icon name={item.icon} size={8} />
                      </span>
                      <span>
                        <span className="block font-bold leading-[9px]">{item.title}</span>
                        <span className="block text-neutral-500">{item.detail}</span>
                      </span>
                      <span className="text-neutral-400">{item.time}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* Floating cards */}
      <div className="absolute -left-6 -bottom-8 hidden items-center gap-3 rounded-xl border border-neutral-200 bg-white p-3.5 pr-5 shadow-[0_18px_44px_-14px_rgba(15,23,42,0.3)] sm:flex">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600">
          <Icon name="check" size={16} />
        </span>
        <span>
          <span className="block text-[13px] font-bold text-neutral-900">Report ready</span>
          <span className="mt-0.5 block text-[11px] text-neutral-500">Evidence attached · for your review</span>
        </span>
      </div>
      <div className="absolute -right-4 -top-9 hidden items-center gap-3 rounded-xl border border-neutral-200 bg-white p-3.5 shadow-[0_18px_44px_-14px_rgba(15,23,42,0.3)] sm:flex">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary-50 text-[11px] font-extrabold text-primary-700">
          EM
        </span>
        <span>
          <span className="block text-[13px] font-bold text-neutral-900">Emma Johnson</span>
          <span className="mt-0.5 block text-[11px] text-neutral-500">Score 92 · advisory</span>
        </span>
      </div>
    </div>
  );
}
