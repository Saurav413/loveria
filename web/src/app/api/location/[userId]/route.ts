import { prisma } from "@/lib/prisma";
import { json } from "@/lib/http";
import { haversineKm } from "@/lib/pair";

export async function GET(
  _request: Request,
  context: { params: Promise<{ userId: string }> }
) {
  const { userId: raw } = await context.params;
  const userId = Number(raw);
  if (!userId) return json({ error: "Invalid user ID." }, 400);
  const self = await prisma.user.findUnique({ where: { id: userId } });
  if (!self) return json({ error: "User not found." }, 404);

  const partner = self.partnerUserId
    ? await prisma.user.findUnique({ where: { id: self.partnerUserId } })
    : null;

  let distanceKm: number | null = null;
  if (
    self.latitude != null &&
    self.longitude != null &&
    partner?.latitude != null &&
    partner?.longitude != null
  ) {
    distanceKm = haversineKm(
      self.latitude,
      self.longitude,
      partner.latitude,
      partner.longitude
    );
  }

  return json({
    self: {
      nickname: self.nickname,
      latitude: self.latitude,
      longitude: self.longitude,
    },
    partner: partner
      ? {
          nickname: partner.nickname,
          latitude: partner.latitude,
          longitude: partner.longitude,
        }
      : null,
    distance_km: distanceKm,
  });
}
