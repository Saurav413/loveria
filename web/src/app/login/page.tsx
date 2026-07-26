"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { GoogleAuthShell } from "@/components/GoogleAuthShell";
import { resumeSession } from "@/lib/client";

export default function LoginPage() {
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
    <main className="page-shell" style={{ maxWidth: 460, paddingTop: "4rem" }}>
      <div className="glass-card">
        <h1
          className="brand"
          style={{ cursor: "pointer", marginTop: 0 }}
          onClick={() => router.push("/")}
        >
          Loveria
        </h1>
        <p className="muted">Log in to continue your journey together.</p>
        <div style={{ margin: "1.25rem 0" }}>
          <GoogleAuthShell buttonText="continue_with">
            <span className="btn" style={{ width: "100%", display: "flex" }}>
              Continue with Google
            </span>
          </GoogleAuthShell>
        </div>
        <p className="muted" style={{ fontSize: "0.85rem" }}>
          Don&apos;t have an account?{" "}
          <Link href="/" style={{ color: "var(--primary-light)" }}>
            Sign up
          </Link>
        </p>
      </div>
    </main>
  );
}
