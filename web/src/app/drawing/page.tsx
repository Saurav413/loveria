"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api, readStoredUser } from "@/lib/client";
import { LoveriaCinematicBg } from "@/lib/cinematic-bg";

export default function DrawingPage() {
  const router = useRouter();
  const selfCanvasRef = useRef<HTMLCanvasElement>(null);
  const partnerCanvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const last = useRef<{ x: number; y: number } | null>(null);
  const [status, setStatus] = useState("");
  const sinceRef = useRef(0);

  useEffect(() => {
    const user = readStoredUser();
    if (!user) {
      router.replace("/login");
      return;
    }
    LoveriaCinematicBg.start({ userId: user.id });

    const selfCtx = selfCanvasRef.current?.getContext("2d");
    const partnerCtx = partnerCanvasRef.current?.getContext("2d");
    if (selfCtx) {
      selfCtx.strokeStyle = "#ff5cc8";
      selfCtx.lineWidth = 3;
      selfCtx.lineCap = "round";
    }
    if (partnerCtx) {
      partnerCtx.strokeStyle = "#8a5dff";
      partnerCtx.lineWidth = 3;
      partnerCtx.lineCap = "round";
    }

    const drawStroke = (
      ctx: CanvasRenderingContext2D,
      stroke: { x0: number; y0: number; x1: number; y1: number }
    ) => {
      ctx.beginPath();
      ctx.moveTo(stroke.x0, stroke.y0);
      ctx.lineTo(stroke.x1, stroke.y1);
      ctx.stroke();
    };

    const loadSelf = async () => {
      const result = await api<{ drawing?: { url?: string; image_data?: string } }>(
        `/api/drawing/self/${user.id}`
      );
      if (result.ok && selfCanvasRef.current) {
        const img = new Image();
        img.onload = () => {
          selfCtx?.clearRect(0, 0, 600, 400);
          selfCtx?.drawImage(img, 0, 0, 600, 400);
        };
        img.src = result.data.drawing?.url || result.data.drawing?.image_data || "";
      }
    };

    const loadPartner = async () => {
      const result = await api<{ drawing?: { url?: string; image_data?: string } }>(
        `/api/drawing/partner/${user.id}`
      );
      if (result.ok && partnerCanvasRef.current) {
        const img = new Image();
        img.onload = () => {
          partnerCtx?.clearRect(0, 0, 600, 400);
          partnerCtx?.drawImage(img, 0, 0, 600, 400);
        };
        img.src = result.data.drawing?.url || result.data.drawing?.image_data || "";
      }
    };

    const pollEvents = async () => {
      const result = await api<{
        events?: Array<{ id: number; event_type: string; payload?: { x0: number; y0: number; x1: number; y1: number } }>;
      }>(`/api/drawing/events/${user.id}?since=${sinceRef.current}`);
      if (!result.ok || !partnerCtx) return;
      for (const event of result.data.events || []) {
        sinceRef.current = Math.max(sinceRef.current, event.id);
        if (event.event_type === "clear") {
          partnerCtx.clearRect(0, 0, 600, 400);
        } else if (event.event_type === "stroke" && event.payload) {
          drawStroke(partnerCtx, event.payload);
        }
      }
    };

    loadSelf();
    loadPartner();
    const partnerTimer = setInterval(loadPartner, 2500);
    const eventTimer = setInterval(pollEvents, 400);
    return () => {
      clearInterval(partnerTimer);
      clearInterval(eventTimer);
    };
  }, [router]);

  const pos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * 600,
      y: ((e.clientY - rect.top) / rect.height) * 400,
    };
  };

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    drawing.current = true;
    last.current = pos(e);
  };

  const onPointerMove = async (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current || !last.current) return;
    const user = readStoredUser();
    const ctx = selfCanvasRef.current?.getContext("2d");
    if (!user || !ctx) return;
    const next = pos(e);
    const stroke = { x0: last.current.x, y0: last.current.y, x1: next.x, y1: next.y };
    ctx.beginPath();
    ctx.moveTo(stroke.x0, stroke.y0);
    ctx.lineTo(stroke.x1, stroke.y1);
    ctx.stroke();
    last.current = next;
    if (user.partner_user_id) {
      api("/api/drawing/stroke", {
        method: "POST",
        body: JSON.stringify({ userId: user.id, stroke }),
      });
    }
  };

  const onPointerUp = () => {
    drawing.current = false;
    last.current = null;
  };

  const save = async () => {
    const user = readStoredUser();
    const canvas = selfCanvasRef.current;
    if (!user || !canvas) return;
    setStatus("Saving...");
    const result = await api<{ error?: string }>("/api/drawing/save", {
      method: "POST",
      body: JSON.stringify({ userId: user.id, imageData: canvas.toDataURL("image/png") }),
    });
    setStatus(result.ok ? "Drawing saved." : result.data.error || "Save failed.");
  };

  const clear = async () => {
    const user = readStoredUser();
    const ctx = selfCanvasRef.current?.getContext("2d");
    if (!user || !ctx) return;
    ctx.clearRect(0, 0, 600, 400);
    if (user.partner_user_id) {
      await api("/api/drawing/clear", {
        method: "POST",
        body: JSON.stringify({ userId: user.id }),
      });
    }
  };

  return (
    <main className="page-shell" style={{ maxWidth: 960 }}>
      <div className="glass-card">
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
          <h1 style={{ color: "var(--primary)", marginTop: 0 }}>Shared Drawing</h1>
          <Link href="/home" className="muted">Home</Link>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div>
            <p className="muted">You</p>
            <canvas
              ref={selfCanvasRef}
              width={600}
              height={400}
              style={{ width: "100%", background: "#fff", borderRadius: 12, touchAction: "none" }}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerLeave={onPointerUp}
            />
          </div>
          <div>
            <p className="muted">Partner</p>
            <canvas
              ref={partnerCanvasRef}
              width={600}
              height={400}
              style={{ width: "100%", background: "#fff", borderRadius: 12 }}
            />
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          <button className="btn" type="button" onClick={save}>Save</button>
          <button className="btn btn-ghost" type="button" onClick={clear}>Clear</button>
        </div>
        {status && <p className="muted">{status}</p>}
      </div>
    </main>
  );
}
