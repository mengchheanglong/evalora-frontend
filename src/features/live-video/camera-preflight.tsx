"use client";

import {
  ConnectionQuality,
  ConnectionState,
  Room,
  RoomEvent,
  type Participant,
} from "livekit-client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Icon } from "@/components/icons";
import { EvaloraLogo } from "@/components/logo";
import { apiPost } from "@/lib/api";

type Props = {
  accessCode: string;
  onCancel: () => void;
  onContinue: (stream: MediaStream) => void;
};

type State = "idle" | "requesting" | "ready" | "error";
type MediaDevice = Pick<MediaDeviceInfo, "deviceId" | "label">;
type ConnectivityState = "idle" | "checking" | "connected" | "error";
type NetworkQuality = "checking" | "excellent" | "good" | "poor" | "lost";

/**
 * Candidate-side consent and device check. The parent takes ownership of the
 * stream only after Continue, so cancelling or leaving this screen always
 * stops the camera tracks.
 */
export function CameraPreflight({ accessCode, onCancel, onContinue }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const testRoomRef = useRef<Room | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioFrameRef = useRef<number | null>(null);
  const [state, setState] = useState<State>("idle");
  const [message, setMessage] = useState("");
  const [cameras, setCameras] = useState<MediaDevice[]>([]);
  const [microphones, setMicrophones] = useState<MediaDevice[]>([]);
  const [cameraId, setCameraId] = useState("");
  const [microphoneId, setMicrophoneId] = useState("");
  const [microphoneLevel, setMicrophoneLevel] = useState(0);
  const [connectivity, setConnectivity] = useState<ConnectivityState>("idle");
  const [networkQuality, setNetworkQuality] = useState<NetworkQuality>("checking");

  const stopAudioMeter = useCallback(() => {
    if (audioFrameRef.current !== null) cancelAnimationFrame(audioFrameRef.current);
    audioFrameRef.current = null;
    void audioContextRef.current?.close();
    audioContextRef.current = null;
    setMicrophoneLevel(0);
  }, []);

  const stopConnectivityTest = useCallback(async () => {
    const room = testRoomRef.current;
    room?.removeAllListeners();
    testRoomRef.current = null;
    await room?.disconnect();
  }, []);

  const stopStream = useCallback(() => {
    stopAudioMeter();
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, [stopAudioMeter]);

  useEffect(() => () => {
    void stopConnectivityTest();
    stopStream();
  }, [stopConnectivityTest, stopStream]);

  const startAudioMeter = useCallback((stream: MediaStream) => {
    stopAudioMeter();
    const context = new AudioContext();
    const analyser = context.createAnalyser();
    analyser.fftSize = 256;
    context.createMediaStreamSource(stream).connect(analyser);
    const samples = new Uint8Array(analyser.frequencyBinCount);
    audioContextRef.current = context;

    const measure = () => {
      analyser.getByteTimeDomainData(samples);
      let total = 0;
      for (const sample of samples) {
        const normalized = (sample - 128) / 128;
        total += normalized * normalized;
      }
      setMicrophoneLevel(Math.min(100, Math.round(Math.sqrt(total / samples.length) * 280)));
      audioFrameRef.current = requestAnimationFrame(measure);
    };
    measure();
  }, [stopAudioMeter]);

  const ensureConnectivity = useCallback(async () => {
    if (testRoomRef.current) return;
    setConnectivity("checking");
    setNetworkQuality("checking");
    const room = new Room({ adaptiveStream: true, dynacast: true });
    testRoomRef.current = room;
    console.info("[DeviceCheck:LiveKit] Starting connectivity test", {
      endpoint: `/sessions/access/${encodeURIComponent(accessCode)}/livekit-token`,
    });
    room.on(RoomEvent.ConnectionStateChanged, (connectionState: ConnectionState) => {
      console.info("[DeviceCheck:LiveKit] Connection state changed", connectionState);
    });
    room.on(
      RoomEvent.ConnectionQualityChanged,
      (quality: ConnectionQuality, participant: Participant) => {
        if (participant !== room.localParticipant) return;
        setNetworkQuality(
          quality === ConnectionQuality.Excellent
            ? "excellent"
            : quality === ConnectionQuality.Good
              ? "good"
              : quality === ConnectionQuality.Poor
                ? "poor"
                : quality === ConnectionQuality.Lost
                  ? "lost"
                  : "checking",
        );
      },
    );
    room.on(RoomEvent.Disconnected, (reason) => {
      console.warn("[DeviceCheck:LiveKit] Disconnected", { reason });
      if (testRoomRef.current === room) {
        setConnectivity("error");
        setNetworkQuality("lost");
      }
    });
    room.on(RoomEvent.MediaDevicesError, (deviceError) => {
      console.error("[DeviceCheck:LiveKit] Media devices error", deviceError);
    });

    try {
      console.info("[DeviceCheck:LiveKit] Requesting candidate token");
      const credentials = await apiPost<{ token: string; url: string }>(
        `/sessions/access/${encodeURIComponent(accessCode)}/livekit-token`,
      );
      console.info("[DeviceCheck:LiveKit] Token response received", {
        hasToken: typeof credentials.token === "string" && credentials.token.length > 0,
        tokenLength: typeof credentials.token === "string" ? credentials.token.length : 0,
        url: credentials.url,
      });
      if (!credentials.url?.startsWith("wss://") && !credentials.url?.startsWith("ws://")) {
        throw new Error("LiveKit token endpoint returned an invalid WebSocket URL.");
      }
      if (!credentials.token || credentials.token.split(".").length !== 3) {
        throw new Error("LiveKit token endpoint returned an invalid token.");
      }
      console.info("[DeviceCheck:LiveKit] Connecting room", { url: credentials.url });
      await room.connect(credentials.url, credentials.token);
      console.info("[DeviceCheck:LiveKit] Room connected", {
        room: room.name,
        participant: room.localParticipant.identity,
      });
      setConnectivity("connected");
      const initialQuality = room.localParticipant.connectionQuality;
      setNetworkQuality(
        initialQuality === ConnectionQuality.Excellent
          ? "excellent"
          : initialQuality === ConnectionQuality.Poor
            ? "poor"
            : "good",
      );
    } catch (connectionError) {
      console.error("[DeviceCheck:LiveKit] Connectivity test failed", connectionError);
      if (testRoomRef.current === room) {
        setConnectivity("error");
        setNetworkQuality("lost");
        await stopConnectivityTest();
        throw new Error("LiveKit connectivity check failed.", { cause: connectionError });
      }
    }
  }, [accessCode, stopConnectivityTest]);

  const requestMedia = useCallback(async (nextCameraId = cameraId, nextMicrophoneId = microphoneId) => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setState("error");
      setMessage("Camera access requires a modern browser and a secure HTTPS connection.");
      return;
    }

    stopStream();
    setState("requesting");
    setMessage("");
    try {
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: nextCameraId
            ? { deviceId: { exact: nextCameraId } }
            : { facingMode: "user" },
          audio: nextMicrophoneId
            ? { deviceId: { exact: nextMicrophoneId }, echoCancellation: true, noiseSuppression: true }
            : { echoCancellation: true, noiseSuppression: true },
        });
      } catch (constraintErr) {
        const constraintName = constraintErr instanceof DOMException ? constraintErr.name : "";
        // A machine with no audio input at all still deserves a working camera
        // flow: retry without audio before giving up.
        if (constraintName === "NotFoundError" || constraintName === "DevicesNotFoundError") {
          stream = await navigator.mediaDevices.getUserMedia({
            video: nextCameraId
              ? { deviceId: { exact: nextCameraId } }
              : { facingMode: "user" },
            audio: false,
          });
        } else if (nextCameraId || nextMicrophoneId) {
          // Fallback to default devices if exact device ID constraint failed
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: "user" },
            audio: { echoCancellation: true, noiseSuppression: true },
          });
        } else {
          throw constraintErr;
        }
      }

      streamRef.current = stream;
      const devices = await navigator.mediaDevices.enumerateDevices();
      const nextCameras = devices.filter((device) => device.kind === "videoinput");
      const nextMicrophones = devices.filter((device) => device.kind === "audioinput");
      setCameras(nextCameras);
      setMicrophones(nextMicrophones);
      setCameraId(stream.getVideoTracks()[0]?.getSettings().deviceId ?? nextCameraId);
      setMicrophoneId(stream.getAudioTracks()[0]?.getSettings().deviceId ?? nextMicrophoneId);
      startAudioMeter(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => undefined);
      }
      setState("ready");
      await ensureConnectivity();
    } catch (error) {
      const name = error instanceof DOMException ? error.name : "";
      const connectivityFailed =
        error instanceof Error && error.message === "LiveKit connectivity check failed.";
      // A rejected token request (backend down or erroring) arrives as a plain
      // Error/ApiError, not a DOMException — it must read as a service problem,
      // never as "your camera is broken".
      const serviceProblem =
        !connectivityFailed &&
        !name &&
        !(error instanceof DOMException);
      setState(connectivityFailed || serviceProblem ? "ready" : "error");
      setMessage(
        connectivityFailed
          ? "Your devices are ready, but we could not reach the live interview service. Check your network and try again."
          : serviceProblem
          ? "We could not reach the interview service right now. Your devices are ready — please try again in a moment."
          : name === "NotAllowedError" || name === "PermissionDeniedError"
          ? "Camera or microphone permission was denied. Allow both in your browser, then try again."
          : name === "NotFoundError" || name === "DevicesNotFoundError"
          ? "No camera was found on this device. Please connect a camera and try again."
          : name === "NotReadableError" || name === "TrackStartError"
          ? "Your camera is currently in use by another application."
          : name === "OverconstrainedError"
          ? "The selected camera or microphone is not available. Please try another device."
          : "We could not access your camera and microphone. Check that they are connected and not in use by another app.",
      );
    }
  }, [cameraId, ensureConnectivity, microphoneId, startAudioMeter, stopStream]);

  // The camera is mandatory (the interviewer must see the candidate); a missing
  // microphone must not lock the candidate out of the assessment entirely.
  const requiredChecksPass =
    state === "ready" &&
    cameras.length > 0 &&
    Boolean(streamRef.current?.getVideoTracks().some((track) => track.readyState === "live"));

  async function continueAssessment() {
    const stream = streamRef.current;
    if (!stream) return;
    // The device check and interview use the same candidate identity. Wait for
    // the temporary room to leave before opening the real room, otherwise the
    // two sessions can displace one another during the handoff.
    await stopConnectivityTest();
    stopAudioMeter();
    streamRef.current = null;
    onContinue(stream);
  }

  function cancel() {
    void stopConnectivityTest();
    stopStream();
    onCancel();
  }

  return (
    <main className="min-h-screen bg-[#f4f7f9] px-4 py-8 text-neutral-950 sm:px-6">
      <section className="mx-auto flex min-h-[calc(100vh-64px)] max-w-[760px] items-center">
        <div className="w-full overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-[0_20px_55px_rgba(15,23,42,0.10)]">
          <header className="flex items-center justify-between border-b border-neutral-200 px-5 py-4 sm:px-8">
            <EvaloraLogo compact />

            <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-50 px-3 py-1.5 text-xs font-semibold text-sky-700">
              <Icon name="lock" size={12} />
              Private interview
            </span>
          </header>

          <div className="px-5 py-8 sm:px-8 sm:py-10">
            {/* Heading */}
            <div className="flex items-start gap-4">
              <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-sky-100 text-sky-700">
                <Icon name="video" size={22} />
              </span>

              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-sky-700">Device check</p>
                <h1 className="mt-1 text-2xl font-black tracking-tight">Turn on your camera and microphone</h1>
              </div>
            </div>

            <p className="mt-4 max-w-[560px] text-sm leading-6 text-neutral-600">
              Your live camera and microphone are shared only with the authorized interviewer during this assessment. They are not recorded by this feature.
            </p>

            {/* Video preview */}
            <div className="relative mt-6 overflow-hidden rounded-xl border border-neutral-200 bg-neutral-950">
              <video autoPlay className="aspect-video size-full object-cover" muted playsInline ref={videoRef} />

              {state !== "ready" ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-neutral-950/85 px-5 text-center">
                  <span
                    className={`grid size-12 place-items-center rounded-full ${
                      state === "requesting" ? "bg-white/10" : "bg-white/5"
                    }`}
                  >
                    {state === "requesting" ? (
                      <span className="size-4 animate-spin rounded-full border-2 border-white/25 border-t-white" />
                    ) : (
                      <Icon className="text-white/40" name="video" size={20} />
                    )}
                  </span>
                  <p className="text-sm font-semibold text-white">
                    {state === "requesting"
                      ? "Requesting camera and microphone access…"
                      : state === "error"
                        ? "Camera or microphone unavailable"
                        : "Your camera preview will appear here."}
                  </p>
                  {state !== "requesting" && state !== "error" ? (
                    <p className="max-w-[340px] text-xs leading-5 text-white/50">
                      Enable your devices and approve both browser permissions to continue.
                    </p>
                  ) : null}
                </div>
              ) : (
                <div className="pointer-events-none absolute bottom-3 left-3 flex items-center gap-1.5 rounded-full bg-black/60 px-3 py-1.5 text-xs font-bold text-white backdrop-blur">
                  <span className="size-1.5 animate-pulse rounded-full bg-emerald-400" />
                  Camera and microphone ready
                </div>
              )}
            </div>

            {state === "ready" ? (
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <label className="text-xs font-bold text-neutral-700">
                  Camera
                  <select
                    className="mt-1.5 h-10 w-full rounded-lg border border-neutral-200 bg-white px-3 text-sm font-medium outline-none focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10"
                    onChange={(event) => {
                      const value = event.target.value;
                      setCameraId(value);
                      void requestMedia(value, microphoneId);
                    }}
                    value={cameraId}
                  >
                    {cameras.map((device, index) => (
                      <option key={device.deviceId} value={device.deviceId}>
                        {device.label || `Camera ${index + 1}`}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="text-xs font-bold text-neutral-700">
                  Microphone
                  <select
                    className="mt-1.5 h-10 w-full rounded-lg border border-neutral-200 bg-white px-3 text-sm font-medium outline-none focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10"
                    onChange={(event) => {
                      const value = event.target.value;
                      setMicrophoneId(value);
                      void requestMedia(cameraId, value);
                    }}
                    value={microphoneId}
                  >
                    {microphones.map((device, index) => (
                      <option key={device.deviceId} value={device.deviceId}>
                        {device.label || `Microphone ${index + 1}`}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            ) : null}

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4">
                <div className="flex items-center justify-between text-xs font-bold text-neutral-700">
                  <span>Microphone input</span>
                  <span>{microphoneLevel > 4 ? "Detected" : "Speak to test"}</span>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-neutral-200">
                  <div
                    className="h-full rounded-full bg-emerald-500 transition-[width] duration-100"
                    style={{ width: `${microphoneLevel}%` }}
                  />
                </div>
              </div>

              <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4">
                <div className="flex items-center justify-between text-xs font-bold text-neutral-700">
                  <span>Live connection</span>
                  <span className={connectivity === "connected" ? "text-emerald-600" : connectivity === "error" ? "text-rose-600" : "text-amber-600"}>
                    {connectivity === "connected" ? "Connected" : connectivity === "error" ? "Failed" : connectivity === "checking" ? "Checking…" : "Not checked"}
                  </span>
                </div>
                <div className="mt-3 flex items-center gap-2 text-xs text-neutral-600">
                  <span className={`size-2 rounded-full ${
                    networkQuality === "excellent"
                      ? "bg-emerald-500"
                      : networkQuality === "good"
                        ? "bg-sky-500"
                        : networkQuality === "poor"
                          ? "bg-amber-500"
                          : "bg-rose-500"
                  }`} />
                  Network: <span className="font-bold capitalize">{networkQuality}</span>
                </div>
              </div>
            </div>

            {message ? (
              <div className="mt-4 flex items-start gap-2.5 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3">
                <Icon className="mt-0.5 shrink-0 text-rose-500" name="shield" size={15} />
                <p className="text-sm leading-5 text-rose-700">{message}</p>
              </div>
            ) : null}

            {/* Actions */}
            <div className="mt-7 flex flex-wrap items-center justify-between gap-3">
              <button className="button-secondary h-10 px-4" onClick={cancel} type="button">
                <Icon name="chevron" className="rotate-90" size={14} />
                Back
              </button>

              <div className="flex flex-wrap items-center gap-3">
                {state !== "ready" ? (
                  <button
                    className="button-secondary h-10 px-4"
                    disabled={state === "requesting"}
                    onClick={() => void requestMedia()}
                    type="button"
                  >
                    {state === "requesting" ? (
                      <>
                        <span className="size-3 animate-spin rounded-full border-2 border-neutral-300 border-t-neutral-600" />
                        Requesting…
                      </>
                    ) : (
                      <>
                        <Icon name="video" size={14} />
                        Enable devices
                      </>
                    )}
                  </button>
                ) : null}

                <button
                  className="button-primary h-10 px-5"
                  disabled={!requiredChecksPass}
                  onClick={continueAssessment}
                  type="button"
                >
                  Continue
                  <Icon className="-rotate-90" name="chevron" size={14} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
