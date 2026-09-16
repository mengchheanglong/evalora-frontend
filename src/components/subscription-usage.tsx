"use client";

import { useEffect, useState } from "react";
import { apiGet } from "@/lib/api";
import { formatPeriodDate, hasEnded, type CurrentSubscription } from "@/lib/current-subscription";

type Usage = { sessionsUsed: number; sessionLimit: number | null; periodStart: string; periodEnd: string };

export function SubscriptionUsage({ subscription }: { subscription: CurrentSubscription }) {
  const [usage, setUsage] = useState<Usage | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    void apiGet<Usage>("/subscriptions/usage", { signal: controller.signal }).then((value) => {
      if (!controller.signal.aborted) { setUsage(value); setFailed(false); }
    }).catch(() => { if (!controller.signal.aborted) setFailed(true); });
    return () => controller.abort();
  }, [subscription]);
  const ended = hasEnded(subscription);
  const label = ended ? "Paid period ended" : subscription.cancelAtPeriodEnd ? "Access ends" : "Renew by";
  return (
    <div className="space-y-3 text-xs text-[var(--theme-muted)]" aria-live="polite">
      <div className="flex flex-wrap justify-between gap-2"><span>{label}</span><strong className="text-[var(--theme-heading)]">{formatPeriodDate(subscription.currentPeriodEnd)}</strong></div>
      <p>{ended ? "Renew your plan to continue paid access." : "Manual renewal · no automatic charge"}</p>
      <div className="border-t border-[var(--theme-border)] pt-3">
        <div className="flex flex-wrap justify-between gap-2"><span>Interviews started this month</span><strong className="text-[var(--theme-heading)]">{failed ? "Usage unavailable" : !usage ? "Loading…" : `${usage.sessionsUsed} / ${usage.sessionLimit ?? "Unlimited"}`}</strong></div>
        {usage && !failed && <>
          {usage.sessionLimit !== null && usage.sessionLimit > 0 && <progress aria-label="Monthly started interview sessions used" className="mt-2 h-1.5 w-full accent-blue-500" max={usage.sessionLimit} value={Math.min(usage.sessionsUsed, usage.sessionLimit)} />}
          <p className="mt-2">Usage resets {formatPeriodDate(usage.periodEnd)} (UTC)</p>
        </>}
      </div>
    </div>
  );
}
