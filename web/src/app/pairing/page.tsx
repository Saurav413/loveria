"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api, readStoredUser, saveUser } from "@/lib/client";
import { LoveriaCinematicBg } from "@/lib/cinematic-bg";

export default function PairingPage() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [myCode, setMyCode] = useState("");
  const [status, setStatus] = useState("");

  useEffect(() => {
    const user = readStoredUser();
    if (!user) {
      router.replace("/login");
      return;
    }
    if (user.partner_user_id) {
      router.replace("/home");
      return;
    }
    LoveriaCinematicBg.start({ userId: user.id });
    const timer = setInterval(async () => {
      const latest = await api<{ user?: typeof user }>(`/api/user/${user.id}`);
      if (latest.ok && latest.data.user?.partner_user_id) {
        saveUser(latest.data.user);
        router.replace("/home");
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
    setStatus("Share this code with your partner.");
  };

  const connect = async () => {
    const user = readStoredUser();
    if (!user) return;
    const result = await api<{ error?: string; user?: typeof user }>("/api/pairing/connect", {
      method: "POST",
      body: JSON.stringify({ userId: user.id, code }),
    });
    if (!result.ok || !result.data.user) {
      setStatus(result.data.error || "Could not connect.");
      return;
    }
    saveUser(result.data.user);
    localStorage.removeItem("pairingSkipped");
    router.push("/home");
  };

  const skip = () => {
    localStorage.setItem("pairingSkipped", "true");
    router.push("/home?skipped=1");
  };

  return (
    <main className="page-shell" style={{ maxWidth: 520, paddingTop: "3rem" }}>
      <div className="glass-card">
        <h1 style={{ color: "var(--primary)", marginTop: 0 }}>Pair With Partner</h1>
        <p className="muted">Create a code or enter theirs to connect your accounts.</p>
        <div style={{ display: "grid", gap: "0.75rem", marginTop: "1rem" }}>
          <button className="btn" type="button" onClick={createCode}>Create pairing code</button>
          {myCode && <p style={{ fontSize: "1.6rem", letterSpacing: "0.2em", textAlign: "center" }}>{myCode}</p>}
          <input className="input" placeholder="Enter partner code" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} />
          <button className="btn" type="button" onClick={connect}>Connect</button>
          <button className="btn btn-ghost" type="button" onClick={skip}>Skip for now</button>
          <Link href="/home" className="muted" style={{ textAlign: "center" }}>Back to home</Link>
        </div>
        {status && <p className="muted">{status}</p>}
      </div>
    </main>
  );
}
