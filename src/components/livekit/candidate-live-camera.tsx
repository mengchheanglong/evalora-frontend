"use client";

import {
  ConnectionQuality,
  Room,
  RoomEvent,
  Track,
  VideoQuality,
  type RemoteTrack,
  type RemoteTrackPublication,
  type RemoteParticipant,
  type RemoteAudioTrack,
  type RemoteVideoTrack,
  type TrackPublication,
  type Participant,
} from "livekit-client";
import { useEffect, useRef, useState } from "react";
import type { RefObject } from "react";
import { apiPost, getErrorMessage } from "@/lib/api";
import {
  LIVE_CAPTION_TOPIC,
  parseLiveCaption,
  type LiveCaption,
} from "@/features/live-video/live-captions";

type CandidateLiveCameraProps = {
  sessionId: string;
  onConnectionQualityChange?: (quality: MediaConnectionQuality) => void;
  onStatusChange?: (status: CameraStatus) => void;
  lowBandwidthMode?: boolean;
  onCaption?: (caption: LiveCaption) => void;
  onMicrophoneStateChange?: (state: "waiting" | "live" | "muted") => void;
  interviewerMicrophoneMuted?: boolean;
  onInterviewerMicrophoneStateChange?: (state: "connecting" | "live" | "muted" | "error") => void;
  /** When true, renders just the video (no header/card wrapper). */
  compact?: boolean;
  /** External video ref to attach tracks to instead of the internal one. */
  externalVideoRef?: RefObject<HTMLVideoElement | null>;
};

export type CameraStatus =
  | "waiting"
  | "connecting"
  | "reconnecting"
  | "connected"
  | "error"
  | "offline";

export type MediaConnectionQuality = "excellent" | "good" | "poor" | "lost";

function mediaConnectionQuality(quality: ConnectionQuality): MediaConnectionQuality {
  return quality === ConnectionQuality.Excellent
    ? "excellent"
    : quality === ConnectionQuality.Good
      ? "good"
      : quality === ConnectionQuality.Poor
        ? "poor"
        : "lost";
}

/**
 * Interviewer-side camera panel.
 *
 * Connects to the interview's LiveKit room, subscribes to the candidate's
 * camera publication, and displays the remote video.
 */
export function CandidateLiveCamera({
  sessionId,
  compact,
  externalVideoRef,
  onConnectionQualityChange,
  onMicrophoneStateChange,
  onStatusChange,
  lowBandwidthMode = false,
  onCaption,
  interviewerMicrophoneMuted = true,
  onInterviewerMicrophoneStateChange,
}: CandidateLiveCameraProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  /** Use external ref if provided, otherwise internal. */
  const targetVideoRef = externalVideoRef ?? videoRef;
  const roomRef = useRef<Room | null>(null);
  const lowBandwidthModeRef = useRef(lowBandwidthMode);
  lowBandwidthModeRef.current = lowBandwidthMode;
  const [status, setStatus] = useState<CameraStatus>("waiting");
  const [error, setError] = useState("");
  const [microphoneState, setMicrophoneState] = useState<"waiting" | "live" | "muted">("waiting");
  const [connectionQuality, setConnectionQuality] =
    useState<MediaConnectionQuality>("lost");
  const interviewerMicrophoneMutedRef = useRef(interviewerMicrophoneMuted);
  interviewerMicrophoneMutedRef.current = interviewerMicrophoneMuted;
  const reconciliationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    onMicrophoneStateChange?.(microphoneState);
  }, [microphoneState, onMicrophoneStateChange]);

  useEffect(() => {
    onConnectionQualityChange?.(connectionQuality);
  }, [connectionQuality, onConnectionQualityChange]);

  useEffect(() => {
    onStatusChange?.(status);
  }, [onStatusChange, status]);

  useEffect(() => {
    for (const participant of roomRef.current?.remoteParticipants.values() ?? []) {
      participant.getTrackPublication(Track.Source.Camera)?.setVideoQuality(
        lowBandwidthMode ? VideoQuality.LOW : VideoQuality.HIGH,
      );
    }
  }, [lowBandwidthMode]);

  useEffect(() => {
    const room = roomRef.current;
    if (!room || room.state !== "connected") return;
    onInterviewerMicrophoneStateChange?.("connecting");
    void room.localParticipant
      .setMicrophoneEnabled(!interviewerMicrophoneMuted)
      .then(() => {
        onInterviewerMicrophoneStateChange?.(
          interviewerMicrophoneMuted ? "muted" : "live",
        );
      })
      .catch((publishError) => {
        console.error("[CandidateLiveCamera] Interviewer microphone failed:", publishError);
        onInterviewerMicrophoneStateChange?.("error");
      });
  }, [interviewerMicrophoneMuted, onInterviewerMicrophoneStateChange]);

  useEffect(() => {
    let cancelled = false;
    let attachedTrack: RemoteVideoTrack | null = null;
    let attachedAudioTrack: RemoteAudioTrack | null = null;
    let audioElement: HTMLAudioElement | null = null;
    const room = new Room({
      adaptiveStream: true,
      dynacast: true,
    });
    roomRef.current = room;
    room.registerTextStreamHandler(LIVE_CAPTION_TOPIC, (reader) => {
      void reader.readAll().then((value) => {
        if (cancelled) return;
        const caption = parseLiveCaption(value);
        if (caption) onCaption?.(caption);
      }).catch(() => undefined);
    });

    function cleanupVideo() {
      const video = targetVideoRef.current;
      if (attachedTrack && video) {
        attachedTrack.detach(video);
      }
      attachedTrack = null;
      if (video) video.srcObject = null;
    }

    function cleanupAudio() {
      if (attachedAudioTrack && audioElement) {
        attachedAudioTrack.detach(audioElement);
      }
      attachedAudioTrack = null;
      audioElement = null;
      setMicrophoneState("waiting");
    }

    function attachCandidateTrack(track: RemoteTrack) {
      if (cancelled) return;
      if (track.kind !== Track.Kind.Video) return;

      cleanupVideo();
      attachedTrack = track as RemoteVideoTrack;
      const video = targetVideoRef.current;
      console.log("[LiveKit] attaching candidate video track", {
        sid: (track as RemoteVideoTrack).sid,
        hasVideo: Boolean(video),
      });
      if (video) {
        attachedTrack.attach(video);
        void video.play().then(() => {
          console.log("[LiveKit] video playback started");
        }).catch((playError) => {
          console.warn("[LiveKit] video play failed, retrying:", playError);
          // Retry play after a short delay (handles autoplay policy)
          setTimeout(() => {
            if (!cancelled && video.srcObject) {
              void video.play().catch(() => undefined);
            }
          }, 500);
        });
      }
      setError("");
      setStatus("connected");
    }

    function attachCandidateAudio(track: RemoteTrack, publication: RemoteTrackPublication) {
      if (cancelled || track.kind !== Track.Kind.Audio) return;

      cleanupAudio();
      attachedAudioTrack = track as RemoteAudioTrack;
      audioElement = document.createElement("audio");
      audioElement.autoplay = true;
      attachedAudioTrack.attach(audioElement);
      void audioElement.play().catch(() => undefined);
      setMicrophoneState(publication.isMuted ? "muted" : "live");
    }

    function isCandidateMedia(publication: RemoteTrackPublication) {
      return publication.source === Track.Source.Camera ||
        publication.source === Track.Source.Microphone;
    }

    function attachSubscribedPublication(publication: RemoteTrackPublication) {
      if (!isCandidateMedia(publication) || !publication.isSubscribed || !publication.track) {
        return;
      }
      if (publication.source === Track.Source.Camera) {
        attachCandidateTrack(publication.track);
      } else if (publication.source === Track.Source.Microphone) {
        attachCandidateAudio(publication.track, publication);
      }
    }

    function subscribeToParticipant(participant: RemoteParticipant) {
      console.log("[LiveKit] subscribeToParticipant", participant.identity, {
        publications: [...participant.trackPublications.values()].map((p) => ({
          source: p.source,
          isSubscribed: p.isSubscribed,
          hasTrack: Boolean(p.track),
          sid: p.trackSid,
        })),
      });
      for (const publication of participant.trackPublications.values()) {
        if (!isCandidateMedia(publication)) continue;
        publication.setSubscribed(true);
        if (publication.source === Track.Source.Camera) {
          publication.setVideoQuality(
            lowBandwidthModeRef.current ? VideoQuality.LOW : VideoQuality.HIGH,
          );
        }
        attachSubscribedPublication(publication);
      }
    }

    function handleTrackSubscribed(
      track: RemoteTrack,
      publication: RemoteTrackPublication,
    ) {
      console.log("[LiveKit] track subscribed", {
        kind: track.kind,
        source: publication.source,
        sid: publication.trackSid,
      });
      if (publication.source === Track.Source.Camera) {
        publication.setVideoQuality(
          lowBandwidthModeRef.current ? VideoQuality.LOW : VideoQuality.HIGH,
        );
        attachCandidateTrack(track);
      } else if (publication.source === Track.Source.Microphone) {
        attachCandidateAudio(track, publication);
      }
    }

    function handleTrackPublished(publication: RemoteTrackPublication, participant: RemoteParticipant) {
      console.log("[LiveKit] track published", publication.source);
      subscribeToParticipant(participant);
    }

    function handleTrackUnsubscribed(track: RemoteTrack) {
      if (track === attachedTrack) {
        cleanupVideo();
        setStatus("waiting");
        setError("");
      } else if (track === attachedAudioTrack) {
        cleanupAudio();
      }
    }

    function handleTrackMuted(publication: TrackPublication) {
      if (publication.source === Track.Source.Microphone) {
        setMicrophoneState("muted");
      }
    }

    function handleTrackUnmuted(publication: TrackPublication) {
      if (publication.source === Track.Source.Microphone) {
        setMicrophoneState("live");
      }
    }

    function handleConnectionQualityChanged(
      quality: ConnectionQuality,
      participant: Participant,
    ) {
      if (participant !== room.localParticipant) {
        setConnectionQuality(mediaConnectionQuality(quality));
      }
    }

    function restoreSubscribedTracks() {
      for (const participant of room.remoteParticipants.values()) {
        setConnectionQuality(
          mediaConnectionQuality(participant.connectionQuality),
        );
        subscribeToParticipant(participant);
      }
      setStatus(attachedTrack ? "connected" : "waiting");
    }

    room
      .on(RoomEvent.ParticipantConnected, (participant) => {
        console.log("[LiveKit] participant joined", participant.identity);
        subscribeToParticipant(participant);
      })
      .on(RoomEvent.ParticipantDisconnected, (participant) => {
        console.log("[LiveKit] participant left", participant.identity);
        cleanupVideo();
        cleanupAudio();
        setStatus("waiting");
        setConnectionQuality("lost");
      })
      .on(RoomEvent.TrackPublished, handleTrackPublished)
      .on(RoomEvent.TrackSubscribed, handleTrackSubscribed)
      .on(RoomEvent.TrackUnsubscribed, handleTrackUnsubscribed)
      .on(RoomEvent.TrackMuted, handleTrackMuted)
      .on(RoomEvent.TrackUnmuted, handleTrackUnmuted)
      .on(RoomEvent.ConnectionQualityChanged, handleConnectionQualityChanged)
      .on(RoomEvent.Reconnecting, () => {
        if (!cancelled) setStatus("reconnecting");
      })
      .on(RoomEvent.Reconnected, () => {
        if (!cancelled) {
          restoreSubscribedTracks();
          void room.localParticipant
            .setMicrophoneEnabled(!interviewerMicrophoneMutedRef.current)
            .then(() => {
              onInterviewerMicrophoneStateChange?.(
                interviewerMicrophoneMutedRef.current ? "muted" : "live",
              );
            })
            .catch(() => onInterviewerMicrophoneStateChange?.("error"));
        }
      })
      .on(RoomEvent.Disconnected, () => {
        if (!cancelled) {
          cleanupVideo();
          cleanupAudio();
          setStatus("offline");
          setConnectionQuality("lost");
        }
      });

    void (async () => {
      setStatus("connecting");
      setError("");
      try {
        const credentials = await apiPost<{ token: string; url: string }>(
          `/sessions/${encodeURIComponent(sessionId)}/livekit-token`,
        );
        if (cancelled) return;

        await room.connect(credentials.url, credentials.token, {
          autoSubscribe: true,
        });
        if (cancelled) {
          room.disconnect();
          return;
        }

        console.log("[LiveKit] interviewer joined room", {
          requestedSessionId: sessionId,
          roomName: room.name,
          remoteParticipants: [...room.remoteParticipants.keys()],
        });

        // Participants and tracks may already exist before event listeners can
        // observe their publication. Always reconcile the room after joining.
        room.remoteParticipants.forEach((participant) => {
          subscribeToParticipant(participant);
        });

        await room.localParticipant.setMicrophoneEnabled(
          !interviewerMicrophoneMutedRef.current,
        );
        onInterviewerMicrophoneStateChange?.(
          interviewerMicrophoneMutedRef.current ? "muted" : "live",
        );

        // TrackSubscribed normally fires during connection. Reconcile current
        // publications too so already-published media cannot be missed.
        restoreSubscribedTracks();

        // A connected interviewer with no remote participant cannot receive a
        // track. Surface the room mismatch clearly instead of showing an
        // indefinite transport-level Connecting state.
        if (room.remoteParticipants.size === 0) {
          setStatus("waiting");
          setError("Waiting for the candidate to join this interview session.");
        }

        // Periodic reconciliation: catch any tracks that were published
        // after the initial subscription pass or missed by event handlers.
        const reconciliationInterval = setInterval(() => {
          if (cancelled || room.state !== "connected") return;
          for (const participant of room.remoteParticipants.values()) {
            const cameraPub = participant.getTrackPublication(Track.Source.Camera);
            if (cameraPub && cameraPub.isSubscribed && cameraPub.track && !attachedTrack) {
              console.warn("[LiveKit] reconciliation: re-attaching missed camera track");
              attachCandidateTrack(cameraPub.track);
            }
            const micPub = participant.getTrackPublication(Track.Source.Microphone);
            if (micPub && micPub.isSubscribed && micPub.track && !attachedAudioTrack) {
              console.warn("[LiveKit] reconciliation: re-attaching missed microphone track");
              attachCandidateAudio(micPub.track, micPub);
            }
          }
          // If we are still waiting but a participant appeared, try subscribing
          if (room.remoteParticipants.size > 0 && !attachedTrack) {
            for (const participant of room.remoteParticipants.values()) {
              subscribeToParticipant(participant);
            }
          }
        }, 3_000);

        // Store interval for cleanup
        reconciliationIntervalRef.current = reconciliationInterval;
      } catch (requestError) {
        if (!cancelled) {
          console.error("[CandidateLiveCamera] LiveKit connection failed:", requestError);
          setStatus("error");
          setError(
            getErrorMessage(
              requestError,
              "Failed to connect to the candidate camera.",
            ),
          );
        }
      }
    })();

    return () => {
      cancelled = true;
      if (reconciliationIntervalRef.current) {
        clearInterval(reconciliationIntervalRef.current);
        reconciliationIntervalRef.current = null;
      }
      cleanupVideo();
      cleanupAudio();
      setConnectionQuality("lost");
      room.removeAllListeners();
      room.unregisterTextStreamHandler(LIVE_CAPTION_TOPIC);
      if (roomRef.current === room) roomRef.current = null;
      room.disconnect();
    };
  }, [onCaption, onInterviewerMicrophoneStateChange, sessionId, targetVideoRef]);

  if (compact) {
    // The live room renders the visible draggable video element. Keep this
    // component mounted for its signaling effect, but do not attach the same
    // ref to a second hidden <video> element.
    if (externalVideoRef) return null;

    return (
      <div className="relative size-full bg-[#0b0f17]">
        <video
          ref={targetVideoRef}
          autoPlay
          playsInline
          muted
          className="size-full object-cover"
        />

        {status !== "connected" ? (
          <div className="absolute inset-0 flex items-center justify-center px-6 text-center">
            <div>
              <div className="mx-auto mb-3 flex size-10 items-center justify-center rounded-full bg-white/10">
                <span
                  className={`size-3 rounded-full ${
                    status === "error"
                      ? "bg-red-400"
                      : "bg-amber-400"
                  }`}
                />
              </div>

              <p className="text-sm font-semibold text-white">
                {status === "waiting"
                  ? "Waiting for candidate camera..."
                  : status === "reconnecting"
                    ? "Reconnecting..."
                  : status === "connecting"
                    ? "Connecting to candidate..."
                    : status === "offline"
                      ? "Live camera disconnected"
                      : "Unable to connect to camera"}
              </p>

              {error ? (
                <p className="mt-2 max-w-md text-xs leading-5 text-white/60">
                  {error}
                </p>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <section className="overflow-hidden rounded-xl border border-[var(--theme-border)] bg-black shadow-[var(--shadow-card)]">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 bg-[#111827] px-4 py-3">
        <div>
          <p className="text-sm font-bold text-white">
            Candidate Camera
          </p>

          <p className="mt-0.5 text-xs text-white/60">
            Live interview video
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-semibold">
          <span
            className={`size-2 rounded-full ${
              status === "connected"
                ? "bg-emerald-400"
                : status === "error"
                  ? "bg-red-400"
                  : "bg-amber-400"
            }`}
          />

          <span className="text-white/80">
            {status === "connected"
              ? "Live"
              : status === "waiting"
                ? "Waiting for candidate"
                : status === "reconnecting"
                  ? "Reconnecting..."
                : status === "connecting"
                  ? "Connecting..."
                  : status === "offline"
                    ? "Offline"
                    : "Connection error"}
          </span>

          <span className={`rounded-full px-2 py-1 capitalize ${
            connectionQuality === "excellent"
              ? "bg-emerald-500/15 text-emerald-300"
              : connectionQuality === "good"
                ? "bg-sky-500/15 text-sky-300"
                : connectionQuality === "poor"
                  ? "bg-amber-500/15 text-amber-300"
                  : "bg-rose-500/15 text-rose-300"
          }`}>
            {connectionQuality}
          </span>

          <span className={`rounded-full px-2 py-1 ${
            microphoneState === "muted"
              ? "bg-rose-500/15 text-rose-300"
              : microphoneState === "live"
                ? "bg-emerald-500/15 text-emerald-300"
                : "bg-white/10 text-white/50"
          }`}>
            {microphoneState === "muted"
              ? "Mic muted"
              : microphoneState === "live"
                ? "Mic live"
                : "No mic"}
          </span>
        </div>
      </div>

      {/* Video */}
      <div className="relative aspect-video w-full bg-[#0b0f17]">
        <video
          ref={targetVideoRef}
          autoPlay
          playsInline
          muted
          className="h-full w-full object-cover"
        />

        {status !== "connected" ? (
          <div className="absolute inset-0 flex items-center justify-center px-6 text-center">
            <div>
              <div className="mx-auto mb-3 flex size-10 items-center justify-center rounded-full bg-white/10">
                <span
                  className={`size-3 rounded-full ${
                    status === "error"
                      ? "bg-red-400"
                      : "bg-amber-400"
                  }`}
                />
              </div>

              <p className="text-sm font-semibold text-white">
                {status === "waiting"
                  ? "Waiting for candidate camera..."
                  : status === "reconnecting"
                    ? "Reconnecting..."
                  : status === "connecting"
                    ? "Connecting to candidate..."
                    : status === "offline"
                      ? "Live camera disconnected"
                      : "Unable to connect to camera"}
              </p>

              {error ? (
                <p className="mt-2 max-w-md text-xs leading-5 text-white/60">
                  {error}
                </p>
              ) : null}
            </div>
          </div>
        ) : null}

        <div className="pointer-events-none absolute bottom-3 left-3 rounded-full bg-black/60 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur">
          {status === "connected"
            ? "● Candidate live"
            : "Candidate camera"}
        </div>
      </div>
    </section>
  );
}
