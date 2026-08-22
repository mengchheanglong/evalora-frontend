"use client";

import { useEffect, useState } from "react";

export type BackendHealth = "checking" | "online" | "offline";

const POLL_INTERVAL_MS = 15_000;

/**
 * Lightweight backend reachability probe.
 *
 * Polls the Nest health endpoint through the same-origin proxy — exactly the
 * path real data requests take — so "offline" here means the same thing it
 * means for apiRequest(). Used by the global health banner and the dashboard's
 * offline state; never blocks or retries aggressively, because this is
 * informational, not load-bearing.
 */
export function useBackendHealth(): BackendHealth {
  const [health, setHealth] = useState<BackendHealth>("checking");

  useEffect(() => {
    let cancelled = false;
    let timer: number | null = null;

    async function probe() {
      try {
        const response = await fetch("/api/backend/health", {
          cache: "no-store",
          // A hung backend should read as offline quickly, not after the
          // browser's default timeout.
          signal: AbortSignal.timeout(5_000),
        });
        if (!cancelled) setHealth(response.ok ? "online" : "offline");
      } catch {
        if (!cancelled) setHealth("offline");
      }
      if (!cancelled) timer = window.setTimeout(probe, POLL_INTERVAL_MS);
    }

    void probe();
    return () => {
      cancelled = true;
      if (timer !== null) window.clearTimeout(timer);
    };
  }, []);

  return health;
}
