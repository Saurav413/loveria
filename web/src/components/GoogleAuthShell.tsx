"use client";

import { useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { useRouter } from "next/navigation";
import { api, nextOnboardingPath, saveUser, type LoveriaUser } from "@/lib/client";

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: Record<string, unknown>) => void;
          renderButton: (el: HTMLElement, config: Record<string, unknown>) => void;
        };
      };
    };
  }
}

function OtpModal({
  maskedEmail,
  otp,
  setOtp,
  status,
  onCancel,
  onVerify,
}: {
  maskedEmail: string;
  otp: string[];
  setOtp: (v: string[]) => void;
  status: string;
  onCancel: () => void;
  onVerify: () => void;
}) {
  const digitsRef = useRef<Array<HTMLInputElement | null>>([]);

  return (
    <div className="otp-overlay">
      <div className="otp-modal">
        <h3 style={{ marginTop: 0 }}>Email Verification</h3>
        <p className="muted">Enter the code sent to {maskedEmail}</p>
        <div className="otp-row">
          {otp.map((digit, i) => (
            <input
              key={i}
              ref={(el) => {
                digitsRef.current[i] = el;
              }}
              value={digit}
              maxLength={1}
              inputMode="numeric"
              onChange={(e) => {
                const v = e.target.value.replace(/\D/g, "").slice(-1);
                const next = [...otp];
                next[i] = v;
                setOtp(next);
                if (v && i < 5) digitsRef.current[i + 1]?.focus();
              }}
              onKeyDown={(e) => {
                if (e.key === "Backspace" && !otp[i] && i > 0) {
                  digitsRef.current[i - 1]?.focus();
                }
              }}
            />
          ))}
        </div>
        <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
          <button className="btn btn-ghost" type="button" onClick={onCancel}>
            Cancel
          </button>
          <button className="btn" type="button" onClick={onVerify}>
            Verify
          </button>
        </div>
        {status && <p className="muted">{status}</p>}
      </div>
    </div>
  );
}

function useGoogleAuth() {
  const router = useRouter();
  const [googleClientId, setGoogleClientId] = useState("");
  const [verificationId, setVerificationId] = useState<string | null>(null);
  const [maskedEmail, setMaskedEmail] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [status, setStatus] = useState("");

  useEffect(() => {
    api<{ googleClientId?: string }>("/api/config/public").then(({ data }) => {
      setGoogleClientId(data.googleClientId || "");
    });
  }, []);

  const onCredential = async (credential: string) => {
    setStatus("Sending verification code...");
    const start = await api<{
      error?: string;
      verificationId?: string;
      email?: string;
    }>("/api/auth/google/start", {
      method: "POST",
      body: JSON.stringify({ credential }),
    });
    if (!start.ok) {
      setStatus(start.data.error || "Could not start Google sign-in.");
      return;
    }
    setVerificationId(start.data.verificationId || null);
    setMaskedEmail(start.data.email || "");
    setStatus("");
  };

  const verifyOtp = async () => {
    if (!verificationId) return;
    const code = otp.join("");
    if (code.length !== 6) {
      setStatus("Enter the 6-digit code.");
      return;
    }
    setStatus("Verifying...");
    const result = await api<{ error?: string; user?: LoveriaUser }>(
      "/api/auth/google/verify",
      {
        method: "POST",
        body: JSON.stringify({ verificationId, code }),
      }
    );
    if (!result.ok || !result.data.user) {
      setStatus(result.data.error || "Invalid code.");
      return;
    }
    saveUser(result.data.user);
    router.push(nextOnboardingPath(result.data.user));
  };

  const otpUi =
    verificationId != null ? (
      <OtpModal
        maskedEmail={maskedEmail}
        otp={otp}
        setOtp={setOtp}
        status={status}
        onCancel={() => setVerificationId(null)}
        onVerify={verifyOtp}
      />
    ) : null;

  const statusUi =
    status && !verificationId ? (
      <p className="muted" style={{ fontSize: "0.85rem", textAlign: "center", margin: "0.5rem 0 0" }}>
        {status}
      </p>
    ) : null;

  return { googleClientId, onCredential, otpUi, statusUi };
}

function mountGoogleButtons(
  clientId: string,
  targets: Array<{ el: HTMLElement | null; text: string }>,
  onCredential: (credential: string) => void
) {
  const script = document.createElement("script");
  script.src = "https://accounts.google.com/gsi/client";
  script.async = true;
  script.onload = () => {
    if (!window.google) return;
    window.google.accounts.id.initialize({
      client_id: clientId,
      callback: (response: { credential: string }) => onCredential(response.credential),
    });
    for (const target of targets) {
      if (!target.el) continue;
      target.el.innerHTML = "";
      window.google.accounts.id.renderButton(target.el, {
        theme: "outline",
        size: "large",
        width: 400,
        text: target.text,
      });
    }
  };
  document.body.appendChild(script);
  return () => script.remove();
}

export function GoogleAuthShell({
  children,
  className = "",
  buttonText = "continue_with",
}: {
  children: ReactNode;
  className?: string;
  buttonText?: "continue_with" | "signup_with";
}) {
  const hitRef = useRef<HTMLDivElement>(null);
  const { googleClientId, onCredential, otpUi, statusUi } = useGoogleAuth();

  useEffect(() => {
    if (!googleClientId) return;
    return mountGoogleButtons(
      googleClientId,
      [{ el: hitRef.current, text: buttonText }],
      onCredential
    );
  }, [googleClientId, buttonText]);

  return (
    <>
      <div className={`google-auth-shell ${className}`.trim()}>
        <div className="google-auth-face" aria-hidden="true">
          {children}
        </div>
        <div className="google-auth-hit" ref={hitRef} />
      </div>
      {statusUi}
      {otpUi}
    </>
  );
}

/** Landing: one Google init, two click targets (Continue + Sign up). */
export function LandingGoogleAuth({
  children,
}: {
  children: (ctx: {
    primaryRef: RefObject<HTMLDivElement | null>;
    secondaryRef: RefObject<HTMLDivElement | null>;
  }) => ReactNode;
}) {
  const primaryRef = useRef<HTMLDivElement>(null);
  const secondaryRef = useRef<HTMLDivElement>(null);
  const { googleClientId, onCredential, otpUi, statusUi } = useGoogleAuth();

  useEffect(() => {
    if (!googleClientId) return;
    return mountGoogleButtons(
      googleClientId,
      [
        { el: primaryRef.current, text: "continue_with" },
        { el: secondaryRef.current, text: "signup_with" },
      ],
      onCredential
    );
  }, [googleClientId]);

  return (
    <>
      {children({ primaryRef, secondaryRef })}
      {statusUi}
      {otpUi}
    </>
  );
}
