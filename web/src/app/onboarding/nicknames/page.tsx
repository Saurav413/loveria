"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, readStoredUser, saveUser } from "@/lib/client";

export default function NicknamesPage() {
  const router = useRouter();
  const [nickname, setNickname] = useState("");
  const [partnerNickname, setPartnerNickname] = useState("");
  const [status, setStatus] = useState("");

  useEffect(() => {
    if (!readStoredUser()) router.replace("/login");
  }, [router]);

  const save = async () => {
    const user = readStoredUser();
    if (!user) return;
    setStatus("Saving...");
    const result = await api<{ error?: string; user?: typeof user }>("/api/user/nicknames", {
      method: "POST",
      body: JSON.stringify({ userId: user.id, nickname, partnerNickname }),
    });
    if (!result.ok || !result.data.user) {
      setStatus(result.data.error || "Could not save nicknames.");
      return;
    }
    saveUser(result.data.user);
    router.push("/onboarding/date");
  };

  return (
    <main className="page-shell" style={{ maxWidth: 480, paddingTop: "3rem" }}>
      <div className="glass-card">
        <h1 style={{ color: "var(--primary)", marginTop: 0 }}>Set Your Nicknames</h1>
        <p className="muted">What should we call you and your person?</p>
        <div style={{ display: "grid", gap: "0.75rem", marginTop: "1rem" }}>
          <input className="input" placeholder="Your nickname" value={nickname} onChange={(e) => setNickname(e.target.value)} />
          <input className="input" placeholder="Partner nickname" value={partnerNickname} onChange={(e) => setPartnerNickname(e.target.value)} />
          <button className="btn" type="button" onClick={save}>Continue</button>
        </div>
        {status && <p className="muted">{status}</p>}
      </div>
    </main>
  );
}
