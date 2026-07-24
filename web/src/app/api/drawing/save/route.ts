import { prisma } from "@/lib/prisma";
import { storeImage } from "@/lib/blob";
import { json, readJson } from "@/lib/http";

export async function POST(request: Request) {
  const body = await readJson<{ userId?: number; imageData?: string }>(request);
  const userId = Number(body.userId || 0);
  const imageData = (body.imageData || "").trim();
  if (!userId || !imageData) {
    return json({ error: "Valid user ID and drawing image are required." }, 400);
  }
  try {
    const url = await storeImage(imageData, `drawings/${userId}-${Date.now()}.png`);
    await prisma.sharedDrawing.upsert({
      where: { userId },
      create: { userId, url },
      update: { url },
    });
    return json({ message: "Drawing saved successfully." }, 201);
  } catch (err) {
    return json({ error: (err as Error).message || "Save failed." }, 400);
  }
}
