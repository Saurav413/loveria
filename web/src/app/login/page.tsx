"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { GoogleAuthShell } from "@/components/GoogleAuthShell";

export default function LoginPage() {
  const router = useRouter();

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
