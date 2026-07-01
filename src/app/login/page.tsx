import Link from "next/link";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6 py-10">
      <section className="card w-full max-w-md p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.25em] text-indigo-600">Evalora</p>
        <h1 className="mt-3 text-3xl font-bold text-slate-950">Login</h1>
        <p className="mt-2 text-sm text-slate-600">Connect this form to `/api/auth/login` when auth is implemented.</p>

        <form className="mt-8 space-y-4">
          <label className="block text-sm font-semibold text-slate-700">
            Email
            <input className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3" type="email" placeholder="candidate@example.com" />
          </label>
          <label className="block text-sm font-semibold text-slate-700">
            Password
            <input className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3" type="password" placeholder="••••••••" />
          </label>
          <button className="w-full rounded-xl bg-indigo-600 px-4 py-3 font-semibold text-white" type="button">
            Continue
          </button>
        </form>

        <Link className="mt-6 block text-center text-sm font-semibold text-indigo-700" href="/">
          Back to home
        </Link>
      </section>
    </main>
  );
}
