"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  api,
  clearAuth,
  hasSkippedPairing,
  nextOnboardingPath,
  readStoredUser,
  saveUser,
  type LoveriaUser,
} from "@/lib/client";
import { LoveriaCinematicBg } from "@/lib/cinematic-bg";

type Photo = { url: string; caption?: string };

export default function HomePage() {
  const router = useRouter();
  const [user, setUser] = useState<LoveriaUser | null>(null);
  const [days, setDays] = useState(0);
  const [distanceMain, setDistanceMain] = useState("Detecting locations...");
  const [selfLoc, setSelfLoc] = useState("Your location: --");
  const [partnerLoc, setPartnerLoc] = useState("Partner location: --");
  const [memories, setMemories] = useState<Photo[]>([]);
  const [selfAvatar, setSelfAvatar] = useState("");
  const [partnerAvatar, setPartnerAvatar] = useState("");

  useEffect(() => {
    (async () => {
      const stored = readStoredUser();
      if (!stored) {
        router.replace("/login");
        return;
      }

      const refreshed = await api<{ user?: LoveriaUser }>(`/api/user/${stored.id}`);
      const dbUser = refreshed.ok && refreshed.data.user ? refreshed.data.user : stored;
      saveUser(dbUser);

      const path = nextOnboardingPath(dbUser);
      if (path !== "/home") {
        router.replace(path);
        return;
      }
      if (dbUser.partner_user_id) localStorage.removeItem("pairingSkipped");
      else if (hasSkippedPairing()) localStorage.setItem("pairingSkipped", "true");

      setUser(dbUser);
      if (dbUser.relationship_date) {
        const start = new Date(dbUser.relationship_date);
        const diff = Math.ceil(Math.abs(Date.now() - start.getTime()) / (1000 * 60 * 60 * 24));
        setDays(diff);
      }

      const [selfPhoto, partnerPhoto] = await Promise.all([
        api<{ photo?: { url?: string } }>(`/api/user/profile-picture/${dbUser.id}`),
        dbUser.partner_user_id
          ? api<{ photo?: { url?: string } }>(`/api/user/profile-picture/${dbUser.partner_user_id}`)
          : Promise.resolve({ ok: false, data: {} as { photo?: { url?: string } } }),
      ]);
      if (selfPhoto.ok) setSelfAvatar(selfPhoto.data.photo?.url || "");
      if (partnerPhoto.ok) setPartnerAvatar(partnerPhoto.data.photo?.url || "");

      const photos = await LoveriaCinematicBg.start({ userId: dbUser.id });
      setMemories(photos);

      const syncLocation = async () => {
        if (navigator.geolocation) {
          try {
            const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
              navigator.geolocation.getCurrentPosition(resolve, reject, {
                enableHighAccuracy: true,
                timeout: 15000,
                maximumAge: 60000,
              })
            );
            await api("/api/location/update", {
              method: "POST",
              body: JSON.stringify({
                userId: dbUser.id,
                latitude: pos.coords.latitude,
                longitude: pos.coords.longitude,
              }),
            });
          } catch {
            setDistanceMain("Could not get current location.");
          }
        }
        const loc = await api<{
          error?: string;
          distance_km?: number | null;
          self?: { nickname?: string; latitude?: number | null; longitude?: number | null };
          partner?: { nickname?: string; latitude?: number | null; longitude?: number | null };
        }>(`/api/location/${dbUser.id}`);
        if (!loc.ok) {
          setDistanceMain(loc.data.error || "Could not load distance.");
          return;
        }
        const fmt = (lat?: number | null, lng?: number | null) =>
          lat == null || lng == null ? "Not shared yet" : `${Number(lat).toFixed(5)}, ${Number(lng).toFixed(5)}`;
        setSelfLoc(`${loc.data.self?.nickname || "You"}: ${fmt(loc.data.self?.latitude, loc.data.self?.longitude)}`);
        setPartnerLoc(`${loc.data.partner?.nickname || "Partner"}: ${fmt(loc.data.partner?.latitude, loc.data.partner?.longitude)}`);
        setDistanceMain(
          loc.data.distance_km == null
            ? "Waiting for both locations..."
            : `${Number(loc.data.distance_km).toFixed(2)} km apart`
        );
      };

      await syncLocation();
      const timer = setInterval(syncLocation, 60000);
      return () => clearInterval(timer);
    })();
  }, [router]);

  if (!user) {
    return <div className="page-shell muted">Loading...</div>;
  }

  const initial = (name?: string | null) => (name || "?").charAt(0).toUpperCase();

  return (
    <>
      <header className="site-header">
        <Link className="brand" href="/home">Loveria</Link>
        <nav className="nav">
          <Link href="/reminders">Reminders</Link>
          <Link href="/drawing">Drawing</Link>
          <Link href="/slideshow">Slideshow</Link>
          <Link href="/pairing">Pairing</Link>
          <button
            className="btn btn-ghost"
            type="button"
            onClick={() => {
              clearAuth();
              router.push("/");
            }}
          >
            Log out
          </button>
        </nav>
      </header>

      <main className="page-shell">
        <section className="home-hero">
          <div>
            <div className="hero-avatars">
              <div className="avatar">
                {selfAvatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={selfAvatar} alt={user.nickname || "You"} />
                ) : (
                  initial(user.nickname)
                )}
              </div>
              <div className="avatar">
                {partnerAvatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={partnerAvatar} alt={user.partner_nickname || "Partner"} />
                ) : (
                  initial(user.partner_nickname)
                )}
              </div>
            </div>
            <h1 className="landing-title">Our Journey</h1>
            <p className="muted">{user.nickname} & {user.partner_nickname}</p>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "clamp(3.5rem, 8vw, 5.5rem)", color: "var(--primary)", fontWeight: 700, lineHeight: 0.95 }}>
              {days}
            </div>
            <div className="muted" style={{ letterSpacing: "0.18em", textTransform: "uppercase", fontSize: "0.78rem" }}>
              Days of Love
            </div>
          </div>
        </section>

        <section className="home-grid">
          <article className="glass-card">
            <h2 style={{ color: "var(--primary-light)", marginTop: 0 }}>Our Distance</h2>
            <div style={{ fontFamily: "system-ui", fontWeight: 600, marginBottom: 8 }}>{distanceMain}</div>
            <p className="muted" style={{ fontSize: "0.9rem" }}>{selfLoc}</p>
            <p className="muted" style={{ fontSize: "0.9rem" }}>{partnerLoc}</p>
          </article>
          <article className="glass-card">
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
              <h2 style={{ color: "var(--primary-light)", marginTop: 0 }}>Shared Memories</h2>
              <Link href="/slideshow" style={{ color: "var(--primary-light)", fontFamily: "system-ui", fontSize: "0.85rem" }}>
                Add photos →
              </Link>
            </div>
            {memories.length ? (
              <div className="memory-strip">
                {memories.slice(0, 12).map((photo, i) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={`${photo.url}-${i}`} className="memory-thumb" src={photo.url} alt={photo.caption || "Memory"} />
                ))}
              </div>
            ) : (
              <p className="muted">Add photos to set your cinematic page backgrounds.</p>
            )}
          </article>
        </section>

        <h2 style={{ color: "#fff" }}>Explore</h2>
        <section className="features">
          {[
            { href: "/reminders", title: "Reminders", text: "Save dates and notes that matter to both of you." },
            { href: "/drawing", title: "Live Drawing", text: "Sketch together on a shared canvas." },
            { href: "/slideshow", title: "Shared Slideshow", text: "Upload photos that become your page backgrounds." },
            { href: "/pairing", title: "Pairing", text: "Connect or unpair with a pairing code." },
          ].map((f) => (
            <Link key={f.href} href={f.href} className="feature">
              <strong>{f.title}</strong>
              <span className="muted">{f.text}</span>
            </Link>
          ))}
        </section>
      </main>
    </>
  );
}
