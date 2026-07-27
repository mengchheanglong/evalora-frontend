"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { AuthLayout } from "@/components/auth-layout";
import { Icon } from "@/components/icons";
import { InlineAlert } from "@/components/ui-states";
import { apiPost, getErrorMessage } from "@/lib/api";

type ForgotPasswordResponse = {
  message: string;
  emailDelivery?: {
    status: "sent" | "skipped" | "failed" | "queued";
    reason?: string;
    provider?: string;
  };
  resetUrl?: string;
};

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<ForgotPasswordResponse | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setResult(null);
    setSubmitting(true);
    try {
      const response = await apiPost<ForgotPasswordResponse>("/auth/forgot-password", { email });
      setResult(response);
    } catch (requestError) {
      setError(getErrorMessage(requestError, "Unable to start password reset."));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout
      headline={
        <>
          <span className="block">Forgot your</span>
          <span className="block text-primary">password?</span>
        </>
      }
      lead="Enter the email for your Evalora workspace. We'll send a reset link when an account exists."
      panelClassName="max-w-[420px]"
    >
      {result ? (
        <div className="space-y-6 text-center">
          <div className="flex justify-center text-primary-700">
            <Icon name="mail" size={56} />
          </div>
          <div>
            <h1 className="text-[28px] font-bold leading-[34px] tracking-[-0.02em] text-neutral-950">Check your email</h1>
            <p className="mx-auto mt-2 max-w-[340px] text-[14px] leading-5 text-neutral-500">{result.message}</p>
          </div>

          {result.emailDelivery?.status === "sent" ? (
            <InlineAlert tone="success">Reset email sent. Open the link within 1 hour.</InlineAlert>
          ) : null}

          {result.emailDelivery?.status === "failed" ? (
            <InlineAlert tone="error">
              {result.emailDelivery.reason ?? "Email delivery failed. Use the link below if available."}
            </InlineAlert>
          ) : null}

          {result.resetUrl ? (
            <div className="rounded-[8px] border border-amber-200 bg-amber-50 p-4 text-left">
              <p className="text-[12px] font-bold text-amber-900">Email was not delivered</p>
              <p className="mt-1 text-[12px] leading-5 text-amber-800">
                {result.emailDelivery?.reason ??
                  "Copy this one-time link to choose a new password (local/demo mode)."}
              </p>
              <a
                className="mt-3 block break-all text-[12px] font-semibold text-primary-700 hover:underline"
                href={result.resetUrl}
              >
                {result.resetUrl}
              </a>
            </div>
          ) : null}

          <Link className="inline-flex h-12 w-full items-center justify-center rounded-[6px] bg-primary text-[14px] font-semibold text-white hover:bg-primary-600" href="/login">
            Back to sign in
          </Link>
          <button
            className="w-full text-[12px] font-bold text-primary-700 hover:underline"
            onClick={() => {
              setResult(null);
              setEmail("");
            }}
            type="button"
          >
            Try a different email
          </button>
        </div>
      ) : (
        <form className="space-y-5" onSubmit={handleSubmit}>
          <div className="mb-2 text-center">
            <h1 className="text-[28px] font-bold leading-[34px] tracking-[-0.02em] text-neutral-950">Reset password</h1>
            <p className="mt-2 text-[14px] leading-5 text-neutral-500">
              We&apos;ll email a secure link if this address has a workspace account.
            </p>
          </div>

          {error ? <InlineAlert tone="error">{error}</InlineAlert> : null}

          <label className="block text-left">
            <span className="text-[13px] font-bold text-neutral-800">Work email</span>
            <span className="relative mt-2 block">
              <Icon className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" name="mail" size={16} />
              <input
                autoComplete="email"
                autoFocus
                className="control h-[52px] rounded-lg border-transparent bg-neutral-50 !pl-12 pr-4 text-[13px] focus:border-primary-400 focus:bg-white"
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@company.com"
                required
                type="email"
                value={email}
              />
            </span>
          </label>

          <button
            className="button-primary h-[52px] w-full rounded-lg !bg-primary-500 text-[13px] font-bold hover:!bg-primary-600"
            disabled={submitting}
            type="submit"
          >
            {submitting ? <span className="size-4 animate-spin rounded-full border-2 border-white/40 border-t-white" /> : null}
            {submitting ? "Sending link" : "Send reset link"}
          </button>

          <p className="text-center text-[12px] text-neutral-500">
            Remembered it?{" "}
            <Link className="font-bold !text-primary-700 hover:!text-primary-600 hover:underline" href="/login">
              Back to sign in
            </Link>
          </p>
        </form>
      )}
    </AuthLayout>
  );
}
