import { prisma } from "@/lib/prisma";
import { json } from "@/lib/http";

export async function GET(
  _request: Request,
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
  const drawing = await prisma.sharedDrawing.findUnique({
    where: { userId: user.partnerUserId },
  });
  if (!drawing) return json({ error: "No partner drawing found yet." }, 404);
  return json({
    drawing: {
      image_data: drawing.url,
      url: drawing.url,
      updated_at: drawing.updatedAt.toISOString(),
    },
  });
}
