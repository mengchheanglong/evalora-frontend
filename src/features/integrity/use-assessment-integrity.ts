"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { reportIntegrityEvent } from "@/lib/api";
import type { IntegrityEvent, IntegrityEventResult, SessionStatus } from "@/lib/types";
import {
  INTEGRITY_DEBOUNCE_MS,
  mergeSignal,
  type IntegritySignal,
  type PendingDetection,
} from "./integrity-signals";

/** Everything the page and the warning dialog need from integrity monitoring. */
export interface IntegrityState {
  /** Official backend counters — never incremented locally. */
  warningCount: number;
  warningLimit: number;
  /** Last status the backend reported. */
  status: SessionStatus | "unknown";
  /** Server-authored copy of what was detected. */
  reason: string;
  /** True once the backend counted an event (assessment ended at limit 1). */
  terminated: boolean;
  /** True while the warning/forced-exit dialog should be visible. */
  showDialog: boolean;
  /** The counted event that triggered the dialog. */
  latestEvent?: IntegrityEvent;
}

type Options = {
  /** Private candidate access code. */
  accessCode: string;
  /** Only monitor while the assessment is running and before completion. */
  active: boolean;
};

/**
 * Candidate-side integrity monitoring.
 *
 * The backend is the only source of truth: this hook reports raw browser
 * signals and then follows the official `warningCount` / `status` the backend
 * returns. It never stores or increments a local warning count, so refreshing
 * the page can never reset enforcement.
 */
export function useAssessmentIntegrity({ accessCode, active }: Options) {
  const [state, setState] = useState<IntegrityState>({
    warningCount: 0,
    warningLimit: 1,
    status: "unknown",
    reason: "",
    terminated: false,
    showDialog: false,
  });

  const pendingRef = useRef<PendingDetection | null>(null);
  const timerRef = useRef<number | null>(null);
  const inFlightRef = useRef<Promise<void>>(Promise.resolve());
  const accessCodeRef = useRef(accessCode);
  accessCodeRef.current = accessCode;
  const activeRef = useRef(active);
  activeRef.current = active;
  // Once the backend counts an event the dialog must stay up, even if a later
  // duplicate response (counted: false) arrives.
  const countedRef = useRef(false);

  const applyResult = useCallback((result: IntegrityEventResult) => {
    setState((current) => ({
      ...current,
      warningCount: result.warningCount,
      warningLimit: result.warningLimit,
      status: result.status,
      reason: result.reason,
    }));

    if (result.counted && !countedRef.current) {
      countedRef.current = true;
      setState((current) => ({
        ...current,
        terminated: result.status !== "in_progress" || result.warningCount >= result.warningLimit,
        showDialog: true,
        latestEvent: result.event,
      }));
    }
  }, []);

  const sendDetection = useCallback(
    async (detection: PendingDetection) => {
      if (!activeRef.current) return;
      try {
        const result = await reportIntegrityEvent(accessCodeRef.current, {
          clientEventId: detection.clientEventId,
          type: detection.type,
          detectedAt: detection.detectedAt,
          returnedAt: detection.returnedAt,
          durationMs: detection.durationMs,
        });
        applyResult(result);
      } catch {
        // The backend decides. A rejected report (session already ended) is
        // never converted into a local warning here.
      }
    },
    [applyResult],
  );

  /** Best-effort delivery for tab close / navigation where fetch would die. */
  const beaconDetection = useCallback((detection: PendingDetection) => {
    if (typeof navigator === "undefined" || typeof navigator.sendBeacon !== "function") return;
    const url = `${window.location.origin}/api/backend/sessions/access/${encodeURIComponent(accessCodeRef.current)}/integrity-events`;
    const body = new Blob(
      [
        JSON.stringify({
          clientEventId: detection.clientEventId,
          type: detection.type,
          detectedAt: detection.detectedAt,
          returnedAt: detection.returnedAt,
          durationMs: detection.durationMs,
        }),
      ],
      { type: "application/json" },
    );
    navigator.sendBeacon(url, body);
  }, []);

  /** Flushes the pending detection through the one-in-flight request chain. */
  const flush = useCallback(() => {
    const detection = pendingRef.current;
    pendingRef.current = null;
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (!detection) return;
    const previous = inFlightRef.current;
    const next = previous.then(() => sendDetection(detection)).catch(() => undefined);
    inFlightRef.current = next;
  }, [sendDetection]);

  const queueSignal = useCallback(
    (signal: IntegritySignal, atMs = Date.now()) => {
      pendingRef.current = mergeSignal(pendingRef.current, signal, atMs);
      if (!pendingRef.current) return;
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(() => flush(), INTEGRITY_DEBOUNCE_MS);
    },
    [flush],
  );

  useEffect(() => {
    if (!active) return;
    let disposed = false;

    const onVisibilityChange = () => {
      if (disposed) return;
      if (document.visibilityState === "hidden") queueSignal("hidden");
      else queueSignal("visible");
    };

    const onBlur = () => {
      if (!disposed) queueSignal("blur");
    };

    // Tab close / navigate: the debounce timer may never fire, so hand the
    // pending detection (which already holds the counted visibilitychange) to
    // sendBeacon before the page goes away.
    const onPageExit = (signal: "pagehide" | "beforeunload") => {
      if (disposed) return;
      queueSignal(signal);
      const detection = pendingRef.current;
      pendingRef.current = null;
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      if (detection) beaconDetection(detection);
    };

    const onPagehide = () => onPageExit("pagehide");
    const onBeforeunload = () => onPageExit("beforeunload");

    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("blur", onBlur);
    document.addEventListener("pagehide", onPagehide);
    window.addEventListener("beforeunload", onBeforeunload);

    return () => {
      disposed = true;
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
      timerRef.current = null;
      pendingRef.current = null;
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("blur", onBlur);
      document.removeEventListener("pagehide", onPagehide);
      window.removeEventListener("beforeunload", onBeforeunload);
    };
  }, [active, beaconDetection, queueSignal]);

  const dismiss = useCallback(() => {
    // A forced-exit (terminated) dialog is intentionally not dismissable.
    setState((current) => (current.terminated ? current : { ...current, showDialog: false }));
  }, []);

  return { ...state, dismiss };
}

export type AssessmentIntegrity = ReturnType<typeof useAssessmentIntegrity>;
