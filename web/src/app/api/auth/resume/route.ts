import { prisma } from "@/lib/prisma";
import { json, mapUser, readJson } from "@/lib/http";
import { hashDeviceToken, validateTrustedDevice } from "@/lib/auth";

/** Restore a logged-in session from a trusted device token (no Google / OTP). */
export async function POST(request: Request) {
  const body = await readJson<{ deviceToken?: string }>(request);
  const deviceToken = (body.deviceToken || "").trim();
  if (!deviceToken) {
    return json({ error: "Device token is required." }, 400);
  }

  const tokenHash = hashDeviceToken(deviceToken);
  const device = await prisma.trustedDevice.findFirst({
    where: {
      tokenHash,
      expiresAt: { gt: new Date() },
    },
  });

  if (!device) {
    return json({ error: "Session expired. Please sign in again." }, 401);
  }

  const ok = await validateTrustedDevice(
    device.email,
    device.googleSub,
    deviceToken
  );
  if (!ok) {
    return json({ error: "Session expired. Please sign in again." }, 401);
  }

  const user = await prisma.user.findUnique({ where: { email: device.email } });
  if (!user) {
    return json({ error: "User not found. Please sign in again." }, 404);
  }

  return json({
    message: "Session restored.",
    user: mapUser(user),
    deviceToken,
  });
}
