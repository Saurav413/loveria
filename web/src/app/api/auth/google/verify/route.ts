import { prisma } from "@/lib/prisma";
import { json, mapUser, readJson } from "@/lib/http";
import { hashSecret, issueTrustedDevice, verifySecret } from "@/lib/auth";

export async function POST(request: Request) {
  const body = await readJson<{ verificationId?: string; code?: string }>(request);
  const verificationId = body.verificationId || "";
  const code = (body.code || "").trim();
  if (!verificationId || !code) {
    return json({ error: "Verification ID and code are required." }, 400);
  }

  const verification = await prisma.emailVerification.findUnique({
    where: { id: verificationId },
  });
  if (!verification) {
    return json({ error: "Invalid verification request." }, 400);
  }
  if (verification.usedAt) {
    return json({ error: "Verification code already used." }, 400);
  }
  if (verification.expiresAt.getTime() < Date.now()) {
    return json({ error: "Verification code expired." }, 400);
  }
  if (!(await verifySecret(code, verification.codeHash))) {
    return json({ error: "Invalid verification code." }, 401);
  }

  await prisma.emailVerification.update({
    where: { id: verificationId },
    data: { usedAt: new Date() },
  });

  let user = await prisma.user.findUnique({ where: { email: verification.email } });
  if (!user) {
    const synthetic = await hashSecret(
      `google:${verification.googleSub}:${Date.now()}`
    );
    user = await prisma.user.create({
      data: { email: verification.email, password: synthetic },
    });
  }

  const deviceToken = await issueTrustedDevice(
    verification.email,
    verification.googleSub
  );

  return json({
    message: "Google sign-in successful.",
    user: mapUser(user),
    deviceToken,
  });
}
