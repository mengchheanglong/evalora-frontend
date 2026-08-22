import type { Room } from "livekit-client";

export const LIVE_CAPTION_TOPIC = "evalora.live-captions";

export type LiveCaption = {
  id: string;
  speaker: string;
  text: string;
  timestamp: number;
  final: boolean;
};

type RecognitionResult = {
  isFinal: boolean;
  0: { transcript: string };
};

type RecognitionEvent = Event & {
  resultIndex: number;
  results: ArrayLike<RecognitionResult>;
};

type Recognition = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: RecognitionEvent) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
};

type RecognitionConstructor = new () => Recognition;

export type CaptionController = {
  supported: boolean;
  /** Human-readable reason when supported is false (browser has no Web Speech API). */
  unsupportedReason?: string;
  start(): void;
  stop(): void;
};

export function createCandidateCaptionController(
  room: Room,
  speaker = "Candidate",
): CaptionController {
  const browser = window as typeof window & {
    SpeechRecognition?: RecognitionConstructor;
    webkitSpeechRecognition?: RecognitionConstructor;
  };
  const Constructor = browser.SpeechRecognition ?? browser.webkitSpeechRecognition;
  if (!Constructor) {
    return {
      supported: false,
      unsupportedReason:
        "Live captions are not supported in this browser. Use Chrome or Edge to see your speech transcribed live.",
      start() {},
      stop() {},
    };
  }

  const recognition = new Constructor();
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.lang = navigator.language || "en-US";
  let active = false;
  let restartTimer: number | null = null;
  const phraseId = () => crypto.randomUUID();
  let currentId = phraseId();

  recognition.onresult = (event) => {
    for (let index = event.resultIndex; index < event.results.length; index += 1) {
      const result = event.results[index];
      const text = result?.[0]?.transcript.trim();
      if (!text) continue;
      const caption: LiveCaption = {
        id: currentId,
        speaker,
        text,
        timestamp: Date.now(),
        final: result.isFinal,
      };
      void room.localParticipant
        .sendText(JSON.stringify(caption), { topic: LIVE_CAPTION_TOPIC })
        .catch(() => undefined);
      if (result.isFinal) currentId = phraseId();
    }
  };
  recognition.onend = () => {
    if (!active) return;
    restartTimer = window.setTimeout(() => {
      try {
        recognition.start();
      } catch {
        // The browser may still be closing the previous recognition session.
      }
    }, 300);
  };
  recognition.onerror = () => undefined;

  return {
    supported: true,
    start() {
      if (active) return;
      active = true;
      try {
        recognition.start();
      } catch {
        // Already running.
      }
    },
    stop() {
      active = false;
      if (restartTimer !== null) window.clearTimeout(restartTimer);
      restartTimer = null;
      try {
        recognition.stop();
      } catch {
        recognition.abort();
      }
    },
  };
}

export function parseLiveCaption(value: string): LiveCaption | null {
  try {
    const parsed = JSON.parse(value) as Partial<LiveCaption>;
    if (
      typeof parsed.id !== "string" ||
      typeof parsed.speaker !== "string" ||
      typeof parsed.text !== "string" ||
      typeof parsed.timestamp !== "number" ||
      typeof parsed.final !== "boolean"
    ) return null;
    return parsed as LiveCaption;
  } catch {
    return null;
  }
}
