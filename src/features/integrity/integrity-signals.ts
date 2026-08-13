import type { IntegrityEventResult, IntegrityEventType } from "@/lib/types";

/**
 * How long nearby browser signals stay merged into ONE reported violation.
 * Switching tabs fires blur + visibilitychange + pagehide almost together; a
 * single debounced report with one clientEventId keeps them from looking like
 * several violations.
 */
export const INTEGRITY_DEBOUNCE_MS = 800;

/**
 * How long the pointer must stay OUTSIDE the assessment window before the exit
 * is treated as a possible violation. Briefly crossing into the browser
 * toolbar, devtools, or a second monitor happens all the time and would be a
 * false positive, so the hook only reports a pointer_exit once this threshold
 * has elapsed with the pointer still outside.
 */
export const POINTER_OUTSIDE_THRESHOLD_MS = 2_000;

/**
 * Browser signals the integrity hook listens for.
 * - `pointer`: the pointer left the window and stayed out past the threshold.
 * - `pointer-return`: the pointer came back — only records timing, never counts.
 */
export type IntegritySignal = "hidden" | "visible" | "blur" | "pagehide" | "beforeunload" | "pointer" | "pointer-return";

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
 * Significance ranking for merging nearby signals into ONE violation.
 * A hidden transition is the strongest signal, blur the weakest; when signals
 * collide the window keeps the strongest type so one physical action never
 * turns into two reported violations.
 */
const SIGNAL_RANK: Record<IntegrityEventType, number> = {
  visibilitychange: 4,
  pagehide: 3,
  // beforeunload never persists as a type (it maps to pagehide), but the
  // union includes it so rank it beside pagehide.
  beforeunload: 3,
  pointer_exit: 2,
  blur: 1,
};

/**
 * Pure merge used by both the hook and unit tests. Multiple nearby signals
 * collapse into ONE detection with a single clientEventId; a real transition
 * to hidden upgrades the whole window to the counted `visibilitychange` type,
 * and a sustained pointer exit to the counted `pointer_exit` type.
 */
export function mergeSignal(
  pending: PendingDetection | null,
  signal: IntegritySignal,
  atMs: number,
): PendingDetection | null {
  const iso = new Date(atMs).toISOString();

  // A page becoming visible or the pointer returning with nothing pending is
  // not a violation — there is nothing to attach the timing to.
  if (!pending && (signal === "visible" || signal === "pointer-return")) return null;

  if (!pending) {
    // A hidden transition is a counted event even when it opens the window;
    // a sustained pointer exit is counted; pagehide/beforeunload are
    // supporting evidence, blur is the lowest signal.
    const type: IntegrityEventType =
      signal === "hidden"
        ? "visibilitychange"
        : signal === "pointer"
          ? "pointer_exit"
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
  // Nearby signals keep the STRONGEST type: a tab switch that upgrades the
  // window to visibilitychange, or a pointer exit that upgrades a blur, still
  // counts as exactly ONE violation with one clientEventId.
  if (signal === "hidden") {
    type = "visibilitychange";
  } else if (signal === "pointer") {
    if (SIGNAL_RANK.pointer_exit > SIGNAL_RANK[type]) type = "pointer_exit";
  }
  if (signal === "visible" && !returnedAt) returnedAt = iso;
  if (signal === "pointer-return" && type === "pointer_exit" && !returnedAt) returnedAt = iso;
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
