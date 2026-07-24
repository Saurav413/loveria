"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, readStoredUser, saveUser } from "@/lib/client";

export default function GenderPage() {
  const router = useRouter();
  const [status, setStatus] = useState("");

  useEffect(() => {
    if (!readStoredUser()) router.replace("/login");
  }, [router]);

  const choose = async (gender: string) => {
    const user = readStoredUser();
    if (!user) return;
    setStatus("Saving...");
    const result = await api<{ error?: string; user?: typeof user }>("/api/user/gender", {
      method: "POST",
      body: JSON.stringify({ userId: user.id, gender }),
    });
    if (!result.ok || !result.data.user) {
      setStatus(result.data.error || "Could not save gender.");
      return;
    }
    saveUser(result.data.user);
    router.push("/onboarding/nicknames");
  };

  return (
    <main className="page-shell" style={{ maxWidth: 480, paddingTop: "3rem" }}>
      <div className="glass-card">
        <h1 style={{ color: "var(--primary)", marginTop: 0 }}>Select Gender</h1>
        <p className="muted">This helps personalize your Loveria space.</p>
        <div style={{ display: "grid", gap: "0.75rem", marginTop: "1.25rem" }}>
          {["male", "female", "others"].map((g) => (
            <button key={g} className="btn" type="button" onClick={() => choose(g)} style={{ textTransform: "capitalize" }}>
              {g}
            </button>
          ))}
        </div>
        {status && <p className="muted">{status}</p>}
      </div>
    </main>
  );
}
