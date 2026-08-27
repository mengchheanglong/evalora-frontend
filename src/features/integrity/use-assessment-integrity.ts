"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { reportIntegrityEvent } from "@/lib/api";
import type { IntegrityEvent, IntegrityEventResult, SessionStatus } from "@/lib/types";
import {
  INTEGRITY_DEBOUNCE_MS,
  POINTER_OUTSIDE_THRESHOLD_MS,
  interpretIntegrityResult,
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
  sessionStatus: SessionStatus | "unknown";
  /** Server-authored copy of what was detected. */
  reason: string;
  /**
   * First-strike warning (warningCount = 1, session still active): the dialog
   * is dismissable and the candidate may continue.
   */
  showWarning: boolean;
  /**
   * Second-strike forced exit (warningCount = 2 or session ended): the dialog
   * blocks the assessment and cannot be dismissed.
   */
  terminated: boolean;
  /** The counted event that triggered the dialog. */
  latestEvent?: IntegrityEvent;
}

type Options = {
  /** Private candidate access code. */
  accessCode: string;
  /** Only monitor while the assessment is running and before completion. */
  active: boolean;
  /** Interviewer-controlled toggle for pointer-exit detection. */
  pointerDetectionEnabled?: boolean;
};

/**
 * Candidate-side integrity monitoring.
 *
 * The backend is the only source of truth: this hook reports raw browser
 * signals and then follows the official `warningCount` / `status` the backend
 * returns. It never stores or increments a local warning count, so refreshing
 * the page can never reset enforcement.
 */
export function useAssessmentIntegrity({ accessCode, active, pointerDetectionEnabled = true }: Options) {
  const [state, setState] = useState<IntegrityState>({
    warningCount: 0,
    warningLimit: 2,
    sessionStatus: "unknown",
    reason: "",
    showWarning: false,
    terminated: false,
  });
  /** Set when reports cannot reach the backend (offline/mock) so the UI can say monitoring is degraded. */
  const [deliveryFailed, setDeliveryFailed] = useState(false);

  const pendingRef = useRef<PendingDetection | null>(null);
  const timerRef = useRef<number | null>(null);
  const inFlightRef = useRef<Promise<void>>(Promise.resolve());
  /** When the pointer left the window; null while it is inside. */
  const pointerOutAtRef = useRef<number | null>(null);
  /** Timer that turns a sustained pointer exit into a counted signal. */
  const pointerTimerRef = useRef<number | null>(null);
  const accessCodeRef = useRef(accessCode);
  accessCodeRef.current = accessCode;
  const activeRef = useRef(active);
  activeRef.current = active;
  // Once the backend terminates the session the forced-exit dialog must stay
  // up, even if a later duplicate response (counted: false) arrives.
  const terminatedRef = useRef(false);

  const applyResult = useCallback((result: IntegrityEventResult) => {
    const outcome = interpretIntegrityResult(result);

    setState((current) => ({
      ...current,
      warningCount: result.warningCount,
      warningLimit: result.warningLimit,
      sessionStatus: result.sessionStatus,
      reason: result.reason,
    }));

    // First strike: warn, keep the session active, let the candidate continue.
    if (outcome === "warning" && !terminatedRef.current) {
      setState((current) => ({
        ...current,
        showWarning: true,
        latestEvent: result.event,
      }));
    }

    // Second strike: the backend ended the session — block the assessment.
    if (outcome === "terminated" && !terminatedRef.current) {
      terminatedRef.current = true;
      setState((current) => ({
        ...current,
        showWarning: false,
        terminated: true,
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
        setDeliveryFailed(false);
        applyResult(result);
      } catch {
        // The backend decides. A rejected report (session already ended) is
        // never converted into a local warning here, but a delivery failure
        // must not be fully invisible: the UI shows monitoring as degraded.
        setDeliveryFailed(true);
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

    // ----------------------------------------------------------------
    // Pointer-exit detection. The pointer must STAY outside the window past
    // the threshold before it becomes a counted pointer_exit signal, so a
    // brief trip to the browser toolbar or a second monitor is not a strike.
    // ----------------------------------------------------------------
    const onPointerLeave = () => {
      if (disposed || pointerOutAtRef.current !== null) return;
      pointerOutAtRef.current = Date.now();
      pointerTimerRef.current = window.setTimeout(() => {
        pointerTimerRef.current = null;
        const outAt = pointerOutAtRef.current;
        if (disposed || outAt === null) return;
        // Still outside after the threshold: this is the counted violation.
        queueSignal("pointer", outAt);
      }, POINTER_OUTSIDE_THRESHOLD_MS);
    };

    // mouseout with no relatedTarget means the pointer moved to something
    // outside the document (browser chrome, devtools, another window).
    const onPointerOut = (event: MouseEvent) => {
      if (disposed || event.relatedTarget !== null) return;
      onPointerLeave();
    };

    const onPointerReturn = () => {
      if (pointerTimerRef.current !== null) {
        window.clearTimeout(pointerTimerRef.current);
        pointerTimerRef.current = null;
      }
      if (pointerOutAtRef.current !== null) {
        pointerOutAtRef.current = null;
        // Only records timing if a pointer_exit violation is already pending;
        // a quick return before the threshold is a no-op.
        queueSignal("pointer-return", Date.now());
      }
    };

    const onPointerOver = (event: MouseEvent) => {
      if (disposed || event.relatedTarget !== null) return;
      onPointerReturn();
    };

    const onPagehide = () => onPageExit("pagehide");
    const onBeforeunload = () => onPageExit("beforeunload");

    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("blur", onBlur);
    document.addEventListener("pagehide", onPagehide);
    window.addEventListener("beforeunload", onBeforeunload);

    // ----------------------------------------------------------------
    // Pointer-exit listeners: only active when the interviewer toggle is ON.
    // When paused, any pending outside-timer is cancelled immediately.
    // ----------------------------------------------------------------
    let pointerActive = pointerDetectionEnabled;
    const attachPointer = () => {
      if (!pointerActive) return;
      document.documentElement.addEventListener("mouseleave", onPointerLeave);
      document.addEventListener("mouseout", onPointerOut);
      document.documentElement.addEventListener("mouseenter", onPointerReturn);
      document.addEventListener("mouseover", onPointerOver);
    };
    const detachPointer = (cancelPending = true) => {
      document.documentElement.removeEventListener("mouseleave", onPointerLeave);
      document.removeEventListener("mouseout", onPointerOut);
      document.documentElement.removeEventListener("mouseenter", onPointerReturn);
      document.removeEventListener("mouseover", onPointerOver);
      if (cancelPending && pointerTimerRef.current !== null) {
        window.clearTimeout(pointerTimerRef.current);
        pointerTimerRef.current = null;
      }
      if (cancelPending) pointerOutAtRef.current = null;
    };
    attachPointer();

    return () => {
      disposed = true;
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
      timerRef.current = null;
      if (pointerTimerRef.current !== null) window.clearTimeout(pointerTimerRef.current);
      pointerTimerRef.current = null;
      pointerOutAtRef.current = null;
      pendingRef.current = null;
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("blur", onBlur);
      document.removeEventListener("pagehide", onPagehide);
      window.removeEventListener("beforeunload", onBeforeunload);
      detachPointer(false);
    };
  }, [active, pointerDetectionEnabled, beaconDetection, queueSignal]);

  // When the interviewer pauses pointer detection at runtime, cancel any
  // pending outside-timer and clear the out-at state so the hook is clean
  // before the next pointer re-entry.
  useEffect(() => {
    if (pointerDetectionEnabled) return;
    if (pointerTimerRef.current !== null) {
      window.clearTimeout(pointerTimerRef.current);
      pointerTimerRef.current = null;
    }
    pointerOutAtRef.current = null;
  }, [pointerDetectionEnabled]);

  const dismiss = useCallback(() => {
    // Only the first-strike warning is dismissable; the forced exit is not.
    setState((current) => (current.terminated ? current : { ...current, showWarning: false }));
  }, []);

  return { ...state, deliveryFailed, dismiss };
}

export type AssessmentIntegrity = ReturnType<typeof useAssessmentIntegrity>;
