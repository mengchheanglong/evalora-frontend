"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Icon } from "@/components/icons";
import { planLabel } from "@/lib/admin";
import type { ServiceStatus, SubscriptionPlan, UserRole } from "@/lib/types";

/**
 * Building blocks shared by the platform console pages under `/admin`.
 * These are deliberately separate from the workspace components so the
 * console can evolve without touching the workspace UI.
 */

export type Notice = { tone: "success" | "error"; text: string };

export const STATUS_META: Record<ServiceStatus, { label: string; pill: string; dot: string }> = {
  operational: { label: "Operational", pill: "border-emerald-200 bg-emerald-50 text-emerald-700", dot: "bg-emerald-500" },
  degraded: { label: "Degraded", pill: "border-amber-200 bg-amber-50 text-amber-700", dot: "bg-amber-500" },
  unavailable: { label: "Unavailable", pill: "border-rose-200 bg-rose-50 text-rose-700", dot: "bg-rose-500" },
};

export function Panel({ title, description, action, children }: { title: string; description?: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="card rounded-[10px] p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-black text-[var(--theme-heading)]">{title}</h2>
          {description ? <p className="mt-1 text-xs text-[var(--theme-muted)]">{description}</p> : null}
        </div>
        {action}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export function StatTile({ label, value, detail, status }: { label: string; value: ReactNode; detail: string; status: ServiceStatus }) {
  return (
    <div className="rounded-[8px] border border-[var(--theme-border)] bg-[var(--theme-panel-tint)] p-3.5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-bold text-[var(--theme-muted)]">{label}</p>
        <span aria-hidden="true" className={`size-2 rounded-full ${STATUS_META[status].dot}`} />
      </div>
      <p className="mt-1.5 text-xl font-extrabold leading-none text-[var(--theme-heading)]">{value}</p>
      <p className="mt-1.5 text-xs leading-4 text-[var(--theme-muted)]">{detail}</p>
    </div>
  );
}

export function StatusPill({ status }: { status: ServiceStatus }) {
  return <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-bold ${STATUS_META[status].pill}`}>{STATUS_META[status].label}</span>;
}

export function AccountStatusBadge({ suspended, since }: { suspended: boolean; since?: string }) {
  return (
    <span
      className={`inline-flex items-center rounded border px-2 py-0.5 text-xs font-bold ${suspended ? "border-rose-200 bg-rose-50 text-rose-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}
      title={suspended && since ? `Suspended ${formatDate(since)}` : undefined}
    >
      {suspended ? "Suspended" : "Active"}
    </span>
  );
}

export function PlanBadge({ plan }: { plan: SubscriptionPlan }) {
  const tone =
    plan === "enterprise"
      ? "border-violet-200 bg-violet-50 text-violet-700"
      : plan === "pro"
        ? "border-sky-200 bg-sky-50 text-sky-700"
        : "border-[var(--theme-border)] bg-[var(--theme-panel-soft)] text-[var(--theme-text)]";
  return <span className={`inline-flex items-center rounded border px-2 py-0.5 text-xs font-bold ${tone}`}>{planLabel(plan)}</span>;
}

export function RoleBadge({ role, label }: { role: UserRole; label: string }) {
  const tone =
    role === "admin"
      ? "border-amber-200 bg-amber-50 text-amber-700"
      : role === "organization"
        ? "border-violet-100 bg-violet-50 text-violet-700"
        : role === "interviewer"
          ? "border-sky-100 bg-sky-50 text-sky-700"
          : "border-[var(--theme-border)] bg-[var(--theme-panel-soft)] text-[var(--theme-muted)]";
  return <span className={`inline-flex items-center rounded border px-2 py-0.5 text-xs font-bold ${tone}`}>{label}</span>;
}

export function SearchField({ label, placeholder, value, onChange }: { label: string; placeholder: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="group flex h-9 min-w-[220px] flex-1 items-center gap-2 rounded-[7px] border border-[var(--color-primary-300)]/70 bg-[var(--color-primary-50)]/70 px-3 text-[var(--color-primary-700)] transition focus-within:border-[var(--color-primary-500)] focus-within:bg-[var(--theme-panel)] focus-within:ring-4 focus-within:ring-[var(--theme-ring)] sm:max-w-[380px]">
      <span className="sr-only">{label}</span>
      <input
        className="min-w-0 flex-1 border-0 bg-transparent text-xs font-medium text-[var(--theme-text)] outline-none placeholder:text-[var(--theme-muted)]"
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        type="search"
        value={value}
      />
      <Icon className="pointer-events-none shrink-0 text-[var(--color-primary-700)]/70 transition group-focus-within:text-[var(--color-primary-700)]" name="search" size={15} />
    </label>
  );
}

export function FilterSelect({ label, value, onChange, children }: { label: string; value: string; onChange: (value: string) => void; children: ReactNode }) {
  return (
    <label className="flex items-center gap-2 text-xs font-bold text-[var(--theme-muted)]">
      <span>{label}</span>
      <select className="control h-9 min-h-0 w-auto rounded-[7px] px-2 text-xs font-semibold" onChange={(event) => onChange(event.target.value)} value={value}>
        {children}
      </select>
    </label>
  );
}

export function Pagination({ page, totalPages, total, pageSize, onChange, disabled }: { page: number; totalPages: number; total: number; pageSize: number; onChange: (page: number) => void; disabled: boolean }) {
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--theme-border)] px-5 py-3 text-xs text-[var(--theme-muted)]">
      <span>{total === 0 ? "No results" : `Showing ${from.toLocaleString()}–${to.toLocaleString()} of ${total.toLocaleString()}`}</span>
      <div className="flex items-center gap-2">
        <button className="button-secondary h-8 min-h-0 rounded-[6px] px-3 text-xs" disabled={disabled || page <= 1} onClick={() => onChange(page - 1)} type="button">Previous</button>
        <span className="font-semibold">Page {page} of {totalPages}</span>
        <button className="button-secondary h-8 min-h-0 rounded-[6px] px-3 text-xs" disabled={disabled || page >= totalPages} onClick={() => onChange(page + 1)} type="button">Next</button>
      </div>
    </div>
  );
}

export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const handle = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(handle);
  }, [value, delayMs]);
  return debounced;
}

export function formatDate(iso?: string): string {
  if (!iso) return "—";
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}
