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
    <div className="status-error-state flex min-h-[300px] items-center justify-center rounded-[8px] border p-8 text-center" role="alert">
      <div className="max-w-md">
        <span className="status-error-icon mx-auto flex size-11 items-center justify-center rounded-full">
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

export function InlineAlert({ children, tone = "info" }: { children: React.ReactNode; tone?: "info" | "success" | "warning" | "error" }) {
  return <div className={`status-alert status-alert--${tone} rounded-[6px] border px-4 py-3 text-sm leading-5`} role={tone === "error" ? "alert" : "status"}>{children}</div>;
}

/**
 * Shown instead of the generic ErrorState when the backend itself is
 * unreachable — the message names the real cause and clears automatically
 * (via retry or the health probe) once the service is back.
 */
export function BackendOfflineState({ onRetry }: { onRetry?: () => void }) {
  return (
    <div className="flex min-h-[300px] items-center justify-center rounded-[8px] border border-rose-200 bg-rose-50 p-8 text-center" role="alert">
      <div className="max-w-md">
        <span className="mx-auto flex size-11 animate-pulse items-center justify-center rounded-full bg-rose-100 text-rose-600">
          <Icon name="waves" size={20} />
        </span>
        <h2 className="mt-4 text-base font-bold text-rose-900">The Evalora service is offline</h2>
        <p className="mt-2 text-sm leading-6 text-rose-700">
          We could not reach the assessment API, so this page cannot load live data. This is usually temporary — check
          your connection or try again in a moment.
        </p>
        {onRetry ? (
          <button
            className="mt-5 rounded-[6px] bg-rose-700 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-rose-800"
            onClick={onRetry}
            type="button"
          >
            Try again
          </button>
        ) : null}
      </div>
    </div>
  );
}
