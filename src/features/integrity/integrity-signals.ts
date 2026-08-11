import type { IntegrityEventResult, IntegrityEventType } from "@/lib/types";

/**
 * How long nearby browser signals stay merged into ONE reported violation.
 * Switching tabs fires blur + visibilitychange + pagehide almost together; a
 * single debounced report with one clientEventId keeps them from looking like
 * several violations.
 */
export const INTEGRITY_DEBOUNCE_MS = 800;

/** Browser signals the integrity hook listens for. */
export type IntegritySignal = "hidden" | "visible" | "blur" | "pagehide" | "beforeunload";

/** A debounced violation waiting to be reported. */
export interface PendingDetection {
  /** Unique id generated once per merged violation; retries never duplicate it. */
  clientEventId: string;
  type: IntegrityEventType;
  detectedAt: string;
  returnedAt?: string;
  durationMs?: number;
  firstSeenAt: number;
}

export function createClientEventId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  // Non-secure contexts (plain http demos) may not expose crypto.randomUUID.
  return `evt-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

/**
 * Pure merge used by both the hook and unit tests. Multiple nearby signals
 * collapse into ONE detection with a single clientEventId; a real transition
 * to hidden upgrades the whole window to the counted `visibilitychange` type.
 */
export function mergeSignal(
  pending: PendingDetection | null,
  signal: IntegritySignal,
  atMs: number,
): PendingDetection | null {
  const iso = new Date(atMs).toISOString();

  // A page becoming visible with no prior signal is not a violation.
  if (!pending && signal === "visible") return null;

  if (!pending) {
    // A hidden transition is a counted event even when it opens the window;
    // pagehide/beforeunload are supporting evidence, blur is the lowest signal.
    const type: IntegrityEventType =
      signal === "hidden"
        ? "visibilitychange"
        : signal === "pagehide" || signal === "beforeunload"
          ? "pagehide"
          : "blur";
    return {
      clientEventId: createClientEventId(),
      type,
      detectedAt: iso,
      returnedAt: signal === "visible" ? iso : undefined,
      firstSeenAt: atMs,
    };
  }

  let type = pending.type;
  let returnedAt = pending.returnedAt;
  // A real transition to hidden is the only COUNTED signal; it upgrades the
  // whole window, so blur-only noise never ends the assessment by itself.
  if (signal === "hidden") type = "visibilitychange";
  if (signal === "visible" && !returnedAt) returnedAt = iso;
  const durationMs =
    returnedAt !== undefined
      ? Math.max(0, new Date(returnedAt).getTime() - new Date(pending.detectedAt).getTime())
      : pending.durationMs;

  return { ...pending, type, returnedAt, durationMs };
}

/** How the candidate UI must react to an official backend decision. */
export type IntegrityOutcome = "warning" | "terminated" | "none";

/**
 * Maps the backend's official response to the UI stage.
 *
 * The backend decides enforcement; this only translates it:
 * - a counted event with the session still active is the FIRST warning;
 * - a counted event that reached the limit (or ended the session) is the
 *   forced-exit state;
 * - anything else (supporting signal, duplicate) changes nothing.
 */
export function interpretIntegrityResult(result: IntegrityEventResult): IntegrityOutcome {
  if (!result.counted) return "none";
  if (result.action === "terminated") return "terminated";
  if (result.sessionStatus !== "in_progress") return "terminated";
  if (result.warningCount >= result.warningLimit) return "terminated";
  return "warning";
}
