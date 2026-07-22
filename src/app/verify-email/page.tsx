"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AuthLayout } from "@/components/auth-layout";
import { useAuth } from "@/components/auth-provider";
import { Icon } from "@/components/icons";
import { InlineAlert } from "@/components/ui-states";
import { getErrorMessage } from "@/lib/api";

type VerificationState = "checking" | "waiting" | "error";

export default function VerifyEmailPage() {
  const router = useRouter();
  const { verifyEmail, resendEmailVerification } = useAuth();
  const [email, setEmail] = useState("");
  const [state, setState] = useState<VerificationState>("checking");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [resending, setResending] = useState(false);
  const [fallbackUrl, setFallbackUrl] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const nextEmail = params.get("email")?.trim() ?? "";
    const token = params.get("token")?.trim() ?? "";
    setEmail(nextEmail);
    setFallbackUrl(sessionStorage.getItem("evalora-verification-fallback") ?? "");

    if (!token) {
      setState("waiting");
      return;
    }

    void (async () => {
      try {
        await verifyEmail(token);
        sessionStorage.removeItem("evalora-verification-fallback");
        router.replace("/dashboard");
        router.refresh();
      } catch (requestError) {
        setError(getErrorMessage(requestError, "Unable to verify this email."));
        setState("error");
      }
    })();
  }, [router, verifyEmail]);

  async function resend() {
    if (!email || resending) return;
    setResending(true);
    setError("");
    setNotice("");
    try {
      const result = await resendEmailVerification(email);
      setNotice(result.message);
      if (result.verificationUrl) {
        sessionStorage.setItem("evalora-verification-fallback", result.verificationUrl);
        setFallbackUrl(result.verificationUrl);
      }
    } catch (requestError) {
      setError(getErrorMessage(requestError, "Unable to resend the verification email."));
    } finally {
      setResending(false);
    }
  }

  return (
    <AuthLayout
      headline={<><span className="block">One last step.</span><span className="block text-[#149bc8]">Verify your email.</span></>}
      lead="Confirm your work email before entering the workspace. This keeps account ownership and invitations tied to the right person."
      panelClassName="max-w-[440px]"
    >
      <div className="space-y-5 text-center">
        <span className="mx-auto inline-flex size-12 items-center justify-center rounded-full bg-primary-50 text-primary-700">
          <Icon name="mail" size={22} />
        </span>

        {state === "checking" ? (
          <>
            <h1 className="text-[28px] font-black text-[#151922]">Verifying your email</h1>
            <p className="text-[13px] text-neutral-500">Please wait while we activate your workspace.</p>
            <span className="mx-auto block size-5 animate-spin rounded-full border-2 border-primary-100 border-t-primary-600" />
          </>
        ) : (
          <>
            <div>
              <h1 className="text-[28px] font-black text-[#151922]">Check your inbox</h1>
              <p className="mt-3 text-[13px] leading-6 text-neutral-500">
                We sent a verification link{email ? <> to <strong className="text-neutral-800">{email}</strong></> : ""}.
              </p>
            </div>

            {error ? <InlineAlert tone="error">{error}</InlineAlert> : null}
            {notice ? <InlineAlert tone="success">{notice}</InlineAlert> : null}

            {email ? (
              <button className="button-secondary h-11 w-full rounded-lg text-[12px] font-bold" disabled={resending} onClick={() => void resend()} type="button">
                {resending ? "Sending..." : "Resend verification email"}
              </button>
            ) : null}

            {fallbackUrl ? (
              <a className="button-primary flex h-11 w-full items-center justify-center rounded-lg text-[12px] font-bold" href={fallbackUrl}>
                Continue verification
              </a>
            ) : null}

            <p className="text-[12px] text-neutral-500">
              Already verified? <Link className="font-bold !text-primary-700 hover:!text-primary-600" href="/login">Back to sign in</Link>
            </p>
          </>
        )}
      </div>
    </AuthLayout>
  );
}
