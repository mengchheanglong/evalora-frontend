const chipStyles: Record<string, string> = {
  Completed: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  "In progress": "bg-sky-50 text-blue-700 ring-sky-200",
  Invited: "bg-amber-50 text-amber-700 ring-amber-200",
  "Report ready": "bg-violet-50 text-violet-700 ring-violet-200",
  Ready: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  Upcoming: "bg-amber-50 text-amber-700 ring-amber-200",
};

export function StatusChip({ label }: { label: string }) {
  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold ring-1 ${chipStyles[label] ?? "bg-neutral-100 text-neutral-700 ring-neutral-200"}`}>
      {label}
    </span>
  );
}
