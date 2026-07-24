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

  // Just connected — only profile picture is required; journey data is inherited.
  if (user.partner_user_id && justPaired) {
    return "/onboarding/profile-picture";
  }

  if (user.partner_user_id) {
    // Fill any gaps the partner didn't have yet (rare); otherwise home.
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
    const raw = localStorage.getItem("user");
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.id ? parsed : null;
  } catch {
    return null;
  }
}

export function saveUser(user: LoveriaUser) {
  localStorage.setItem("user", JSON.stringify(user));
}

export function clearAuth() {
  localStorage.removeItem("user");
  localStorage.removeItem("pairingSkipped");
  localStorage.removeItem("pairedJustNow");
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
