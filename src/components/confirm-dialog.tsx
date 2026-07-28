"use client";

import { useEffect, useRef } from "react";
import { Icon, type IconName } from "@/components/icons";

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "danger" | "primary";
  icon?: IconName;
  pending?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

/**
 * Accessible in-app replacement for window.confirm(): backdrop, Escape to
 * cancel, body scroll-lock, focus moved to the confirm button, and
 * role="dialog" + aria-modal + aria-labelledby for assistive tech.
 */
export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  tone = "danger",
  icon,
  pending = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !pending) onCancel();
    };
    document.addEventListener("keydown", onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    confirmRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onCancel, pending]);

  if (!open) return null;

  const danger = tone === "danger";
  const resolvedIcon: IconName = icon ?? (danger ? "trash" : "check");

  return (
    <div className="fixed inset-0 z-[60] grid place-items-center p-4">
      <button aria-label="Close" className="absolute inset-0 cursor-default bg-neutral-950/55 backdrop-blur-[2px]" disabled={pending} onClick={onCancel} type="button" />
      <div aria-busy={pending} aria-labelledby="confirm-dialog-title" aria-modal="true" className="card relative z-10 w-full max-w-[420px] rounded-xl border border-[var(--theme-border)] p-6 shadow-2xl" role="dialog">
        <div className="flex items-start gap-4">
          <span className={`grid size-11 shrink-0 place-items-center rounded-full ${danger ? "bg-rose-500/10 text-rose-600" : "bg-[var(--color-primary-50)] text-[var(--color-primary-600)]"}`}>
            <Icon name={resolvedIcon} size={20} />
          </span>
          <div className="min-w-0 pt-0.5">
            <h2 className="text-base font-bold leading-snug text-[var(--theme-heading)]" id="confirm-dialog-title">{title}</h2>
            {message ? <p className="mt-1.5 text-xs leading-5 text-[var(--theme-muted)]">{message}</p> : null}
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2.5">
          <button className="button-secondary h-10 rounded-[8px] px-4 text-xs" disabled={pending} onClick={onCancel} type="button">
            {cancelLabel}
          </button>
          <button
            className={`inline-flex h-10 min-w-[112px] items-center justify-center gap-2 rounded-[8px] px-4 text-xs font-bold text-white transition disabled:cursor-not-allowed disabled:opacity-70 ${danger ? "bg-rose-600 hover:bg-rose-700" : "bg-[var(--color-primary-600)] hover:bg-[var(--color-primary-700)]"}`}
            disabled={pending}
            onClick={onConfirm}
            ref={confirmRef}
            type="button"
          >
            {pending ? <span className="size-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" /> : null}
            {pending ? `${confirmLabel}...` : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
