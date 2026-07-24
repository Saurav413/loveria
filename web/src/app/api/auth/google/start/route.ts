import { prisma } from "@/lib/prisma";
import { json, readJson } from "@/lib/http";
import {
  generateOtpCode,
  generateVerificationId,
  hashSecret,
  maskEmail,
  verifyGoogleCredential,
} from "@/lib/auth";
import { sendOtpEmail, smtpConfigured } from "@/lib/mail";

export async function POST(request: Request) {
  const body = await readJson<{ credential?: string }>(request);
  const verification = await verifyGoogleCredential(
    body.credential || "",
    process.env.GOOGLE_CLIENT_ID || ""
  );
  if (verification.error) {
    return json({ error: verification.error }, verification.status || 400);
  }
  if (!smtpConfigured()) {
    return json({ error: "Email OTP is not configured on server." }, 500);
  }

  const email = verification.payload!.email;
  const googleSub = verification.payload!.sub;
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
  });
}
