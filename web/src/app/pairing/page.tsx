"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api, readStoredUser, saveUser, type LoveriaUser } from "@/lib/client";
import { LoveriaCinematicBg } from "@/lib/cinematic-bg";

export default function PairingPage() {
  const router = useRouter();
  const [user, setUser] = useState<LoveriaUser | null>(null);
  const [code, setCode] = useState("");
  const [myCode, setMyCode] = useState("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  const goAfterPair = () => {
    localStorage.setItem("pairedJustNow", "1");
    localStorage.removeItem("pairingSkipped");
    router.push("/onboarding/profile-picture");
  };

  useEffect(() => {
    const stored = readStoredUser();
    if (!stored) {
      router.replace("/login");
      return;
    }

    let cancelled = false;
    (async () => {
      const latest = await api<{ user?: LoveriaUser }>(`/api/user/${stored.id}`);
      const current = latest.ok && latest.data.user ? latest.data.user : stored;
      if (cancelled) return;
      saveUser(current);
      setUser(current);
      LoveriaCinematicBg.start({ userId: current.id });

      // Freshly paired during onboarding — finish profile photo.
      if (current.partner_user_id && localStorage.getItem("pairedJustNow") === "1") {
        router.replace("/onboarding/profile-picture");
      }
    })();

    const timer = setInterval(async () => {
      const storedNow = readStoredUser();
      if (!storedNow || storedNow.partner_user_id) return;
      const latest = await api<{ user?: LoveriaUser }>(`/api/user/${storedNow.id}`);
      if (latest.ok && latest.data.user?.partner_user_id) {
        saveUser(latest.data.user);
        setUser(latest.data.user);
        goAfterPair();
      }
    }, 4000);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [router]);

  const createCode = async () => {
    const current = readStoredUser();
    if (!current) return;
    setBusy(true);
    const result = await api<{ error?: string; code?: string }>("/api/pairing/create-code", {
      method: "POST",
      body: JSON.stringify({ userId: current.id }),
    });
    setBusy(false);
    if (!result.ok) {
      setStatus(result.data.error || "Could not create code.");
      return;
    }
    setMyCode(result.data.code || "");
    setStatus("Share this code with your partner. When they join, you can finish with just a profile photo.");
  };

  const connect = async () => {
    const current = readStoredUser();
    if (!current) return;
    setBusy(true);
    const result = await api<{ error?: string; user?: LoveriaUser }>("/api/pairing/connect", {
      method: "POST",
      body: JSON.stringify({ userId: current.id, code }),
    });
    setBusy(false);
    if (!result.ok || !result.data.user) {
      setStatus(result.data.error || "Could not connect.");
      return;
    }
    saveUser(result.data.user);
    setUser(result.data.user);
    goAfterPair();
  };

  const unpair = async () => {
    const current = readStoredUser();
    if (!current?.partner_user_id) return;
    if (!window.confirm("Unpair from your partner? You can pair again anytime with a new code.")) {
      return;
    }
    setBusy(true);
    setStatus("Unpairing...");
    const result = await api<{ error?: string; user?: LoveriaUser }>("/api/pairing/unpair", {
      method: "POST",
      body: JSON.stringify({ userId: current.id }),
    });
    setBusy(false);
    if (!result.ok || !result.data.user) {
      setStatus(result.data.error || "Could not unpair.");
      return;
    }
    saveUser(result.data.user);
    setUser(result.data.user);
    setMyCode("");
    setCode("");
    localStorage.removeItem("pairedJustNow");
    localStorage.setItem("pairingSkipped", "true");
    setStatus("You are unpaired. Create a code or enter a partner code to pair again.");
  };

  const skip = () => {
    localStorage.setItem("pairingSkipped", "true");
    localStorage.removeItem("pairedJustNow");
    router.push("/onboarding/gender");
  };

  const setupWhileWaiting = () => {
    localStorage.setItem("pairingSkipped", "true");
    router.push("/onboarding/gender");
  };

  if (!user) {
    return (
      <main className="page-shell" style={{ maxWidth: 520, paddingTop: "3rem" }}>
        <div className="glass-card">
          <p className="muted" style={{ margin: 0 }}>
            Loading…
          </p>
        </div>
      </main>
    );
  }

  if (user.partner_user_id) {
    return (
      <main className="page-shell" style={{ maxWidth: 520, paddingTop: "3rem" }}>
        <div className="glass-card">
          <h1 style={{ color: "var(--primary)", marginTop: 0 }}>You&apos;re paired</h1>
          <p className="muted">
            Your accounts are connected. Unpair if you want to disconnect, or go back home.
          </p>
          <div style={{ display: "grid", gap: "0.75rem", marginTop: "1rem" }}>
            <button className="btn" type="button" disabled={busy} onClick={unpair}>
              Unpair from partner
            </button>
            <Link className="btn btn-ghost" href="/home" style={{ width: "100%" }}>
              Back to home
            </Link>
          </div>
          {status && <p className="muted">{status}</p>}
        </div>
      </main>
    );
  }

  return (
    <main className="page-shell" style={{ maxWidth: 520, paddingTop: "3rem" }}>
      <div className="glass-card">
        <h1 style={{ color: "var(--primary)", marginTop: 0 }}>Pair with your partner</h1>
        <p className="muted">
          Pair first. If your partner already set up Loveria, you only need a profile picture after
          connecting.
        </p>
        <div style={{ display: "grid", gap: "0.75rem", marginTop: "1rem" }}>
          <button className="btn" type="button" disabled={busy} onClick={createCode}>
            Create pairing code
          </button>
          {myCode && (
            <p style={{ fontSize: "1.6rem", letterSpacing: "0.2em", textAlign: "center", margin: 0 }}>
              {myCode}
            </p>
          )}
          <input
            className="input"
            placeholder="Enter partner code"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
          />
          <button className="btn" type="button" disabled={busy} onClick={connect}>
            Connect with code
          </button>
          {myCode && (
            <button className="btn btn-ghost" type="button" onClick={setupWhileWaiting}>
              Set up my profile while I wait
            </button>
          )}
          <button className="btn btn-ghost" type="button" onClick={skip}>
            Skip pairing for now
          </button>
          <Link className="btn btn-ghost" href="/home" style={{ width: "100%" }}>
            Back to home
          </Link>
        </div>
        {status && <p className="muted">{status}</p>}
      </div>
    </main>
  );
}
