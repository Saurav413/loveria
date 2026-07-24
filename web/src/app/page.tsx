"use client";

import Link from "next/link";

export default function LandingPage() {
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
          <div style={{ display: "grid", gap: "0.75rem" }}>
            <Link className="btn" href="/signup" style={{ width: "100%" }}>
              Continue with Google
            </Link>
            <Link className="btn" href="/signup" style={{ width: "100%" }}>
              Continue with Apple
            </Link>
            <Link className="btn btn-ghost" href="/login" style={{ width: "100%" }}>
              Log in
            </Link>
          </div>
          <p className="muted" style={{ marginTop: "1rem", fontSize: "0.85rem", textAlign: "center" }}>
            New here? <Link href="/signup" style={{ color: "var(--primary-light)" }}>Sign up</Link>
          </p>
        </aside>
      </main>
    </>
  );
}
