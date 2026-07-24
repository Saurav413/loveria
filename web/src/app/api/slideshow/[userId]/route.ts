import { prisma } from "@/lib/prisma";
import { json } from "@/lib/http";
import { pairIds } from "@/lib/pair";

export async function GET(
  _request: Request,
  context: { params: Promise<{ userId: string }> }
) {
  const { userId: raw } = await context.params;
  const userId = Number(raw);
  if (!userId) return json({ error: "Invalid user ID." }, 400);
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return json({ error: "User not found." }, 404);

  const partnerUserId = user.partnerUserId || 0;
  let photos;
  if (partnerUserId > 0) {
    const [a, b] = pairIds(userId, partnerUserId);
    photos = await prisma.slideshowPhoto.findMany({
      where: {
        OR: [
          { pairUserA: a, pairUserB: b },
          { pairUserA: userId, pairUserB: userId },
          { pairUserA: partnerUserId, pairUserB: partnerUserId },
        ],
      },
      orderBy: { createdAt: "desc" },
    });
  } else {
    photos = await prisma.slideshowPhoto.findMany({
      where: { pairUserA: userId, pairUserB: userId },
      orderBy: { createdAt: "desc" },
    });
  }

  return json({
    photos: photos.map((p) => ({
      id: p.id,
      image_data: p.url,
      url: p.url,
      caption: p.caption,
      uploaded_by: p.uploadedBy,
      created_at: p.createdAt.toISOString(),
    })),
  });
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ userId: string }> }
) {
  // DELETE /api/slideshow/:photoId — param name reused as photoId
  const { userId: raw } = await context.params;
  const photoId = Number(raw);
  const body = await request.json().catch(() => ({} as { userId?: number }));
  const userId = Number(body.userId || 0);
  if (!photoId || !userId) {
    return json({ error: "Valid photo ID and user ID are required." }, 400);
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return json({ error: "User not found." }, 404);

  const partnerUserId = user.partnerUserId || 0;
  let deleted;
  if (partnerUserId > 0) {
    const [a, b] = pairIds(userId, partnerUserId);
    deleted = await prisma.slideshowPhoto.deleteMany({
      where: {
        id: photoId,
        OR: [
          { pairUserA: a, pairUserB: b },
          { pairUserA: userId, pairUserB: userId },
          { pairUserA: partnerUserId, pairUserB: partnerUserId },
        ],
      },
    });
  } else {
    deleted = await prisma.slideshowPhoto.deleteMany({
      where: { id: photoId, pairUserA: userId, pairUserB: userId },
    });
  }

  if (!deleted.count) return json({ error: "Photo not found." }, 404);
  return json({ message: "Photo removed from slideshow." });
}
