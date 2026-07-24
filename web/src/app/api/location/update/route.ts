import { prisma } from "@/lib/prisma";
import { json, readJson } from "@/lib/http";

export async function POST(request: Request) {
  const body = await readJson<{
    userId?: number;
    latitude?: number;
    longitude?: number;
  }>(request);
  const userId = Number(body.userId || 0);
  const latitude = Number(body.latitude);
  const longitude = Number(body.longitude);
  if (!userId) return json({ error: "Valid user ID is required." }, 400);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return json({ error: "Valid latitude and longitude are required." }, 400);
  }
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    return json({ error: "Latitude/longitude out of range." }, 400);
  }
  try {
    await prisma.user.update({
      where: { id: userId },
      data: { latitude, longitude, locationUpdatedAt: new Date() },
    });
    return json({ message: "Location updated successfully." });
  } catch {
    return json({ error: "User not found." }, 404);
  }
}
