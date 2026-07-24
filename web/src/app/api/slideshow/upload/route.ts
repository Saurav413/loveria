import { prisma } from "@/lib/prisma";
import { storeImage } from "@/lib/blob";
import { json, readJson } from "@/lib/http";
import { pairIds } from "@/lib/pair";

export async function POST(request: Request) {
  const body = await readJson<{
    userId?: number;
    imageData?: string;
    caption?: string;
  }>(request);
  const userId = Number(body.userId || 0);
  const imageData = body.imageData || "";
  const caption = (body.caption || "").trim() || null;
  if (!userId || !imageData) {
    return json({ error: "Valid user ID and image are required." }, 400);
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return json({ error: "User not found." }, 404);

  const partnerUserId = user.partnerUserId || 0;
  const [a, b] =
    partnerUserId > 0 ? pairIds(userId, partnerUserId) : ([userId, userId] as [number, number]);

  try {
    const url = await storeImage(imageData, `slideshow/${userId}-${Date.now()}.jpg`);
    await prisma.slideshowPhoto.create({
      data: {
        pairUserA: a,
        pairUserB: b,
        uploadedBy: userId,
        caption,
        url,
      },
    });
    return json({ message: "Photo added to slideshow." }, 201);
  } catch (err) {
    return json({ error: (err as Error).message || "Upload failed." }, 400);
  }
}
