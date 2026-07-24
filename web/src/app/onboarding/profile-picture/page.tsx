"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, readStoredUser } from "@/lib/client";

async function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Could not read file."));
    reader.readAsDataURL(file);
  });
}

export default function ProfilePicturePage() {
  const router = useRouter();
  const [preview, setPreview] = useState("");
  const [status, setStatus] = useState("");
  const [pairedFlow, setPairedFlow] = useState(false);

  useEffect(() => {
    const user = readStoredUser();
    if (!user) {
      router.replace("/login");
      return;
    }
    const paired =
      Boolean(user.partner_user_id) || localStorage.getItem("pairedJustNow") === "1";
    setPairedFlow(paired);
  }, [router]);

  const finish = () => {
    localStorage.removeItem("pairedJustNow");
    if (pairedFlow || readStoredUser()?.partner_user_id) {
      router.push("/home");
    } else {
      router.push("/onboarding/couple-photo");
    }
  };

  const upload = async () => {
    const user = readStoredUser();
    const input = document.getElementById("photo") as HTMLInputElement | null;
    const file = input?.files?.[0];
    if (!user || !file) {
      setStatus("Choose a photo first.");
      return;
    }
    setStatus("Uploading...");
    const imageData = await fileToDataUrl(file);
    const result = await api<{ error?: string }>("/api/user/profile-picture", {
      method: "POST",
      body: JSON.stringify({ userId: user.id, imageData }),
    });
    if (!result.ok) {
      setStatus(result.data.error || "Upload failed.");
      return;
    }
    finish();
  };

  return (
    <main className="page-shell" style={{ maxWidth: 480, paddingTop: "3rem" }}>
      <div className="glass-card">
        <h1 style={{ color: "var(--primary)", marginTop: 0 }}>Profile Picture</h1>
        <p className="muted">
          {pairedFlow
            ? "You're paired — just add a profile photo to finish."
            : "Upload a photo to personalize your Loveria profile."}
        </p>
        <input
          id="photo"
          type="file"
          accept="image/*"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            fileToDataUrl(file).then(setPreview);
          }}
        />
        {preview && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={preview}
            alt="Preview"
            style={{
              width: 120,
              height: 120,
              borderRadius: "50%",
              objectFit: "cover",
              marginTop: 12,
            }}
          />
        )}
        <div style={{ display: "flex", gap: "0.5rem", marginTop: "1rem" }}>
          <button className="btn" type="button" onClick={upload}>
            Save
          </button>
          <button className="btn btn-ghost" type="button" onClick={finish}>
            Skip
          </button>
        </div>
        {status && <p className="muted">{status}</p>}
      </div>
    </main>
  );
}
