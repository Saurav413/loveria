import { prisma } from "@/lib/prisma";
import { json, readJson } from "@/lib/http";
import { pairIds } from "@/lib/pair";

async function resolvePair(userId: number) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return { error: "User not found.", status: 404 as const };
  if (!user.partnerUserId) {
    return { error: "User is not paired yet.", status: 400 as const };
  }
  const [a, b] = pairIds(userId, user.partnerUserId);
  return { a, b, partnerUserId: user.partnerUserId };
}

export async function POST(request: Request) {
  const body = await readJson<{ userId?: number; stroke?: unknown }>(request);
  const userId = Number(body.userId || 0);
  if (!userId || body.stroke == null) {
    return json({ error: "Valid user ID and stroke are required." }, 400);
  }
  const pair = await resolvePair(userId);
  if ("error" in pair) return json({ error: pair.error }, pair.status);

  await prisma.drawingEvent.create({
    data: {
      pairUserA: pair.a,
      pairUserB: pair.b,
      fromUserId: userId,
      eventType: "stroke",
      payload: JSON.stringify(body.stroke),
    },
  });

  const keep = await prisma.drawingEvent.findMany({
    where: { pairUserA: pair.a, pairUserB: pair.b },
    orderBy: { id: "desc" },
    take: 500,
    select: { id: true },
  });
  const keepIds = keep.map((e) => e.id);
  if (keepIds.length) {
    await prisma.drawingEvent.deleteMany({
      where: {
        pairUserA: pair.a,
        pairUserB: pair.b,
        id: { notIn: keepIds },
      },
    });
  }

  return json({ message: "Stroke recorded." });
}
