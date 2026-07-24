"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api, readStoredUser } from "@/lib/client";
import { LoveriaCinematicBg } from "@/lib/cinematic-bg";

type Reminder = {
  id: number;
  reminder_date: string;
  note: string;
  is_notified: boolean;
};

export default function RemindersPage() {
  const router = useRouter();
  const [date, setDate] = useState("");
  const [note, setNote] = useState("");
  const [status, setStatus] = useState("");
  const [reminders, setReminders] = useState<Reminder[]>([]);

  const load = async (userId: number) => {
    const result = await api<{ reminders?: Reminder[] }>(`/api/reminders/${userId}`);
    if (result.ok) setReminders(result.data.reminders || []);
  };

  useEffect(() => {
    const user = readStoredUser();
    if (!user) {
      router.replace("/login");
      return;
    }
    LoveriaCinematicBg.start({ userId: user.id });
    load(user.id);

    const checkDue = async () => {
      const result = await api<{ reminders?: Reminder[] }>(`/api/reminders/${user.id}`);
      if (!result.ok) return;
      const list = result.data.reminders || [];
      setReminders(list);
      const today = new Date().toISOString().slice(0, 10);
      for (const reminder of list) {
        if (!reminder.is_notified && reminder.reminder_date <= today) {
          if ("Notification" in window && Notification.permission === "granted") {
            new Notification("Loveria Reminder", { body: reminder.note });
          }
          await api(`/api/reminders/${reminder.id}/notified`, { method: "PATCH" });
        }
      }
      await load(user.id);
    };

    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
    checkDue();
    const timer = setInterval(checkDue, 60000);
    return () => clearInterval(timer);
  }, [router]);

  const create = async () => {
    const user = readStoredUser();
    if (!user) return;
    const result = await api<{ error?: string }>("/api/reminders", {
      method: "POST",
      body: JSON.stringify({ userId: user.id, reminderDate: date, note }),
    });
    if (!result.ok) {
      setStatus(result.data.error || "Could not create reminder.");
      return;
    }
    setDate("");
    setNote("");
    setStatus("Reminder saved.");
    await load(user.id);
  };

  return (
    <main className="page-shell" style={{ maxWidth: 560 }}>
      <div className="glass-card">
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
          <h1 style={{ color: "var(--primary)", marginTop: 0 }}>Reminders</h1>
          <Link href="/home" className="muted">Home</Link>
        </div>
        <div style={{ display: "grid", gap: "0.75rem" }}>
          <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          <textarea className="input" rows={3} placeholder="Note" value={note} onChange={(e) => setNote(e.target.value)} />
          <button className="btn" type="button" onClick={create}>Save reminder</button>
        </div>
        {status && <p className="muted">{status}</p>}
        <ul style={{ marginTop: "1.25rem", paddingLeft: "1.1rem", fontFamily: "system-ui" }}>
          {reminders.map((r) => (
            <li key={r.id} style={{ marginBottom: 8 }}>
              <strong>{r.reminder_date}</strong> — {r.note}
              {r.is_notified ? " (notified)" : ""}
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
