import bcrypt from "bcryptjs";
import { randomBytes, randomInt } from "crypto";

export function generateOtpCode() {
  return String(randomInt(100000, 999999));
}

export function generatePairingCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[randomInt(0, chars.length)];
  }
  return code;
}

export function generateVerificationId() {
  return randomBytes(16).toString("hex");
}

export function maskEmail(email: string) {
  const [local, domain] = email.split("@");
  if (!domain) return email;
  if (local.length <= 2) return `**@${domain}`;
  return `${local[0]}${"*".repeat(Math.max(local.length - 2, 1))}${local[local.length - 1]}@${domain}`;
}

export async function hashSecret(value: string) {
  return bcrypt.hash(value, 10);
}

export async function verifySecret(value: string, hash: string) {
  return bcrypt.compare(value, hash);
}

export type GooglePayload = {
  email: string;
  sub: string;
  email_verified?: string | boolean;
  aud?: string;
  iss?: string;
};

export async function verifyGoogleCredential(
  credential: string,
  googleClientId: string
): Promise<{ error?: string; status?: number; payload?: GooglePayload }> {
  if (!credential) {
    return { error: "Google credential is required.", status: 400 };
  }
  if (!googleClientId) {
    return { error: "Google sign-in is not configured on server.", status: 500 };
  }

  const url = `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`;
  const response = await fetch(url);
  const payload = (await response.json()) as GooglePayload & { error?: string };

  if (!response.ok || payload.error) {
    return { error: "Invalid Google credential.", status: 401 };
  }
  if (payload.aud !== googleClientId) {
    return { error: "Google credential audience mismatch.", status: 401 };
  }
  const iss = payload.iss || "";
  if (iss !== "accounts.google.com" && iss !== "https://accounts.google.com") {
    return { error: "Invalid Google credential issuer.", status: 401 };
  }
  if (payload.email_verified !== true && payload.email_verified !== "true") {
    return { error: "Google email is not verified.", status: 401 };
  }
  if (!payload.email || !payload.sub) {
    return { error: "Google credential missing email.", status: 401 };
  }

  return { payload };
}
