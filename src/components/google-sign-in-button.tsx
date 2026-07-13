"use client";

import { useEffect, useRef, useState } from "react";
import { AuthDivider } from "@/components/auth-layout";
import { GoogleIcon } from "@/components/icons";
import { getErrorMessage } from "@/lib/api";

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize(config: {
            client_id: string;
            callback: (response: { credential: string }) => void;
            auto_select?: boolean;
            cancel_on_tap_outside?: boolean;
          }): void;
          renderButton(
            parent: HTMLElement,
            options: {
              theme?: "outline" | "filled_blue" | "filled_black";
              size?: "large" | "medium" | "small";
              text?: "signin_with" | "signup_with" | "continue_with" | "signin";
              width?: number;
              shape?: "rectangular" | "pill" | "circle" | "square";
              logo_alignment?: "left" | "center";
            },
          ): void;
          prompt(): void;
        };
      };
    };
  }
}

type GoogleSignInButtonProps = {
  mode?: "signin" | "signup";
  organizationName?: string;
  disabled?: boolean;
  onCredential: (credential: string) => Promise<void>;
  onError?: (message: string) => void;
};

const SCRIPT_ID = "evalora-google-gsi";
const SCRIPT_SRC = "https://accounts.google.com/gsi/client";

export function GoogleSignInButton({
  mode = "signin",
  disabled = false,
  onCredential,
  onError,
}: GoogleSignInButtonProps) {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID?.trim() ?? "";
  const buttonHostRef = useRef<HTMLDivElement | null>(null);
  const [scriptReady, setScriptReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [localError, setLocalError] = useState("");

  const handleCredential = useRef(onCredential);
  handleCredential.current = onCredential;
  const handleError = useRef(onError);
  handleError.current = onError;

  useEffect(() => {
    if (!clientId) return;

    let cancelled = false;
    function markReady() {
      if (!cancelled) setScriptReady(true);
    }

    const existing = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
    if (existing) {
      if (window.google?.accounts?.id) markReady();
      else existing.addEventListener("load", markReady);
      return () => {
        cancelled = true;
        existing.removeEventListener("load", markReady);
      };
    }

    const script = document.createElement("script");
    script.id = SCRIPT_ID;
    script.src = SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onload = markReady;
    script.onerror = () => {
      if (!cancelled) {
        setLocalError("Unable to load Google sign-in. Check your network and try again.");
      }
    };
    document.head.appendChild(script);
    return () => {
      cancelled = true;
    };
  }, [clientId]);

  useEffect(() => {
    if (!clientId || !scriptReady || !buttonHostRef.current || !window.google?.accounts?.id) return;

    const host = buttonHostRef.current;
    host.innerHTML = "";

    window.google.accounts.id.initialize({
      client_id: clientId,
      callback: async (response) => {
        if (!response.credential) {
          const message = "Google did not return a sign-in credential.";
          setLocalError(message);
          handleError.current?.(message);
          return;
        }
        setBusy(true);
        setLocalError("");
        try {
          await handleCredential.current(response.credential);
        } catch (error) {
          const message = getErrorMessage(error, "Google sign-in failed.");
          setLocalError(message);
          handleError.current?.(message);
        } finally {
          setBusy(false);
        }
      },
      auto_select: false,
      cancel_on_tap_outside: true,
    });

    window.google.accounts.id.renderButton(host, {
      theme: "outline",
      size: "large",
      text: mode === "signup" ? "signup_with" : "signin_with",
      width: Math.min(400, Math.max(280, host.clientWidth || 320)),
      shape: "rectangular",
      logo_alignment: "left",
    });
  }, [clientId, scriptReady, mode]);

  if (!clientId) {
    return (
      <div className="space-y-3">
        <AuthDivider label="or continue with" />
        <button
          className="button-secondary h-12 w-full rounded-lg border-neutral-300 bg-white text-[13px] font-bold text-neutral-500"
          disabled
          type="button"
        >
          <GoogleIcon />
          <span>Google sign-in not configured</span>
        </button>
        <p className="text-center text-[11px] text-neutral-400">
          Set <code className="font-mono">NEXT_PUBLIC_GOOGLE_CLIENT_ID</code> and backend{" "}
          <code className="font-mono">GOOGLE_CLIENT_ID</code> to enable Google.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <AuthDivider label="or continue with" />
      <div className={`flex min-h-12 w-full justify-center ${disabled || busy ? "pointer-events-none opacity-60" : ""}`}>
        <div className="w-full max-w-[400px]" ref={buttonHostRef} />
      </div>
      {busy ? <p className="text-center text-[12px] text-neutral-500">Signing in with Google…</p> : null}
      {localError ? <p className="text-center text-[12px] text-rose-600">{localError}</p> : null}
    </div>
  );
}
