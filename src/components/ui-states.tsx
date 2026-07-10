import { Icon, type IconName } from "@/components/icons";

export function PageLoader({ label = "Loading workspace" }: { label?: string }) {
  return (
    <div className="flex min-h-[360px] items-center justify-center" role="status">
      <div className="text-center">
        <span className="mx-auto block size-8 animate-spin rounded-full border-[3px] border-neutral-200 border-t-primary" />
        <p className="mt-4 text-sm font-semibold text-neutral-600">{label}</p>
      </div>
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex min-h-[300px] items-center justify-center rounded-[8px] border border-red-100 bg-red-50/40 p-8 text-center" role="alert">
      <div className="max-w-md">
        <span className="mx-auto flex size-11 items-center justify-center rounded-full bg-red-100 text-red-600">
          <Icon name="question" size={20} />
        </span>
        <h2 className="mt-4 text-base font-bold text-neutral-950">We could not load this view</h2>
        <p className="mt-2 text-sm leading-6 text-neutral-600">{message}</p>
        {onRetry ? (
          <button className="mt-5 rounded-[6px] bg-neutral-950 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-neutral-800" onClick={onRetry} type="button">
            Try again
          </button>
        ) : null}
      </div>
    </div>
  );
}

export function EmptyState({
  action,
  description,
  icon = "clipboard",
  title,
}: {
  action?: React.ReactNode;
  description: string;
  icon?: IconName;
  title: string;
}) {
  return (
    <div className="flex min-h-[280px] items-center justify-center border border-dashed border-neutral-300 bg-white p-8 text-center">
      <div className="max-w-md">
        <span className="mx-auto flex size-12 items-center justify-center rounded-[8px] bg-neutral-100 text-neutral-700">
          <Icon name={icon} size={22} />
        </span>
        <h2 className="mt-4 text-base font-bold text-neutral-950">{title}</h2>
        <p className="mt-2 text-sm leading-6 text-neutral-600">{description}</p>
        {action ? <div className="mt-5">{action}</div> : null}
      </div>
    </div>
  );
}

export function InlineAlert({ children, tone = "info" }: { children: React.ReactNode; tone?: "info" | "success" | "error" }) {
  const classes = {
    info: "border-sky-200 bg-sky-50 text-sky-900",
    success: "border-emerald-200 bg-emerald-50 text-emerald-900",
    error: "border-red-200 bg-red-50 text-red-900",
  }[tone];
  return <div className={`rounded-[6px] border px-4 py-3 text-sm leading-5 ${classes}`} role={tone === "error" ? "alert" : "status"}>{children}</div>;
}
