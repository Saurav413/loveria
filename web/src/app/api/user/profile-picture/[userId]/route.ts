import { prisma } from "@/lib/prisma";
import { json } from "@/lib/http";

export async function GET(
  _request: Request,
  context: { params: Promise<{ userId: string }> }
) {
  const { userId: raw } = await context.params;
  const userId = Number(raw);
  if (!userId) return json({ error: "Invalid user ID." }, 400);
  const photo = await prisma.profilePhoto.findUnique({ where: { userId } });
  if (!photo) return json({ error: "No profile picture found." }, 404);
  return json({
    photo: {
      id: photo.id,
      user_id: photo.userId,
      url: photo.url,
      image_data: photo.url,
    },
  });
}
