import { prisma } from "@/lib/prisma";
import { json } from "@/lib/http";
import { pairIds } from "@/lib/pair";

export async function GET(
  request: Request,
  context: { params: Promise<{ userId: string }> }
) {
  const { userId: raw } = await context.params;
  const userId = Number(raw);
  if (!userId) return json({ error: "Invalid user ID." }, 400);

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return json({ error: "User not found." }, 404);
  if (!user.partnerUserId) {
    return json({ error: "User is not paired yet." }, 400);
  }
  const [a, b] = pairIds(userId, user.partnerUserId);
  const since = Number(new URL(request.url).searchParams.get("since") || 0);

  const events = await prisma.drawingEvent.findMany({
    where: {
      pairUserA: a,
      pairUserB: b,
      id: { gt: BigInt(since || 0) },
      fromUserId: { not: userId },
    },
    orderBy: { id: "asc" },
    take: 200,
  });

  return json({
    events: events.map((e) => ({
      id: Number(e.id),
      event_type: e.eventType,
      payload: e.payload ? JSON.parse(e.payload) : null,
      from_user_id: e.fromUserId,
      created_at: e.createdAt.toISOString(),
    })),
  });
}
