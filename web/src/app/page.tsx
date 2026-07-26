"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LandingGoogleAuth } from "@/components/GoogleAuthShell";
import { resumeSession } from "@/lib/client";

export default function LandingPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const session = await resumeSession();
      if (cancelled) return;
      if (session) {
        router.replace(session.path);
        return;
      }
      setChecking(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  if (checking) {
    return (
      <main className="page-shell" style={{ maxWidth: 460, paddingTop: "4rem" }}>
        <div className="glass-card">
          <p className="muted" style={{ margin: 0, textAlign: "center" }}>
            Welcome back — signing you in…
          </p>
        </div>
      </main>
    );
  }

  return (
    <>
      <header className="site-header">
        <Link className="brand" href="/">
          Loveria
        </Link>
      </header>
      <main className="page-shell landing-hero">
        <div>
          <h1 className="landing-title">Connect with your favorite person</h1>
          <p className="muted landing-copy">
            A shared space for your journey, reminders, drawings, and memories — made for two.
          </p>
        </div>
        <aside className="glass-card">
          <h2 style={{ marginTop: 0, color: "var(--primary-light)" }}>Get started</h2>
          <LandingGoogleAuth>
            {({ primaryRef, secondaryRef }) => (
              <>
                <div style={{ display: "grid", gap: "0.75rem" }}>
                  <div className="google-auth-shell">
                    <div className="google-auth-face" aria-hidden="true">
                      <span className="btn" style={{ width: "100%", display: "flex" }}>
                        Continue with Google
                      </span>
                    </div>
                    <div className="google-auth-hit" ref={primaryRef} />
                  </div>
                  <button
                    className="btn"
                    type="button"
                    style={{ width: "100%" }}
                    onClick={() => alert("Apple sign-in will be connected in a future update.")}
                  >
                    Continue with Apple
                  </button>
                  <Link className="btn btn-ghost" href="/login" style={{ width: "100%" }}>
                    Log in
                  </Link>
                </div>
                <p
                  className="muted"
                  style={{ marginTop: "1rem", fontSize: "0.85rem", textAlign: "center" }}
                >
                  New here?{" "}
                  <span className="google-auth-shell google-auth-inline">
                    <span className="google-auth-face" aria-hidden="true">
                      <span style={{ color: "var(--primary-light)", fontWeight: 600 }}>Sign up</span>
                    </span>
                    <div className="google-auth-hit" ref={secondaryRef} />
                  </span>
                </p>
              </>
            )}
          </LandingGoogleAuth>
        </aside>
      </main>
    </>
  );
}
