"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { AuthLayout } from "@/components/auth-layout";
import { useAuth } from "@/components/auth-provider";
import { InlineAlert, PageLoader } from "@/components/ui-states";
import { apiGet, apiPost, getErrorMessage } from "@/lib/api";
import type { AuthResponse, InvitePreview } from "@/lib/types";

export default function AcceptInvitePage() {
  const { token: rawToken } = useParams<{ token: string }>();
  const token = decodeURIComponent(rawToken);
  const router = useRouter();
  const { refresh } = useAuth();

  const [preview, setPreview] = useState<InvitePreview | null>(null);
  const [loadError, setLoadError] = useState("");
  const [loading, setLoading] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setLoadError("");
      try {
        const next = await apiGet<InvitePreview>(`/organization/invites/token/${encodeURIComponent(token)}`);
        if (!cancelled) setPreview(next);
      } catch (requestError) {
        if (!cancelled) setLoadError(getErrorMessage(requestError, "This invitation is invalid or expired."));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") ?? "");
    const confirmation = String(form.get("confirmation") ?? "");
    if (password !== confirmation) {
      setError("Passwords do not match.");
      return;
    }

    setError("");
    setSubmitting(true);
    try {
      await apiPost<AuthResponse>("/organization/invites/accept", {
        token,
        name: String(form.get("name") ?? ""),
        password,
      });
      await refresh();
      router.replace("/dashboard");
      router.refresh();
    } catch (requestError) {
      setError(getErrorMessage(requestError, "Unable to accept this invitation."));
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#f7f8fa]">
        <PageLoader label="Checking invitation" />
      </main>
    );
  }

  if (loadError || !preview) {
    return (
      <AuthLayout
        headline={<><span className="block">Invitation unavailable.</span><span className="block text-[#149bc8]">Ask for a new link.</span></>}
        lead="Workspace invitations expire after 7 days or after they are used once."
      >
        <div className="space-y-4">
          <InlineAlert tone="error">{loadError || "Invitation not found."}</InlineAlert>
          <Link className="button-primary inline-flex h-11 items-center justify-center rounded-[8px] px-5 text-[13px]" href="/login">
            Go to sign in
          </Link>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      headline={<><span className="block">Join your team.</span><span className="block text-[#149bc8]">{preview.organizationName}</span></>}
      lead={`${preview.inviterName ? `${preview.inviterName} invited you` : "You were invited"} as ${preview.roleLabel.toLowerCase()}. You'll share this organization's templates, sessions, and reports.`}
    >
      <form className="space-y-5" onSubmit={handleSubmit}>
        <div>
          <p className="text-[11px] font-bold uppercase text-[#118bb5]">Workspace invite</p>
          <h1 className="mt-2 text-[28px] font-black leading-tight text-[#151922]">Create your account</h1>
          <p className="mt-2 text-sm leading-6 text-neutral-600">
            You are joining <strong>{preview.organizationName}</strong> as an <strong>{preview.roleLabel}</strong>. Email is fixed to the invitation.
          </p>
        </div>

        {error ? <InlineAlert tone="error">{error}</InlineAlert> : null}

        <label className="block">
          <span className="mb-2 block text-[12px] font-bold text-neutral-800">Work email</span>
          <input className="control h-11 w-full rounded-[8px] px-4 text-[13px] text-neutral-500" disabled readOnly value={preview.email} />
        </label>

        <label className="block">
          <span className="mb-2 block text-[12px] font-bold text-neutral-800">Full name</span>
          <input className="control h-11 w-full rounded-[8px] px-4 text-[13px]" name="name" placeholder="Alex Morgan" required autoComplete="name" />
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-2 block text-[12px] font-bold text-neutral-800">Password</span>
            <div className="relative">
              <input
                className="control h-11 w-full rounded-[8px] px-4 pr-12 text-[13px]"
                minLength={8}
                name="password"
                placeholder="At least 8 characters"
                required
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
              />
              <button className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-bold text-primary-700" onClick={() => setShowPassword((v) => !v)} type="button">
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </label>
          <label className="block">
            <span className="mb-2 block text-[12px] font-bold text-neutral-800">Confirm password</span>
            <input
              className="control h-11 w-full rounded-[8px] px-4 text-[13px]"
              minLength={8}
              name="confirmation"
              placeholder="Repeat password"
              required
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
            />
          </label>
        </div>

        <p className="text-[11px] text-neutral-500">
          Expires {new Date(preview.expiresAt).toLocaleString()}. Candidates still use assessment links only — this is a workspace login.
        </p>

        <button className="button-primary h-11 w-full rounded-[8px] text-[13px]" disabled={submitting} type="submit">
          {submitting ? "Joining workspace…" : "Join workspace"}
        </button>

        <p className="text-center text-[12px] text-neutral-500">
          Already have an account?{" "}
          <Link className="font-bold text-primary-700 hover:text-primary-600" href="/login">
            Sign in
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}
