import type { ReactNode } from "react";
import { Icon, type IconName } from "@/components/icons";

type OverviewCardProps = {
  label: string;
  value: ReactNode;
  detail: string;
  icon: IconName;
  accent: string;
  tone: string;
  progress?: number | null;
  status?: string;
  emphasis?: "default" | "attention" | "quiet";
};

export function OverviewCard({
  label,
  value,
  detail,
  icon,
  accent,
  tone,
  progress,
  status,
  emphasis = "default",
}: OverviewCardProps) {
  const safeProgress = typeof progress === "number" && Number.isFinite(progress)
    ? Math.max(0, Math.min(100, progress))
    : null;

  return (
    <article
      className={`rounded-[10px] border p-4 ${
        emphasis === "attention"
          ? "border-amber-300 bg-amber-50/50 shadow-[0_10px_28px_rgba(245,158,11,0.09)]"
          : emphasis === "quiet"
            ? "border-[var(--theme-border)] bg-[var(--theme-panel-tint)] shadow-none"
            : "border-[var(--theme-border)] bg-[var(--theme-panel)] shadow-[var(--theme-shadow)]"
      }`}
    >
      <div className="flex items-start gap-3">
        <span
          className={`flex size-9 shrink-0 items-center justify-center rounded-[8px] border ${tone}`}
          style={{
            backgroundColor: `color-mix(in srgb, ${accent} 12%, transparent)`,
            borderColor: `color-mix(in srgb, ${accent} 35%, transparent)`,
          }}
        >
          <Icon name={icon} size={17} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="text-[11px] font-bold leading-4 text-[var(--theme-text)]">{label}</p>
            {status ? (
              <span className="rounded-full bg-[var(--theme-panel-soft)] px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-[var(--theme-muted)]">
                {status}
              </span>
            ) : null}
          </div>
          <p className="mt-1 text-[24px] font-extrabold leading-none text-[var(--theme-heading)]">{value}</p>
          <p className="mt-1.5 text-[10px] font-medium leading-4 text-[var(--theme-muted)]">{detail}</p>
        </div>
      </div>
      {safeProgress !== null ? (
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[var(--theme-panel-soft)]" aria-hidden="true">
          <div className="h-full rounded-full" style={{ width: `${safeProgress}%`, backgroundColor: accent }} />
        </div>
      ) : null}
    </article>
  );
}
