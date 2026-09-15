"use client";

import { useEffect, useState } from "react";
import { fetchCurrentSubscription, subscriptionLoading, type SubscriptionState } from "@/lib/current-subscription";

/**
 * `reloadKey` lets a caller force a refetch of the same workspace — the billing
 * page uses it right after the backend verifies a payment, so the newly active
 * period is displayed without a full page navigation.
 */
export function useCurrentSubscription(userId?: string, organizationId?: string, authenticated = false, reloadKey = 0) {
  const scope = authenticated && userId ? JSON.stringify([userId, organizationId ?? null, reloadKey]) : null;
  const [result, setResult] = useState<{ scope: string; state: SubscriptionState } | null>(null);

  useEffect(() => {
    if (!scope) {
      setResult(null);
      return;
    }
    const controller = new AbortController();
    setResult({ scope, state: subscriptionLoading });
    void fetchCurrentSubscription(controller.signal).then(
      (subscription) => {
        if (!controller.signal.aborted) setResult({ scope, state: { status: "ready", subscription } });
      },
      () => {
        if (!controller.signal.aborted) setResult({ scope, state: { status: "error" } });
      },
    );
    return () => controller.abort();
  }, [scope]);

  // Do not render another user's/workspace's plan before the effect runs.
  return scope && result?.scope === scope ? result.state : subscriptionLoading;
}
