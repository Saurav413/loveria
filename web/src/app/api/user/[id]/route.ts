import { prisma } from "@/lib/prisma";
import { json, mapUser } from "@/lib/http";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const userId = Number(id);
  if (!userId) return json({ error: "Invalid user ID." }, 400);
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return json({ error: "User not found." }, 404);
  return json({ user: mapUser(user) });
}
