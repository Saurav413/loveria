import nodemailer from "nodemailer";

export function smtpConfigured() {
  return Boolean(
    process.env.SMTP_HOST &&
      process.env.SMTP_USER &&
      process.env.SMTP_PASS &&
      process.env.SMTP_FROM
  );
}

export async function sendOtpEmail(toEmail: string, otpCode: string) {
  if (!smtpConfigured()) {
    return { ok: false as const, error: "Email OTP is not configured on server." };
  }

  const port = Number(process.env.SMTP_PORT || 587);
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  let from = process.env.SMTP_FROM || process.env.SMTP_USER!;
  const match = from.match(/^(.+?)\s*<(.+?)>$/);
  if (match) {
    from = `"${match[1].trim()}" <${match[2]}>`;
  }

  try {
    await transporter.sendMail({
      from,
      to: toEmail,
      subject: "Your Loveria verification code",
      text: `Your verification code is ${otpCode}. It expires in 10 minutes.`,
      html: `<p>Your verification code is:</p><h2>${otpCode}</h2><p>This code expires in 10 minutes.</p>`,
    });
    return { ok: true as const };
  } catch {
    return { ok: false as const, error: "Failed to send verification code." };
  }
}
