"use client";

export default function AppError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--theme-page)] px-5 py-12 text-[var(--theme-text)]">
      <section className="w-full max-w-[520px] rounded-[12px] border border-[var(--theme-border)] bg-[var(--theme-panel)] p-7 text-center shadow-[var(--theme-shadow)] sm:p-10" role="alert">
        <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-red-50 text-xl font-black text-red-600" aria-hidden="true">!</span>
        <p className="mt-5 text-[11px] font-black uppercase tracking-[0.12em] text-[var(--color-primary-700)]">Evalora workspace</p>
        <h1 className="mt-2 text-2xl font-black text-[var(--theme-heading)]">We could not load this view</h1>
        <p className="mt-3 text-sm leading-6 text-[var(--theme-muted)]">
          Your data is safe. Try the request again, or return to the workspace after the service recovers.
        </p>
        <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
          <button className="button-primary h-11 rounded-[7px] px-5 text-sm font-bold" onClick={reset} type="button">Try again</button>
          <a className="inline-flex h-11 items-center justify-center rounded-[7px] border border-[var(--theme-border)] px-5 text-sm font-bold text-[var(--theme-text)] transition hover:bg-[var(--theme-panel-soft)]" href="/dashboard">Return to Overview</a>
        </div>
      </section>
    </main>
  );
}
