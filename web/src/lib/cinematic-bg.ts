"use client";

const INTERVAL_MS = 9000;
const KB = ["kb-a", "kb-b", "kb-c"] as const;

type Photo = { url: string; caption?: string };

let photos: Photo[] = [];
let index = 0;
let tickTimer: ReturnType<typeof setInterval> | null = null;
let refreshTimer: ReturnType<typeof setInterval> | null = null;
let activeLayer: "a" | "b" = "a";
let startedForUser: number | null = null;

function ensureRoot() {
  let root = document.getElementById("loveriaCinematicBg");
  if (root) return root;
  root = document.createElement("div");
  root.id = "loveriaCinematicBg";
  root.className = "loveria-cinematic-bg";
  root.setAttribute("aria-hidden", "true");
  root.innerHTML = `
    <div class="loveria-cinematic-layer" data-layer="a"><img alt="" /></div>
    <div class="loveria-cinematic-layer" data-layer="b"><img alt="" /></div>
    <div class="loveria-cinematic-scrim"></div>
  `;
  document.body.prepend(root);
  document.body.classList.add("has-cinematic-bg");
  return root;
}

async function fetchJsonSafe(url: string) {
  try {
    const response = await fetch(url);
    const data = await response.json().catch(() => ({}));
    return { ok: response.ok, data };
  } catch {
    return { ok: false, data: {} as Record<string, unknown> };
  }
}

async function collectPhotos(userId: number): Promise<Photo[]> {
  const userRaw = localStorage.getItem("user");
  let partnerId: number | null = null;
  try {
    const user = userRaw ? JSON.parse(userRaw) : null;
    if (user?.partner_user_id) partnerId = Number(user.partner_user_id);
  } catch {
    partnerId = null;
  }

  const [slideshow, selfCouple, partnerCouple, selfProfile, partnerProfile] =
    await Promise.all([
      fetchJsonSafe(`/api/slideshow/${userId}`),
      fetchJsonSafe(`/api/couple-photo/${userId}`),
      partnerId
        ? fetchJsonSafe(`/api/couple-photo/${partnerId}`)
        : Promise.resolve({ ok: false, data: {} }),
      fetchJsonSafe(`/api/user/profile-picture/${userId}`),
      partnerId
        ? fetchJsonSafe(`/api/user/profile-picture/${partnerId}`)
        : Promise.resolve({ ok: false, data: {} }),
    ]);

  const reel: Photo[] = [];
  const seen = new Set<string>();
  const push = (url?: string, caption?: string) => {
    if (!url || seen.has(url)) return;
    seen.add(url);
    reel.push({ url, caption: caption || "" });
  };

  if (selfCouple.ok) push((selfCouple.data as { photo?: { url?: string } }).photo?.url, "Us");
  if (partnerCouple.ok)
    push((partnerCouple.data as { photo?: { url?: string } }).photo?.url, "Us");

  if (slideshow.ok && Array.isArray((slideshow.data as { photos?: unknown[] }).photos)) {
    const list = (slideshow.data as { photos: Array<{ url: string; caption?: string; created_at?: string; id: number }> }).photos
      .slice()
      .sort((a, b) => {
        const timeA = Date.parse(a.created_at || "") || 0;
        const timeB = Date.parse(b.created_at || "") || 0;
        if (timeA !== timeB) return timeA - timeB;
        return Number(a.id) - Number(b.id);
      });
    list.forEach((p) => push(p.url, p.caption || ""));
  }

  if (!reel.length) {
    if (selfProfile.ok)
      push((selfProfile.data as { photo?: { url?: string } }).photo?.url, "You");
    if (partnerProfile.ok)
      push((partnerProfile.data as { photo?: { url?: string } }).photo?.url, "Partner");
  }

  return reel;
}

function showPhoto(photoIndex: number) {
  if (!photos.length) return;
  const root = ensureRoot();
  const next = photos[photoIndex % photos.length];
  const nextLayerName = activeLayer === "a" ? "b" : "a";
  const currentEl = root.querySelector(`[data-layer="${activeLayer}"]`);
  const nextEl = root.querySelector(`[data-layer="${nextLayerName}"]`);
  if (!currentEl || !nextEl) return;
  const img = nextEl.querySelector("img");
  if (img) {
    img.src = next.url;
    img.alt = next.caption || "Memory";
  }
  nextEl.classList.remove(...KB, "is-active");
  void (nextEl as HTMLElement).offsetWidth;
  nextEl.classList.add(KB[photoIndex % KB.length], "is-active");
  currentEl.classList.remove("is-active");
  activeLayer = nextLayerName;
  index = photoIndex % photos.length;
  root.classList.add("has-photos");
}

function clearTimers() {
  if (tickTimer) clearInterval(tickTimer);
  if (refreshTimer) clearInterval(refreshTimer);
  tickTimer = null;
  refreshTimer = null;
}

function startTicker() {
  if (tickTimer) clearInterval(tickTimer);
  if (photos.length <= 1) {
    if (photos.length === 1) showPhoto(0);
    return;
  }
  showPhoto(index);
  tickTimer = setInterval(() => showPhoto(index + 1), INTERVAL_MS);
}

async function refresh(userId: number) {
  const nextPhotos = await collectPhotos(userId);
  const sig = (list: Photo[]) => list.map((p) => `${p.url.length}:${p.caption || ""}`).join("|");
  const changed = sig(nextPhotos) !== sig(photos);
  photos = nextPhotos;
  const root = ensureRoot();
  if (!photos.length) {
    root.classList.remove("has-photos");
    root.querySelectorAll(".loveria-cinematic-layer").forEach((layer) => {
      const img = layer.querySelector("img");
      if (img) img.removeAttribute("src");
      layer.classList.remove("is-active", ...KB);
    });
    return photos;
  }
  if (changed || !root.querySelector(".loveria-cinematic-layer.is-active")) {
    index = 0;
    showPhoto(0);
  }
  startTicker();
  return photos;
}

export const LoveriaCinematicBg = {
  async start(options: { userId: number }) {
    const userId = Number(options.userId);
    if (!userId) return [] as Photo[];
    ensureRoot();
    startedForUser = userId;
    clearTimers();
    const list = await refresh(userId);
    refreshTimer = setInterval(() => {
      if (startedForUser) refresh(startedForUser);
    }, 12000);
    return list;
  },
  refresh,
};
