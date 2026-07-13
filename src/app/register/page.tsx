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

export default function RegisterPage() {
  const router = useRouter();
  const { register, loginWithGoogle } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [organizationName, setOrganizationName] = useState("");

  async function finishGoogleSignUp(credential: string) {
    setError("");
    setSubmitting(true);
    try {
      await loginWithGoogle(credential, organizationName || undefined);
      router.replace("/dashboard");
      router.refresh();
    } catch (requestError) {
      setError(getErrorMessage(requestError, "Unable to sign up with Google."));
      throw requestError;
    } finally {
      setSubmitting(false);
    }
  }

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
      await register({
        name: String(form.get("name") ?? ""),
        email: String(form.get("email") ?? ""),
        password,
        organizationName: String(form.get("organizationName") ?? "") || undefined,
      });
      router.replace("/dashboard");
      router.refresh();
    } catch (requestError) {
      setError(getErrorMessage(requestError, "Unable to create your workspace."));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout
      headline={<><span className="block">Start with structure.</span><span className="block text-[#149bc8]">Scale with clarity.</span></>}
      lead="Create a company workspace. You become the owner and can invite interviewers to share templates, sessions, and reports."
      panelClassName="max-w-[560px]"
    >
      <form className="space-y-5" onSubmit={handleSubmit}>
        <div>
          <p className="text-[11px] font-bold uppercase text-[#118bb5]">Create your workspace</p>
          <h1 className="mt-2 text-[32px] font-black leading-tight text-[#151922]">Set up Evalora</h1>
          <p className="mt-2 text-sm leading-6 text-neutral-600">Your account becomes the workspace owner. Invite teammates later from Team — candidates still use assessment links only.</p>
        </div>

        {error ? <InlineAlert tone="error">{error}</InlineAlert> : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <Field autoComplete="name" label="Full name" name="name" placeholder="Alex Morgan" />
          <label className="block">
            <span className="text-[12px] font-bold text-neutral-800">Organization</span>
            <input
              autoComplete="organization"
              className="control mt-2 h-12"
              name="organizationName"
              onChange={(event) => setOrganizationName(event.target.value)}
              placeholder="Acme Talent"
              value={organizationName}
            />
          </label>
        </div>
        <Field autoComplete="email" label="Work email" name="email" placeholder="alex@company.com" type="email" />

        <div className="grid gap-4 sm:grid-cols-2">
          <PasswordField label="Password" name="password" onToggle={() => setShowPassword((shown) => !shown)} shown={showPassword} />
          <PasswordField label="Confirm password" name="confirmation" onToggle={() => setShowPassword((shown) => !shown)} shown={showPassword} />
        </div>
        <p className="text-[11px] leading-5 text-neutral-500">Use at least 8 characters. This signup creates the organization owner. Interviewers join by invite; candidates use assessment links.</p>

        <label className="flex items-center gap-2 text-[11px] leading-5 text-neutral-500">
          <input className="size-5 shrink-0 rounded-md border border-neutral-200 bg-white text-primary-500 accent-primary-500" type="checkbox" />
          <span>
            I agree to the <Link className="font-bold !text-primary-700 hover:!text-primary-600" href="/terms">Terms of Service</Link> and <Link className="font-bold !text-primary-700 hover:!text-primary-600" href="/privacy">Privacy Policy</Link>
          </span>
        </label>

        <button className="button-primary h-12 w-full !bg-primary-500 hover:!bg-primary-600 hover:shadow-[0_10px_22px_rgba(47,178,228,0.22)]" disabled={submitting} type="submit">
          {submitting ? <span className="size-4 animate-spin rounded-full border-2 border-white/40 border-t-white" /> : null}
          {submitting ? "Creating workspace" : "Create workspace"}
        </button>

        <GoogleSignInButton disabled={submitting} mode="signup" onCredential={finishGoogleSignUp} onError={setError} />

        <p className="text-center text-[13px] text-neutral-500">
          Already have an account? <Link className="font-bold !text-primary-700 hover:!text-primary-600" href="/login">login</Link>
        </p>
      </form>
    </AuthLayout>
  );
}

function Field({ label, name, placeholder, type = "text", autoComplete }: { label: string; name: string; placeholder: string; type?: string; autoComplete: string }) {
  return (
    <label className="block">
      <span className="text-[12px] font-bold text-neutral-800">{label}</span>
      <input autoComplete={autoComplete} className="control mt-2 h-12" name={name} placeholder={placeholder} required={name !== "organizationName"} type={type} />
    </label>
  );
}

function PasswordField({ label, name, onToggle, shown }: { label: string; name: string; onToggle: () => void; shown: boolean }) {
  return (
    <label className="block">
      <span className="text-[12px] font-bold text-neutral-800">{label}</span>
      <span className="relative mt-2 block">
        <input autoComplete={name === "password" ? "new-password" : "new-password"} className="control h-12 pr-11" minLength={8} name={name} placeholder="8+ characters" required type={shown ? "text" : "password"} />
        <button aria-label={shown ? "Hide password" : "Show password"} className="absolute right-2 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center text-neutral-400 hover:text-neutral-800" onClick={onToggle} type="button"><Icon name="eye" size={16} /></button>
      </span>
    </label>
  );
}
