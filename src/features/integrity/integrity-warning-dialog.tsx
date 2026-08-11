"use client";

import Link from "next/link";
import { Icon } from "@/components/icons";
import type { AssessmentIntegrity } from "./use-assessment-integrity";

function formatTime(value?: string): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en", { timeStyle: "short" }).format(date);
}

/**
 * Candidate-facing integrity dialog.
 *
 * It is rendered ONLY from the backend's official response: the warning count,
 * limit, and status are the values the server returned, and the reason is the
 * server-authored copy of what was detected. Nothing here is stored locally,
 * and the wording never claims cheating was proven.
 */
export function IntegrityWarningDialog({ integrity }: { integrity: AssessmentIntegrity }) {
  if (!integrity.showDialog) return null;

  const terminated = integrity.terminated;
  const reason = integrity.reason || "Possible tab switching detected.";
  const detectedAt = formatTime(integrity.latestEvent?.detectedAt);

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
          {terminated ? "Assessment ended" : "Integrity warning"}
        </h2>

        <p className="mt-4 text-sm font-bold leading-6 text-neutral-800">
          {reason}
          {detectedAt ? (
            <span className="ml-1.5 font-semibold text-neutral-400">({detectedAt})</span>
          ) : null}
        </p>

        <div className="mt-5 rounded-lg bg-neutral-50 px-4 py-3 text-xs leading-5 text-neutral-600">
          <p className="font-bold text-neutral-700">
            Official warning {integrity.warningCount} of {integrity.warningLimit}
          </p>

          <p className="mt-1.5">
            {terminated
              ? "Your assessment was ended and your saved responses have been preserved for the review team."
              : "Your saved responses remain available. Continue when you are ready."}
          </p>
        </div>

        <p className="mt-5 text-xs leading-5 text-neutral-500">
          A possible tab switch was detected on this device. The review team can
          see this event in the session record. If you believe this was a
          mistake, let your interviewer know.
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
