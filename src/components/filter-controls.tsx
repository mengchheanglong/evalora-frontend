import type { ReactNode } from "react";
import { Icon } from "@/components/icons";

export function FilterToggleButton({
  controls,
  open,
  activeCount,
  subject,
  onToggle,
}: {
  controls: string;
  open: boolean;
  activeCount: number;
  subject: string;
  onToggle: () => void;
}) {
  return (
    <button
      aria-controls={controls}
      aria-expanded={open}
      aria-label={open ? `Close ${subject} filters` : `Open ${subject} filters`}
      className={`flex h-9 shrink-0 items-center justify-center gap-2 rounded-[7px] border px-3 text-xs font-bold transition focus:outline-none focus:ring-4 focus:ring-[var(--theme-ring)] ${
        open || activeCount
          ? "border-[var(--color-primary-400)] bg-[var(--color-primary-50)] text-[var(--color-primary-700)]"
          : "border-[var(--theme-border)] bg-[var(--theme-panel)] text-[var(--theme-text)] hover:border-[var(--theme-border-strong)] hover:bg-[var(--theme-panel-soft)]"
      }`}
      onClick={onToggle}
      title={open ? "Close filters" : "Open filters"}
      type="button"
    >
      <Icon name="filter" size={15} />
      <span className="hidden sm:inline">Filters</span>
      {activeCount ? <span className="grid size-4.5 place-items-center rounded-full bg-[var(--color-primary-700)] text-[9px] text-white">{activeCount}</span> : null}
      <Icon className={`hidden transition-transform duration-200 sm:block ${open ? "rotate-180" : ""}`} name="chevron" size={12} />
    </button>
  );
}

export function FilterPanelFrame({
  title,
  description,
  onClear,
  children,
}: {
  title: string;
  description: string;
  onClear: () => void;
  children: ReactNode;
}) {
  return (
    <div className="border-b border-[var(--theme-border)] bg-[var(--theme-panel-soft)]/55 px-4 py-3.5 sm:px-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xs font-bold text-[var(--theme-heading)]">{title}</h2>
          <p className="mt-0.5 text-[11px] text-[var(--theme-muted)]">{description}</p>
        </div>
        <button className="rounded-[6px] px-2 py-1 text-[11px] font-bold text-[var(--color-primary-700)] transition hover:bg-[var(--color-primary-50)] hover:text-[var(--color-primary-600)]" onClick={onClear} type="button">
          Clear filters
        </button>
      </div>
      <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {children}
      </div>
    </div>
  );
}

export function FilterSelectField({
  label,
  children,
  value,
  onChange,
}: {
  label: string;
  children: ReactNode;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block rounded-[7px] border border-[var(--theme-border)] bg-[var(--theme-panel)] p-2.5">
      <span className="mb-1.5 block text-[10px] font-bold text-[var(--theme-muted)]">{label}</span>
      <select className="control h-8 rounded-[6px] text-xs" onChange={(event) => onChange(event.target.value)} value={value}>
        {children}
      </select>
    </label>
  );
}
