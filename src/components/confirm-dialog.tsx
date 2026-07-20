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
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCancel();
    };
    document.addEventListener("keydown", onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    confirmRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onCancel]);

  if (!open) return null;

  const danger = tone === "danger";
  const resolvedIcon: IconName = icon ?? (danger ? "trash" : "check");

  return (
    <div className="fixed inset-0 z-[60] grid place-items-center p-4">
      <button aria-label="Close" className="absolute inset-0 cursor-default bg-neutral-950/50 backdrop-blur-[2px]" onClick={onCancel} type="button" />
      <div aria-labelledby="confirm-dialog-title" aria-modal="true" className="card relative z-10 w-full max-w-[420px] rounded-[16px] p-6" role="dialog">
        <div className="flex items-start gap-4">
          <span className={`grid size-11 shrink-0 place-items-center rounded-full ${danger ? "bg-rose-50 text-rose-600" : "bg-primary-50 text-primary-600"}`}>
            <Icon name={resolvedIcon} size={20} />
          </span>
          <div className="min-w-0 pt-0.5">
            <h2 className="text-[17px] font-black leading-snug text-neutral-900" id="confirm-dialog-title">{title}</h2>
            {message ? <p className="mt-1.5 text-[13.5px] leading-6 text-neutral-500">{message}</p> : null}
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2.5">
          <button className="button-secondary h-10 rounded-[9px] px-4 text-[13px]" onClick={onCancel} type="button">
            {cancelLabel}
          </button>
          <button
            className={`inline-flex h-10 items-center rounded-[9px] px-4 text-[13px] font-bold text-white transition ${danger ? "bg-rose-600 hover:bg-rose-700" : "bg-primary-600 hover:bg-primary-700"}`}
            onClick={onConfirm}
            ref={confirmRef}
            type="button"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
