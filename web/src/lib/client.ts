export type LoveriaUser = {
  id: number;
  email: string;
  gender: string | null;
  nickname: string | null;
  partner_nickname: string | null;
  relationship_date: string | null;
  partner_user_id: number | null;
  latitude?: number | null;
  longitude?: number | null;
};

const USER_KEY = "user";
const DEVICE_TOKEN_KEY = "loveria_device_token";
const COOKIE_USER = "loveria_user";
const COOKIE_DEVICE = "loveria_device";
const SESSION_DAYS = 365;

function cookieSecureFlag() {
  return typeof window !== "undefined" && window.location.protocol === "https:"
    ? "; Secure"
    : "";
}

function writeCookie(name: string, value: string) {
  const maxAge = SESSION_DAYS * 24 * 60 * 60;
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAge}; SameSite=Lax${cookieSecureFlag()}`;
}

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const prefix = `${name}=`;
  const part = document.cookie.split("; ").find((row) => row.startsWith(prefix));
  if (!part) return null;
  try {
    return decodeURIComponent(part.slice(prefix.length));
  } catch {
    return null;
  }
}

function clearCookie(name: string) {
  document.cookie = `${name}=; path=/; max-age=0; SameSite=Lax${cookieSecureFlag()}`;
}

/** Where to send the user after login / refresh. Pairing comes first. */
export function nextOnboardingPath(user: LoveriaUser): string {
  const skipped =
    typeof window !== "undefined" &&
    localStorage.getItem("pairingSkipped") === "true";
  const justPaired =
    typeof window !== "undefined" &&
    localStorage.getItem("pairedJustNow") === "1";

  if (!user.partner_user_id && !skipped) {
    return "/pairing";
  }

  if (user.partner_user_id && justPaired) {
    return "/onboarding/profile-picture";
  }

  if (user.partner_user_id) {
    if (!user.nickname || !user.partner_nickname) return "/onboarding/nicknames";
    if (!user.relationship_date) return "/onboarding/date";
    return "/home";
  }

  if (!user.gender) return "/onboarding/gender";
  if (!user.nickname || !user.partner_nickname) return "/onboarding/nicknames";
  if (!user.relationship_date) return "/onboarding/date";
  return "/home";
}

export function readStoredUser(): LoveriaUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(USER_KEY) || readCookie(COOKIE_USER);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.id) return null;
    // Re-hydrate localStorage if we only had the cookie backup.
    if (!localStorage.getItem(USER_KEY)) {
      localStorage.setItem(USER_KEY, JSON.stringify(parsed));
    }
    return parsed;
  } catch {
    return null;
  }
}

export function saveUser(user: LoveriaUser) {
  const raw = JSON.stringify(user);
  localStorage.setItem(USER_KEY, raw);
  try {
    writeCookie(COOKIE_USER, raw);
  } catch {
    // Cookie may exceed size limits; localStorage is enough.
  }
}

export function readDeviceToken(): string | null {
  if (typeof window === "undefined") return null;
  const fromStorage = localStorage.getItem(DEVICE_TOKEN_KEY);
  if (fromStorage) return fromStorage;
  const fromCookie = readCookie(COOKIE_DEVICE);
  if (fromCookie) {
    localStorage.setItem(DEVICE_TOKEN_KEY, fromCookie);
    return fromCookie;
  }
  return null;
}

export function saveDeviceToken(token: string) {
  localStorage.setItem(DEVICE_TOKEN_KEY, token);
  writeCookie(COOKIE_DEVICE, token);
}

export function clearAuth() {
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem("pairingSkipped");
  localStorage.removeItem("pairedJustNow");
  localStorage.removeItem(DEVICE_TOKEN_KEY);
  clearCookie(COOKIE_USER);
  clearCookie(COOKIE_DEVICE);
}

/** Restore an existing login on this device (stored user and/or trusted device). */
export async function resumeSession(): Promise<{
  user: LoveriaUser;
  path: string;
} | null> {
  if (typeof window === "undefined") return null;

  const stored = readStoredUser();
  if (stored?.id) {
    const refreshed = await api<{ user?: LoveriaUser }>(`/api/user/${stored.id}`);
    if (refreshed.ok && refreshed.data.user) {
      saveUser(refreshed.data.user);
      return {
        user: refreshed.data.user,
        path: nextOnboardingPath(refreshed.data.user),
      };
    }
    // Offline / API hiccup — keep local session so they stay logged in.
    return { user: stored, path: nextOnboardingPath(stored) };
  }

  const deviceToken = readDeviceToken();
  if (!deviceToken) return null;

  const resumed = await api<{
    error?: string;
    user?: LoveriaUser;
    deviceToken?: string;
  }>("/api/auth/resume", {
    method: "POST",
    body: JSON.stringify({ deviceToken }),
  });
  if (!resumed.ok || !resumed.data.user) return null;

  saveUser(resumed.data.user);
  if (resumed.data.deviceToken) saveDeviceToken(resumed.data.deviceToken);
  return {
    user: resumed.data.user,
    path: nextOnboardingPath(resumed.data.user),
  };
}

export function hasSkippedPairing() {
  return (
    localStorage.getItem("pairingSkipped") === "true" ||
    new URLSearchParams(window.location.search).get("skipped") === "1"
  );
}

export async function api<T = Record<string, unknown>>(
  path: string,
  options?: RequestInit
): Promise<{ ok: boolean; status: number; data: T }> {
  const response = await fetch(path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers || {}),
    },
  });
  const data = (await response.json().catch(() => ({}))) as T;
  return { ok: response.ok, status: response.status, data };
}
