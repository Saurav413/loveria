import { json } from "@/lib/http";
import { smtpConfigured } from "@/lib/mail";

export async function GET() {
  return json({
    googleClientId: process.env.GOOGLE_CLIENT_ID || "",
    smtpConfigured: smtpConfigured(),
  });
}
