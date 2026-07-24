import { prisma } from "@/lib/prisma";
import { generatePairingCode } from "@/lib/auth";
import { json, readJson } from "@/lib/http";

export async function POST(request: Request) {
  const body = await readJson<{ userId?: number }>(request);
  const userId = Number(body.userId || 0);
  if (!userId) return json({ error: "Valid user ID is required." }, 400);

  let code = generatePairingCode();
  for (let i = 0; i < 5; i++) {
    const exists = await prisma.pairingCode.findUnique({ where: { code } });
    if (!exists) break;
    code = generatePairingCode();
  }

  await prisma.pairingCode.deleteMany({
    where: { ownerUserId: userId, status: "active" },
  });

  await prisma.pairingCode.create({
    data: { code, ownerUserId: userId, status: "active" },
  });

  return json({ code, message: "Pairing code created." }, 201);
}
