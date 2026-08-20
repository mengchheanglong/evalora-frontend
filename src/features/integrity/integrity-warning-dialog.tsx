"use client";

import Link from "next/link";
import { Icon } from "@/components/icons";
import type { AssessmentIntegrity } from "./use-assessment-integrity";

/**
 * Candidate-facing integrity dialog.
 *
 * It is rendered ONLY from the backend's official response: the warning count,
 * limit, and status are the values the server returned, and the reason is the
 * server-authored copy of what was detected. Nothing here is stored locally,
 * and the wording never claims cheating was proven.
 */
export function IntegrityWarningDialog({ integrity }: { integrity: AssessmentIntegrity }) {
  if (!integrity.showWarning && !integrity.terminated) return null;

  const terminated = integrity.terminated;
  const reason = integrity.reason || "Possible tab switching detected.";
  // The wording explains exactly what was detected without ever claiming
  // cheating was proven. Keyed off the server-authored event type/reason.
  const isPointerExit = integrity.latestEvent?.type === "pointer_exit" || /pointer/i.test(reason);

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/70 px-5 backdrop-blur-sm">
      <div
        aria-live="assertive"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="integrity-dialog-title"
        className={`w-full max-w-[480px] rounded-xl bg-white p-8 text-center shadow-2xl ${
          terminated ? "" : "animate-[fadeIn_150ms_ease-out]"
        }`}
      >
        <span
          className={`mx-auto flex size-12 items-center justify-center rounded-full ${
            terminated ? "bg-red-100 text-red-600" : "bg-amber-100 text-amber-700"
          }`}
        >
          <Icon name="shield" size={24} />
        </span>

        <h2
          id="integrity-dialog-title"
          className="mt-5 text-xl font-black leading-7 text-neutral-950"
        >
          {terminated ? "Interview ended" : `Warning ${integrity.warningCount} of ${integrity.warningLimit}`}
        </h2>

        <p className="mt-4 text-sm font-bold leading-6 text-neutral-800">{reason}</p>

        {terminated ? (
          <p className="mt-4 text-sm leading-6 text-neutral-600">
            The integrity violation limit has been reached. Please contact the
            recruiter if you believe this is a mistake.
          </p>
        ) : isPointerExit ? (
          <p className="mt-4 text-sm leading-6 text-neutral-600">
            We detected that your mouse pointer left the assessment window.
            Keep your pointer inside the assessment screen during the
            interview. If this happens again, the interview will end.
          </p>
        ) : (
          <p className="mt-4 text-sm leading-6 text-neutral-600">
            Possible tab switching or leaving the assessment screen was
            detected. You can continue the interview, but if this happens
            again, the interview will end.
          </p>
        )}

        <div className="mt-5 rounded-lg bg-neutral-50 px-4 py-3 text-xs leading-5 text-neutral-600">
          <p className="font-bold text-neutral-700">
            Official warning {integrity.warningCount} of {integrity.warningLimit}
          </p>
        </div>

        <p className="mt-5 text-xs leading-5 text-neutral-500">
          {isPointerExit
            ? "Your mouse pointer left the assessment window. The review team can see this event in the session record. If you believe this was a mistake, let your interviewer know."
            : "Possible tab switching or leaving the assessment screen was detected. The review team can see this event in the session record. If you believe this was a mistake, let your interviewer know."}
        </p>

        {terminated ? (
          <Link href="/" className="button-secondary mt-7">
            Return to Evalora
          </Link>
        ) : (
          <button
            type="button"
            onClick={integrity.dismiss}
            className="button-primary mt-7"
          >
            Continue assessment
          </button>
        )}
      </div>
    </div>
  );
}
