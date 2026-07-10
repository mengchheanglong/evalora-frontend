"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { useAuth } from "@/components/auth-provider";
import { AuthDivider, AuthLayout } from "@/components/auth-layout";
import { Icon } from "@/components/icons";
import { InlineAlert } from "@/components/ui-states";
import { getErrorMessage } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

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
        <div>
          <p className="text-[11px] font-bold uppercase text-[#118bb5]">Workspace sign in</p>
          <h1 className="mt-2 text-[32px] font-black leading-tight text-[#151922]">Welcome back</h1>
          <p className="mt-2 text-sm leading-6 text-neutral-600">Use your interviewer or administrator account.</p>
        </div>

        {error ? <InlineAlert tone="error">{error}</InlineAlert> : null}

        <label className="block">
          <span className="text-[12px] font-bold text-neutral-800">Work email</span>
          <span className="relative mt-2 block">
            <Icon className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" name="mail" size={16} />
            <input autoComplete="email" autoFocus className="control h-12 pl-10" onChange={(event) => setEmail(event.target.value)} placeholder="you@company.com" required type="email" value={email} />
          </span>
        </label>

        <label className="block">
          <span className="text-[12px] font-bold text-neutral-800">Password</span>
          <span className="relative mt-2 block">
            <Icon className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" name="lock" size={16} />
            <input autoComplete="current-password" className="control h-12 pl-10" minLength={8} onChange={(event) => setPassword(event.target.value)} placeholder="Enter your password" required type="password" value={password} />
          </span>
        </label>

        <button className="button-primary h-12 w-full" disabled={submitting} type="submit">
          {submitting ? <span className="size-4 animate-spin rounded-full border-2 border-white/40 border-t-white" /> : null}
          {submitting ? "Signing in" : "Sign in"}
        </button>

        <AuthDivider label="New to Evalora?" />
        <Link className="button-secondary h-12 w-full" href="/register">Create a workspace</Link>

        <p className="rounded-[6px] bg-neutral-50 px-4 py-3 text-center text-[11px] leading-5 text-neutral-500">
          Candidates open assessments from their private invitation link and do not need a platform account.
        </p>
      </form>
    </AuthLayout>
  );
}
