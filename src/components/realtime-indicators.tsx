"use client";

import { Icon } from "@/components/icons";
import type { ConnectionState, InterviewParticipant } from "@/lib/realtime";

const CONNECTION_STYLE: Record<ConnectionState, { label: string; dot: string; text: string }> = {
  connecting: { label: "Connecting", dot: "bg-amber-500 animate-pulse", text: "text-amber-700" },
  live: { label: "Live", dot: "bg-emerald-500", text: "text-emerald-700" },
  reconnecting: { label: "Reconnecting", dot: "bg-amber-500 animate-pulse", text: "text-amber-700" },
  offline: { label: "Offline", dot: "bg-rose-500", text: "text-rose-700" },
};

/** Connection state + measured round-trip latency for the live channel. */
export function ConnectionPill({ state, latencyMs, showLatency = true }: { state: ConnectionState; latencyMs?: number | null; showLatency?: boolean }) {
  const style = CONNECTION_STYLE[state];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full bg-[var(--theme-panel-soft)] px-2.5 py-1 text-xs font-bold ${style.text}`}
      title={state === "live" ? "Updates arrive instantly over the live connection" : "Your work is saved either way"}
    >
      <span className={`size-1.5 rounded-full ${style.dot}`} />
      {style.label}
      {showLatency && state === "live" && typeof latencyMs === "number" ? (
        <span className="font-semibold text-[var(--theme-faint)]">· {latencyMs} ms</span>
      ) : null}
    </span>
  );
}

export function PresenceChips({ participants }: { participants: InterviewParticipant[] }) {
  if (!participants.length) return null;
  return (
    <span className="inline-flex items-center gap-1.5">
      {participants.map((participant) => (
        <span
          className="inline-flex items-center gap-1.5 rounded-full bg-[var(--theme-panel-soft)] px-2.5 py-1 text-xs font-semibold text-[var(--theme-muted)]"
          key={`${participant.role}-${participant.userId}`}
          title={`${participant.name} is in this session`}
        >
          <Icon name={participant.role === "candidate" ? "user" : "users"} size={12} />
          {participant.name.split(" ")[0]}
          <span className="size-1.5 rounded-full bg-emerald-500" />
        </span>
      ))}
    </span>
  );
}
