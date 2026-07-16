"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState, type FormEvent } from "react";
import { AuthLayout } from "@/components/auth-layout";
import { Icon } from "@/components/icons";
import { InlineAlert, PageLoader } from "@/components/ui-states";
import { apiPost, getErrorMessage } from "@/lib/api";
import { PASSWORD_RULES, passwordPolicyError } from "@/lib/password-policy";

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<PageLoader label="Loading password reset" />}>
      <ResetPasswordForm />
    </Suspense>
  );
}

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token")?.trim() ?? "";

  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const ruleState = useMemo(
    () => PASSWORD_RULES.map((rule) => ({ ...rule, ok: password.length > 0 && rule.test(password) })),
    [password],
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!token) {
      setError("This reset link is missing a token. Request a new password reset from the sign-in page.");
      return;
    }
    const policyError = passwordPolicyError(password);
    if (policyError) {
      setError(policyError);
      return;
    }
    if (password !== confirmation) {
      setError("Passwords do not match.");
      return;
    }

    setSubmitting(true);
    try {
      const response = await apiPost<{ message?: string }>("/auth/reset-password", { token, password });
      setSuccess(response.message ?? "Password updated. You can sign in with your new password.");
      window.setTimeout(() => {
        router.replace("/login");
        router.refresh();
      }, 1600);
    } catch (requestError) {
      setError(getErrorMessage(requestError, "Unable to reset password. Request a new link."));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout
      headline={
        <>
          <span className="block">Choose a new</span>
          <span className="block text-primary">password</span>
        </>
      }
      lead="Set a strong password for your Evalora workspace, then sign in again."
      panelClassName="max-w-[420px]"
    >
      <form className="space-y-6" onSubmit={handleSubmit}>
        <div className="text-center">
          <div className="mb-4 flex justify-center text-primary-700">
            <Icon name="lock" size={56} />
          </div>
          <h1 className="text-[28px] font-bold leading-[34px] tracking-[-0.02em] text-neutral-950">Reset your password</h1>
          <p className="mx-auto mt-2 max-w-[340px] text-[14px] leading-5 text-neutral-500">
            Enter and confirm your new password to continue.
          </p>
        </div>

        {!token ? (
          <InlineAlert tone="error">
            Missing reset token.{" "}
            <Link className="font-bold underline" href="/forgot-password">
              Request a new link
            </Link>
            .
          </InlineAlert>
        ) : null}
        {error ? <InlineAlert tone="error">{error}</InlineAlert> : null}
        {success ? <InlineAlert tone="success">{success}</InlineAlert> : null}

        <label className="block text-left">
          <span className="text-[13px] font-bold text-neutral-800">New password</span>
          <span className="relative mt-2 block">
            <input
              autoComplete="new-password"
              className="form-field h-12 pr-10 text-[13px]"
              minLength={8}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter new password"
              required
              type={showPassword ? "text" : "password"}
              value={password}
            />
            <button
              aria-label={showPassword ? "Hide password" : "Show password"}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500"
              onClick={() => setShowPassword((shown) => !shown)}
              type="button"
            >
              <Icon name="eye" size={16} />
            </button>
          </span>
        </label>

        <label className="block text-left">
          <span className="text-[13px] font-bold text-neutral-800">Confirm new password</span>
          <span className="relative mt-2 block">
            <input
              autoComplete="new-password"
              className="form-field h-12 pr-10 text-[13px]"
              minLength={8}
              onChange={(event) => setConfirmation(event.target.value)}
              placeholder="Confirm new password"
              required
              type={showPassword ? "text" : "password"}
              value={confirmation}
            />
          </span>
        </label>

        <ul className="space-y-2 text-left text-[13px] text-neutral-600">
          {ruleState.map((rule) => (
            <li className="flex items-center gap-2" key={rule.id}>
              <span
                className={`inline-flex size-[18px] shrink-0 items-center justify-center rounded-full text-white ${
                  rule.ok ? "bg-emerald-600" : "bg-neutral-300"
                }`}
              >
                <Icon name="check" size={12} />
              </span>
              <span className={rule.ok ? "text-neutral-800" : undefined}>{rule.label}</span>
            </li>
          ))}
        </ul>

        <button
          className="button-primary h-12 w-full rounded-[6px] !text-[14px] font-semibold"
          disabled={submitting || !token || Boolean(success)}
          type="submit"
        >
          {submitting ? "Updating password" : "Reset password"}
        </button>

        <Link className="block text-center text-[13px] font-bold text-primary-700 hover:underline" href="/login">
          &larr; Back to login
        </Link>
      </form>
    </AuthLayout>
  );
}
