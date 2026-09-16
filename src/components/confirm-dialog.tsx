"use client";

import { useEffect, useRef, useState } from "react";
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
  /**
   * Extra step for high-impact actions (the "type the name to confirm"
   * pattern): the confirm button stays disabled until the typed value matches
   * `expected` exactly.
   */
  challenge?: { label: string; expected: string; placeholder?: string };
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
  challenge,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const confirmRef = useRef<HTMLButtonElement>(null);
  const challengeRef = useRef<HTMLInputElement>(null);
  const [typed, setTyped] = useState("");

  useEffect(() => {
    if (!open) return;
    setTyped("");
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !pending) onCancel();
    };
    document.addEventListener("keydown", onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    // With a challenge the first thing to do is type, so focus lands there.
    if (challenge) challengeRef.current?.focus();
    else confirmRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onCancel, pending, challenge]);

  if (!open) return null;

  const danger = tone === "danger";
  const resolvedIcon: IconName = icon ?? (danger ? "trash" : "check");
  const challengeMet = !challenge || typed.trim() === challenge.expected;

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
        {challenge ? (
          <label className="mt-5 block">
            <span className="block text-xs font-bold text-[var(--theme-heading)]">{challenge.label}</span>
            <input
              autoComplete="off"
              className="control mt-1.5 h-10 rounded-[8px] text-sm"
              disabled={pending}
              onChange={(event) => setTyped(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && challengeMet && !pending) onConfirm();
              }}
              placeholder={challenge.placeholder ?? challenge.expected}
              ref={challengeRef}
              spellCheck={false}
              type="text"
              value={typed}
            />
          </label>
        ) : null}
        <div className="mt-6 flex justify-end gap-2.5">
          <button className="button-secondary h-10 rounded-[8px] px-4 text-xs" disabled={pending} onClick={onCancel} type="button">
            {cancelLabel}
          </button>
          <button
            className={`inline-flex h-10 min-w-[112px] items-center justify-center gap-2 rounded-[8px] px-4 text-xs font-bold text-white transition disabled:cursor-not-allowed disabled:opacity-70 ${danger ? "bg-rose-600 hover:bg-rose-700" : "bg-[var(--color-primary-600)] hover:bg-[var(--color-primary-700)]"}`}
            disabled={pending || !challengeMet}
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
