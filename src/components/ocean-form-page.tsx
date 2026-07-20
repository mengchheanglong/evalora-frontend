import { Icon } from "@/components/icons";

const inputClass =
  "h-12 w-full rounded-md border border-slate-700/80 bg-slate-900/80 px-4 text-sm font-medium text-slate-100 shadow-inner outline-none transition placeholder:text-slate-500 focus:border-cyan-400 focus:ring-4 focus:ring-cyan-400/15";

const iconInputClass =
  "h-12 w-full rounded-md border border-slate-700/80 bg-slate-900/80 pl-11 pr-4 text-sm font-medium text-slate-100 shadow-inner outline-none transition placeholder:text-slate-500 focus:border-cyan-400 focus:ring-4 focus:ring-cyan-400/15";

function FieldHelper({ children }: { children: React.ReactNode }) {
  return <p className="mt-2 text-xs leading-5 text-slate-500">{children}</p>;
}

export function OceanFormPage() {
  return (
    <main className="min-h-screen bg-slate-950 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.18),transparent_34%),linear-gradient(135deg,#020617_0%,#0f172a_48%,#083344_100%)] px-4 py-10 text-slate-100 sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-5xl items-center justify-center">
        <section className="w-full max-w-md rounded-2xl border border-white/10 bg-slate-100 p-6 text-slate-950 shadow-2xl shadow-cyan-950/30 sm:p-8">
          <div className="mb-8">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-cyan-700">Ocean Mode</p>
            <h1 className="mt-3 text-3xl font-extrabold leading-tight text-slate-950 sm:text-4xl">
              Create your account
            </h1>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Secure access for your workspace with a clean dark ocean form.
            </p>
          </div>

          <form className="space-y-5">
            <div>
              <label className="mb-2 block text-sm font-bold text-slate-800" htmlFor="email">
                Email
              </label>
              <div className="relative">
                <Icon className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" name="mail" size={17} />
                <input
                  autoComplete="email"
                  className={iconInputClass}
                  id="email"
                  name="email"
                  placeholder="you@example.com"
                  type="email"
                />
              </div>
              <FieldHelper>Use the email address connected to your team workspace.</FieldHelper>
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold text-slate-800" htmlFor="password">
                Password
              </label>
              <div className="relative">
                <Icon className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" name="lock" size={17} />
                <input
                  autoComplete="new-password"
                  className={iconInputClass}
                  id="password"
                  name="password"
                  placeholder="Create a strong password"
                  type="password"
                />
              </div>
              <FieldHelper>Use at least 8 characters with a mix of letters and numbers.</FieldHelper>
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold text-slate-800" htmlFor="confirm-password">
                Confirm Password
              </label>
              <input
                autoComplete="new-password"
                className={inputClass}
                id="confirm-password"
                name="confirm-password"
                placeholder="Repeat your password"
                type="password"
              />
            </div>

            <label className="flex items-start gap-3 rounded-lg border border-slate-300 bg-white/70 p-3 text-sm text-slate-700">
              <input
                className="mt-0.5 size-4 rounded border-slate-400 text-cyan-500 focus:ring-cyan-400"
                name="terms"
                type="checkbox"
              />
              <span>
                I agree to the terms and understand that this assessment feedback is advisory.
              </span>
            </label>

            <button
              className="inline-flex h-12 w-full items-center justify-center rounded-md bg-cyan-400 px-5 text-sm font-bold text-slate-950 shadow-lg shadow-cyan-950/20 transition hover:bg-cyan-500 focus:outline-none focus:ring-4 focus:ring-cyan-400/25"
              type="submit"
            >
              Submit
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}

export default OceanFormPage;
