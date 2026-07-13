"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { useAuth } from "@/components/auth-provider";
import { AuthLayout } from "@/components/auth-layout";
import { GoogleSignInButton } from "@/components/google-sign-in-button";
import { Icon } from "@/components/icons";
import { InlineAlert } from "@/components/ui-states";
import { getErrorMessage } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const { login, loginWithGoogle } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function finishGoogleSignIn(credential: string) {
    setError("");
    setSubmitting(true);
    try {
      await loginWithGoogle(credential);
      const returnTo = new URLSearchParams(window.location.search).get("returnTo");
      router.replace(returnTo?.startsWith("/") ? returnTo : "/dashboard");
      router.refresh();
    } catch (requestError) {
      setError(getErrorMessage(requestError, "Unable to sign in with Google."));
      throw requestError;
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await login({ email, password });
      const returnTo = new URLSearchParams(window.location.search).get("returnTo");
      router.replace(returnTo?.startsWith("/") ? returnTo : "/dashboard");
      router.refresh();
    } catch (requestError) {
      setError(getErrorMessage(requestError, "Unable to sign in."));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout
      headline={<><span className="block">Clear evidence.</span><span className="block text-[#149bc8]">Better interviews.</span></>}
      lead="Run structured assessments, review evidence in context, and keep every hiring decision human-led."
    >
      <form className="space-y-5" onSubmit={handleSubmit}>
        <div className="mb-7 text-center">
          <h1 className="text-[30px] font-black leading-tight text-[#151922]">Welcome back!</h1>
          <p className="mt-4 text-[17px] leading-6 text-neutral-500">Sign in to continue to your account.</p>
        </div>

        {error ? <InlineAlert tone="error">{error}</InlineAlert> : null}

        <label className="block">
          <span className="text-[13px] font-bold text-neutral-800">Email</span>
          <span className="relative mt-2 block">
            <Icon className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" name="mail" size={16} />
            <input autoComplete="email" autoFocus className="control h-[52px] rounded-lg border-transparent bg-neutral-50 !pl-12 pr-4 text-[13px] focus:border-primary-400 focus:bg-white" onChange={(event) => setEmail(event.target.value)} placeholder="Enter your email" required type="email" value={email} />
          </span>
        </label>

        <label className="block">
          <span className="text-[13px] font-bold text-neutral-800">Password</span>
          <span className="relative mt-2 block">
            <Icon className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" name="lock" size={16} />
            <input autoComplete="current-password" className="control h-[52px] rounded-lg border-transparent bg-neutral-50 !pl-12 pr-4 text-[13px] focus:border-primary-400 focus:bg-white" minLength={8} onChange={(event) => setPassword(event.target.value)} placeholder="Enter your password" required type="password" value={password} />
          </span>
        </label>

        <div className="flex items-center justify-between gap-4 pt-3 text-[12px]">
          <label className="flex items-center gap-2 text-neutral-500">
            <input className="size-5 rounded-md border border-neutral-200 bg-white text-primary-500 accent-primary-500" type="checkbox" />
            <span>Remember me</span>
          </label>
          <Link className="font-bold !text-primary-700 hover:!text-primary-600" href="/forgot-password">Forgot password?</Link>
        </div>

        <button className="button-primary h-[52px] w-full rounded-lg !bg-primary-500 text-[13px] font-bold hover:!bg-primary-600 hover:shadow-[0_10px_22px_rgba(47,178,228,0.22)]" disabled={submitting} type="submit">
          {submitting ? <span className="size-4 animate-spin rounded-full border-2 border-white/40 border-t-white" /> : null}
          {submitting ? "Signing in" : "Sign in"}
        </button>

        <GoogleSignInButton disabled={submitting} mode="signin" onCredential={finishGoogleSignIn} onError={setError} />

        <p className="pt-3 text-center text-[12px] text-neutral-500">
          Don&apos;t have an account? <Link className="font-bold !text-primary-700 hover:!text-primary-600" href="/register">Sign up</Link>
        </p>
      </form>
    </AuthLayout>
  );
}
