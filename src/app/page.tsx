import Link from "next/link";
import { ButtonLink } from "@/components/button-link";
import { Icon } from "@/components/icons";
import { EvaloraLogo, LogoMark } from "@/components/logo";
import { howItWorks, landingFeatures, landingStats, testimonials } from "@/lib/mock-data";

const customerLogos = ["KiriromTech", "FutureSoft", "TechVision", "NEXORA", "BrightHire"];

export default function HomePage() {
  return (
    <main className="bg-white text-neutral-950">
      <header className="mx-auto flex max-w-[1220px] items-center justify-between gap-6 px-5 pt-[47px] pb-[66px] sm:px-0">
        <Link className="inline-flex items-center gap-3 sm:hidden" href="/">
          <LogoMark className="size-11" />
          <span className="text-2xl font-bold text-neutral-950">Evalora</span>
        </Link>
        <span className="hidden sm:inline-flex">
          <EvaloraLogo href="/" />
        </span>
        <nav className="hidden items-center gap-[37px] text-[13px] font-bold text-neutral-700 md:flex">
          <a href="#features">Features</a>
          <a href="#workflow">How it works</a>
          <a href="#teams">For Teams</a>
          <a href="#resources">Resources</a>
        </nav>
        <div className="flex items-center gap-3">
          <span className="hidden sm:inline-flex">
            <ButtonLink className="h-[34px] min-w-[130px] px-5 py-0 text-[13px]" href="/login" variant="secondary">
              Log in
            </ButtonLink>
          </span>
          <ButtonLink className="h-[34px] min-w-[130px] px-5 py-0 text-[13px]" href="/register">
            Get Started
          </ButtonLink>
        </div>
      </header>

      <section className="mx-auto grid max-w-[1220px] items-start gap-[88px] px-5 sm:px-0 lg:grid-cols-[630px_1fr]">
        <div>
          <h1 className="max-w-[620px] text-5xl font-black leading-[1.08] tracking-normal text-neutral-950 sm:text-[64px]">
            Smarter Hiring
            <span className="block">
              <span className="text-[#38c6e9]">Better</span> Decisions
            </span>
          </h1>
          <p className="mt-[58px] max-w-[660px] text-[24px] leading-[29px] text-neutral-800">
            Evalora uses AI to evaluate candidates across technical skills, behavior, leadership, and communication skills, helping you find the right talent faster and with confidence.
          </p>
          <div className="mt-[39px] flex flex-wrap gap-[13px]">
            <ButtonLink className="h-[34px] min-w-[129px] px-5 py-0 text-[13px]" href="/register">Get Started</ButtonLink>
            <ButtonLink className="h-[34px] min-w-[126px] px-5 py-0 text-[13px]" href="/assessment/demo-session" variant="secondary">
              Watch Demo
            </ButtonLink>
          </div>
          <div className="mt-[43px] flex flex-wrap gap-x-[55px] gap-y-4 text-[13px] font-semibold text-neutral-700">
            {["AI-Powered Evaluation", "Save Time & Reduce Bias", "Data-Driven Insights"].map((item) => (
              <span className="inline-flex items-center gap-2" key={item}>
                <span className="inline-flex size-5 items-center justify-center rounded-full bg-[#2fb2e4] text-white">
                  <Icon name="check" size={14} />
                </span>
                {item}
              </span>
            ))}
          </div>
        </div>

        <HeroDashboardPreview />
      </section>

      <section className="mx-auto max-w-[890px] px-5 pt-[68px] text-center sm:px-0">
        <p className="text-[13px] font-semibold text-neutral-400">Trusted by innovative teams around the world</p>
        <div className="mt-[58px] flex flex-wrap items-center justify-center gap-x-[73px] gap-y-5 text-[13px] font-bold text-neutral-400">
          {customerLogos.map((logo) => (
            <span key={logo}>{logo}</span>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-[1220px] px-5 pt-[92px] sm:px-0" id="features">
        <div className="text-center">
          <h2 className="text-[36px] font-black leading-[43px] tracking-normal text-neutral-950">Everything you need to evaluate with confidence</h2>
          <p className="mt-[22px] text-[23px] leading-7 text-neutral-700">Comprehensive assessment tools powered by AI to help you make better hiring decisions.</p>
        </div>
        <div className="mt-[42px] grid gap-[24px] sm:grid-cols-2 lg:grid-cols-5">
          {landingFeatures.map((feature) => (
            <article className="soft-card flex min-h-[306px] flex-col items-center px-[24px] py-[41px] text-center" key={feature.title}>
              <span className="inline-flex size-[58px] items-center justify-center rounded-[8px] bg-sky-200 text-blue-600">
                <Icon name={feature.icon} size={30} />
              </span>
              <h3 className="mt-[18px] text-[17px] font-black leading-5">{feature.title}</h3>
              <p className="mt-[17px] text-[11px] leading-[13px] text-neutral-700">{feature.description}</p>
              <a className="mt-auto pt-6 text-[11px] font-bold text-blue-600" href="#workflow">
                Learn more -&gt;
              </a>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-[1220px] px-5 pt-[110px] sm:px-0" id="workflow">
        <div className="text-center">
          <h2 className="text-[36px] font-black leading-[43px] text-neutral-950">How Evalora works</h2>
          <p className="mt-[23px] text-[23px] leading-7 text-neutral-700">Simple steps to evaluate candidates smarter and faster.</p>
        </div>
        <div className="mt-[58px] grid gap-10 md:grid-cols-4">
          {howItWorks.map((step) => (
            <article className="text-center" key={step.title}>
              <span className={`mx-auto inline-flex size-[74px] items-center justify-center rounded-full ${step.tint}`}>
                <Icon name={step.icon} size={34} />
              </span>
              <h3 className="mt-[28px] text-[17px] font-black">{step.title}</h3>
              <p className="mx-auto mt-[18px] max-w-[180px] text-[11px] leading-[13px] text-neutral-700">{step.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-[1220px] px-5 pt-[104px] sm:px-0" id="teams">
        <div className="grid min-h-[220px] gap-6 rounded-[8px] bg-[#05084f] px-8 py-[42px] text-white sm:grid-cols-2 lg:grid-cols-4">
          {landingStats.map((stat) => (
            <article className="text-center" key={stat.label}>
              <Icon className="mx-auto text-fuchsia-500" name={stat.icon} size={42} />
              <p className="mt-4 text-2xl font-black">{stat.value}</p>
              <p className="mt-3 text-sm font-semibold text-slate-200">{stat.label}</p>
              <p className="text-xs text-slate-300">{stat.detail}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-[1220px] px-5 pt-[66px] sm:px-0" id="resources">
        <div className="text-center">
          <h2 className="text-[36px] font-black leading-[43px] text-neutral-950">Loved by hiring teams</h2>
          <p className="mt-[24px] text-[23px] leading-7 text-neutral-700">See what our customers have to say about Evalora.</p>
        </div>
        <div className="mt-[40px] grid gap-[33px] md:grid-cols-3">
          {testimonials.map((testimonial) => (
            <article className="soft-card min-h-[260px] p-[36px]" key={testimonial.name}>
              <p className="text-[58px] font-black leading-none text-[#05084f]">"</p>
              <p className="mt-[8px] min-h-[84px] text-[14px] leading-[16px] text-neutral-700">{testimonial.quote}</p>
              <div className="mt-[26px] flex items-end justify-between gap-4">
                <div className="flex items-center gap-4">
                  <span className="inline-flex size-14 items-center justify-center rounded-full border-4 border-neutral-950">
                    <Icon name="user" size={28} />
                  </span>
                  <div>
                    <p className="font-black">{testimonial.name}</p>
                    <p className="text-sm font-semibold text-neutral-700">{testimonial.role}</p>
                  </div>
                </div>
                <span className="flex text-amber-400" aria-label="Five star rating">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Icon fill="currentColor" key={star} name="star" size={16} />
                  ))}
                </span>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-[1220px] px-5 pt-[54px] pb-[220px] sm:px-0">
        <div className="flex min-h-[181px] flex-col gap-6 rounded-[8px] bg-[#f5f1ff] px-[61px] py-[38px] md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-8">
            <Icon className="hidden text-indigo-500 sm:block" name="sparkle" size={58} />
            <div>
              <h2 className="text-[24px] font-black leading-7">Ready to hire smarter?</h2>
              <p className="mt-[7px] text-[20px] leading-6 text-neutral-800">Join thousands of teams using Evalora to find and hire the best talent.</p>
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap gap-3">
            <ButtonLink className="h-[34px] min-w-[130px] px-5 py-0 text-[13px]" href="/assessment/demo-session" variant="secondary">
              Demo
            </ButtonLink>
            <ButtonLink className="h-[34px] min-w-[130px] px-5 py-0 text-[13px]" href="/register">Get Started</ButtonLink>
          </div>
        </div>
      </section>
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
    <div className="mt-[2px] w-[517px] max-w-full rounded-none border border-neutral-900 bg-white">
      <div className="grid h-[322px] grid-cols-[105px_1fr] overflow-hidden">
        <aside className="border-r border-neutral-200 bg-[#fbfdff] px-[10px] py-[10px]">
          <div className="flex items-center gap-[5px]">
            <LogoMark className="size-[25px]" />
            <span className="text-[6px] font-black tracking-[0.08em]">EVALORA</span>
          </div>
          <div className="mt-[14px] space-y-[4px]">
            {navItems.map((item, index) => (
              <div className={`flex h-[20px] items-center gap-[7px] rounded-[4px] px-[6px] text-[6px] font-semibold ${index === 0 ? "bg-[#bfeeff] text-[#005cff]" : "text-neutral-700"}`} key={item}>
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
