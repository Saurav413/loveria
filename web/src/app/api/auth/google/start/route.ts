import { prisma } from "@/lib/prisma";
import { json, mapUser, readJson } from "@/lib/http";
import {
  generateOtpCode,
  generateVerificationId,
  hashSecret,
  maskEmail,
  validateTrustedDevice,
  verifyGoogleCredential,
} from "@/lib/auth";
import { sendOtpEmail, smtpConfigured } from "@/lib/mail";

async function findOrCreateUser(email: string, googleSub: string) {
  let user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    const synthetic = await hashSecret(`google:${googleSub}:${Date.now()}`);
    user = await prisma.user.create({
      data: { email, password: synthetic },
    });
  }
  return user;
}

export async function POST(request: Request) {
  const body = await readJson<{ credential?: string; deviceToken?: string }>(request);
  const verification = await verifyGoogleCredential(
    body.credential || "",
    process.env.GOOGLE_CLIENT_ID || ""
  );
  if (verification.error) {
    return json({ error: verification.error }, verification.status || 400);
  }

  const email = verification.payload!.email;
  const googleSub = verification.payload!.sub;
  const existingToken = (body.deviceToken || "").trim();

  // Same Google account on a previously verified device → skip email OTP.
  if (await validateTrustedDevice(email, googleSub, existingToken || undefined)) {
    const user = await findOrCreateUser(email, googleSub);
    return json({
      message: "Signed in on trusted device.",
      user: mapUser(user),
      deviceToken: existingToken,
      skippedOtp: true,
    });
  }

  if (!smtpConfigured()) {
    return json({ error: "Email OTP is not configured on server." }, 500);
  }

  const otpCode = generateOtpCode();
  const codeHash = await hashSecret(otpCode);
  const verificationId = generateVerificationId();

  await prisma.emailVerification.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  });

  await prisma.emailVerification.create({
    data: {
      id: verificationId,
      email,
      googleSub,
      codeHash,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    },
  });

  const sent = await sendOtpEmail(email, otpCode);
  if (!sent.ok) {
    return json({ error: sent.error }, 500);
  }

  return json({
    message: "Verification code sent.",
    verificationId,
    email: maskEmail(email),
    skippedOtp: false,
  });
}
