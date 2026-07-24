import { prisma } from "@/lib/prisma";
import { json, mapUser, readJson } from "@/lib/http";

export async function POST(request: Request) {
  const body = await readJson<{
    userId?: number;
    nickname?: string;
    partnerNickname?: string;
  }>(request);
  const userId = Number(body.userId || 0);
  const nickname = body.nickname || "";
  const partnerNickname = body.partnerNickname || "";
  if (!userId || !nickname || !partnerNickname) {
    return json({ error: "User ID and both nicknames are required." }, 400);
  }
  const user = await prisma.user.update({
    where: { id: userId },
    data: { nickname, partnerNickname },
  }).catch(() => null);
  if (!user) return json({ error: "User not found." }, 404);
  return json({ message: "Nicknames updated successfully.", user: mapUser(user) });
}
