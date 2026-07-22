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
  className?: string;
  onCredential: (credential: string) => Promise<void>;
  onError?: (message: string) => void;
};

const SCRIPT_ID = "evalora-google-gsi";
const SCRIPT_SRC = "https://accounts.google.com/gsi/client?hl=en";

export function GoogleSignInButton({
  mode = "signin",
  disabled = false,
  className = "",
  onCredential,
  onError,
}: GoogleSignInButtonProps) {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID?.trim() ?? "";
  const buttonHostRef = useRef<HTMLDivElement | null>(null);
  const renderedButtonKeyRef = useRef("");
  const [scriptReady, setScriptReady] = useState(false);
  const [buttonWidth, setButtonWidth] = useState(0);
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
  }, [clientId, scriptReady]);

  useEffect(() => {
    if (!scriptReady || !buttonHostRef.current) return;

    const host = buttonHostRef.current;
    const updateWidth = () => setButtonWidth(Math.floor(host.getBoundingClientRect().width));
    updateWidth();

    const observer = new ResizeObserver(updateWidth);
    observer.observe(host);
    return () => observer.disconnect();
  }, [scriptReady]);

  useEffect(() => {
    if (!clientId || !scriptReady || !buttonHostRef.current || !window.google?.accounts?.id || buttonWidth <= 0) return;

    const host = buttonHostRef.current;
    const renderKey = `${clientId}:${mode}`;
    if (renderedButtonKeyRef.current === renderKey) return;

    host.innerHTML = "";

    window.google.accounts.id.renderButton(host, {
      theme: "outline",
      size: "large",
      text: mode === "signup" ? "signup_with" : "signin_with",
      width: Math.min(400, Math.max(200, buttonWidth || host.clientWidth || 320)),
      shape: "rectangular",
      logo_alignment: "left",
    });
    renderedButtonKeyRef.current = renderKey;
  }, [buttonWidth, clientId, scriptReady, mode]);

  if (!clientId) {
    return (
      <div className={`space-y-3 ${className}`}>
        <AuthDivider label="or continue with" />
        <button
          className="h-[52px] w-full rounded-lg border border-solid border-[#cbd5df] bg-white text-[13px] font-bold text-neutral-700 inline-flex items-center justify-center gap-3 shadow-sm cursor-not-allowed opacity-70"
          disabled
          type="button"
        >
          <GoogleIcon />
          <span>{mode === "signup" ? "Sign up with Google" : "Sign in with Google"}</span>
        </button>
        <p className="text-center text-[11px] text-neutral-400">
          Set <code className="font-mono">NEXT_PUBLIC_GOOGLE_CLIENT_ID</code> and backend{" "}
          <code className="font-mono">GOOGLE_CLIENT_ID</code> to enable Google.
        </p>
      </div>
    );
  }

  return (
    <div className={`space-y-3 ${className}`}>
      <AuthDivider label="or continue with" />
      <div className={`relative h-[52px] w-full overflow-hidden rounded-lg ${disabled || busy ? "pointer-events-none opacity-60" : ""}`}>
        {!scriptReady ? (
          <div className="flex h-full w-full items-center justify-center border border-solid border-[#cbd5df] bg-white text-[12px] font-semibold text-neutral-500">
            Loading Google sign-in...
          </div>
        ) : (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center gap-3 border border-solid border-[#cbd5df] bg-white text-[13px] font-semibold text-neutral-800 shadow-sm">
            <GoogleIcon />
            <span>{mode === "signup" ? "Sign up with Google" : "Sign in with Google"}</span>
          </div>
        )}
        <div
          ref={buttonHostRef}
          className={`${scriptReady ? "flex" : "hidden"} absolute inset-0 h-full w-full items-center justify-center overflow-hidden opacity-[0.01] [&>div]:!w-full [&_iframe]:!h-[52px] [&_iframe]:!w-full`}
        />
      </div>
      {busy ? <p className="text-center text-[12px] text-neutral-500">Signing in with Google…</p> : null}
      {localError ? <p className="text-center text-[12px] text-rose-600">{localError}</p> : null}
    </div>
  );
}
