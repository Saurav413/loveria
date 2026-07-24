"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, nextOnboardingPath, readStoredUser, saveUser, type LoveriaUser } from "@/lib/client";
import { LoveriaCinematicBg } from "@/lib/cinematic-bg";

export default function PairingPage() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [myCode, setMyCode] = useState("");
  const [status, setStatus] = useState("");

  const goAfterPair = () => {
    localStorage.setItem("pairedJustNow", "1");
    localStorage.removeItem("pairingSkipped");
    // Paired users only need a profile photo next.
    router.push("/onboarding/profile-picture");
  };

  useEffect(() => {
    const user = readStoredUser();
    if (!user) {
      router.replace("/login");
      return;
    }
    if (user.partner_user_id) {
      // Already paired — finish with profile photo if coming from login, else home.
      if (localStorage.getItem("pairedJustNow") === "1") {
        router.replace("/onboarding/profile-picture");
      } else {
        router.replace(nextOnboardingPath(user));
      }
      return;
    }
    LoveriaCinematicBg.start({ userId: user.id });
    const timer = setInterval(async () => {
      const latest = await api<{ user?: LoveriaUser }>(`/api/user/${user.id}`);
      if (latest.ok && latest.data.user?.partner_user_id) {
        saveUser(latest.data.user);
        goAfterPair();
      }
    }, 4000);
    return () => clearInterval(timer);
  }, [router]);

  const createCode = async () => {
    const user = readStoredUser();
    if (!user) return;
    const result = await api<{ error?: string; code?: string }>("/api/pairing/create-code", {
      method: "POST",
      body: JSON.stringify({ userId: user.id }),
    });
    if (!result.ok) {
      setStatus(result.data.error || "Could not create code.");
      return;
    }
    setMyCode(result.data.code || "");
    setStatus("Share this code with your partner. When they join, you can finish with just a profile photo.");
  };

  const connect = async () => {
    const user = readStoredUser();
    if (!user) return;
    const result = await api<{ error?: string; user?: LoveriaUser }>("/api/pairing/connect", {
      method: "POST",
      body: JSON.stringify({ userId: user.id, code }),
    });
    if (!result.ok || !result.data.user) {
      setStatus(result.data.error || "Could not connect.");
      return;
    }
    saveUser(result.data.user);
    goAfterPair();
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

  return (
    <main className="page-shell" style={{ maxWidth: 520, paddingTop: "3rem" }}>
      <div className="glass-card">
        <h1 style={{ color: "var(--primary)", marginTop: 0 }}>Pair with your partner</h1>
        <p className="muted">
          Pair first. If your partner already set up Loveria, you only need a profile picture after connecting.
        </p>
        <div style={{ display: "grid", gap: "0.75rem", marginTop: "1rem" }}>
          <button className="btn" type="button" onClick={createCode}>
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
          <button className="btn" type="button" onClick={connect}>
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
        </div>
        {status && <p className="muted">{status}</p>}
      </div>
    </main>
  );
}
