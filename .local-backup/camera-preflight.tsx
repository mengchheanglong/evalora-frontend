"use client";

import { CandidateVideoPreview } from "./candidate-video-preview";
import { useCandidateMedia } from "./use-candidate-media";
import { Icon } from "../../components/icons";

type CameraPreflightProps = {
  onContinue: (stream: MediaStream) => void;
  onCancel: () => void;
};

export function CameraPreflight({
  onContinue,
  onCancel,
}: CameraPreflightProps) {
  const media = useCandidateMedia();

  async function handleEnableMedia() {
    try {
      await media.requestMedia();
    } catch {
      // useCandidateMedia exposes the error state.
    }
  }

  function handleContinue() {
    if (!media.stream || media.state !== "ready") {
      return;
    }

    const currentStream = media.handoffMedia();

    if (!currentStream) {
      return;
    }

    onContinue(currentStream);
  }

  function handleCancel() {
    media.stopMedia();
    onCancel();
  }

  const cameraReady =
    media.state === "ready" &&
    Boolean(media.stream);

  const primaryButtonClass =
    "button-primary min-h-12 rounded-lg !bg-[#159ac8] px-5 text-sm font-bold !text-white shadow-[0_8px_18px_rgba(21,154,200,0.22)] hover:!bg-[#0d83b0] hover:shadow-[0_10px_22px_rgba(21,154,200,0.3)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#159ac8] disabled:!bg-[#94a3b8] disabled:!opacity-100";

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f4f7f9] px-4 py-8">
      <section className="w-full max-w-[760px] rounded-[12px] border border-neutral-200 bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)] sm:p-8">
        {/* Header */}
        <div className="flex items-start gap-4">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-[8px] bg-sky-50 text-sky-700">
            <Icon name="message" size={20} />
          </div>

          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-wide text-sky-700">
              Camera setup
            </p>

            <h1 className="mt-1 text-2xl font-black text-neutral-950">
              Check your camera before starting
            </h1>

            <p className="mt-2 text-sm leading-6 text-neutral-600">
              Make sure your camera and microphone are working
              correctly before you continue to the interview.
            </p>
          </div>
        </div>

        {/* Camera preview */}
        <div className="mt-7">
          <CandidateVideoPreview
            stream={media.stream}
            cameraEnabled={cameraReady}
          />
        </div>

        {/* Error */}
        {media.error ? (
          <div className="mt-4 rounded-[8px] border border-red-200 bg-red-50 px-4 py-3">
            <p className="text-sm font-semibold leading-5 text-red-800">
              {media.error}
            </p>
          </div>
        ) : null}

        {/* Camera permission */}
        {media.state === "idle" ||
        media.state === "error" ? (
          <button
            className={`${primaryButtonClass} mt-6 w-full`}
            onClick={() => void handleEnableMedia()}
            type="button"
          >
            <Icon name="message" size={15} />
            Allow camera access
          </button>
        ) : null}

        {/* Loading */}
        {media.state === "requesting" ? (
          <div className="mt-6 flex items-center justify-center gap-3 rounded-[8px] bg-sky-50 px-4 py-4">
            <span className="size-4 animate-spin rounded-full border-2 border-sky-200 border-t-sky-600" />

            <p className="text-sm font-semibold text-sky-800">
              Requesting camera access...
            </p>
          </div>
        ) : null}

        {/* Ready */}
        {media.state === "ready" ? (
          <div className="mt-5 flex items-center gap-2 rounded-[8px] bg-emerald-50 px-4 py-3">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
              <Icon name="check" size={14} />
            </span>

            <div>
              <p className="text-sm font-bold text-emerald-800">
                Camera is ready
              </p>

              <p className="text-xs text-emerald-700">
                Your camera and microphone are ready for the interview.
              </p>
            </div>
          </div>
        ) : null}

        {/* Buttons */}
        <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
          <button
            className="button-secondary min-h-12 rounded-lg px-5 text-sm font-bold"
            onClick={handleCancel}
            type="button"
          >
            Cancel
          </button>

          <button
            className={primaryButtonClass}
            disabled={!cameraReady}
            onClick={handleContinue}
            type="button"
          >
            Continue to interview

            <Icon
              className="-rotate-90"
              name="chevron"
              size={13}
            />
          </button>
        </div>
      </section>
    </main>
  );
}
