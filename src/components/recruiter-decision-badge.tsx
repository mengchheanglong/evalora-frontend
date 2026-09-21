import type { RecruiterVerdict } from "@/lib/types";

type VerdictMeta = { label: string; bg: string; text: string; ring?: string };

const VERDICT_STYLES: Record<string, VerdictMeta> = {
  APPROVE: { label: "APPROVE", bg: "bg-emerald-50", text: "text-emerald-700" },
  REJECT: { label: "REJECT", bg: "bg-rose-50", text: "text-rose-700" },
  PENDING: { label: "PENDING", bg: "bg-amber-50", text: "text-amber-700" },
};

function verdictMeta(verdict?: RecruiterVerdict): VerdictMeta {
  if (verdict === "HIRE" || verdict === "STRONG_HIRE") return VERDICT_STYLES.APPROVE;
  if (verdict === "NO_HIRE") return VERDICT_STYLES.REJECT;
  if (verdict === "NEUTRAL") return VERDICT_STYLES.PENDING;
  return { label: "PENDING REVIEW", bg: "bg-neutral-100", text: "text-neutral-500" };
}

/**
 * Compact badge for table rows and card layouts.
 * Shows uppercase verdict text: APPROVE, REJECT, PENDING, or PENDING REVIEW.
 */
export function RecruiterDecisionBadge({
  verdict,
  className = "",
}: {
  verdict?: RecruiterVerdict;
  className?: string;
}) {
  const meta = verdictMeta(verdict);
  return (
    <span
      className={`inline-flex items-center rounded-[5px] px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide ${meta.bg} ${meta.text} ${className}`}
    >
      {meta.label}
    </span>
  );
}

/**
 * Hero badge for the report detail page. Includes a "Decision" label above
 * the badge and uses a ring indicator for decided states.
 */
export function RecruiterDecisionHeroBadge({
  verdict,
  className = "",
}: {
  verdict?: RecruiterVerdict;
  className?: string;
}) {
  const meta = verdictMeta(verdict);
  const hasRing = !!verdict;
  return (
    <div className={`text-center ${className}`}>
      <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--theme-faint)]">
        Decision
      </p>
      <span
        className={`mt-1.5 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold uppercase ring-1 ${
          hasRing
            ? `${meta.bg} ${meta.text} ring-current/20`
            : "bg-[var(--theme-panel-soft)] text-[var(--theme-muted)] ring-[var(--theme-border)]"
        }`}
      >
        <span className={`size-2 rounded-full ${meta.bg.replace("bg-", "bg-")}`} />
        {meta.label}
      </span>
    </div>
  );
}
