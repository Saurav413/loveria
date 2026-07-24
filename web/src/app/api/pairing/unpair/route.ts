import { prisma } from "@/lib/prisma";
import { json, mapUser, readJson } from "@/lib/http";

export async function POST(request: Request) {
  const body = await readJson<{ userId?: number }>(request);
  const userId = Number(body.userId || 0);
  if (!userId) return json({ error: "Valid user ID is required." }, 400);

  try {
    const user = await prisma.$transaction(async (tx) => {
      const self = await tx.user.findUnique({ where: { id: userId } });
      if (!self) throw new Error("NOT_FOUND");
      if (!self.partnerUserId) throw new Error("NOT_PAIRED");

      const partnerId = self.partnerUserId;

      await tx.user.update({
        where: { id: partnerId },
        data: { partnerUserId: null },
      });

      const updated = await tx.user.update({
        where: { id: userId },
        data: { partnerUserId: null },
      });

      // Drop any leftover active codes owned by either side.
      await tx.pairingCode.deleteMany({
        where: {
          OR: [{ ownerUserId: userId }, { ownerUserId: partnerId }],
          status: "active",
        },
      });

      return updated;
    });

    return json({
      message: "Unpaired successfully.",
      user: mapUser(user),
    });
  } catch (err) {
    const message = (err as Error).message;
    if (message === "NOT_FOUND") return json({ error: "User not found." }, 404);
    if (message === "NOT_PAIRED") {
      return json({ error: "You are not paired with anyone." }, 400);
    }
    return json({ error: "Database error." }, 500);
  }
}
