import { prisma } from "@/lib/prisma";
import { json, mapUser, readJson } from "@/lib/http";

export async function POST(request: Request) {
  const body = await readJson<{ userId?: number; relationshipDate?: string }>(request);
  const userId = Number(body.userId || 0);
  const relationshipDate = body.relationshipDate || "";
  if (!userId || !relationshipDate) {
    return json({ error: "User ID and relationship date are required." }, 400);
  }
  const user = await prisma.user.update({
    where: { id: userId },
    data: { relationshipDate: new Date(relationshipDate) },
  }).catch(() => null);
  if (!user) return json({ error: "User not found." }, 404);
  return json({
    message: "Relationship date updated successfully.",
    user: mapUser(user),
  });
}
