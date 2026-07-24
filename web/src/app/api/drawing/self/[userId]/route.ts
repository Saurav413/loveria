import { prisma } from "@/lib/prisma";
import { json } from "@/lib/http";

export async function GET(
  _request: Request,
  context: { params: Promise<{ userId: string }> }
) {
  const { userId: raw } = await context.params;
  const userId = Number(raw);
  if (!userId) return json({ error: "Invalid user ID." }, 400);
  const drawing = await prisma.sharedDrawing.findUnique({ where: { userId } });
  if (!drawing) return json({ error: "No drawing found." }, 404);
  return json({
    drawing: {
      image_data: drawing.url,
      url: drawing.url,
      updated_at: drawing.updatedAt.toISOString(),
    },
  });
}
