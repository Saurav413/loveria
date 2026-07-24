"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, readStoredUser, saveUser } from "@/lib/client";

export default function DatePage() {
  const router = useRouter();
  const [relationshipDate, setRelationshipDate] = useState("");
  const [status, setStatus] = useState("");

  useEffect(() => {
    if (!readStoredUser()) router.replace("/login");
  }, [router]);

  const save = async () => {
    const user = readStoredUser();
    if (!user) return;
    setStatus("Saving...");
    const result = await api<{ error?: string; user?: typeof user }>("/api/user/relationship-date", {
      method: "POST",
      body: JSON.stringify({ userId: user.id, relationshipDate }),
    });
    if (!result.ok || !result.data.user) {
      setStatus(result.data.error || "Could not save date.");
      return;
    }
    saveUser(result.data.user);
    router.push("/onboarding/profile-picture");
  };

  return (
    <main className="page-shell" style={{ maxWidth: 480, paddingTop: "3rem" }}>
      <div className="glass-card">
        <h1 style={{ color: "var(--primary)", marginTop: 0 }}>Our Special Date</h1>
        <p className="muted">When did your journey begin?</p>
        <div style={{ display: "grid", gap: "0.75rem", marginTop: "1rem" }}>
          <input className="input" type="date" value={relationshipDate} onChange={(e) => setRelationshipDate(e.target.value)} />
          <button className="btn" type="button" onClick={save}>Continue</button>
        </div>
        {status && <p className="muted">{status}</p>}
      </div>
    </main>
  );
}
