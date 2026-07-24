import { prisma } from "@/lib/prisma";
import { json, readJson } from "@/lib/http";
import { pairIds } from "@/lib/pair";

export async function POST(request: Request) {
  const body = await readJson<{ userId?: number }>(request);
  const userId = Number(body.userId || 0);
  if (!userId) return json({ error: "Valid user ID is required." }, 400);

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return json({ error: "User not found." }, 404);
  if (!user.partnerUserId) {
    return json({ error: "User is not paired yet." }, 400);
  }
  const [a, b] = pairIds(userId, user.partnerUserId);

  await prisma.drawingEvent.create({
    data: {
      pairUserA: a,
      pairUserB: b,
      fromUserId: userId,
      eventType: "clear",
      payload: null,
    },
  });

  return json({ message: "Clear recorded." });
}
