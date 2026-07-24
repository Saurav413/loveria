import { prisma } from "@/lib/prisma";
import { json, mapUser, readJson } from "@/lib/http";

export async function POST(request: Request) {
  const body = await readJson<{ userId?: number; gender?: string }>(request);
  const userId = Number(body.userId || 0);
  const gender = body.gender || "";
  if (!userId || !["male", "female", "others"].includes(gender)) {
    return json({ error: "User ID and valid gender are required." }, 400);
  }
  const user = await prisma.user.update({
    where: { id: userId },
    data: { gender },
  }).catch(() => null);
  if (!user) return json({ error: "User not found." }, 404);
  return json({ message: "Gender updated successfully.", user: mapUser(user) });
}
