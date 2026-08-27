"use client";

import { useBackendHealth } from "@/lib/backend-health";

/**
 * Global "backend unreachable" banner.
 *
 * Rendered inside AppShell above page content, so every workspace page shows
 * it the moment the API stops answering — instead of each request failing
 * individually with a generic error. Deliberately quiet while healthy or
 * still checking: no noise during a normal page load.
 */
export function BackendHealthBanner() {
  const health = useBackendHealth();

  if (health !== "offline") return null;

  return (
    <div
      className="mb-5 flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3"
      role="alert"
    >
      <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-rose-100 text-rose-600">
        <span className="size-2 animate-pulse rounded-full bg-rose-500" />
      </span>
      <div className="min-w-0">
        <p className="text-sm font-bold text-rose-800">Evalora&rsquo;s service is unreachable</p>
        <p className="mt-0.5 text-xs leading-5 text-rose-700">
          The assessment API is not responding right now. Pages may show errors or stale data until it comes back —
          this banner clears automatically once the connection is restored. Your work in progress is saved locally and
          will sync when you retry.
        </p>
      </div>
    </div>
  );
}
