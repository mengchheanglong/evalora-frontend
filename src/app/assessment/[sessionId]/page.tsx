"use client";

import Link from "next/link";
import {
  ConnectionQuality,
  Room,
  RoomEvent,
  Track,
  VideoQuality,
  type LocalTrackPublication,
  type LocalVideoTrack,
  type Participant,
  type RemoteAudioTrack,
  type RemoteTrack,
  type TrackPublication,
} from "livekit-client";
import { useParams } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  CandidateInterviewerInbox,
  CandidateInterviewerQuestions,
  useInterviewerFollowUps,
} from "@/components/candidate-interviewer-questions";

import { ConnectionPill } from "@/components/realtime-indicators";
import type { ConnectionState } from "@/lib/realtime";

import { CandidateCodingAssessment } from "@/components/candidate-coding-assessment";
import { CameraPreflight } from "@/features/live-video/camera-preflight";
import { FloatingCandidateCamera } from "@/features/live-video/candidate-mini-camera";
import {
  createCandidateCaptionController,
  type CaptionController,
} from "@/features/live-video/live-captions";
import { useAssessmentIntegrity } from "@/features/integrity/use-assessment-integrity";
import { IntegrityWarningDialog } from "@/features/integrity/integrity-warning-dialog";
import { Icon, type IconName } from "@/components/icons";
import { useAiStream } from "@/components/use-ai-stream";
import { EvaloraLogo } from "@/components/logo";

import {
  ApiError,
  apiGet,
  apiPost,
  apiPut,
  getErrorMessage,
} from "@/lib/api";

import { decideInterviewerResume } from "@/lib/candidate-interview-navigation";

import type {
  AssessmentModule,
  CandidateAccessSession,
  CandidateCodeSubmission,
  CandidateResponse,
  InterviewerFollowUp,
  JsonValue,
  Question,
} from "@/lib/types";

import {
  parseSavedResponse,
  readStructuredFollowUp,
  withStructuredFollowUp,
} from "@/lib/candidate-response-storage";

/* ============================================================
   TYPES
   ============================================================ */

type View =
  | "loading"
  | "welcome"
  | "camera"
  | "assessment"
  | "review"
  | "interviewer"
  | "complete"
  | "error";

type SaveState = "saved" | "saving" | "error";

type MediaConnectionQuality = "excellent" | "good" | "poor" | "lost";

function mediaConnectionQuality(quality: ConnectionQuality): MediaConnectionQuality {
  return quality === ConnectionQuality.Excellent
    ? "excellent"
    : quality === ConnectionQuality.Good
      ? "good"
      : quality === ConnectionQuality.Poor
        ? "poor"
        : "lost";
}

type Answer = {
  text: string;
  json?: JsonValue;
};

type FollowUp = {
  question: string;
  answer: string;
};

type AiStream = ReturnType<typeof useAiStream>;

/* ============================================================
   CONNECTION STATUS
   ============================================================ */

function FloatingConnectionStatus({
  state,
  latencyMs,
  visible,
}: {
  state: ConnectionState;
  latencyMs?: number | null;
  visible: boolean;
}) {
  return (
    <div
      aria-live="polite"
      aria-atomic="true"
      role="status"
      className={`pointer-events-none fixed right-4 top-20 z-30 transition-all ${
        visible
          ? "translate-y-0 opacity-100"
          : "-translate-y-2 opacity-0"
      }`}
    >
      <span className="inline-flex rounded-full border border-neutral-200 bg-white/95 p-1 shadow-sm backdrop-blur">
        <ConnectionPill
          state={state}
          latencyMs={latencyMs}
          showLatency={false}
        />
      </span>
    </div>
  );
}

/* ============================================================
   MAIN PAGE
   ============================================================ */

export default function CandidateAssessmentPage() {
  const params = useParams<{ sessionId: string }>();

  const accessCode = decodeURIComponent(
    params.sessionId,
  );

  /* ----------------------------------------------------------
     SESSION
     ---------------------------------------------------------- */

  const [session, setSession] =
    useState<CandidateAccessSession | null>(null);

  const [view, setView] =
    useState<View>("loading");

  const [pageError, setPageError] =
    useState("");

  const [actionError, setActionError] =
    useState("");

  /* ----------------------------------------------------------
     ANSWERS
     ---------------------------------------------------------- */

  const [answers, setAnswers] =
    useState<Record<string, Answer>>({});

  const [followUps, setFollowUps] =
    useState<Record<string, FollowUp>>({});

  /* ----------------------------------------------------------
     MODULE / QUESTION
     ---------------------------------------------------------- */

  const [activeModuleIndex, setActiveModuleIndex] =
    useState(0);

  const [activeQuestionIndex, setActiveQuestionIndex] =
    useState(0);

  const [briefingModuleId, setBriefingModuleId] =
    useState("");

  const [adaptiveQuestions, setAdaptiveQuestions] =
    useState<Question[] | null>(null);

  const [codingComplete, setCodingComplete] =
    useState(false);

  /* ----------------------------------------------------------
     CAMERA
     ---------------------------------------------------------- */

  const [candidateCameraStream, setCandidateCameraStream] =
    useState<MediaStream | null>(null);

  const candidateCameraStreamRef =
    useRef<MediaStream | null>(null);

  const candidateMicrophonePublicationRef =
    useRef<LocalTrackPublication | null>(null);

  const [candidateMicrophoneMuted, setCandidateMicrophoneMuted] =
    useState(false);

  const [candidateScreenShareState, setCandidateScreenShareState] =
    useState<"idle" | "starting" | "sharing">("idle");

  const [candidateConnectionQuality, setCandidateConnectionQuality] =
    useState<MediaConnectionQuality>("lost");

  const [candidateMediaConnection, setCandidateMediaConnection] =
    useState<"connecting" | "connected" | "reconnecting" | "offline">("connecting");
  const [interviewerMicrophoneState, setInterviewerMicrophoneState] =
    useState<"waiting" | "live" | "muted" | "offline">("waiting");

  const candidateLiveKitRoomRef = useRef<Room | null>(null);
  const candidateCaptionControllerRef = useRef<CaptionController | null>(null);
  const [candidateLowBandwidthOverride, setCandidateLowBandwidthOverride] =
    useState<boolean | null>(null);
  const candidateLowBandwidthMode = candidateLowBandwidthOverride ??
    (candidateConnectionQuality === "poor" || candidateConnectionQuality === "lost");
  const candidateLowBandwidthModeRef = useRef(candidateLowBandwidthMode);
  candidateLowBandwidthModeRef.current = candidateLowBandwidthMode;

  useEffect(() => {
    const publication = candidateLiveKitRoomRef.current?.localParticipant.getTrackPublication(
      Track.Source.Camera,
    );
    const videoTrack = publication?.track as LocalVideoTrack | undefined;
    videoTrack?.setPublishingQuality(
      candidateLowBandwidthMode ? VideoQuality.LOW : VideoQuality.HIGH,
    );
  }, [candidateLowBandwidthMode]);

  const stopCandidateCamera = useCallback(() => {
    const stream = candidateCameraStreamRef.current;

    if (!stream) {
      return;
    }

    stream.getTracks().forEach((track) => {
      track.stop();
    });

    candidateCameraStreamRef.current = null;
    candidateMicrophonePublicationRef.current = null;
    setCandidateMicrophoneMuted(false);
    setCandidateCameraStream(null);
  }, []);

  const toggleCandidateMicrophone = useCallback(async () => {
    const publication = candidateMicrophonePublicationRef.current;
    if (!publication) return;

    try {
      if (publication.isMuted) {
        await publication.unmute();
        setCandidateMicrophoneMuted(false);
        candidateCaptionControllerRef.current?.start();
      } else {
        await publication.mute();
        setCandidateMicrophoneMuted(true);
        candidateCaptionControllerRef.current?.stop();
      }
    } catch (error) {
      console.error("[CandidateLiveKit] Could not change microphone state:", error);
      setActionError("We could not change your microphone state. Please try again.");
    }
  }, []);

  const toggleCandidateScreenShare = useCallback(async () => {
    const room = candidateLiveKitRoomRef.current;
    if (!room || room.state !== "connected") {
      setActionError("Screen sharing is available after the live media connection is ready.");
      return;
    }

    const isSharing = Boolean(
      room.localParticipant.getTrackPublication(Track.Source.ScreenShare),
    );
    setCandidateScreenShareState("starting");
    setActionError("");

    try {
      await room.localParticipant.setScreenShareEnabled(!isSharing, {
        audio: false,
      });
      setCandidateScreenShareState(isSharing ? "idle" : "sharing");
    } catch (error) {
      console.error("[CandidateLiveKit] Could not change screen sharing state:", error);
      setCandidateScreenShareState(isSharing ? "sharing" : "idle");
      setActionError(
        getErrorMessage(error, "We could not start screen sharing. Please try again."),
      );
    }
  }, []);

  /* ----------------------------------------------------------
     UI STATE
     ---------------------------------------------------------- */

  const [starting, setStarting] =
    useState(false);

  const [advancing, setAdvancing] =
    useState(false);

  const [aiGenerating, setAiGenerating] =
    useState(false);

  const [submitting, setSubmitting] =
    useState(false);

  const [confirmed, setConfirmed] =
    useState(false);

  const [reportStatus, setReportStatus] =
    useState<"generated" | "pending">("pending");

  const [timeLeft, setTimeLeft] =
    useState<number | null>(null);

  const [saveState, setSaveState] =
    useState<SaveState>("saved");

  const [showFloatingConnection, setShowFloatingConnection] =
    useState(false);

  const [highlightFollowUpId, setHighlightFollowUpId] =
    useState("");

  const [focusedFollowUpId, setFocusedFollowUpId] =
    useState("");

  /* ----------------------------------------------------------
     REFS
     ---------------------------------------------------------- */

  const adaptiveRequested =
    useRef(false);

  const advancingRef =
    useRef(false);

  const timedOut =
    useRef(false);

  const advancingTimer =
    useRef<ReturnType<typeof setTimeout> | null>(null);

  const followUpAttempts =
    useRef(new Set<string>());

  const resumeAfterFollowUpId =
    useRef("");

  const savedAdaptiveAnswers =
    useRef(new Map<string, Answer>());

  const saveTimers =
    useRef(
      new Map<string, ReturnType<typeof setTimeout>>(),
    );

  const saveRequests =
    useRef(
      new Map<string, Promise<boolean>>(),
    );

  const answerRevisions =
    useRef(new Map<string, number>());

  const dirtyQuestions =
    useRef(new Set<string>());

  /* ----------------------------------------------------------
     CONNECTED HOOKS
     ---------------------------------------------------------- */

  const effectiveAccessCode = session?.accessCode || accessCode;

  const interviewer =
    useInterviewerFollowUps(
      effectiveAccessCode,
      view === "assessment" ||
        view === "review" ||
        view === "interviewer",
    );

  const aiStream =
    useAiStream(effectiveAccessCode);

  /* ----------------------------------------------------------
     INTEGRITY MONITORING

     Active only while the assessment is running (after start, before
     completion). The backend is the single source of truth for the warning
     count and enforcement; this hook only reports signals and follows the
     official response, so refreshing the page can never reset the count.
     ---------------------------------------------------------- */

  const integrity =
    useAssessmentIntegrity({
      accessCode: effectiveAccessCode,
      active:
        session?.status === "in_progress" &&
        (view === "assessment" ||
          view === "review" ||
          view === "interviewer"),
    });

  /* ============================================================
     CAMERA CLEANUP
     ============================================================ */

  useEffect(() => {
    return () => {
      const stream = candidateCameraStreamRef.current;

      if (stream) {
        stream.getTracks().forEach((track) => {
          track.stop();
        });

        candidateCameraStreamRef.current = null;
      }
    };
  }, []);

  /* ============================================================
     INTEGRITY FORCED EXIT

     When the backend counts an event (warningLimit = 1), the session is
     already EXPIRED server-side. Follow that official state: drop the camera
     and mirror the status so every control stops accepting input.
     ============================================================ */

  useEffect(() => {
    if (!integrity.terminated) return;

    stopCandidateCamera();

    setSession((current) =>
      current
        ? { ...current, status: "expired" }
        : current,
    );
  }, [integrity.terminated, stopCandidateCamera]);

  /* ============================================================
     CAMERA LIVEKIT PUBLISHING
     ============================================================

     CameraPreflight owns consent and capture. Once its MediaStream is
     accepted, connect the candidate to the session's LiveKit room and
     publish that existing camera track. Socket.IO continues to carry the
     interview's application events, but no longer publishes candidate media.
     ============================================================ */

  useEffect(() => {
    const actualSessionId = session?.id;
    if (!candidateCameraStream || !actualSessionId) return;
    const stream: MediaStream = candidateCameraStream;

    let cancelled = false;
    const room = new Room({
      adaptiveStream: true,
      dynacast: true,
    });
    candidateLiveKitRoomRef.current = room;
    let interviewerAudioTrack: RemoteAudioTrack | null = null;
    let interviewerAudioElement: HTMLAudioElement | null = null;

    function detachInterviewerAudio() {
      if (interviewerAudioTrack && interviewerAudioElement) {
        interviewerAudioTrack.detach(interviewerAudioElement);
      }
      interviewerAudioTrack = null;
      interviewerAudioElement = null;
    }

    function attachInterviewerAudio(track: RemoteTrack, publication: TrackPublication) {
      if (track.kind !== Track.Kind.Audio) return;
      detachInterviewerAudio();
      interviewerAudioTrack = track as RemoteAudioTrack;
      interviewerAudioElement = document.createElement("audio");
      interviewerAudioElement.autoplay = true;
      interviewerAudioTrack.attach(interviewerAudioElement);
      void interviewerAudioElement.play().catch(() => undefined);
      setInterviewerMicrophoneState(publication.isMuted ? "muted" : "live");
    }

    function restoreInterviewerAudio() {
      for (const participant of room.remoteParticipants.values()) {
        const publication = participant.getTrackPublication(Track.Source.Microphone);
        if (publication?.track) {
          attachInterviewerAudio(publication.track, publication);
          return;
        }
        if (publication) setInterviewerMicrophoneState(publication.isMuted ? "muted" : "waiting");
      }
    }

    room.on(RoomEvent.ParticipantConnected, (participant) => {
      console.info("[CandidateLiveKit] Participant joined", participant.identity);
    });
    room.on(RoomEvent.ParticipantDisconnected, (participant) => {
      console.info("[CandidateLiveKit] Participant left", participant.identity);
    });
    room.on(RoomEvent.TrackSubscribed, (track, publication) => {
      console.info("[CandidateLiveKit] Track subscribed from remote", {
        kind: track.kind,
        source: publication.source,
      });
      if (publication.source === Track.Source.Microphone) {
        attachInterviewerAudio(track, publication);
      }
    });
    room.on(RoomEvent.TrackUnsubscribed, (track) => {
      if (track === interviewerAudioTrack) {
        detachInterviewerAudio();
        setInterviewerMicrophoneState("waiting");
      }
    });
    room.on(RoomEvent.TrackMuted, (publication) => {
      if (!publication.isLocal && publication.source === Track.Source.Microphone) {
        setInterviewerMicrophoneState("muted");
      }
    });
    room.on(RoomEvent.TrackUnmuted, (publication) => {
      if (!publication.isLocal && publication.source === Track.Source.Microphone) {
        setInterviewerMicrophoneState("live");
      }
    });
    room.on(RoomEvent.LocalTrackPublished, (publication) => {
      if (publication.source === Track.Source.ScreenShare) {
        setCandidateScreenShareState("sharing");
      }
    });
    room.on(RoomEvent.LocalTrackUnpublished, (publication) => {
      if (publication.source === Track.Source.ScreenShare) {
        setCandidateScreenShareState("idle");
      }
    });

    async function restorePublishedTracks() {
      const cameraTrack = stream.getVideoTracks()[0];
      console.info("[CandidateLiveKit] restorePublishedTracks", {
        hasCameraTrack: Boolean(cameraTrack),
        cameraReady: cameraTrack?.readyState,
        hasMicrophoneTrack: Boolean(stream.getAudioTracks()[0]),
        microphoneReady: stream.getAudioTracks()[0]?.readyState,
        roomState: room.state,
        localIdentity: room.localParticipant.identity,
      });
      if (!cameraTrack || cameraTrack.readyState === "ended") {
        throw new Error("The selected camera is no longer available.");
      }

      if (!room.localParticipant.getTrackPublication(Track.Source.Camera)) {
        const publication = await room.localParticipant.publishTrack(cameraTrack, {
          source: Track.Source.Camera,
        });
        console.info("[CandidateLiveKit] Published video track", {
          room: actualSessionId,
          source: publication.source,
          trackSid: publication.trackSid,
        });
      }
      const cameraPublication = room.localParticipant.getTrackPublication(
        Track.Source.Camera,
      );
      (cameraPublication?.track as LocalVideoTrack | undefined)?.setPublishingQuality(
        candidateLowBandwidthModeRef.current ? VideoQuality.LOW : VideoQuality.HIGH,
      );

      const microphoneTrack = stream.getAudioTracks()[0];
      if (!microphoneTrack || microphoneTrack.readyState === "ended") {
        throw new Error("The selected microphone is no longer available.");
      }

      let microphonePublication = room.localParticipant.getTrackPublication(
        Track.Source.Microphone,
      );
      if (!microphonePublication) {
        const wasMuted = candidateMicrophonePublicationRef.current?.isMuted ?? false;
        microphonePublication = await room.localParticipant.publishTrack(
          microphoneTrack,
          { source: Track.Source.Microphone },
        );
        console.info("[CandidateLiveKit] Published microphone track", {
          room: actualSessionId,
          source: microphonePublication.source,
          trackSid: microphonePublication.trackSid,
          muted: microphonePublication.isMuted,
        });
        if (wasMuted) await microphonePublication.mute();
      }
      candidateMicrophonePublicationRef.current = microphonePublication;
      setCandidateMicrophoneMuted(microphonePublication.isMuted);
    }

    room.on(
      RoomEvent.ConnectionQualityChanged,
      (quality: ConnectionQuality, participant: Participant) => {
        if (participant === room.localParticipant && !cancelled) {
          setCandidateConnectionQuality(mediaConnectionQuality(quality));
        }
      },
    );
    room.on(RoomEvent.Reconnecting, () => {
      if (!cancelled) {
        candidateCaptionControllerRef.current?.stop();
        setCandidateMediaConnection("reconnecting");
      }
    });
    room.on(RoomEvent.Reconnected, () => {
      if (cancelled) return;
      void restorePublishedTracks()
        .then(() => {
          setCandidateMediaConnection("connected");
          restoreInterviewerAudio();
          if (!candidateMicrophonePublicationRef.current?.isMuted) {
            candidateCaptionControllerRef.current?.start();
          }
        })
        .catch((error) => {
          console.error("[CandidateLiveKit] Could not restore media:", error);
          setCandidateMediaConnection("offline");
          setActionError("We could not restore your live camera and microphone.");
        });
    });
    room.on(RoomEvent.Disconnected, () => {
      if (!cancelled) {
        candidateCaptionControllerRef.current?.stop();
        setCandidateMediaConnection("offline");
        setInterviewerMicrophoneState("offline");
      }
    });

    async function connectCandidateRoom() {
      const maxAttempts = 3;
      let lastError: unknown;

      for (let attempt = 1; attempt <= maxAttempts && !cancelled; attempt += 1) {
        try {
          setCandidateMediaConnection(attempt === 1 ? "connecting" : "reconnecting");
          const credentials = await apiPost<{
            token: string;
            url: string;
          }>(
            `/sessions/access/${encodeURIComponent(effectiveAccessCode)}/livekit-token`,
          );

          if (cancelled) return false;
          console.info("[CandidateLiveKit] Connecting to room", {
            url: credentials.url,
            hasToken: Boolean(credentials.token),
            attempt,
          });
          await room.connect(credentials.url, credentials.token);
          console.info("[CandidateLiveKit] Room connected", {
            room: room.name,
            participant: room.localParticipant.identity,
          });
          return true;
        } catch (error) {
          lastError = error;
          console.warn(
            `[CandidateLiveKit] Connection attempt ${attempt}/${maxAttempts} failed:`,
            error,
          );
          await room.disconnect();
          if (attempt < maxAttempts && !cancelled) {
            await new Promise((resolve) => window.setTimeout(resolve, 1_000 * attempt));
          }
        }
      }

      if (cancelled) return false;
      throw lastError instanceof Error
        ? lastError
        : new Error("Failed to connect to the live interview room.");
    }

    void (async () => {
      try {
        const connected = await connectCandidateRoom();
        if (!connected || cancelled) return;
        setCandidateMediaConnection("connected");
        setCandidateConnectionQuality(
          mediaConnectionQuality(room.localParticipant.connectionQuality),
        );

        if (cancelled) {
          room.disconnect();
          return;
        }

        await restorePublishedTracks();
        restoreInterviewerAudio();
        candidateCaptionControllerRef.current = createCandidateCaptionController(
          room,
          session?.candidateName || "Candidate",
        );
        candidateCaptionControllerRef.current.start();

        console.log("[CandidateLiveKit] Published camera and microphone in room", actualSessionId);
      } catch (error) {
        room.disconnect();
        if (!cancelled) {
          console.error("[CandidateLiveKit] Could not publish camera:", error);
          setActionError(
            getErrorMessage(
              error,
              "We could not connect your camera to the live interview.",
            ),
          );
        }
      }
    })();

    return () => {
      cancelled = true;
      if (candidateMicrophonePublicationRef.current?.trackSid) {
        candidateMicrophonePublicationRef.current = null;
      }
      setCandidateConnectionQuality("lost");
      setCandidateMediaConnection("offline");
      setCandidateScreenShareState("idle");
      candidateCaptionControllerRef.current?.stop();
      candidateCaptionControllerRef.current = null;
      detachInterviewerAudio();
      setInterviewerMicrophoneState("offline");
      if (candidateLiveKitRoomRef.current === room) {
        candidateLiveKitRoomRef.current = null;
      }
      room.disconnect();
    };
  }, [accessCode, candidateCameraStream, session?.id]);

  /* ============================================================
     LOAD ASSESSMENT
     ============================================================ */

  const loadAssessment = useCallback(async () => {
    setView("loading");
    setPageError("");

    try {
      const [nextSession, savedResponses] =
        await Promise.all([
          apiGet<CandidateAccessSession>(
            `/sessions/access/${encodeURIComponent(accessCode)}`,
          ),

          apiGet<CandidateResponse[]>(
            `/responses/access/${encodeURIComponent(accessCode)}`,
          ),
        ]);

      const nextAnswers: Record<string, Answer> = {};
      const nextFollowUps: Record<string, FollowUp> = {};

      const adaptiveSaved =
        new Map<string, Answer>();

      for (const response of savedResponses) {
        if (!response.questionId) {
          const adaptive =
            parseAdaptiveSavedResponse(response);

          if (adaptive) {
            adaptiveSaved.set(
              adaptive.question,
              {
                text: adaptive.answer,
              },
            );

            if (adaptive.followUp) {
              nextFollowUps[
                adaptive.questionId
              ] = adaptive.followUp;
            }
          }

          continue;
        }

        const parsed =
          parseSavedResponse(
            response.responseText,
          );

        nextAnswers[
          response.questionId
        ] = {
          text: parsed.answer,
          json: response.responseJson,
        };

        const structured =
          readStructuredFollowUp(
            response.responseJson,
          );

        if (parsed.followUp) {
          nextFollowUps[
            response.questionId
          ] = parsed.followUp;
        } else if (
          structured?.question &&
          structured.answer
        ) {
          nextFollowUps[
            response.questionId
          ] = {
            question: structured.question,
            answer: structured.answer,
          };
        }
      }

      savedAdaptiveAnswers.current =
        adaptiveSaved;

      let restoredAdaptive: Question[] | null =
        null;

      if (
        nextSession.status === "in_progress" &&
        nextSession.template.modules.some(
          (module) =>
            module.type === "ai_interview",
        )
      ) {
        try {
          const existing =
            await apiGet<{ questions: string[] }>(
              `/ai/access/${encodeURIComponent(
                accessCode,
              )}/adaptive-questions`,
            );

          const generated =
            toAdaptiveQuestions(
              existing.questions,
            );

          if (generated.length) {
            restoredAdaptive = generated;

            for (const question of generated) {
              const saved =
                adaptiveSaved.get(
                  question.questionText,
                );

              if (saved) {
                nextAnswers[
                  question.id
                ] = saved;
              }
            }
          }
        } catch {
          restoredAdaptive = null;
        }
      }

      setSession(nextSession);
      setAnswers(nextAnswers);
      setFollowUps(nextFollowUps);
      setAdaptiveQuestions(restoredAdaptive);

      adaptiveRequested.current =
        Boolean(restoredAdaptive);

      if (restoredAdaptive) {
        const prepared =
          candidateModules(
            nextSession.template.modules,
          );

        const aiIndex =
          prepared.findIndex(
            (module) =>
              module.type === "ai_interview",
          );

        const authoredCount =
          prepared[aiIndex]?.questions?.length ?? 0;

        const firstUnanswered =
          restoredAdaptive.findIndex(
            (question) =>
              !nextAnswers[
                question.id
              ]?.text.trim(),
          );

        if (aiIndex >= 0) {
          setActiveModuleIndex(aiIndex);

          setActiveQuestionIndex(
            authoredCount +
              (firstUnanswered >= 0
                ? firstUnanswered
                : Math.max(
                    0,
                    restoredAdaptive.length - 1,
                  )),
          );
        }
      }

      /* --------------------------------------------------------
         CODING RESTORE
         -------------------------------------------------------- */

      if (
        nextSession.status === "in_progress" &&
        nextSession.template.modules.some(
          (module) =>
            module.type === "coding",
        )
      ) {
        try {
          const [
            codeQuestions,
            codeSubmissions,
          ] = await Promise.all([
            apiGet<Array<{ id: string }>>(
              `/code/access/${encodeURIComponent(
                accessCode,
              )}/questions`,
            ),

            apiGet<CandidateCodeSubmission[]>(
              `/code/access/${encodeURIComponent(
                accessCode,
              )}/submissions`,
            ),
          ]);

          const submitted =
            new Set(
              codeSubmissions.map(
                (submission) =>
                  submission.questionId,
              ),
            );

          setCodingComplete(
            codeQuestions.length > 0 &&
              codeQuestions.every(
                (question) =>
                  submitted.has(question.id),
              ),
          );
        } catch {
          setCodingComplete(false);
        }
      }

      setView(
        nextSession.status === "not_started"
          ? "welcome"
          : nextSession.status === "in_progress"
            ? "camera"
            : "assessment",
      );
    } catch (error) {
      setPageError(
        getErrorMessage(
          error,
          "This invitation is invalid, expired, or already completed.",
        ),
      );

      setView("error");
    }
  }, [accessCode]);

  useEffect(() => {
    void loadAssessment();
  }, [loadAssessment]);

  /* ============================================================
     CONNECTION FLOATING STATUS
     ============================================================ */

  useEffect(() => {
    const update = () => {
      setShowFloatingConnection(
        window.scrollY > 96,
      );
    };

    update();

    window.addEventListener(
      "scroll",
      update,
      { passive: true },
    );

    return () => {
      window.removeEventListener(
        "scroll",
        update,
      );
    };
  }, []);

  /* ============================================================
     TIMER
     ============================================================ */

  useEffect(() => {
    if (!session?.startedAt) {
      setTimeLeft(null);
      return;
    }

    const limit =
      Number(
        session.template.timeLimitMin,
      );

    if (
      !Number.isFinite(limit) ||
      limit <= 0 ||
      view === "complete"
    ) {
      setTimeLeft(null);
      return;
    }

    const start =
      new Date(
        session.startedAt,
      ).getTime();

    const end =
      start +
      limit * 60_000;

    const update = () => {
      setTimeLeft(
        Math.max(
          0,
          Math.ceil(
            (end - Date.now()) / 1000,
          ),
        ),
      );
    };

    update();

    const timer =
      window.setInterval(
        update,
        1000,
      );

    return () => {
      window.clearInterval(timer);
    };
  }, [
    session?.startedAt,
    session?.template.timeLimitMin,
    view,
  ]);

  /* ============================================================
     TIMEOUT
     ============================================================ */

  useEffect(() => {
    if (
      timeLeft !== 0 ||
      timedOut.current ||
      session?.status !== "in_progress"
    ) {
      return;
    }

    timedOut.current = true;

    void apiPut<CandidateAccessSession>(
      `/sessions/access/${encodeURIComponent(
        accessCode,
      )}/timeout`,
    )
      .then((updated) => {
        setSession(updated);
      })
      .catch(() => undefined);
  }, [
    timeLeft,
    session?.status,
    accessCode,
  ]);

  /* ============================================================
     GENERAL CLEANUP
     ============================================================ */

  useEffect(() => {
    return () => {
      for (const timer of saveTimers.current.values()) {
        clearTimeout(timer);
      }

      if (advancingTimer.current) {
        clearTimeout(
          advancingTimer.current,
        );
      }
    };
  }, []);

  /* ============================================================
     MODULES
     ============================================================ */

  const modules = useMemo(() => {
    const base =
      candidateModules(
        session?.template.modules ?? [],
      );

    if (!adaptiveQuestions) {
      return base;
    }

    return base.map((module) => {
      if (
        module.type !==
        "ai_interview"
      ) {
        return module;
      }

      return {
        ...module,
        questions: [
          ...(module.questions ?? []),
          ...adaptiveQuestions,
        ],
      };
    });
  }, [
    session?.template.modules,
    adaptiveQuestions,
  ]);

  /* ============================================================
     ACTIVE QUESTION
     ============================================================ */

  const activeModule =
    modules[activeModuleIndex];

  const activeQuestionCount =
    activeModule?.questions?.length ?? 0;

  const displayedQuestionIndex =
    activeQuestionCount > 0
      ? Math.min(
          activeQuestionIndex,
          activeQuestionCount - 1,
        )
      : 0;

  const activeQuestion =
    activeModule?.questions?.[
      displayedQuestionIndex
    ];

  const adaptiveReady =
    !modules.some(
      (module) =>
        module.type ===
        "ai_interview",
    ) ||
    adaptiveQuestions !== null;

  /* ============================================================
     INTERVIEWER CONTEXT
     ============================================================ */

  const interviewerContextById =
    useMemo(() => {
      const contexts: Record<
        string,
        {
          moduleTitle?: string;
          questionText?: string;
          answerText?: string;
        }
      > = {};

      for (
        const followUp of interviewer.followUps
      ) {
        if (!followUp.parentQuestionId) {
          continue;
        }

        const parentId =
          followUp.parentQuestionId;

        const module =
          modules.find((item) =>
            (item.questions ?? []).some(
              (question) =>
                question.id ===
                parentId,
            ),
          );

        const question =
          module?.questions?.find(
            (item) =>
              item.id === parentId,
          );

        contexts[
          followUp.id
        ] = {
          moduleTitle:
            module?.title,

          questionText:
            question?.questionText,

          answerText:
            answers[parentId]?.text,
        };
      }

      return contexts;
    }, [
      answers,
      interviewer.followUps,
      modules,
    ]);

  /* ============================================================
     INTERVIEWER ARRIVAL
     ============================================================ */

  const arrivalId =
    interviewer.arrival?.id;

  useEffect(() => {
    if (arrivalId) {
      setHighlightFollowUpId(
        arrivalId,
      );
    }
  }, [arrivalId]);

  const focusedInterviewerTurn =
    interviewer.pending.find(
      (item) =>
        item.id ===
        focusedFollowUpId,
    );

  /* ============================================================
     KEEP MODULE INDEX VALID
     ============================================================ */

  useEffect(() => {
    if (
      modules.length === 0
    ) {
      return;
    }

    if (
      activeModuleIndex >=
      modules.length
    ) {
      setActiveModuleIndex(
        modules.length - 1,
      );

      setActiveQuestionIndex(0);
    }
  }, [
    activeModuleIndex,
    modules.length,
  ]);

  /* ============================================================
     START INTERVIEW
     ============================================================ */

  function startAssessment() {
    setActionError("");
    setView("camera");
  }

  /* ============================================================
     CAMERA -> ASSESSMENT
     ============================================================ */

  async function startAssessmentAfterCamera(
    stream: MediaStream,
  ) {
    setStarting(true);
    setActionError("");

    /*
     * Store stream BEFORE changing view.
     * This is what keeps the mini camera alive.
     */
    candidateCameraStreamRef.current =
      stream;

    setCandidateCameraStream(
      stream,
    );

    try {
      const started =
        session?.status === "in_progress"
          ? session
          : await apiPut<CandidateAccessSession>(
              `/sessions/access/${encodeURIComponent(
                accessCode,
              )}/start`,
            );

      setSession(started);

      const prepared =
        candidateModules(
          started.template.modules,
        );

      setBriefingModuleId(
        prepared[0]?.id ?? "",
      );

      setView("assessment");
    } catch (error) {
      stopCandidateCamera();

      setActionError(
        getErrorMessage(
          error,
          "Unable to start the assessment.",
        ),
      );

      setView("welcome");
    } finally {
      setStarting(false);
    }
  }

  /* ============================================================
     UPDATE ANSWER
     ============================================================ */

  function updateAnswer(
    question: Question,
    answer: Answer,
  ) {
    if (timeLeft === 0) {
      return;
    }

    setAnswers((current) => ({
      ...current,
      [question.id]: answer,
    }));

    answerRevisions.current.set(
      question.id,
      (answerRevisions.current.get(
        question.id,
      ) ?? 0) + 1,
    );

    dirtyQuestions.current.add(
      question.id,
    );

    setSaveState("saving");

    const oldTimer =
      saveTimers.current.get(
        question.id,
      );

    if (oldTimer) {
      clearTimeout(oldTimer);
    }

    const timer =
      setTimeout(() => {
        void persistQuestion(
          question.id,
          answer,
        );
      }, 700);

    saveTimers.current.set(
      question.id,
      timer,
    );
  }

  /* ============================================================
     SAVE QUESTION
     ============================================================ */

  async function persistQuestion(
    questionId: string,
    answerOverride?: Answer,
  ): Promise<boolean> {
    const existing =
      saveRequests.current.get(
        questionId,
      );

    if (existing) {
      return existing;
    }

    const answer =
      answerOverride ??
      answers[questionId];

    if (!answer) {
      return false;
    }

    const revision =
      answerRevisions.current.get(
        questionId,
      ) ?? 0;

    const timer =
      saveTimers.current.get(
        questionId,
      );

    if (timer) {
      clearTimeout(timer);
    }

    saveTimers.current.delete(
      questionId,
    );

    setSaveState("saving");

    const request =
      (async () => {
        try {
          const followUp =
            followUps[questionId];

          if (
            questionId.startsWith(
              "ai-adaptive-",
            )
          ) {
            const question =
              adaptiveQuestions?.find(
                (item) =>
                  item.id ===
                  questionId,
              );

            await apiPost(
              `/ai/access/${encodeURIComponent(
                accessCode,
              )}/adaptive-answer`,
              {
                questionId,
                question:
                  question?.questionText ??
                  "",
                answer: answer.text,
                followUpQuestion:
                  followUp?.question,
                followUpAnswer:
                  followUp?.answer,
              },
            );
          } else {
            await apiPost<CandidateResponse>(
              `/responses/access/${encodeURIComponent(
                accessCode,
              )}`,
              {
                questionId,
                responseText:
                  answer.text,
                responseJson:
                  withStructuredFollowUp(
                    answer.json,
                    followUp,
                  ),
              },
            );
          }

          if (
            (answerRevisions.current.get(
              questionId,
            ) ?? 0) === revision
          ) {
            dirtyQuestions.current.delete(
              questionId,
            );
          }

          setSaveState("saved");

          return true;
        } catch (error) {
          console.error(
            "[Assessment] Save failed:",
            error,
          );

          setSaveState("error");

          return false;
        }
      })();

    saveRequests.current.set(
      questionId,
      request,
    );

    try {
      return await request;
    } finally {
      if (
        saveRequests.current.get(
          questionId,
        ) === request
      ) {
        saveRequests.current.delete(
          questionId,
        );
      }
    }
  }

  /* ============================================================
     FLUSH SAVES
     ============================================================ */

  async function flushPendingSaves() {
    const ids = new Set([
      ...dirtyQuestions.current,
      ...saveTimers.current.keys(),
      ...saveRequests.current.keys(),
    ]);

    const results =
      await Promise.all(
        Array.from(ids).map(
          (id) =>
            persistQuestion(id),
        ),
      );

    if (
      results.some(
        (result) => !result,
      )
    ) {
      throw new Error(
        "One or more responses could not be saved.",
      );
    }
  }

  /* ============================================================
     ENSURE QUESTION SAVED
     ============================================================ */

  async function ensureQuestionSaved(
    questionId: string,
    answer: Answer,
  ) {
    const pending =
      dirtyQuestions.current.has(
        questionId,
      ) ||
      saveTimers.current.has(
        questionId,
      ) ||
      saveRequests.current.has(
        questionId,
      );

    if (!pending) {
      return true;
    }

    return persistQuestion(
      questionId,
      answer,
    );
  }

  /* ============================================================
     ADAPTIVE QUESTIONS
     ============================================================ */

  async function prepareAdaptiveQuestions(
    authoredCount: number,
  ) {
    if (adaptiveQuestions?.length) {
      setActiveQuestionIndex(
        authoredCount,
      );

      return true;
    }

    if (
      adaptiveRequested.current
    ) {
      return false;
    }

    adaptiveRequested.current =
      true;

    setAiGenerating(true);
    setActionError("");

    try {
      await flushPendingSaves();

      const aiModule =
        candidateModules(
          session?.template.modules ??
            [],
        ).find(
          (module) =>
            module.type ===
            "ai_interview",
        );

      const result =
        await apiPost<{
          questions: string[];
        }>(
          `/ai/access/${encodeURIComponent(
            accessCode,
          )}/adaptive-questions`,
          {
            count:
              adaptiveQuestionCount(
                aiModule?.settings,
              ),
          },
        );

      const generated =
        toAdaptiveQuestions(
          result.questions,
        );

      if (!generated.length) {
        throw new Error(
          "No tailored questions were generated.",
        );
      }

      setAdaptiveQuestions(
        generated,
      );

      setActiveQuestionIndex(
        authoredCount,
      );

      return true;
    } catch (error) {
      adaptiveRequested.current =
        false;

      setActionError(
        getErrorMessage(
          error,
          "Your answers were saved, but the tailored interview could not load.",
        ),
      );

      return false;
    } finally {
      setAiGenerating(false);
    }
  }

  /* ============================================================
     INTERVIEWER FOCUS
     ============================================================ */

  function focusInterviewerInbox(
    followUpId?: string,
  ) {
    if (followUpId) {
      setHighlightFollowUpId(
        followUpId,
      );

      setFocusedFollowUpId(
        followUpId,
      );
    }

    interviewer.dismissArrival();
    setActionError("");
    setView("assessment");

    window.setTimeout(() => {
      document
        .getElementById(
          "candidate-interviewer-inbox",
        )
        ?.scrollIntoView({
          behavior: window.matchMedia(
            "(prefers-reduced-motion: reduce)",
          ).matches
            ? "auto"
            : "smooth",
          block: "center",
        });
    }, 0);
  }

  function openInterviewerHistory(
    followUpId?: string,
  ) {
    if (followUpId) {
      setHighlightFollowUpId(
        followUpId,
      );
    }

    interviewer.dismissArrival();
    setActionError("");
    setView("interviewer");
  }

  /* ============================================================
     INTERVIEWER CHANGE
     ============================================================ */

  async function handleInterviewerQuestionChanged(
    followUpId?: string,
  ) {
    const refreshed =
      await interviewer.reload();

    if (!followUpId) {
      return refreshed;
    }

    const decision =
      decideInterviewerResume({
        activeQuestionId:
          activeQuestion?.id,

        changedFollowUpId:
          followUpId,

        refreshedFollowUps:
          refreshed,

        resumeAfterFollowUpId:
          resumeAfterFollowUpId.current,
      });

    if (!decision.resolved) {
      return refreshed;
    }

    if (
      focusedFollowUpId ===
      followUpId
    ) {
      setFocusedFollowUpId("");
      setHighlightFollowUpId("");
    }

    if (
      decision.nextBlockingId
    ) {
      resumeAfterFollowUpId.current =
        decision.nextBlockingId;

      focusInterviewerInbox(
        decision.nextBlockingId,
      );

      setActionError(
        "Your interviewer has another follow-up before the interview continues.",
      );
    } else if (
      decision.resume
    ) {
      resumeAfterFollowUpId.current =
        "";

      setView("assessment");

      await nextQuestion(
        followUpId,
      );
    }

    return refreshed;
  }

  /* ============================================================
     NEXT QUESTION
     ============================================================ */

  async function nextQuestion(
    resolvedFollowUpId?: string,
  ) {
    if (
      timeLeft === 0 ||
      advancingRef.current ||
      !activeModule ||
      !activeQuestion
    ) {
      return;
    }

    const answer =
      answers[
        activeQuestion.id
      ];

    if (!answer?.text.trim()) {
      setActionError(
        "Add a response before continuing.",
      );

      return;
    }

    setActionError("");

    const pendingRequired =
      interviewer.pendingRequired.filter(
        (item) =>
          item.id !==
          resolvedFollowUpId,
      );

    const interviewerTurn =
      pendingRequired.find(
        (item) =>
          item.parentQuestionId ===
          activeQuestion.id,
      ) ??
      pendingRequired[0];

    if (interviewerTurn) {
      resumeAfterFollowUpId.current =
        interviewerTurn.id;

      focusInterviewerInbox(
        interviewerTurn.id,
      );

      setActionError(
        "Your interviewer has a follow-up before the interview continues.",
      );

      return;
    }

    /* ----------------------------------------------------------
       AI FOLLOW-UP
       ---------------------------------------------------------- */

    if (
      hasAiInterviewer(
        session?.template.modules ??
          [],
      ) &&
      !followUps[
        activeQuestion.id
      ] &&
      !followUpAttempts.current.has(
        activeQuestion.id,
      )
    ) {
      advancingRef.current = true;
      setAdvancing(true);

      try {
        const saved =
          await ensureQuestionSaved(
            activeQuestion.id,
            answer,
          );

        if (!saved) {
          setActionError(
            "Your response could not be saved. Check your connection.",
          );

          return;
        }

        const decision =
          await aiStream.start({
            questionId:
              activeQuestion.id,

            moduleId:
              activeModule.id,

            question:
              activeQuestion.questionText,

            answer:
              answer.text,
          });

        if (
          decision?.shouldAsk &&
          decision.question
        ) {
          setFollowUps(
            (current) => ({
              ...current,

              [activeQuestion.id]: {
                question:
                  decision.question,
                answer: "",
              },
            }),
          );

          setActionError(
            "One follow-up question was added based on your response.",
          );

          aiStream.reset();

          return;
        }

        followUpAttempts.current.add(
          activeQuestion.id,
        );

        aiStream.reset();
      } catch (error) {
        console.error(
          "[Assessment] AI follow-up failed:",
          error,
        );

        followUpAttempts.current.add(
          activeQuestion.id,
        );

        aiStream.reset();
      } finally {
        advancingRef.current = false;
        setAdvancing(false);
      }
    }

    /* ----------------------------------------------------------
       FOLLOW-UP ANSWER
       ---------------------------------------------------------- */

    const followUp =
      followUps[
        activeQuestion.id
      ];

    if (
      followUp &&
      !followUp.answer.trim()
    ) {
      setActionError(
        "Answer the follow-up question before continuing.",
      );

      return;
    }

    advancingRef.current = true;
    setAdvancing(true);

    try {
      const saved =
        await ensureQuestionSaved(
          activeQuestion.id,
          answer,
        );

      if (!saved) {
        setActionError(
          "Your response could not be saved. Check your connection.",
        );

        return;
      }

      if (
        displayedQuestionIndex <
        activeQuestionCount - 1
      ) {
        setActiveQuestionIndex(
          displayedQuestionIndex + 1,
        );

        return;
      }

      if (
        activeModule.type ===
        "coding"
      ) {
        return;
      }

      if (
        activeModuleIndex <
        modules.length - 1
      ) {
        const next =
          modules[
            activeModuleIndex + 1
          ];

        setActiveModuleIndex(
          activeModuleIndex + 1,
        );

        setActiveQuestionIndex(0);

        setBriefingModuleId(
          next?.id ?? "",
        );

        return;
      }

      setView("review");
    } finally {
      if (advancingTimer.current) {
        clearTimeout(
          advancingTimer.current,
        );
      }

      advancingTimer.current =
        setTimeout(() => {
          advancingRef.current =
            false;

          setAdvancing(false);
        }, 200);
    }
  }

  /* ============================================================
     PREVIOUS
     ============================================================ */

  function previousQuestion() {
    setActionError("");

    if (
      activeQuestionIndex > 0
    ) {
      setActiveQuestionIndex(
        activeQuestionIndex - 1,
      );

      return;
    }

    if (
      activeModuleIndex > 0
    ) {
      const previous =
        modules[
          activeModuleIndex - 1
        ];

      setActiveModuleIndex(
        activeModuleIndex - 1,
      );

      setActiveQuestionIndex(
        Math.max(
          0,
          (previous.questions
            ?.length ?? 1) - 1,
        ),
      );
    }
  }

  /* ============================================================
     SUBMIT
     ============================================================ */

  async function submitAssessment() {
    if (
      timeLeft === 0 ||
      !confirmed
    ) {
      return;
    }

    if (
      !allModulesComplete(
        modules,
        answers,
        followUps,
        codingComplete,
        adaptiveReady,
      )
    ) {
      return;
    }

    setSubmitting(true);
    setActionError("");

    try {
      await flushPendingSaves();

      const completed =
        await apiPut<CandidateAccessSession>(
          `/sessions/access/${encodeURIComponent(
            accessCode,
          )}/complete`,
        );

      setReportStatus(
        completed.reportStatus ??
          "pending",
      );

      stopCandidateCamera();
      setView("complete");
    } catch (error) {
      if (
        isPendingInterviewerQuestionError(
          error,
        )
      ) {
        const refreshed =
          await interviewer.reload();

        const blocking =
          refreshed.find(
            (item) =>
              item.status ===
                "sent" &&
              item.required,
          ) ??
          refreshed.find(
            (item) =>
              item.status ===
              "sent",
          );

        focusInterviewerInbox(
          blocking?.id,
        );

        setActionError(
          "Answer the question your interviewer sent, then submit again.",
        );
      } else {
        setActionError(
          getErrorMessage(
            error,
            "Unable to submit. Your saved responses are still available.",
          ),
        );
      }
    } finally {
      setSubmitting(false);
    }
  }

  /* ============================================================
     PAGE STATES
     ============================================================ */

  if (view === "loading") {
    return <CandidateLoading />;
  }

  if (view === "error") {
    return (
      <CandidateError
        message={pageError}
      />
    );
  }

  if (!session) {
    return null;
  }

  if (view === "welcome") {
    return (
      <CandidateWelcome
        session={session}
        error={actionError}
        starting={starting}
        onStart={startAssessment}
      />
    );
  }

  /* ----------------------------------------------------------
     CAMERA PRE-FLIGHT
     ---------------------------------------------------------- */

  if (view === "camera") {
    return (
      <CameraPreflight
        accessCode={effectiveAccessCode}
        onCancel={() =>
          setView("welcome")
        }
        onContinue={(stream) => {
          void startAssessmentAfterCamera(
            stream,
          );
        }}
      />
    );
  }

  /* ----------------------------------------------------------
     COMPLETE
     ---------------------------------------------------------- */

  if (view === "complete") {
    return (
      <CandidateComplete
        candidateName={
          session.candidateName
        }
        reportStatus={
          reportStatus
        }
      />
    );
  }

  /* ============================================================
     MAIN DATA
     ============================================================ */

  const completion =
    completionPercent(
      modules,
      answers,
      followUps,
      codingComplete,
      adaptiveReady,
    );

  const timeUp =
    timeLeft === 0;

  const linkDropped =
    interviewer.connection ===
      "reconnecting" ||
    interviewer.connection ===
      "offline";

  const pendingRequiredCount =
    interviewer.pendingRequired.length;

  /* ============================================================
     MAIN UI
     ============================================================ */

  return (
    <main className="relative min-h-screen bg-[#f5f7f9] text-neutral-950">
      {/* CAMERA */}

      <FloatingCandidateCamera
        candidateName={session?.candidateName || "Candidate"}
        connectionState={candidateMediaConnection}
        connectionQuality={candidateConnectionQuality}
        lowBandwidthMode={candidateLowBandwidthMode}
        interviewerMicrophoneState={interviewerMicrophoneState}
        microphoneMuted={candidateMicrophoneMuted}
        screenShareState={candidateScreenShareState}
        onToggleLowBandwidth={() => {
          setCandidateLowBandwidthOverride(!candidateLowBandwidthMode);
        }}
        onToggleMicrophone={() => void toggleCandidateMicrophone()}
        onToggleScreenShare={() => void toggleCandidateScreenShare()}
        stream={
          candidateCameraStream
        }
      />

      {/* CONNECTION */}

      <FloatingConnectionStatus
        state={
          interviewer.connection
        }
        latencyMs={
          interviewer.latencyMs
        }
        visible={
          showFloatingConnection
        }
      />

      {/* ACCESSIBILITY */}

      <div
        aria-live="assertive"
        aria-atomic="true"
        role="alert"
        className="sr-only"
      >
        {interviewer.arrival
          ? `New question from ${
              interviewer.arrival
                .askedBy.name
            }`
          : ""}
      </div>

      {/* HEADER */}

      <header className="sticky top-0 z-40 border-b border-neutral-200 bg-white/95 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-[1480px] items-center gap-4 px-4 sm:px-6">
          <EvaloraLogo compact />

          <div className="hidden min-w-0 sm:block">
            <p className="truncate text-sm font-bold">
              {session.template.title}
            </p>

            <p className="mt-0.5 truncate text-xs text-neutral-500">
              {session.candidateName}
            </p>
          </div>

          <div className="ml-auto flex items-center gap-4">
            <div className="hidden items-center gap-2 md:flex">
              <div className="h-1.5 w-32 overflow-hidden rounded-full bg-neutral-100">
                <div
                  className="h-full rounded-full bg-[#29b7e5]"
                  style={{
                    width: `${completion}%`,
                  }}
                />
              </div>

              <span className="text-xs font-bold text-neutral-500">
                {completion}%
              </span>
            </div>

            <span
              className={`inline-flex min-w-[92px] items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm font-bold ${
                timeUp
                  ? "border-red-200 bg-red-50 text-red-700"
                  : "border-neutral-200 bg-white text-neutral-700"
              }`}
            >
              <Icon
                name="clock"
                size={14}
              />

              {timeLeft === null
                ? "Untimed"
                : formatTimer(
                    timeLeft,
                  )}
            </span>

            <span className="hidden sm:inline-flex">
              <ConnectionPill
                state={
                  interviewer.connection
                }
                latencyMs={
                  interviewer.latencyMs
                }
              />
            </span>

            <span
              className={`hidden items-center gap-1.5 text-xs font-semibold sm:flex ${
                saveState ===
                "error"
                  ? "text-red-600"
                  : saveState ===
                      "saving"
                    ? "text-amber-600"
                    : "text-emerald-600"
              }`}
            >
              <span className="size-1.5 rounded-full bg-current" />

              {saveState ===
              "error"
                ? "Save failed"
                : saveState ===
                    "saving"
                  ? "Saving"
                  : "Saved"}
            </span>
          </div>
        </div>
      </header>

      {/* CONNECTION WARNING */}

      {linkDropped && (
        <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-center text-sm font-semibold text-amber-900">
          {interviewer.connection ===
          "offline"
            ? "The live connection is unavailable."
            : "Reconnecting to your interviewer."}{" "}
          Your answers continue saving automatically.
        </div>
      )}

      {/* CONTENT */}

      <div className="mx-auto grid max-w-[1480px] lg:grid-cols-[250px_minmax(0,1fr)]">
        {/* SIDEBAR */}

        <aside className="hidden min-h-[calc(100vh-64px)] border-r border-neutral-200 bg-white p-4 lg:block">
          <p className="px-2 pb-1 text-xs font-bold uppercase text-neutral-400">
            Interview plan
          </p>

          <p className="px-2 pb-3 text-xs text-neutral-400">
            {modules.length} stages
          </p>

          <nav className="space-y-1">
            {modules.map(
              (module, index) => {
                const complete =
                  moduleComplete(
                    module,
                    answers,
                    followUps,
                    codingComplete,
                    adaptiveReady,
                  );

                const active =
                  index ===
                    activeModuleIndex &&
                  view ===
                    "assessment";

                return (
                  <button
                    key={module.id}
                    type="button"
                    disabled={
                      index >
                      activeModuleIndex
                    }
                    onClick={() => {
                      setActiveModuleIndex(
                        index,
                      );

                      setActiveQuestionIndex(
                        0,
                      );

                      setBriefingModuleId(
                        "",
                      );

                      setView(
                        "assessment",
                      );
                    }}
                    className={`flex w-full items-center gap-3 rounded-md px-3 py-3 text-left ${
                      active
                        ? "bg-sky-50 text-sky-900"
                        : "text-neutral-600 hover:bg-neutral-50"
                    }`}
                  >
                    <span
                      className={`flex size-7 shrink-0 items-center justify-center rounded-md ${
                        complete
                          ? "bg-emerald-100 text-emerald-700"
                          : active
                            ? "bg-sky-100 text-sky-700"
                            : "bg-neutral-100 text-neutral-500"
                      }`}
                    >
                      <Icon
                        name={
                          complete
                            ? "check"
                            : moduleIcon(
                                module.type,
                              )
                        }
                        size={13}
                      />
                    </span>

                    <span className="min-w-0">
                      <span className="block truncate text-sm font-bold">
                        {module.title}
                      </span>

                      <span className="mt-0.5 block text-xs text-neutral-400">
                        {complete
                          ? "Complete"
                          : stageFormatLabel(
                              module.type,
                            )}
                      </span>
                    </span>
                  </button>
                );
              },
            )}
          </nav>

          {interviewer.followUps
            .length > 0 && (
            <button
              type="button"
              onClick={() =>
                openInterviewerHistory()
              }
              className="mt-3 flex w-full items-center gap-3 rounded-md px-3 py-3 text-left text-sm font-bold text-neutral-600 hover:bg-neutral-50"
            >
              <span className="flex size-7 items-center justify-center rounded-md bg-violet-100 text-violet-700">
                <Icon
                  name="message"
                  size={13}
                />
              </span>

              Conversation history

              {interviewer.pending
                .length > 0 && (
                <span className="ml-auto grid size-5 place-items-center rounded-full bg-violet-600 text-xs text-white">
                  {
                    interviewer
                      .pending
                      .length
                  }
                </span>
              )}
            </button>
          )}

          <button
            type="button"
            onClick={() =>
              setView("review")
            }
            className="mt-3 flex w-full items-center gap-3 rounded-md px-3 py-3 text-left text-sm font-bold text-neutral-600 hover:bg-neutral-50"
          >
            <span className="flex size-7 items-center justify-center rounded-md bg-neutral-100">
              <Icon
                name="report"
                size={13}
              />
            </span>

            Close interview
          </button>
        </aside>

        {/* MAIN */}

        <section className="min-w-0 p-4 sm:p-6 lg:p-8">
          {/* INTERVIEWER HISTORY */}

          {view ===
          "interviewer" ? (
            <CandidateInterviewerQuestions
              accessCode={
                accessCode
              }
              followUps={
                interviewer.followUps
              }
              contextByFollowUpId={
                interviewerContextById
              }
              highlightId={
                highlightFollowUpId
              }
              disabled={
                timeUp
              }
              onChanged={
                handleInterviewerQuestionChanged
              }
            />
          ) : view ===
            "review" ? (
            /* REVIEW */
            <ReviewPanel
              modules={modules}
              answers={answers}
              followUps={
                followUps
              }
              codingComplete={
                codingComplete
              }
              adaptiveReady={
                adaptiveReady
              }
              confirmed={
                confirmed
              }
              submitting={
                submitting
              }
              error={
                actionError
              }
              pendingRequiredCount={
                pendingRequiredCount
              }
              onConfirm={
                setConfirmed
              }
              onBack={() =>
                setView(
                  "assessment",
                )
              }
              onSubmit={() =>
                void submitAssessment()
              }
              onAnswerInterviewer={() =>
                focusInterviewerInbox(
                  interviewer
                    .pendingRequired[0]
                    ?.id,
                )
              }
            />
          ) : focusedInterviewerTurn ? (
            /* FOCUSED INTERVIEWER */
            <CandidateInterviewerInbox
              accessCode={
                accessCode
              }
              followUps={
                interviewer.followUps
              }
              contextByFollowUpId={
                interviewerContextById
              }
              highlightId={
                focusedInterviewerTurn.id
              }
              disabled={
                timeUp
              }
              onChanged={
                handleInterviewerQuestionChanged
              }
              onOpenAll={() =>
                openInterviewerHistory(
                  focusedInterviewerTurn.id,
                )
              }
              primary
            />
          ) : briefingModuleId ===
              activeModule?.id ? (
            /* BRIEFING */
            <StageBriefing
              module={
                activeModule
              }
              stageIndex={
                activeModuleIndex
              }
              stageTotal={
                modules.length
              }
              onBegin={() => {
                setBriefingModuleId(
                  "",
                );

                if (
                  activeModule.type ===
                    "ai_interview" &&
                  !activeModule
                    .questions
                    ?.length
                ) {
                  void prepareAdaptiveQuestions(
                    0,
                  );
                }
              }}
            />
          ) : activeModule?.type ===
            "coding" ? (
            /* CODING */
            <CandidateCodingAssessment
              accessCode={
                accessCode
              }
              locked={
                timeUp
              }
              onBack={
                previousQuestion
              }
              onContinue={() => {
                setCodingComplete(
                  true,
                );

                if (
                  activeModuleIndex <
                  modules.length - 1
                ) {
                  const next =
                    modules[
                      activeModuleIndex +
                        1
                    ];

                  setActiveModuleIndex(
                    activeModuleIndex +
                      1,
                  );

                  setActiveQuestionIndex(
                    0,
                  );

                  setBriefingModuleId(
                    next?.id ?? "",
                  );
                } else {
                  setView(
                    "review",
                  );
                }
              }}
            />
          ) : activeModule?.type ===
              "ai_interview" &&
            aiGenerating ? (
            /* AI LOADING */
            <AiPreparing />
          ) : activeModule &&
            activeQuestion ? (
            /* QUESTION */
            <QuestionPanel
              module={
                activeModule
              }
              question={
                activeQuestion
              }
              questionIndex={
                displayedQuestionIndex
              }
              answer={
                answers[
                  activeQuestion.id
                ]
              }
              followUp={
                followUps[
                  activeQuestion.id
                ]
              }
              busy={
                advancing
              }
              disabled={
                timeUp
              }
              error={
                actionError
              }
              stream={
                aiStream
              }
              onAnswer={(answer) =>
                updateAnswer(
                  activeQuestion,
                  answer,
                )
              }
              onFollowUp={(answer) => {
                setFollowUps(
                  (current) => ({
                    ...current,

                    [activeQuestion.id]: {
                      ...current[
                        activeQuestion
                          .id
                      ],

                      answer,
                    },
                  }),
                );

                dirtyQuestions.current.add(
                  activeQuestion.id,
                );

                setSaveState(
                  "saving",
                );
              }}
              onBack={
                previousQuestion
              }
              onNext={() =>
                void nextQuestion()
              }
            />
          ) : (
            <QuestionLoading />
          )}

          {/* INTERVIEWER INBOX */}

          {view ===
            "assessment" &&
          !briefingModuleId &&
          !focusedInterviewerTurn ? (
            <CandidateInterviewerInbox
              accessCode={
                accessCode
              }
              followUps={
                interviewer.followUps
              }
              contextByFollowUpId={
                interviewerContextById
              }
              highlightId={
                highlightFollowUpId
              }
              disabled={
                timeUp
              }
              onChanged={
                handleInterviewerQuestionChanged
              }
              onOpenAll={() =>
                openInterviewerHistory(
                  highlightFollowUpId,
                )
              }
            />
          ) : null}
        </section>
      </div>

      {/* NEW QUESTION */}

      {interviewer.arrival &&
      !timeUp ? (
        <NewQuestionAlert
          followUp={
            interviewer.arrival
          }
          onDismiss={
            interviewer.dismissArrival
          }
          onOpen={() =>
            focusInterviewerInbox(
              interviewer.arrival
                ?.id,
            )
          }
        />
      ) : null}

      {/* TIME UP */}

      {timeUp && <TimeUpModal />}

      {/* INTEGRITY WARNING / FORCED EXIT */}

      <IntegrityWarningDialog
        integrity={integrity}
      />
    </main>
  );
}

/* ============================================================
   QUESTION PANEL
   ============================================================ */

function QuestionPanel({
  module,
  question,
  questionIndex,
  answer,
  followUp,
  onAnswer,
  onFollowUp,
  onBack,
  onNext,
  error,
  busy,
  disabled,
  stream,
}: {
  module: AssessmentModule;
  question: Question;
  questionIndex: number;
  answer?: Answer;
  followUp?: FollowUp;
  onAnswer: (answer: Answer) => void;
  onFollowUp: (answer: string) => void;
  onBack: () => void;
  onNext: () => void;
  error: string;
  busy: boolean;
  disabled: boolean;
  stream: AiStream;
}) {
  const options =
    questionOptions(
      question.options,
    );

  const adaptive =
    question.id.startsWith(
      "ai-adaptive-",
    );

  return (
    <div className="mx-auto max-w-[860px]">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-xs font-bold uppercase text-sky-700">
            {module.title}
          </p>

          <p className="mt-1 text-xs text-neutral-500">
            Turn {questionIndex + 1} of{" "}
            {module.questions?.length ?? 1}
          </p>
        </div>

        <span className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-neutral-500 ring-1 ring-neutral-200">
          {stageFormatLabel(
            module.type,
          )}
        </span>
      </div>

      <article className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
        <div className="border-b border-neutral-200 px-5 py-6 sm:px-7">
          <div className="flex items-center gap-3">
            <span
              className={`grid size-9 place-items-center rounded-lg ${
                adaptive
                  ? "bg-amber-50 text-amber-700"
                  : "bg-sky-50 text-sky-700"
              }`}
            >
              <Icon
                name={
                  adaptive
                    ? "sparkle"
                    : "message"
                }
                size={16}
              />
            </span>

            <div>
              <p className="text-xs font-black">
                {adaptive
                  ? "Adaptive interviewer"
                  : "Interview question"}
              </p>

              <p className="mt-0.5 text-xs text-neutral-400">
                {adaptive
                  ? "Based on earlier responses"
                  : "From the interview plan"}
              </p>
            </div>
          </div>

          <h2 className="mt-5 text-lg font-black leading-7">
            {question.questionText}
          </h2>

          <p className="mt-2 text-xs leading-5 text-neutral-500">
            Use a concrete example and explain your actions,
            reasoning, and outcome.
          </p>
        </div>

        <div className="px-5 py-6 sm:px-7">
          <div className="mb-2 flex items-center justify-between">
            <label
              htmlFor={`answer-${question.id}`}
              className="text-xs font-black uppercase text-neutral-500"
            >
              Your response
            </label>

            {!options.length &&
            question.questionType !==
              "scale" ? (
              <span className="text-xs text-neutral-400">
                {answer?.text.length ?? 0} characters
              </span>
            ) : null}
          </div>

          {question.questionType ===
          "scale" ? (
            <ScaleInput
              value={numericAnswer(
                answer,
              )}
              disabled={
                disabled
              }
              onChange={(value) =>
                onAnswer({
                  text:
                    String(
                      value,
                    ),
                  json: {
                    value,
                  },
                })
              }
            />
          ) : options.length ? (
            <ChoiceInput
              options={
                options
              }
              value={
                answer?.text ??
                ""
              }
              disabled={
                disabled
              }
              onChange={(value) =>
                onAnswer({
                  text: value,
                  json: {
                    selectedOption:
                      value,
                  },
                })
              }
            />
          ) : (
            <textarea
              id={`answer-${question.id}`}
              autoFocus
              maxLength={12000}
              readOnly={
                disabled
              }
              value={
                answer?.text ??
                ""
              }
              onChange={(event) =>
                onAnswer({
                  text:
                    event.target
                      .value,
                })
              }
              placeholder="Respond as you would in an interview..."
              className="control min-h-[190px] text-sm leading-6"
            />
          )}

          {followUp ? (
            <div className="mt-6 border-t border-neutral-200 pt-6">
              <div className="rounded-lg bg-amber-50 p-4">
                <p className="flex items-center gap-2 text-xs font-bold text-amber-800">
                  <Icon
                    name="sparkle"
                    size={14}
                  />
                  Adaptive follow-up
                </p>

                <p className="mt-2 text-sm font-bold leading-6 text-amber-950">
                  {followUp.question}
                </p>
              </div>

              <textarea
                className="control mt-4 min-h-[130px]"
                readOnly={
                  disabled
                }
                value={
                  followUp.answer
                }
                onChange={(event) =>
                  onFollowUp(
                    event.target
                      .value,
                  )
                }
                placeholder="Continue your answer..."
              />
            </div>
          ) : module.type ===
              "ai_interview" &&
            (stream.streaming ||
              stream.error) ? (
            <AiFollowUpStream
              text={
                stream.text
              }
              streaming={
                stream.streaming
              }
              error={
                stream.error
              }
            />
          ) : null}

          {error && (
            <p className="mt-4 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
              {error}
            </p>
          )}

          <div className="mt-6 flex justify-between gap-3">
            <button
              type="button"
              className="button-secondary"
              disabled={
                disabled ||
                busy
              }
              onClick={
                onBack
              }
            >
              Previous
            </button>

            <button
              type="button"
              className="button-primary"
              disabled={
                disabled ||
                busy
              }
              onClick={
                onNext
              }
            >
              {busy ? (
                <>
                  <span className="size-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Preparing...
                </>
              ) : (
                <>
                  Continue interview
                  <Icon
                    name="chevron"
                    size={13}
                    className="-rotate-90"
                  />
                </>
              )}
            </button>
          </div>
        </div>
      </article>
    </div>
  );
}

/* ============================================================
   AI PREPARING
   ============================================================ */

function AiPreparing() {
  return (
    <div className="mx-auto max-w-[860px]">
      <div className="rounded-lg border border-sky-100 bg-sky-50 p-4">
        <p className="flex items-center gap-2 text-xs font-bold uppercase text-sky-700">
          <Icon
            name="sparkle"
            size={14}
          />
          AI Interview
        </p>
      </div>

      <div className="mt-4 flex flex-col items-center rounded-xl border border-neutral-200 bg-white px-6 py-16 text-center shadow-sm">
        <span className="size-10 animate-spin rounded-full border-[3px] border-neutral-200 border-t-sky-500" />

        <p className="mt-5 text-base font-black">
          Preparing your tailored questions...
        </p>

        <p className="mt-2 max-w-md text-sm leading-6 text-neutral-500">
          Our AI is reviewing your earlier answers to
          prepare questions matched to your experience.
        </p>
      </div>
    </div>
  );
}

/* ============================================================
   AI FOLLOW-UP STREAM
   ============================================================ */

function AiFollowUpStream({
  text,
  streaming,
  error,
}: {
  text: string;
  streaming: boolean;
  error: string;
}) {
  return (
    <div className="mt-6 border-t border-neutral-200 pt-6">
      <div className="rounded-lg border border-sky-100 bg-sky-50 p-4">
        <p className="flex items-center gap-2 text-xs font-bold uppercase text-sky-700">
          <Icon
            name="sparkle"
            size={14}
          />
          AI follow-up
        </p>

        {text && (
          <p className="mt-2 text-sm font-bold leading-6 text-sky-950">
            {text}

            {streaming && (
              <span className="ml-1 inline-block h-3 w-1 animate-pulse bg-sky-500" />
            )}
          </p>
        )}

        {!text && streaming && (
          <p className="mt-2 text-sm font-semibold text-sky-700">
            Reading your answer...
          </p>
        )}

        {error && (
          <p className="mt-3 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}

/* ============================================================
   STAGE BRIEFING
   ============================================================ */

function StageBriefing({
  module,
  stageIndex,
  stageTotal,
  onBegin,
}: {
  module: AssessmentModule;
  stageIndex: number;
  stageTotal: number;
  onBegin: () => void;
}) {
  return (
    <section className="mx-auto flex min-h-[520px] max-w-[860px] items-center">
      <div className="w-full rounded-xl border border-neutral-200 bg-white px-6 py-9 shadow-sm sm:px-10">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-lg bg-sky-50 text-sky-700">
            <Icon
              name={moduleIcon(module.type)}
              size={18}
            />
          </span>

          <div>
            <p className="text-xs font-bold uppercase text-sky-700">
              Stage {stageIndex + 1} of {stageTotal}
            </p>

            <p className="mt-1 text-xs text-neutral-500">
              {stageFormatLabel(
                module.type,
              )}
            </p>
          </div>
        </div>

        <h1 className="mt-6 text-2xl font-black sm:text-3xl">
          {module.title}
        </h1>

        <p className="mt-3 max-w-[650px] text-sm leading-6 text-neutral-600">
          {stageBriefingText(module)}
        </p>

        <div className="mt-7 border-y border-neutral-200 py-4">
          <p className="text-xs text-neutral-400">
            Core prompts
          </p>

          <p className="mt-1 text-sm font-bold">
            {module.type ===
              "coding" &&
            !module.questions?.length
              ? "Coding workspace"
              : module.questions?.length ??
                0}
          </p>
        </div>

        <button
          type="button"
          autoFocus
          className="button-primary mt-7"
          onClick={onBegin}
        >
          Begin {module.title}

          <Icon
            name="chevron"
            size={13}
            className="-rotate-90"
          />
        </button>
      </div>
    </section>
  );
}

/* ============================================================
   REVIEW
   ============================================================ */

function ReviewPanel({
  modules,
  answers,
  followUps,
  codingComplete,
  adaptiveReady,
  confirmed,
  submitting,
  error,
  pendingRequiredCount,
  onConfirm,
  onBack,
  onSubmit,
  onAnswerInterviewer,
}: {
  modules: AssessmentModule[];
  answers: Record<string, Answer>;
  followUps: Record<string, FollowUp>;
  codingComplete: boolean;
  adaptiveReady: boolean;
  confirmed: boolean;
  submitting: boolean;
  error: string;
  pendingRequiredCount: number;
  onConfirm: (value: boolean) => void;
  onBack: () => void;
  onSubmit: () => void;
  onAnswerInterviewer: () => void;
}) {
  const complete =
    allModulesComplete(
      modules,
      answers,
      followUps,
      codingComplete,
      adaptiveReady,
    );

  return (
    <div className="mx-auto max-w-[860px]">
      <p className="text-xs font-bold uppercase text-sky-700">
        Interview close
      </p>

      <h1 className="mt-2 text-3xl font-black">
        Review the conversation
      </h1>

      <p className="mt-2 text-sm leading-6 text-neutral-600">
        Check each stage before closing your interview.
      </p>

      <div className="mt-6 overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
        <div className="divide-y divide-neutral-100">
          {modules.map((module) => {
            const done =
              moduleComplete(
                module,
                answers,
                followUps,
                codingComplete,
                adaptiveReady,
              );

            return (
              <div
                key={module.id}
                className="flex items-center gap-4 px-5 py-4"
              >
                <span
                  className={`flex size-9 items-center justify-center rounded-lg ${
                    done
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-amber-100 text-amber-700"
                  }`}
                >
                  <Icon
                    name={
                      done
                        ? "check"
                        : moduleIcon(
                            module.type,
                          )
                    }
                    size={16}
                  />
                </span>

                <div>
                  <p className="text-sm font-bold">
                    {module.title}
                  </p>

                  <p className="mt-0.5 text-xs text-neutral-500">
                    {done
                      ? "Stage complete"
                      : "Response required"}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="border-t border-neutral-200 bg-neutral-50 p-5">
          {pendingRequiredCount > 0 && (
            <PendingInterviewerNotice
              count={
                pendingRequiredCount
              }
              onAnswer={
                onAnswerInterviewer
              }
            />
          )}

          <label className="flex cursor-pointer gap-3">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(event) =>
                onConfirm(
                  event.target.checked,
                )
              }
              className="mt-1 size-4 accent-sky-500"
            />

            <span className="text-sm leading-5 text-neutral-600">
              I reviewed my responses and understand that
              completing the interview closes this private link.
            </span>
          </label>

          {error && (
            <p className="mt-3 text-sm text-red-700">
              {error}
            </p>
          )}

          <div className="mt-5 flex justify-between gap-3">
            <button
              type="button"
              className="button-secondary"
              onClick={onBack}
            >
              Return to interview
            </button>

            <button
              type="button"
              className="button-primary"
              disabled={
                !complete ||
                !confirmed ||
                submitting ||
                pendingRequiredCount > 0
              }
              onClick={onSubmit}
            >
              {submitting
                ? "Completing..."
                : "Complete interview"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   PENDING INTERVIEWER
   ============================================================ */

function PendingInterviewerNotice({
  count,
  onAnswer,
}: {
  count: number;
  onAnswer: () => void;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-center gap-3 rounded-lg border border-violet-300 bg-violet-50 px-4 py-3">
      <span className="flex size-8 items-center justify-center rounded-full bg-violet-100 text-violet-700">
        <Icon
          name="user"
          size={15}
        />
      </span>

      <p className="flex-1 text-sm font-semibold text-violet-950">
        {count === 1
          ? "1 question from your interviewer needs an answer."
          : `${count} questions from your interviewer need answers.`}
      </p>

      <button
        type="button"
        onClick={onAnswer}
        className="rounded-md bg-violet-600 px-3 py-2 text-sm font-bold text-white"
      >
        Answer
      </button>
    </div>
  );
}

/* ============================================================
   NEW QUESTION ALERT
   ============================================================ */

function NewQuestionAlert({
  followUp,
  onOpen,
  onDismiss,
}: {
  followUp: InterviewerFollowUp;
  onOpen: () => void;
  onDismiss: () => void;
}) {
  return (
    <div className="fixed bottom-4 right-6 z-50 w-[380px] max-w-[calc(100vw-2rem)]">
      <div className="rounded-xl border border-violet-300 bg-white p-4 shadow-2xl">
        <div className="flex items-start gap-3">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-violet-100 text-violet-700">
            <Icon
              name="user"
              size={15}
            />
          </span>

          <div className="flex-1">
            <p className="text-xs font-bold uppercase text-violet-700">
              New question from{" "}
              {followUp.askedBy.name}
            </p>

            <p className="mt-1 text-sm leading-5 text-neutral-700">
              {followUp.questionText}
            </p>

            <p className="mt-1 text-xs text-neutral-500">
              {followUp.required
                ? "An answer is required."
                : "Optional question."}
            </p>
          </div>

          <button
            type="button"
            onClick={onDismiss}
            className="text-neutral-400"
          >
            <Icon
              name="x"
              size={14}
            />
          </button>
        </div>

        <button
          type="button"
          onClick={onOpen}
          className="mt-3 flex h-9 w-full items-center justify-center gap-2 rounded-lg bg-violet-600 text-sm font-bold text-white"
        >
          Read and answer
          <Icon
            name="chevron"
            size={12}
            className="-rotate-90"
          />
        </button>
      </div>
    </div>
  );
}

/* ============================================================
   TIME UP
   ============================================================ */

function TimeUpModal() {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 px-5 backdrop-blur-sm">
      <div className="w-full max-w-[440px] rounded-xl bg-white p-8 text-center shadow-2xl">
        <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-red-100 text-red-600">
          <Icon
            name="clock"
            size={24}
          />
        </span>

        <h2 className="mt-5 text-xl font-black">
          Time&apos;s up
        </h2>

        <p className="mt-3 text-sm leading-6 text-neutral-600">
          The time limit for this interview has ended.
          Your saved responses have been preserved for
          the review team.
        </p>
      </div>
    </div>
  );
}

/* ============================================================
   WELCOME
   ============================================================ */

function CandidateWelcome({
  session,
  starting,
  error,
  onStart,
}: {
  session: CandidateAccessSession;
  starting: boolean;
  error: string;
  onStart: () => void;
}) {
  const modules =
    candidateModules(
      session.template.modules,
    );

  const timeLabel =
    session.template.timeLimitMin
      ? `${session.template.timeLimitMin} minutes`
      : "Untimed";

  return (
    <main className="min-h-screen bg-[#f4f7f9] px-4 py-8 text-neutral-950 sm:px-6">
      <section className="mx-auto flex min-h-[calc(100vh-64px)] max-w-[980px] items-center">
        <div className="w-full overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-xl">
          <header className="flex items-center justify-between border-b border-neutral-200 px-5 py-4 sm:px-8">
            <EvaloraLogo compact />

            <span className="rounded-full bg-sky-50 px-3 py-1.5 text-xs font-bold text-sky-800">
              Private candidate interview
            </span>
          </header>

          <div className="grid lg:grid-cols-[1fr_360px]">
            <div className="px-5 py-8 sm:px-8">
              <p className="text-xs font-bold uppercase text-sky-700">
                Interview for{" "}
                {session.targetRole ??
                  session.template.roleType}
              </p>

              <h1 className="mt-3 text-3xl font-black sm:text-4xl">
                {session.template.title}
              </h1>

              <p className="mt-3 text-sm font-semibold text-neutral-600">
                Prepared for{" "}
                {session.candidateName}
              </p>

              <p className="mt-6 text-sm leading-6 text-neutral-600">
                This is a structured interview. Your
                responses are saved automatically and relevant
                follow-up questions may be added.
              </p>

              <div className="mt-7 grid gap-4 border-y border-neutral-200 py-5 sm:grid-cols-3">
                <WelcomeFact
                  icon="clock"
                  title={
                    timeLabel
                  }
                  body="Interview time"
                />

                <WelcomeFact
                  icon="clipboard"
                  title={`${modules.length} stages`}
                  body="Shown in order"
                />

                <WelcomeFact
                  icon="message"
                  title="Guided"
                  body="Human + AI follow-ups"
                />
              </div>

              {error && (
                <p className="mt-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </p>
              )}

              <button
                type="button"
                disabled={starting}
                onClick={onStart}
                className="button-primary mt-7"
              >
                {starting
                  ? "Opening interview..."
                  : "Start interview"}

                {!starting && (
                  <Icon
                    name="chevron"
                    size={14}
                    className="-rotate-90"
                  />
                )}
              </button>
            </div>

            <aside className="border-t border-neutral-200 bg-neutral-50 px-5 py-7 lg:border-l lg:border-t-0">
              <p className="text-xs font-bold uppercase text-neutral-400">
                Interview plan
              </p>

              <ol className="mt-4 space-y-1">
                {modules.map(
                  (
                    module,
                    index,
                  ) => (
                    <li
                      key={
                        module.id
                      }
                      className="flex items-center gap-3 border-b border-neutral-200 py-3"
                    >
                      <span className="grid size-7 place-items-center rounded-md bg-white text-xs font-black text-neutral-500 ring-1 ring-neutral-200">
                        {index + 1}
                      </span>

                      <div>
                        <p className="text-sm font-bold">
                          {module.title}
                        </p>

                        <p className="text-xs text-neutral-500">
                          {stageFormatLabel(
                            module.type,
                          )}
                        </p>
                      </div>
                    </li>
                  ),
                )}
              </ol>
            </aside>
          </div>
        </div>
      </section>
    </main>
  );
}

/* ============================================================
   WELCOME FACT
   ============================================================ */

function WelcomeFact({
  icon,
  title,
  body,
}: {
  icon: IconName;
  title: string;
  body: string;
}) {
  return (
    <div className="flex gap-3">
      <span className="flex size-8 items-center justify-center rounded-md bg-sky-50 text-sky-700">
        <Icon
          name={icon}
          size={15}
        />
      </span>

      <div>
        <p className="text-sm font-black">
          {title}
        </p>

        <p className="text-xs text-neutral-500">
          {body}
        </p>
      </div>
    </div>
  );
}

/* ============================================================
   COMPLETE
   ============================================================ */

function CandidateComplete({
  candidateName,
  reportStatus,
}: {
  candidateName: string;
  reportStatus: "generated" | "pending";
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f4f8f9] px-5">
      <div className="w-full max-w-[620px] rounded-xl border border-neutral-200 bg-white p-8 text-center shadow-xl sm:p-12">
        <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
          <Icon
            name="check"
            size={23}
          />
        </span>

        <h1 className="mt-5 text-3xl font-black">
          Interview complete
        </h1>

        <p className="mt-3 text-sm leading-6 text-neutral-600">
          Thank you,{" "}
          {firstName(candidateName)}.
          Your interview is now available to the
          authorized review team.
        </p>

        <div className="mt-6 rounded-lg bg-neutral-50 px-4 py-3 text-xs text-neutral-600">
          {reportStatus ===
          "generated"
            ? "The reviewer report is ready."
            : "Report processing will continue for the review team."}
        </div>

        <p className="mt-7 text-xs text-neutral-500">
          You may close this window.
        </p>
      </div>
    </main>
  );
}

/* ============================================================
   LOADING
   ============================================================ */

function CandidateLoading() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f4f8f9]">
      <div className="text-center">
        <span className="mx-auto block size-9 animate-spin rounded-full border-[3px] border-neutral-200 border-t-[#29b7e5]" />

        <p className="mt-4 text-sm font-semibold text-neutral-600">
          Preparing private interview
        </p>
      </div>
    </main>
  );
}

/* ============================================================
   ERROR
   ============================================================ */

function CandidateError({
  message,
}: {
  message: string;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f4f8f9] px-5">
      <div className="w-full max-w-[560px] rounded-xl border border-neutral-200 bg-white p-8 text-center shadow-xl">
        <EvaloraLogo
          className="justify-center"
          href="/"
        />

        <span className="mx-auto mt-8 flex size-11 items-center justify-center rounded-full bg-red-50 text-red-600">
          <Icon
            name="lock"
            size={20}
          />
        </span>

        <h1 className="mt-4 text-xl font-black">
          Interview unavailable
        </h1>

        <p className="mt-3 text-sm leading-6 text-neutral-600">
          {message}
        </p>

        <Link
          href="/"
          className="button-secondary mt-6"
        >
          Return to Evalora
        </Link>
      </div>
    </main>
  );
}

/* ============================================================
   CHOICE INPUT
   ============================================================ */

function ChoiceInput({
  options,
  value,
  onChange,
  disabled,
}: {
  options: string[];
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="grid gap-2">
      {options.map((option) => (
        <label
          key={option}
          className={`flex items-center gap-3 rounded-lg border px-4 py-3 text-sm font-semibold ${
            value === option
              ? "border-sky-300 bg-sky-50"
              : "border-neutral-200"
          }`}
        >
          <input
            type="radio"
            name="candidate-choice"
            checked={
              value === option
            }
            disabled={
              disabled
            }
            onChange={() =>
              onChange(option)
            }
            className="size-4 accent-sky-500"
          />

          {option}
        </label>
      ))}
    </div>
  );
}

/* ============================================================
   SCALE
   ============================================================ */

function ScaleInput({
  value,
  onChange,
  disabled,
}: {
  value?: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}) {
  return (
    <div>
      <div className="grid grid-cols-5 gap-2">
        {[1, 2, 3, 4, 5].map(
          (number) => (
            <button
              key={number}
              type="button"
              disabled={
                disabled
              }
              onClick={() =>
                onChange(
                  number,
                )
              }
              className={`h-12 rounded-md border text-sm font-black ${
                value === number
                  ? "border-sky-400 bg-sky-500 text-white"
                  : "border-neutral-200 bg-white"
              }`}
            >
              {number}
            </button>
          ),
        )}
      </div>

      <div className="mt-2 flex justify-between text-xs text-neutral-400">
        <span>
          Strongly disagree
        </span>

        <span>
          Strongly agree
        </span>
      </div>
    </div>
  );
}

/* ============================================================
   QUESTION LOADING
   ============================================================ */

function QuestionLoading() {
  return (
    <div className="mx-auto flex min-h-[360px] max-w-[860px] items-center justify-center rounded-xl border border-neutral-200 bg-white">
      <span className="size-8 animate-spin rounded-full border-[3px] border-neutral-200 border-t-sky-500" />
    </div>
  );
}

/* ============================================================
   HELPERS
   ============================================================ */

function candidateModules(
  modules: AssessmentModule[],
): AssessmentModule[] {
  const prepared = [...modules]
    .sort(
      (a, b) =>
        a.orderIndex -
        b.orderIndex,
    )
    .map((module) => ({
      ...module,
      questions:
        module.questions ??
        [],
    }))
    .filter(
      (module) =>
        module.type === "coding" ||
        module.type === "ai_interview" ||
        (module.questions?.length ?? 0) >
          0,
    );

  return [
    ...prepared.filter(
      (module) =>
        module.type !==
        "ai_interview",
    ),
    ...prepared.filter(
      (module) =>
        module.type ===
        "ai_interview",
    ),
  ];
}

function toAdaptiveQuestions(
  questions?: string[],
): Question[] {
  return (questions ?? [])
    .map((text, index) => ({
      id: `ai-adaptive-${index}`,
      questionText:
        text.trim(),
      questionType:
        "short_answer" as const,
    }))
    .filter(
      (question) =>
        question.questionText.length >
        0,
    );
}

function questionResponsesComplete(
  module: AssessmentModule,
  answers: Record<string, Answer>,
  followUps: Record<string, FollowUp>,
) {
  if (
    module.type ===
    "coding"
  ) {
    return true;
  }

  const questions =
    module.questions ?? [];

  return (
    questions.length > 0 &&
    questions.every(
      (question) =>
        Boolean(
          answers[
            question.id
          ]?.text.trim(),
        ) &&
        (!followUps[
          question.id
        ] ||
          Boolean(
            followUps[
              question.id
            ]?.answer.trim(),
          )),
    )
  );
}

function moduleComplete(
  module: AssessmentModule,
  answers: Record<string, Answer>,
  followUps: Record<string, FollowUp>,
  codingComplete: boolean,
  adaptiveReady: boolean,
) {
  return (
    questionResponsesComplete(
      module,
      answers,
      followUps,
    ) &&
    (module.type !==
      "coding" ||
      codingComplete) &&
    (module.type !==
      "ai_interview" ||
      adaptiveReady)
  );
}

function allModulesComplete(
  modules: AssessmentModule[],
  answers: Record<string, Answer>,
  followUps: Record<string, FollowUp>,
  codingComplete: boolean,
  adaptiveReady: boolean,
) {
  return (
    modules.length > 0 &&
    modules.every(
      (module) =>
        moduleComplete(
          module,
          answers,
          followUps,
          codingComplete,
          adaptiveReady,
        ),
    )
  );
}

function completionPercent(
  modules: AssessmentModule[],
  answers: Record<string, Answer>,
  followUps: Record<string, FollowUp>,
  codingComplete: boolean,
  adaptiveReady: boolean,
) {
  if (!modules.length) {
    return 0;
  }

  const completed =
    modules.filter(
      (module) =>
        moduleComplete(
          module,
          answers,
          followUps,
          codingComplete,
          adaptiveReady,
        ),
    ).length;

  return Math.round(
    (completed /
      modules.length) *
      100,
  );
}

function moduleIcon(
  type: AssessmentModule["type"],
): IconName {
  if (
    type === "coding" ||
    type === "debugging"
  ) {
    return "code";
  }

  if (
    type === "leadership"
  ) {
    return "crown";
  }

  if (
    type === "communication"
  ) {
    return "paperPlane";
  }

  if (
    type === "behavioral" ||
    type === "work_style"
  ) {
    return "users";
  }

  if (
    type ===
    "problem_solving"
  ) {
    return "sparkle";
  }

  return "message";
}

function stageFormatLabel(
  type: AssessmentModule["type"],
) {
  switch (type) {
    case "coding":
      return "Coding exercise";

    case "ai_interview":
      return "Adaptive conversation";

    case "work_style":
      return "Work-style reflection";

    case "debugging":
    case "problem_solving":
      return "Technical discussion";

    default:
      return "Structured conversation";
  }
}

function stageBriefingText(
  module: AssessmentModule,
) {
  if (
    module.type ===
    "coding"
  ) {
    return "Work through the coding exercises in the language you are most comfortable using. Run your solution and submit each exercise.";
  }

  if (
    module.type ===
    "ai_interview"
  ) {
    return "This conversation builds on your earlier answers. Questions may adapt to your responses so the interviewer can understand your experience in more depth.";
  }

  if (
    module.type ===
    "work_style"
  ) {
    return "Share how you typically approach work. Answer honestly based on your own experience.";
  }

  if (
    module.type ===
      "debugging" ||
    module.type ===
      "problem_solving"
  ) {
    return "Explain how you diagnose problems, compare options, and reach decisions. Your reasoning is important.";
  }

  return "Answer from your own experience. Use a concrete situation where possible and explain your actions, reasoning, and result.";
}

function hasAiInterviewer(
  modules: AssessmentModule[],
) {
  return modules.some(
    (module) =>
      module.type ===
      "ai_interview",
  );
}

function adaptiveQuestionCount(
  settings?: JsonValue,
) {
  if (
    !settings ||
    typeof settings !==
      "object" ||
    Array.isArray(
      settings,
    )
  ) {
    return 3;
  }

  const value =
    Number(
      (
        settings as Record<
          string,
          JsonValue
        >
      ).adaptiveQuestionCount,
    );

  if (
    !Number.isFinite(value)
  ) {
    return 3;
  }

  return Math.min(
    5,
    Math.max(
      1,
      Math.trunc(value),
    ),
  );
}

function questionOptions(
  value?: JsonValue,
): string[] {
  if (
    Array.isArray(value)
  ) {
    return value.filter(
      (
        item,
      ): item is string =>
        typeof item ===
        "string",
    );
  }

  if (
    value &&
    typeof value ===
      "object"
  ) {
    const record =
      value as Record<
        string,
        JsonValue
      >;

    for (const key of [
      "options",
      "choices",
      "answers",
    ]) {
      const nested =
        record[key];

      if (
        Array.isArray(
          nested,
        )
      ) {
        return nested
          .map((item) => {
            if (
              typeof item ===
              "string"
            ) {
              return item;
            }

            if (
              item &&
              typeof item ===
                "object" &&
              !Array.isArray(
                item,
              )
            ) {
              const object =
                item as Record<
                  string,
                  JsonValue
                >;

              return String(
                object.label ??
                  object.value ??
                  "",
              );
            }

            return "";
          })
          .filter(Boolean);
      }
    }
  }

  return [];
}

function numericAnswer(
  answer?: Answer,
) {
  const value =
    answer?.json &&
    typeof answer.json ===
      "object" &&
    !Array.isArray(
      answer.json,
    )
      ? (
          answer.json as Record<
            string,
            JsonValue
          >
        ).value
      : answer?.text;

  const number =
    Number(value);

  return Number.isFinite(
    number,
  )
    ? number
    : undefined;
}

function firstName(
  name: string,
) {
  return (
    name.trim().split(/\s+/)[0] ||
    "Candidate"
  );
}

function formatTimer(
  seconds: number,
) {
  if (
    !Number.isFinite(
      seconds,
    ) ||
    seconds < 0
  ) {
    return "--:--";
  }

  const minutes =
    Math.floor(
      seconds / 60,
    );

  const remaining =
    Math.floor(
      seconds % 60,
    );

  return `${String(
    minutes,
  ).padStart(
    2,
    "0",
  )}:${String(
    remaining,
  ).padStart(
    2,
    "0",
  )}`;
}

/* ============================================================
   ADAPTIVE SAVED RESPONSE
   ============================================================ */

function parseAdaptiveSavedResponse(
  response: CandidateResponse,
):
  | {
      questionId: string;
      question: string;
      answer: string;
      followUp?: FollowUp;
    }
  | undefined {
  const json =
    response.responseJson;

  if (
    !json ||
    typeof json !==
      "object" ||
    Array.isArray(
      json,
    )
  ) {
    return undefined;
  }

  const record =
    json as Record<
      string,
      JsonValue
    >;

  if (
    record.adaptive !== true ||
    typeof record.question !==
      "string" ||
    typeof record.questionId !==
      "string"
  ) {
    return undefined;
  }

  const marker =
    "\n\nResponse: ";

  const index =
    response.responseText.indexOf(
      marker,
    );

  const answer =
    index >= 0
      ? response.responseText
          .slice(
            index +
              marker.length,
          )
          .trim()
      : response.responseText.trim();

  if (!answer) {
    return undefined;
  }

  let followUp:
    | FollowUp
    | undefined;

  const rawFollowUp =
    record.aiFollowUp;

  if (
    rawFollowUp &&
    typeof rawFollowUp ===
      "object" &&
    !Array.isArray(
      rawFollowUp,
    )
  ) {
    const data =
      rawFollowUp as Record<
        string,
        JsonValue
      >;

    if (
      typeof data.question ===
      "string"
    ) {
      followUp = {
        question:
          data.question,

        answer:
          typeof data.answer ===
          "string"
            ? data.answer
            : "",
      };
    }
  }

  return {
    questionId:
      record.questionId,

    question:
      record.question,

    answer,

    followUp,
  };
}

/* ============================================================
   ERROR HELPERS
   ============================================================ */

function isPendingInterviewerQuestionError(
  error: unknown,
) {
  if (
    !(error instanceof ApiError)
  ) {
    return false;
  }

  const details =
    error.details;

  const code =
    details &&
    typeof details ===
      "object"
      ? (
          details as {
            code?: unknown;
          }
        ).code
      : undefined;

  return (
    code ===
      "INTERVIEWER_FOLLOW_UP_REQUIRED" ||
    error.status === 409
  );
}
