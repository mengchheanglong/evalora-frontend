/** Deterministic initials + pastel background from candidate name (no static stock photos). */

// Each tone carries a solid `bg-*` base (guarantees the circle is always filled)
// plus gradient stops that enhance it where the linear-gradient utility renders.
const PALETTE = [
  "bg-sky-100 from-sky-100 to-cyan-100 text-sky-800",
  "bg-violet-100 from-violet-100 to-fuchsia-100 text-violet-800",
  "bg-emerald-100 from-emerald-100 to-teal-100 text-emerald-800",
  "bg-amber-100 from-amber-100 to-orange-100 text-amber-900",
  "bg-rose-100 from-rose-100 to-pink-100 text-rose-800",
  "bg-indigo-100 from-indigo-100 to-blue-100 text-indigo-800",
];

function hashName(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash;
}

export function candidateInitials(candidateName: string): string {
  const parts = candidateName.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "EV";
  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function candidateAvatarTone(candidateName: string): string {
  return PALETTE[hashName(candidateName.trim().toLowerCase()) % PALETTE.length];
}

