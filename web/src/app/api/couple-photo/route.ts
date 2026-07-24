import { prisma } from "@/lib/prisma";
import { storeImage } from "@/lib/blob";
import { json, readJson } from "@/lib/http";

export async function POST(request: Request) {
  const body = await readJson<{ userId?: number; imageData?: string }>(request);
  const userId = Number(body.userId || 0);
  const imageData = body.imageData || "";
  if (!userId || !imageData) {
    return json({ error: "User ID and image are required." }, 400);
  }
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return json({ error: "User not found." }, 404);
  try {
    const url = await storeImage(imageData, `couple/${userId}-${Date.now()}.jpg`);
    await prisma.couplePhoto.upsert({
      where: { userId },
      create: { userId, url },
      update: { url },
    });
    return json({ message: "Couple photo saved successfully." }, 201);
  } catch (err) {
    return json({ error: (err as Error).message || "Upload failed." }, 400);
  }
}
