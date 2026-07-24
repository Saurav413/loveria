"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api, readStoredUser } from "@/lib/client";
import { LoveriaCinematicBg } from "@/lib/cinematic-bg";

type Photo = {
  id: number;
  url: string;
  image_data?: string;
  caption?: string | null;
};

async function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Could not read file."));
    reader.readAsDataURL(file);
  });
}

async function compressImage(file: File) {
  const dataUrl = await fileToDataUrl(file);
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Invalid image."));
    image.src = dataUrl;
  });
  const frameWidth = 1280;
  const frameHeight = 720;
  const scale = Math.min(frameWidth / img.width, frameHeight / img.height);
  const drawWidth = Math.round(img.width * scale);
  const drawHeight = Math.round(img.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = frameWidth;
  canvas.height = frameHeight;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#13042f";
  ctx.fillRect(0, 0, frameWidth, frameHeight);
  ctx.drawImage(
    img,
    Math.floor((frameWidth - drawWidth) / 2),
    Math.floor((frameHeight - drawHeight) / 2),
    drawWidth,
    drawHeight
  );
  return canvas.toDataURL("image/jpeg", 0.82);
}

export default function SlideshowPage() {
  const router = useRouter();
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [caption, setCaption] = useState("");
  const [status, setStatus] = useState("");

  const load = async (userId: number) => {
    const result = await api<{ photos?: Photo[]; error?: string }>(`/api/slideshow/${userId}`);
    if (!result.ok) {
      setStatus(result.data.error || "Could not load photos.");
      return;
    }
    setPhotos(result.data.photos || []);
  };

  useEffect(() => {
    const user = readStoredUser();
    if (!user) {
      router.replace("/login");
      return;
    }
    LoveriaCinematicBg.start({ userId: user.id });
    load(user.id);
    const timer = setInterval(() => load(user.id), 5000);
    return () => clearInterval(timer);
  }, [router]);

  const upload = async () => {
    const user = readStoredUser();
    const input = document.getElementById("photoInput") as HTMLInputElement | null;
    const file = input?.files?.[0];
    if (!user || !file) {
      setStatus("Please choose an image first.");
      return;
    }
    setStatus("Uploading...");
    try {
      const imageData = await compressImage(file);
      const result = await api<{ error?: string }>("/api/slideshow/upload", {
        method: "POST",
        body: JSON.stringify({ userId: user.id, imageData, caption }),
      });
      if (!result.ok) {
        setStatus(result.data.error || "Upload failed.");
        return;
      }
      setCaption("");
      if (input) input.value = "";
      setStatus("Photo uploaded.");
      await load(user.id);
      LoveriaCinematicBg.refresh(user.id);
    } catch (err) {
      setStatus((err as Error).message || "Upload failed.");
    }
  };

  const remove = async (photoId: number) => {
    const user = readStoredUser();
    if (!user) return;
    const result = await api<{ error?: string }>(`/api/slideshow/${photoId}`, {
      method: "DELETE",
      body: JSON.stringify({ userId: user.id }),
    });
    if (!result.ok) {
      setStatus(result.data.error || "Delete failed.");
      return;
    }
    setStatus("Photo deleted.");
    await load(user.id);
    LoveriaCinematicBg.refresh(user.id);
  };

  return (
    <main className="page-shell" style={{ maxWidth: 900 }}>
      <div className="glass-card">
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
          <h1 style={{ color: "var(--primary)", marginTop: 0 }}>Shared Slideshow</h1>
          <Link href="/home" className="muted">Home</Link>
        </div>
        <p className="muted">Upload photos anytime — they become the cinematic background across your Loveria pages.</p>
        <div style={{ display: "grid", gap: 8, marginBottom: 16 }}>
          <input id="photoInput" type="file" accept="image/*" />
          <input className="input" placeholder="Caption (optional)" value={caption} onChange={(e) => setCaption(e.target.value)} />
          <button className="btn" type="button" onClick={upload}>Upload photo</button>
          {status && <p className="muted">{status}</p>}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 12 }}>
          {photos.map((photo) => (
            <div key={photo.id} style={{ background: "rgba(255,255,255,0.08)", borderRadius: 12, overflow: "hidden" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photo.url || photo.image_data} alt={photo.caption || "Memory"} style={{ width: "100%", height: 140, objectFit: "cover" }} />
              <div style={{ padding: 8, fontFamily: "system-ui", fontSize: 13 }}>
                <div>{photo.caption || "Untitled"}</div>
                <button className="btn btn-ghost" type="button" style={{ marginTop: 6, padding: "0.35rem 0.7rem" }} onClick={() => remove(photo.id)}>
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
