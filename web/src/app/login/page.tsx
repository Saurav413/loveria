"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api, saveUser, type LoveriaUser } from "@/lib/client";

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

function nextPath(user: LoveriaUser) {
  if (!user.gender) return "/onboarding/gender";
  if (!user.nickname || !user.partner_nickname) return "/onboarding/nicknames";
  if (!user.relationship_date) return "/onboarding/date";
  if (!user.partner_user_id && localStorage.getItem("pairingSkipped") !== "true") {
    return "/pairing";
  }
  return "/home";
}

export default function LoginPage() {
  const router = useRouter();
  const [status, setStatus] = useState("");
  const [googleClientId, setGoogleClientId] = useState("");
  const [verificationId, setVerificationId] = useState<string | null>(null);
  const [maskedEmail, setMaskedEmail] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const googleBtnRef = useRef<HTMLDivElement>(null);
  const digitsRef = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    api<{ googleClientId?: string }>("/api/config/public").then(({ data }) => {
      setGoogleClientId(data.googleClientId || "");
    });
  }, []);

  useEffect(() => {
    if (!googleClientId) return;
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.onload = () => {
      if (!window.google || !googleBtnRef.current) return;
      window.google.accounts.id.initialize({
        client_id: googleClientId,
        callback: async (response: { credential: string }) => {
          setStatus("Sending verification code...");
          const start = await api<{
            error?: string;
            verificationId?: string;
            email?: string;
          }>("/api/auth/google/start", {
            method: "POST",
            body: JSON.stringify({ credential: response.credential }),
          });
          if (!start.ok) {
            setStatus(start.data.error || "Could not start Google sign-in.");
            return;
          }
          setVerificationId(start.data.verificationId || null);
          setMaskedEmail(start.data.email || "");
          setStatus("");
        },
      });
      window.google.accounts.id.renderButton(googleBtnRef.current, {
        theme: "outline",
        size: "large",
        width: 320,
        text: "continue_with",
      });
    };
    document.body.appendChild(script);
    return () => {
      script.remove();
    };
  }, [googleClientId]);

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
    router.push(nextPath(result.data.user));
  };

  return (
    <main className="page-shell" style={{ maxWidth: 460, paddingTop: "4rem" }}>
      <div className="glass-card">
        <h1
          className="brand"
          style={{ cursor: "pointer", marginTop: 0 }}
          onClick={() => router.push("/signup")}
        >
          Loveria
        </h1>
        <p className="muted">Log in to continue your journey together.</p>
        <div style={{ margin: "1.25rem 0" }}>
          <div ref={googleBtnRef} />
        </div>
        <p className="muted" style={{ fontSize: "0.85rem" }}>
          Don&apos;t have an account? <Link href="/signup" style={{ color: "var(--primary-light)" }}>Sign up</Link>
        </p>
        {status && <p className="muted">{status}</p>}
      </div>

      {verificationId && (
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
              <button className="btn btn-ghost" type="button" onClick={() => setVerificationId(null)}>
                Cancel
              </button>
              <button className="btn" type="button" onClick={verifyOtp}>
                Verify
              </button>
            </div>
            {status && <p className="muted">{status}</p>}
          </div>
        </div>
      )}
    </main>
  );
}
